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
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  const res  = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const json = await res.json()
  if (!res.ok) { const err = new Error(json.error || 'Request failed'); err.status = res.status; throw err }
  return json
}

const CardTemplatesContext = createContext(null)

export function CardTemplatesProvider({ children }) {
  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)
  const fetched = useRef(false)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/card-templates')
      setTemplates(res.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    fetchTemplates()
  }, [fetchTemplates])

  const saveTemplate = async (templateData) => {
    const res = await apiFetch('/card-templates', { method: 'POST', body: JSON.stringify(templateData) })
    setTemplates(prev => [res.data, ...prev])
    toast.success('Template saved!')
    return res.data
  }

  const updateTemplate = async (id, templateData) => {
    const res = await apiFetch(`/card-templates/${id}`, { method: 'PATCH', body: JSON.stringify(templateData) })
    setTemplates(prev => prev.map(t => t.id === id ? res.data : t))
    toast.success('Template updated!')
    return res.data
  }

  const deleteTemplate = async (id) => {
    await apiFetch(`/card-templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Template deleted')
  }

  return (
    <CardTemplatesContext.Provider value={{ templates, loading, fetchTemplates, saveTemplate, updateTemplate, deleteTemplate }}>
      {children}
    </CardTemplatesContext.Provider>
  )
}

export function useCardTemplates() {
  const ctx = useContext(CardTemplatesContext)
  if (!ctx) throw new Error('useCardTemplates must be inside CardTemplatesProvider')
  return ctx
}