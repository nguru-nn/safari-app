// ---- Add this to storage.js — private uploads for client receipts / bank PoP ----
// Bucket 'client-payment-docs' is private (created via migration, not the dashboard).
// Unlike uploadImage, this returns a storage *path*, not a public URL — the file is
// fetched later via a signed URL (getPrivateFileUrl) since the bucket has no public access.

export async function uploadPrivateFile(bucket, file, folder = '') {
  const ext = file.name.split('.').pop()
  const path = folder ? `${folder}/${crypto.randomUUID()}.${ext}` : `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

// Signed URLs expire — generate on demand rather than storing, so a leaked link
// eventually stops working.
export async function getPrivateFileUrl(bucket, path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export async function deletePrivateFile(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
