import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/* ── Get auth token from Supabase session ──────────────────────── */
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

/* ── Generic fetch wrapper ─────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const token = await getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const json = await res.json()

  if (!res.ok) {
    const err = new Error(json.error || json.message || 'Request failed')
    err.status = res.status
    err.details = json.details
    throw err
  }
  return json
}

/* ── Form Configs API ─────────────────────────────────────────── */
export const formConfigsApi = {
  list:             ()             => apiFetch('/form-configs'),
  getByUrlId:       (urlId)        => apiFetch(`/form-configs/public/${urlId}`),
  create:           (body)         => apiFetch('/form-configs',         { method: 'POST',   body: JSON.stringify(body) }),
  update:           (id, body)     => apiFetch(`/form-configs/${id}`,   { method: 'PATCH',  body: JSON.stringify(body) }),
  delete:           (id)           => apiFetch(`/form-configs/${id}`,   { method: 'DELETE' }),
}

/* ── Submissions API ──────────────────────────────────────────── */
export const submissionsApi = {
  list:             (params = {})  => apiFetch('/submissions?' + new URLSearchParams(params)),
  get:              (id)           => apiFetch(`/submissions/${id}`),
  create:           (body)         => apiFetch('/submissions',           { method: 'POST',   body: JSON.stringify(body) }),
  stats:            ()             => apiFetch('/submissions/stats'),
  updateStatus:     (id, status)   => apiFetch(`/submissions/${id}/status`,    { method: 'PATCH',  body: JSON.stringify({ status }) }),
  bulkUpdateStatus: (ids, status)  => apiFetch('/submissions/bulk-status',     { method: 'PATCH',  body: JSON.stringify({ ids, status }) }),
  delete:           (id)           => apiFetch(`/submissions/${id}`,    { method: 'DELETE' }),

  /* Photo upload — uses FormData not JSON */
  uploadPhoto: async (id, dataUrl) => {
    const token = await getToken()
    const blob  = await fetch(dataUrl).then(r => r.blob())
    const form  = new FormData()
    form.append('photo', blob, 'photo.jpg')
    const res   = await fetch(`${BASE_URL}/submissions/${id}/photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    const json  = await res.json()
    if (!res.ok) throw new Error(json.error || 'Photo upload failed')
    return json
  },
}

/* ── Health check ─────────────────────────────────────────────── */
export const healthApi = () => apiFetch('/health')
