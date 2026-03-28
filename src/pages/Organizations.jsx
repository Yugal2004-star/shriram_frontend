import { useState, useRef } from 'react'
import { useOrganizations } from '../hooks/useOrganizations'
import { Spinner, ConfirmDialog } from '../components/shared/index'
import toast from 'react-hot-toast'

/* ── Constants ────────────────────────────────────────────────── */
const ORG_TYPES  = ['School','College','Industry','Company','Hospital','Custom']
const ORG_ICONS  = { School:'🏫', College:'🎓', Industry:'🏭', Company:'💼', Hospital:'🏥', Custom:'✏️' }
const EMPTY_FORM = { name:'', type:'School', address:'', contact:'', email:'', website:'' }
const fmtDate    = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

function dInput(hasErr=false) {
  return {
    width:'100%', padding:'11px 14px', borderRadius:8,
    border:`1.5px solid ${hasErr ? 'var(--red)' : 'var(--border)'}`,
    fontSize:14, color:'var(--ink)', background:'var(--paper2)',
    outline:'none', fontFamily:'inherit', transition:'border-color .18s',
    boxSizing:'border-box',
  }
}
function onFocusDark(e)       { e.target.style.borderColor='var(--blue)'; e.target.style.boxShadow='0 0 0 3px rgba(35,82,255,.1)' }
function onBlurDark(e,hasErr) { e.target.style.borderColor=hasErr?'var(--red)':'var(--border)'; e.target.style.boxShadow='none' }

function DLabel({ children, required }) {
  return (
    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink)', marginBottom:7 }}>
      {children}{required && <span style={{ color:'var(--red)', marginLeft:3 }}>*</span>}
    </label>
  )
}

function DField({ label, value, onChange, placeholder, type='text', required=false, error='' }) {
  return (
    <div>
      <DLabel required={required}>{label}</DLabel>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={dInput(!!error)} onFocus={onFocusDark} onBlur={e => onBlurDark(e, !!error)} />
      {error && <p style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{error}</p>}
    </div>
  )
}

function Row({ icon, text }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
      <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
      <span style={{ fontSize:12, color:'var(--ink2)', lineHeight:1.5, wordBreak:'break-word' }}>{text}</span>
    </div>
  )
}

function OrgCard({ org, onEdit, onDelete }) {
  return (
    <div style={{ background:'var(--paper)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', transition:'all .2s' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border2)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
      <div style={{ height:4, background:'linear-gradient(90deg,var(--blue),#7c5cfc)' }}/>
      <div style={{ padding:18 }}>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ width:52, height:52, borderRadius:12, overflow:'hidden', flexShrink:0, background:'var(--paper2)', border:'1.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {org.logo_url
              ? <img src={org.logo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
              : <span style={{ fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:18, color:'var(--blue)' }}>{org.name.slice(0,2).toUpperCase()}</span>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:15, fontWeight:800, color:'var(--ink)', letterSpacing:-.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{org.name}</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:6, padding:'3px 10px', borderRadius:20, background:'var(--blue-s)', border:'1px solid rgba(35,82,255,.2)' }}>
              <span style={{ fontSize:12 }}>{ORG_ICONS[org.type]}</span>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--blue)' }}>{org.type}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
          {org.address && <Row icon="📍" text={org.address}/>}
          {org.contact && <Row icon="📞" text={org.contact}/>}
          {org.email   && <Row icon="✉"  text={org.email}/>}
          {org.website && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:13, flexShrink:0 }}>🌐</span>
              <a href={org.website} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, color:'var(--blue)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200, textDecoration:'none' }}>
                {org.website}
              </a>
            </div>
          )}
        </div>
        <div style={{ paddingTop:12, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:11, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace' }}>Added {fmtDate(org.created_at)}</span>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>onEdit(org)} title="Edit"
              style={{ width:30, height:30, borderRadius:7, border:'1px solid var(--border)', background:'var(--blue-s)', color:'var(--blue)', cursor:'pointer', fontSize:14 }}>✏</button>
            <button onClick={()=>onDelete(org.id)} title="Delete"
              style={{ width:30, height:30, borderRadius:7, border:'1px solid var(--border)', background:'var(--red-s)', color:'var(--red)', cursor:'pointer', fontSize:14 }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Organizations() {
  const { organizations, loading, createOrganization, updateOrganization, deleteOrganization } = useOrganizations()

  const [view,        setView]        = useState('list')
  const [editOrg,     setEditOrg]     = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [errors,      setErrors]      = useState({})
  const [logoFile,    setLogoFile]    = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [deleteId,    setDeleteId]    = useState(null)
  const [filterType,  setFilterType]  = useState('All')
  const logoRef = useRef()

  const set = (k,v) => { setForm(p=>({...p,[k]:v})); if(errors[k]) setErrors(p=>({...p,[k]:''})) }

  const handleLogo = e => {
    const file = e.target.files?.[0]; if(!file) return
    if(file.size > 2*1024*1024) { toast.error('Logo too large. Max 2MB.'); return }
    setLogoFile(file)
    const r = new FileReader(); r.onload = ev => setLogoPreview(ev.target.result); r.readAsDataURL(file)
    e.target.value = ''
  }

  const validate = () => {
    const e = {}
    if(!form.name.trim())    e.name    = 'Organization name is required'
    if(!form.type)           e.type    = 'Organization type is required'
    if(!form.address.trim()) e.address = 'Full address is required'
    if(form.contact && !/^\+?[\d\s\-]{7,15}$/.test(form.contact)) e.contact = 'Enter a valid contact number'
    if(form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    setErrors(e); return Object.keys(e).length === 0
  }

  const resetForm = () => { setForm(EMPTY_FORM); setErrors({}); setLogoFile(null); setLogoPreview(null); setEditOrg(null); setView('list') }

  const handleSave = async () => {
    if(!validate()) return
    setSaving(true)
    try {
      await createOrganization(form, logoFile)
      toast.success(`${form.name} added successfully! 🎉`)
      resetForm()
    } catch(err) { toast.error(err.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    if(!form.name.trim()) { setErrors({name:'Name is required'}); return }
    setSaving(true)
    try {
      await updateOrganization(editOrg.id, form, logoFile)   // ← pass logoFile
      toast.success('Organization updated!')
      resetForm()
    } catch(err) { toast.error(err.message || 'Failed to update') }
    finally { setSaving(false) }
  }

  const openEdit = org => {
    setEditOrg(org)
    setForm({ name:org.name||'', type:org.type||'School', address:org.address||'', contact:org.contact||'', email:org.email||'', website:org.website||'' })
    setErrors({}); setLogoFile(null); setLogoPreview(org.logo_url||null)
    setView('edit')
  }

  const filtered = filterType==='All' ? organizations : organizations.filter(o=>o.type===filterType)

  /* ── ADD / EDIT FORM ── */
  if(view==='add' || view==='edit') {
    const isEdit = view==='edit'
    return (
      <div style={{ minHeight:'100vh', background:'var(--paper2)', paddingTop:64, paddingBottom:60 }}>
        <style>{`
          .org-form-wrap { max-width: 860px; margin: 0 auto; padding: 40px 32px 0; }
          .org-form-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .org-form-title { font-size: 32px; }
          @media (max-width: 700px) {
            .org-form-wrap { padding: 20px 16px 0 !important; }
            .org-form-grid2 { grid-template-columns: 1fr !important; gap: 14px !important; margin-bottom: 14px !important; }
            .org-form-title { font-size: 24px !important; }
          }
        `}</style>

        <div className="org-form-wrap">
          <button onClick={resetForm}
            style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600, color:'var(--ink2)', background:'none', border:'none', cursor:'pointer', marginBottom:24, padding:0 }}>
            ← Back to Organizations
          </button>
          <h1 className="org-form-title" style={{ fontFamily:'Outfit,sans-serif', fontWeight:900, color:'var(--ink)', letterSpacing:-.8, marginBottom:6 }}>
            {isEdit ? 'Edit Organization' : 'Add New Organization'}
          </h1>
          <p style={{ fontSize:14, color:'var(--ink2)', marginBottom:28 }}>
            Set up a new school, college, company, or institution to manage ID cards.
          </p>

          <div style={{ background:'var(--paper)', border:'1px solid var(--border)', borderRadius:16, padding:24, marginBottom:20 }}>
            {/* Row 1: Name + Type */}
            <div className="org-form-grid2">
              <DField label="Organization Name" value={form.name} onChange={e=>set('name',e.target.value)}
                placeholder="e.g. Springfield High School" required error={errors.name}/>
              <div>
                <DLabel required>Organization Type</DLabel>
                <select value={form.type} onChange={e=>set('type',e.target.value)}
                  style={{ ...dInput(!!errors.type), cursor:'pointer' }}
                  onFocus={onFocusDark} onBlur={e=>onBlurDark(e,!!errors.type)}>
                  {ORG_TYPES.map(t=><option key={t} value={t}>{ORG_ICONS[t]} {t}</option>)}
                </select>
                {errors.type && <p style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{errors.type}</p>}
              </div>
            </div>

            {/* Row 2: Address + Contact */}
            <div className="org-form-grid2">
              <DField label="Full Address" value={form.address} onChange={e=>set('address',e.target.value)}
                placeholder="123 Main St, City, State" required error={errors.address}/>
              <DField label="Contact Number" value={form.contact} onChange={e=>set('contact',e.target.value)}
                placeholder="+91-9999999999" error={errors.contact}/>
            </div>

            {/* Row 3: Email + Website */}
            <div className="org-form-grid2">
              <DField label="Email Address" value={form.email} onChange={e=>set('email',e.target.value)}
                placeholder="contact@org.com" type="email" error={errors.email}/>
              <DField label="Website (Optional)" value={form.website} onChange={e=>set('website',e.target.value)}
                placeholder="https://www.org.com" error={errors.website}/>
            </div>

            {/* Logo upload */}
            <div style={{ marginBottom:20 }}>
              <DLabel>Organization Logo</DLabel>
              {!logoPreview ? (
                <div onClick={()=>logoRef.current?.click()}
                  style={{ border:'2px dashed var(--border2)', borderRadius:12, padding:'32px 20px', textAlign:'center', cursor:'pointer', transition:'all .2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue)';e.currentTarget.style.background='var(--blue-s)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.background='transparent'}}>
                  <div style={{ fontSize:36, marginBottom:10, opacity:.7 }}>⬆</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:4 }}>Click to upload logo</div>
                  <div style={{ fontSize:12, color:'var(--ink2)' }}>PNG, JPG, WebP up to 2MB</div>
                  <input type="file" ref={logoRef} accept="image/jpeg,image/png,image/webp" onChange={handleLogo} style={{ display:'none' }}/>
                </div>
              ) : (
                <div style={{ display:'flex', gap:14, alignItems:'center', padding:'14px 16px', background:'var(--paper2)', borderRadius:12, border:'1px solid var(--border)', flexWrap:'wrap' }}>
                  <img src={logoPreview} style={{ width:56, height:56, objectFit:'cover', borderRadius:10, border:'2px solid var(--blue)', flexShrink:0 }} alt=""/>
                  <div style={{ flex:1, minWidth:120 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>Logo uploaded ✓</div>
                    <div style={{ fontSize:12, color:'var(--ink2)', marginTop:3 }}>Will appear on the ID card header</div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button onClick={()=>logoRef.current?.click()} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--paper2)', color:'var(--ink2)', cursor:'pointer', fontSize:12, fontWeight:600 }}>🔄 Change</button>
                    <button onClick={()=>{setLogoFile(null);setLogoPreview(null)}} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--red-s)', color:'var(--red)', cursor:'pointer', fontSize:12, fontWeight:600 }}>🗑 Remove</button>
                  </div>
                  <input type="file" ref={logoRef} accept="image/jpeg,image/png,image/webp" onChange={handleLogo} style={{ display:'none' }}/>
                </div>
              )}
            </div>

            <div style={{ padding:'12px 14px', background:'var(--blue-s)', borderRadius:10, border:'1px solid rgba(35,82,255,.2)', fontSize:13, color:'var(--blue)', fontWeight:600, display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ fontSize:16, flexShrink:0 }}>💡</span>
              <div>
                <div style={{ marginBottom:3 }}>Default ID Card Format</div>
                <div style={{ fontSize:12, fontWeight:400, color:'var(--ink2)' }}>The organization name and logo will appear on all generated ID cards for this institution.</div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:12 }}>
            <button onClick={resetForm}
              style={{ flex:1, padding:'13px', borderRadius:10, border:'1.5px solid var(--border)', background:'transparent', color:'var(--ink2)', fontSize:14, fontWeight:700, cursor:'pointer', transition:'all .18s', fontFamily:'inherit' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.background='var(--paper2)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='transparent'}}>
              Cancel
            </button>
            <button onClick={isEdit ? handleUpdate : handleSave} disabled={saving}
              style={{ flex:2, padding:'13px', borderRadius:10, border:'none', background:saving?'var(--border)':'var(--blue)', color:'#fff', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', transition:'all .18s', fontFamily:'inherit', opacity:saving?.7:1 }}
              onMouseEnter={e=>{if(!saving)e.currentTarget.style.background='var(--blue-d)'}}
              onMouseLeave={e=>{if(!saving)e.currentTarget.style.background='var(--blue)'}}>
              {saving ? '⏳ Saving...' : isEdit ? '✓ Update Organization' : '✓ Save Organization'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── LIST PAGE ── */
  if(loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh', background:'var(--paper2)' }}>
      <Spinner size={36}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--paper2)', paddingTop:64 }}>
      <style>{`
        .org-list-wrap { max-width: 1200px; margin: 0 auto; padding: 40px 32px; }
        .org-stats-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; margin-bottom: 28px; }
        .org-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }

        @media (max-width: 900px) {
          .org-stats-grid { grid-template-columns: repeat(3,1fr) !important; }
        }
        @media (max-width: 600px) {
          .org-list-wrap { padding: 20px 14px !important; }
          .org-stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; }
          .org-header { flex-direction: column !important; gap: 14px !important; }
          .org-header button { width: 100% !important; justify-content: center !important; }
        }
      `}</style>

      <div className="org-list-wrap">
        {/* Header */}
        <div className="org-header">
          <div>
            <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:28, fontWeight:900, color:'var(--ink)', letterSpacing:-.5 }}>Organizations</h1>
            <p style={{ fontSize:14, color:'var(--ink2)', marginTop:4 }}>{organizations.length} organizations registered</p>
          </div>
          <button onClick={()=>{setForm(EMPTY_FORM);setErrors({});setLogoFile(null);setLogoPreview(null);setView('add')}}
            style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'var(--blue)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--blue-d)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--blue)'}>
            + Add Organization
          </button>
        </div>

        {/* Stats cards */}
        <div className="org-stats-grid">
          {ORG_TYPES.map(t => {
            const count = organizations.filter(o=>o.type===t).length
            const active = filterType===t
            return (
              <div key={t} onClick={()=>setFilterType(active?'All':t)}
                style={{ padding:'14px 10px', borderRadius:12, border:`1.5px solid ${active?'var(--blue)':'var(--border)'}`, background:active?'var(--blue-s)':'var(--paper)', cursor:'pointer', textAlign:'center', transition:'all .15s' }}>
                <div style={{ fontSize:20, marginBottom:5 }}>{ORG_ICONS[t]}</div>
                <div style={{ fontFamily:'Outfit,sans-serif', fontSize:20, fontWeight:900, color:active?'var(--blue)':'var(--ink)' }}>{count}</div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--ink2)', marginTop:2 }}>{t}</div>
              </div>
            )
          })}
        </div>

        {/* Filter pills */}
        <div style={{ display:'flex', gap:8, marginBottom:22, flexWrap:'wrap' }}>
          {['All',...ORG_TYPES].map(t => (
            <div key={t} onClick={()=>setFilterType(t)}
              style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filterType===t?'var(--blue)':'var(--border)'}`, background:filterType===t?'var(--blue-s)':'var(--paper)', cursor:'pointer', fontSize:12, fontWeight:700, color:filterType===t?'var(--blue)':'var(--ink2)', display:'flex', alignItems:'center', gap:5, transition:'all .15s' }}>
              {t!=='All'&&<span>{ORG_ICONS[t]}</span>}
              <span>{t==='All'?'All Organizations':t}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        {filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'56px 24px' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🏢</div>
            <h3 style={{ fontFamily:'Outfit,sans-serif', fontSize:20, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>
              {filterType==='All' ? 'No organizations yet' : `No ${filterType} added yet`}
            </h3>
            <p style={{ fontSize:14, color:'var(--ink2)', marginBottom:24 }}>Add your first organization to get started.</p>
            <button onClick={()=>setView('add')}
              style={{ padding:'11px 24px', borderRadius:10, border:'none', background:'var(--blue)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              + Add Organization
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
            {filtered.map(org => (
              <OrgCard key={org.id} org={org} onEdit={openEdit} onDelete={setDeleteId}/>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId} onClose={()=>setDeleteId(null)}
        onConfirm={()=>deleteOrganization(deleteId)}
        title="Delete Organization"
        message="This will permanently delete this organization and its logo. This cannot be undone."
        confirmLabel="Delete" danger/>
    </div>
  )
}