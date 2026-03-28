import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function apiFetch(path, options = {}) {
  const token = await getToken()
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  const res  = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const json = await res.json()
  if (!res.ok) { const err = new Error(json.error || 'Request failed'); err.status = res.status; throw err }
  return json
}

/* ── Context ─────────────────────────────────────────────────── */
const OrgsContext = createContext(null)

export function OrganizationsProvider({ children }) {
  const [organizations, setOrganizations] = useState([])
  const [loading,       setLoading]       = useState(true)
  const hasFetched = useRef(false)

  const fetchOrganizations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/organizations')
      setOrganizations(res.data || [])
    } catch (err) {
      console.error('fetchOrganizations error:', err)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchOrganizations()
  }, [fetchOrganizations])

  /* Create org + optional logo upload */
  const createOrganization = async (formData, logoFile) => {
    const res = await apiFetch('/organizations', {
      method: 'POST',
      body: JSON.stringify({
        name:    formData.name,
        type:    formData.type,
        address: formData.address || null,
        contact: formData.contact || null,
        email:   formData.email   || null,
        website: formData.website || null,
      }),
    })
    let org = res.data

    if (logoFile) {
      try {
        const token     = await getToken()
        const form      = new FormData()
        form.append('logo', logoFile)
        const logoRes   = await fetch(`${BASE_URL}/organizations/${org.id}/logo`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        })
        const logoJson  = await logoRes.json()
        if (logoRes.ok) {
          // FIX: append cache-busting timestamp so the browser doesn't show stale logo
          org = {
            ...logoJson.data,
            logo_url: logoJson.data.logo_url
              ? `${logoJson.data.logo_url}?t=${Date.now()}`
              : null,
          }
        }
      } catch (err) {
        console.warn('Logo upload failed:', err.message)
        toast.error('Organization saved but logo upload failed.')
      }
    }
    setOrganizations(prev => [org, ...prev])
    return org
  }

  const updateOrganization = async (id, updates, logoFile = null, removeLogo = false) => {
    /* 1. Save text fields first */
    let res = await apiFetch(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
    let org = res.data

    /* 2. FIX: If the user explicitly removed the logo, clear it via a dedicated call */
    if (removeLogo && !logoFile) {
      try {
        const token = await getToken()
        const removeRes = await fetch(`${BASE_URL}/organizations/${id}/logo`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const removeJson = await removeRes.json()
        if (removeRes.ok) org = removeJson.data
        else console.warn('Logo removal failed:', removeJson)
      } catch (err) {
        console.warn('Logo removal error:', err.message)
        toast.error('Organization updated but logo removal failed.')
      }
    }

    /* 3. Upload new logo if one was selected */
    if (logoFile) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const form  = new FormData()
        form.append('logo', logoFile)
        const logoRes  = await fetch(`${BASE_URL}/organizations/${id}/logo`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        })
        const logoJson = await logoRes.json()
        if (logoRes.ok) {
          // FIX: append cache-busting timestamp so the browser doesn't show stale logo
          org = {
            ...logoJson.data,
            logo_url: logoJson.data.logo_url
              ? `${logoJson.data.logo_url}?t=${Date.now()}`
              : null,
          }
        } else {
          console.warn('Logo upload failed:', logoJson)
        }
      } catch (err) {
        console.warn('Logo upload error:', err.message)
        toast.error('Organization updated but logo upload failed.')
      }
    }

    setOrganizations(prev => prev.map(o => o.id === id ? org : o))
    return org
  }

  const deleteOrganization = async (id) => {
    await apiFetch(`/organizations/${id}`, { method: 'DELETE' })
    setOrganizations(prev => prev.filter(o => o.id !== id))
    toast.success('Organization deleted')
  }

  return (
    <OrgsContext.Provider value={{ organizations, loading, fetchOrganizations, createOrganization, updateOrganization, deleteOrganization }}>
      {children}
    </OrgsContext.Provider>
  )
}

export function useOrganizations() {
  const ctx = useContext(OrgsContext)
  if (!ctx) throw new Error('useOrganizations must be inside OrganizationsProvider')
  return ctx
}