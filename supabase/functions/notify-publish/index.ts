// Deploy target: Supabase Edge Function "notify-publish"
//
// Why this exists: Supabase's Database Webhooks always send their own fixed
// payload shape ({ type, table, record, old_record, schema }) — there's no
// way to make that match what GitHub's repository_dispatch API requires
// ({ event_type, client_payload }). This function is the adapter in between.
//
// Called by a Postgres trigger (via pg_net) on every itineraries UPDATE.
// Only actually dispatches to GitHub at the exact moment status becomes
// 'published' — every other update is a fast no-op.

Deno.serve(async (req) => {
  let payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const record = payload.record
  const oldRecord = payload.old_record

  const justPublished = record?.status === 'published' && oldRecord?.status !== 'published'
  if (!justPublished) {
    return new Response(JSON.stringify({ skipped: true, reason: 'not a publish transition' }), { status: 200 })
  }

  const githubOwner = Deno.env.get('GITHUB_OWNER')
  const githubRepo = Deno.env.get('GITHUB_REPO')
  const githubToken = Deno.env.get('GITHUB_PAT')

  if (!githubOwner || !githubRepo || !githubToken) {
    return new Response(
      JSON.stringify({ error: 'Missing GITHUB_OWNER / GITHUB_REPO / GITHUB_PAT secrets on this function' }),
      { status: 500 }
    )
  }

  const dispatchRes = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      event_type: 'safari-publish',
      client_payload: { record, old_record: oldRecord },
    }),
  })

  if (!dispatchRes.ok) {
    const detail = await dispatchRes.text()
    return new Response(JSON.stringify({ error: 'GitHub dispatch failed', status: dispatchRes.status, detail }), {
      status: 502,
    })
  }

  return new Response(JSON.stringify({ triggered: true, itinerary_id: record.id, slug: record.slug }), {
    status: 200,
  })
})
