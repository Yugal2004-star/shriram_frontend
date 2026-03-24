import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠ Missing Supabase env vars. Copy .env.example → .env.local and fill in your values.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/* ── Storage helpers ──────────────────────────────────── */
export const PHOTO_BUCKET = 'id-card-photos'
export const BG_BUCKET   = 'card-backgrounds'

/* ── Upload template background image → returns public URL ── */
export async function uploadBgImage(file) {
  const ext  = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `backgrounds/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from(BG_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(BG_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPhoto(submissionId, dataUrl) {
  const base64 = dataUrl.split(',')[1]
  const blob   = await fetch(dataUrl).then(r => r.blob())
  const path   = `submissions/${submissionId}/photo.jpg`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function getPhotoUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}