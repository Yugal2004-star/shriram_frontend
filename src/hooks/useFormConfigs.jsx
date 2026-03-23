import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { formConfigsApi } from '../lib/api'
import toast from 'react-hot-toast'

/* ── Context — single instance shared across all components ─── */
const FormConfigsContext = createContext(null)

export function FormConfigsProvider({ children }) {
  const [configs,  setConfigs]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const hasFetched = useRef(false)

  /* Fetch ONCE on app mount ─────────────────────────────────── */
  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await formConfigsApi.list()
      setConfigs(res.data || [])
    } catch (err) {
      console.error('fetchConfigs error:', err)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchConfigs()
  }, [fetchConfigs])

  /* CRUD ──────────────────────────────────────────────────────── */
  const createConfig = async ({ schoolName, role, fields, expiresAt }) => {
    const res = await formConfigsApi.create({
      school_name: schoolName, role, fields,
      expires_at:  expiresAt || null,
    })
    setConfigs(prev => [res.data, ...prev])
    return { ...res.data, url: res.url }
  }

  const toggleActive = async (id, isActive) => {
    try {
      await formConfigsApi.update(id, { is_active: isActive })
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, is_active: isActive } : c))
      toast.success(isActive ? 'Link activated' : 'Link deactivated')
    } catch (err) { toast.error(err.message) }
  }

  const fetchConfigByUrlId = async (urlId) => {
    try {
      const res = await formConfigsApi.getByUrlId(urlId)
      return res.data
    } catch { return null }
  }

  const deleteConfig = async (id) => {
    try {
      await formConfigsApi.delete(id)
      setConfigs(prev => prev.filter(c => c.id !== id))
      toast.success('Link deleted')
    } catch (err) { toast.error(err.message) }
  }

  return (
    <FormConfigsContext.Provider value={{ configs, loading, fetchConfigs, createConfig, toggleActive, fetchConfigByUrlId, deleteConfig }}>
      {children}
    </FormConfigsContext.Provider>
  )
}

/* Single hook — reads from shared context */
export function useFormConfigs() {
  const ctx = useContext(FormConfigsContext)
  if (!ctx) throw new Error('useFormConfigs must be inside FormConfigsProvider')
  return ctx
}