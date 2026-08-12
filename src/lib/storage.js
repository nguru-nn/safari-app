import { supabase } from './supabase'

// Buckets are created once via the Supabase dashboard (Storage → New bucket):
// 'hero-images' and 'hotel-images', both public.
export async function uploadImage(bucket, file) {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
