import { supabase } from './supabase'

// Buckets are created once via the Supabase dashboard (Storage → New bucket):
// 'hero-images' and 'hotel-images', both public.
// 'client-payment-docs' and 'invoice-pdfs' are created via migration, both private —
// see uploadPrivateFile / getPrivateFileUrl below.

// Resizes/re-encodes an image in the browser before upload. Hotel thumbnails render
// at ~140x100 and the lightbox never exceeds viewport width, so there's no reason to
// store (and re-serve, over and over, to every page visitor) multi-megabyte camera
// originals. Capping the longest edge and re-encoding as JPEG cuts stored bytes —
// and therefore egress — dramatically, with no visible quality loss at display size.
async function compressImage(file, { maxDimension = 1600, quality = 0.8 } = {}) {
  // Skip non-raster files (e.g. already-small or unusual formats) rather than risk breaking them
  if (!file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  // Fall back to the original file if canvas encoding fails for any reason
  if (!blob) return file
  // Only use the compressed version if it's actually smaller
  if (blob.size >= file.size) return file

  const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], newName, { type: 'image/jpeg' })
}

export async function uploadImage(bucket, file) {
  const compressed = await compressImage(file)
  const ext = compressed.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
    // Filenames are random UUIDs and never overwritten (upsert: false), so it's safe
    // to cache them for a full year — this lets the CDN actually serve repeat views
    // from edge cache instead of re-pulling from origin every hour.
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// ---- Private uploads (client receipts, bank proof-of-payment, invoice PDFs) ----
// Unlike uploadImage, these buckets have no public access — a file is only reachable
// via a short-lived signed URL, generated on demand, never stored. Used for anything
// that shouldn't be reachable by a guessed or leaked link indefinitely.

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
