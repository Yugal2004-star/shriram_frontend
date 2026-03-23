import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { submissionsApi } from '../lib/api'
import toast from 'react-hot-toast'

/* ── camelCase → snake_case mapping ─────────────────────────── */
function mapToBackend(formData) {
  return {
    form_config_id:    formData.formConfigId    || null,
    school_name:       formData.schoolName      || formData.school_name || '',
    role:              formData.role            || 'Student',
    name:              formData.Name            || null,
    class:             formData.ClassN          || formData.class       || null,
    section:           formData.Section         || formData.section     || null,
    roll_number:       formData.RollNumber      || formData.roll_number || null,
    admission_number:  formData.AdmissionNumber || formData.admission_number || null,
    date_of_birth:     formData.DateofBirth     || formData.date_of_birth    || null,
    contact_number:    formData.ContactNumber   || formData.contact_number   || null,
    emergency_contact: formData.EmergencyContact|| formData.emergency_contact|| null,
    blood_group:       formData.BloodGroup      || formData.blood_group      || null,
    address:           formData.Address         || formData.address          || null,
    mode_of_transport: formData.ModeOfTransportation || formData.mode_of_transport || null,
    designation:       formData.Designation     || formData.designation      || null,
    department:        formData.Department      || formData.department       || null,
    aadhar_card:       formData.AadharCard      || formData.aadhar_card      || null,
  }
}

/* ── Context — single instance shared across all components ─── */
const SubmissionsContext = createContext(null)

export function SubmissionsProvider({ children }) {
  const [submissions, setSubmissions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const hasFetched = useRef(false)  // prevent double-fetch in StrictMode

  /* Fetch ONCE on app mount ─────────────────────────────────── */
  const fetchSubmissions = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const res = await submissionsApi.list(params)
      setSubmissions(res.data || [])
    } catch (err) {
      toast.error('Failed to load submissions')
      console.error(err)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchSubmissions()

    /* Realtime — update state without re-fetching */
    const channel = supabase
      .channel('submissions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, payload => {
        if (payload.eventType === 'INSERT') {
          setSubmissions(prev => [payload.new, ...prev])
          toast.success(`New submission from ${payload.new.name || 'someone'}!`)
        }
        if (payload.eventType === 'UPDATE') {
          setSubmissions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
        }
        if (payload.eventType === 'DELETE') {
          setSubmissions(prev => prev.filter(s => s.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchSubmissions])

  /* CRUD ──────────────────────────────────────────────────────── */
  const createSubmission = async (formData, photoDataUrl) => {
    const payload = mapToBackend(formData)
    const res = await submissionsApi.create(payload)
    const sub = res.data
    if (photoDataUrl) {
      try {
        const photoRes = await submissionsApi.uploadPhoto(sub.id, photoDataUrl)
        sub.photo_url  = photoRes.photo_url
      } catch (err) {
        console.warn('Photo upload failed:', err.message)
        toast.error('Details saved but photo upload failed.')
      }
    }
    return sub
  }

  const updateStatus = async (id, status) => {
    try {
      await submissionsApi.updateStatus(id, status)
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
      toast.success(`Submission ${status}`)
      return true
    } catch (err) { toast.error(err.message || 'Update failed'); return false }
  }

  const bulkUpdateStatus = async (ids, status) => {
    try {
      const res = await submissionsApi.bulkUpdateStatus(ids, status)
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status } : s))
      toast.success(`${res.updated} submissions ${status}`)
      return true
    } catch (err) { toast.error(err.message || 'Bulk update failed'); return false }
  }

  const deleteSubmission = async (id) => {
    try {
      await submissionsApi.delete(id)
      setSubmissions(prev => prev.filter(s => s.id !== id))
      toast.success('Submission deleted')
      return true
    } catch (err) { toast.error(err.message || 'Delete failed'); return false }
  }

  /* Debounced duplicate check ─────────────────────────────────── */
  const dupTimer = useRef(null)
  /* checkDuplicate — checks name, rollNumber, AND contactNumber
     Uses already-loaded submissions state first (no extra API call).
     Falls back to API search for name (contact/roll checked locally). */
  const checkDuplicate = useCallback((schoolName, name, rollNumber, callback, contactNumber) => {
    if (dupTimer.current) clearTimeout(dupTimer.current)
    if (!schoolName || (!name && !rollNumber && !contactNumber)) { callback(null); return }

    dupTimer.current = setTimeout(async () => {
      try {
        // Check contact number locally against already-loaded submissions
        if (contactNumber) {
          const contactMatch = submissions.find(s =>
            s.contact_number === contactNumber
          ) || null
          callback(contactMatch)
          return
        }
        // Check name via API
        const res = await submissionsApi.list({ school: schoolName, search: name, limit: 5 })
        const match = res.data?.find(s =>
          (name       && s.name?.toLowerCase() === name.toLowerCase()) ||
          (rollNumber && s.roll_number === rollNumber)
        ) || null
        callback(match)
      } catch { callback(null) }
    }, 400)
  }, [submissions])

  return (
    <SubmissionsContext.Provider value={{ submissions, loading, fetchSubmissions, createSubmission, updateStatus, bulkUpdateStatus, deleteSubmission, checkDuplicate }}>
      {children}
    </SubmissionsContext.Provider>
  )
}

/* Single hook — reads from shared context */
export function useSubmissions() {
  const ctx = useContext(SubmissionsContext)
  if (!ctx) throw new Error('useSubmissions must be inside SubmissionsProvider')
  return ctx
}