// Usage:
//   node scripts/generate-page.mjs --id=<itinerary-uuid>
//   node scripts/generate-page.mjs --slug=<itinerary-slug>
//
// Env vars required (same as the app's .env):
//   SUPABASE_URL, SUPABASE_ANON_KEY, PUBLIC_SITE_BASE_URL
//
// Writes to dist-public/safari/<slug>.html — that folder's contents are what
// gets FTP-deployed to Hostinger's public_html/safari/.

import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'node:fs/promises'
import { renderItineraryPage } from './render-template.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v]
  })
)

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SITE_BASE_URL = process.env.PUBLIC_SITE_BASE_URL || 'https://your-subdomain.example.com'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY in the environment.')
  process.exit(1)
}
if (!args.id && !args.slug) {
  console.error('Pass --id=<uuid> or --slug=<slug>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  let query = supabase.from('itineraries').select('*').eq('status', 'published')
  query = args.id ? query.eq('id', args.id) : query.eq('slug', args.slug)

  const { data: itinerary, error: itineraryError } = await query.single()
  if (itineraryError || !itinerary) {
    console.error('Could not find a published itinerary matching that lookup:', itineraryError?.message)
    process.exit(1)
  }
  if (!itinerary.slug) {
    console.error(`Itinerary ${itinerary.id} has no slug set — cannot generate a URL for it.`)
    process.exit(1)
  }

  const { data: days, error: daysError } = await supabase
    .from('itinerary_days')
    .select(`
      *,
      day_content_blocks ( id, content, sort_order ),
      day_activities ( id, activity ),
      day_hotel_images ( id, image_url, sort_order )
    `)
    .eq('itinerary_id', itinerary.id)
    .order('day_number', { ascending: true })
  if (daysError) throw daysError

  const { data: items, error: itemsError } = await supabase
    .from('inclusion_exclusion_items')
    .select('*')
    .eq('itinerary_id', itinerary.id)
    .order('sort_order')
  if (itemsError) throw itemsError

  const { data: pricing, error: pricingError } = await supabase
    .from('pricing')
    .select('*')
    .eq('itinerary_id', itinerary.id)
  if (pricingError) throw pricingError

  const html = renderItineraryPage(
    {
      itinerary,
      days,
      inclusions: items.filter((i) => i.type === 'included'),
      exclusions: items.filter((i) => i.type === 'excluded'),
      pricing,
    },
    SITE_BASE_URL
  )

  const outDir = new URL('../dist-public/safari/', import.meta.url)
  await mkdir(outDir, { recursive: true })
  const outPath = new URL(`${itinerary.slug}.html`, outDir)
  await writeFile(outPath, html, 'utf-8')

  console.log(`✓ Generated ${outPath.pathname}`)
  console.log(`  Public URL will be: ${SITE_BASE_URL.replace(/\/$/, '')}/safari/${itinerary.slug}.html`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
