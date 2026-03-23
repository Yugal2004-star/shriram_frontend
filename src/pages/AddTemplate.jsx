import { useState } from 'react'
import { useFormConfigs } from '../hooks/useFormConfigs'
import { useOrganizations } from '../hooks/useOrganizations'
import { Input, Btn, Card, Badge } from '../components/shared/index'
import toast from 'react-hot-toast'

const ALL_FIELDS = ['Name','ClassN','Section','DateofBirth','AdmissionNumber','RollNumber','ContactNumber','EmergencyContact','BloodGroup','UploadYourPhoto','Address','ModeOfTransportation','Designation','AadharCard','Department']
const ICONS = {Name:'👤',ClassN:'🏫',Section:'📌',DateofBirth:'🎂',AdmissionNumber:'🔢',RollNumber:'🎯',ContactNumber:'📱',EmergencyContact:'🚨',BloodGroup:'🩸',UploadYourPhoto:'📷',Address:'📍',ModeOfTransportation:'🚌',Designation:'💼',AadharCard:'🪪',Department:'🏢'}

const ORG_TYPES = [
  { value: 'School',   label: 'School',   icon: '🏫', placeholder: 'e.g. Netaji School, DPS Nagpur...'      },
  { value: 'College',  label: 'College',  icon: '🎓', placeholder: 'e.g. Prerna College, RCOEM...'          },
  { value: 'Industry', label: 'Industry', icon: '🏭', placeholder: 'e.g. Tata Steel Plant, MIDC Factory...' },
  { value: 'Company',  label: 'Company',  icon: '💼', placeholder: 'e.g. WideSoftech Pvt. Ltd...'           },
  { value: 'Hospital', label: 'Hospital', icon: '🏥', placeholder: 'e.g. Orange City Hospital, AIIMS...'    },
  { value: 'Custom',   label: 'Custom',   icon: '✏️', placeholder: 'Enter your organization name...'        },
]

export default function AddTemplate() {
  const { configs, createConfig }       = useFormConfigs()
  const { organizations }               = useOrganizations()

  const [orgType,     setOrgType]     = useState('')
  const [orgName,     setOrgName]     = useState('')   // final name used
  const [manualMode,  setManualMode]  = useState(false) // true = typing manually
  const [role,        setRole]        = useState('Student')
  const [fields,      setFields]      = useState(['Name','ClassN','Section','RollNumber'])
  const [expiry,      setExpiry]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [copied,      setCopied]      = useState(false)
  const [orgTypeErr,  setOrgTypeErr]  = useState('')
  const [orgNameErr,  setOrgNameErr]  = useState('')

  const BASE_URL   = window.location.origin
  const selectedOrg = ORG_TYPES.find(o => o.value === orgType)

  /* Organizations filtered by selected type */
  const filteredOrgs = orgType
    ? organizations.filter(o => o.type === orgType)
    : []

  const hasOrgsForType = filteredOrgs.length > 0

  const toggleField = f => setFields(prev =>
    prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
  )

  /* When type changes — reset name and mode */
  const handleTypeChange = (type) => {
    setOrgType(type)
    setOrgName('')
    setManualMode(false)
    if (orgTypeErr) setOrgTypeErr('')
    if (orgNameErr) setOrgNameErr('')
  }

  const handleGenerate = async () => {
    let valid = true
    if (!orgType)         { setOrgTypeErr('Please select an organization type'); valid = false }
    if (!orgName.trim())  { setOrgNameErr(`${orgType || 'Organization'} name is required`); valid = false }
    if (!valid) return
    if (fields.length === 0) { toast.error('Select at least one field'); return }
    setOrgTypeErr('')
    setOrgNameErr('')
    setLoading(true)
    try {
      const expiresAt = expiry ? new Date(expiry + 'T23:59:59.000Z').toISOString() : null
      const cfg = await createConfig({ schoolName: orgName.trim(), role, fields, expiresAt })
      const url = `${BASE_URL}/form/${cfg.url_id}`
      setResult({ url, ...cfg })
      toast.success('Link generated! 🎉')
    } catch (err) {
      toast.error(err.message || 'Failed to generate link')
    } finally { setLoading(false) }
  }

  const copy = () => {
    navigator.clipboard?.writeText(result.url).catch(() => {})
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const previewName = orgName || (selectedOrg ? `Your ${selectedOrg.label}` : 'Organization Name')

  /* ── Shared select style ── */
  const selectStyle = (hasErr) => ({
    width: '100%', padding: '11px 14px 11px 38px',
    borderRadius: 'var(--r)',
    border: `1.5px solid ${hasErr ? 'var(--red)' : orgType ? 'var(--blue)' : 'var(--border)'}`,
    fontSize: 14, color: 'var(--ink)', background: 'var(--paper)',
    outline: 'none', cursor: 'pointer', transition: 'all .18s',
    fontFamily: 'inherit', appearance: 'none',
  })

  return (
    <div className="anim-fade-up" style={{ paddingTop: 80, minHeight: '100vh' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', minHeight: 'calc(100vh - 64px)' }}>

        {/* ── Left: Form ── */}
        <div style={{ padding: '36px 44px', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>WideSoftech Pvt. Ltd.</div>
            <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--ink)', letterSpacing: -.5 }}>Generate Form Link</h1>
            <p style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 4 }}>Configure fields and create a shareable form link for your organization.</p>
          </div>

          {/* ── STEP 1: Role ── */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
              Step 1 — Role Type *
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {['Student','Staff','Employee'].map(r => (
                <div key={r} onClick={() => setRole(r)}
                  style={{ padding: '16px 12px', borderRadius: 'var(--r)', border: `2px solid ${role===r?'var(--blue)':'var(--border)'}`, background: role===r?'var(--blue-s)':'var(--paper)', cursor: 'pointer', textAlign: 'center', transition: 'all .18s' }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{r==='Student'?'🎓':r==='Staff'?'👨‍🏫':'💼'}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: role===r?'var(--blue)':'var(--ink)' }}>{r}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── STEP 2: Org Type ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
              Step 2 — Organization Type *
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none', zIndex: 1 }}>
                {selectedOrg ? selectedOrg.icon : '🏢'}
              </span>
              <select
                value={orgType}
                onChange={e => handleTypeChange(e.target.value)}
                style={selectStyle(!!orgTypeErr)}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(35,82,255,.1)' }}
                onBlur={e  => { e.target.style.borderColor = orgTypeErr ? 'var(--red)' : orgType ? 'var(--blue)' : 'var(--border)'; e.target.style.boxShadow = 'none' }}>
                <option value="" disabled>-- Select Organization Type --</option>
                {ORG_TYPES.map(o => (
                  <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--ink3)', pointerEvents: 'none' }}>▾</span>
            </div>
            {orgTypeErr && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{orgTypeErr}</p>}
          </div>

          {/* Quick type pills */}
          {!orgType && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {ORG_TYPES.map(o => (
                <div key={o.value} onClick={() => handleTypeChange(o.value)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='var(--blue-s)'; e.currentTarget.style.color='var(--blue)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--paper)'; e.currentTarget.style.color='var(--ink2)' }}>
                  <span>{o.icon}</span><span>{o.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 3: Org Name — DROPDOWN from organizations table ── */}
          {orgType && (
            <div className="anim-fade-up" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                Step 3 — Select {selectedOrg?.label} *
              </div>

              {/* Selected type chip */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--blue-s)', borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'var(--blue)', marginBottom: 10 }}>
                <span>{selectedOrg?.icon}</span>
                <span>{selectedOrg?.label} selected</span>
                <button onClick={() => { handleTypeChange(''); setManualMode(false) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', fontSize: 14, lineHeight: 1, padding: '0 0 0 2px' }}>✕</button>
              </div>

              {/* ── Case A: orgs exist for this type → show dropdown ── */}
              {hasOrgsForType && !manualMode ? (
                <div>
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none', zIndex: 1 }}>
                      {selectedOrg?.icon}
                    </span>
                    <select
                      value={orgName}
                      onChange={e => { setOrgName(e.target.value); if (orgNameErr) setOrgNameErr('') }}
                      style={{ ...selectStyle(!!orgNameErr), borderColor: orgNameErr ? 'var(--red)' : 'var(--border)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(35,82,255,.1)' }}
                      onBlur={e  => { e.target.style.borderColor = orgNameErr ? 'var(--red)' : 'var(--border)'; e.target.style.boxShadow = 'none' }}>
                      <option value="" disabled>-- Select {selectedOrg?.label} --</option>
                      {filteredOrgs.map(o => (
                        <option key={o.id} value={o.name}>
                          {o.name}{o.address ? ` — ${o.address}` : ''}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--ink3)', pointerEvents: 'none' }}>▾</span>
                  </div>

                  {orgNameErr && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{orgNameErr}</p>}

                  {/* Selected org details card */}
                  {orgName && (() => {
                    const sel = filteredOrgs.find(o => o.name === orgName)
                    return sel ? (
                      <div style={{ padding: '12px 14px', background: 'var(--paper2)', borderRadius: 'var(--r)', border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--blue-s)', border: '1.5px solid var(--blue-m)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {sel.logo_url
                            ? <img src={sel.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
                            : <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: 14, color: 'var(--blue)' }}>{sel.name.slice(0,2).toUpperCase()}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{sel.name}</div>
                          {sel.address && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>📍 {sel.address}</div>}
                          {sel.contact && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>📞 {sel.contact}</div>}
                          {sel.email   && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>✉ {sel.email}</div>}
                        </div>
                        <span style={{ fontSize: 18, color: 'var(--teal)' }}>✓</span>
                      </div>
                    ) : null
                  })()}

                  {/* Link to type manually */}
                  <button onClick={() => { setManualMode(true); setOrgName('') }}
                    style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink3)', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✏ Not listed? Type manually
                  </button>
                </div>
              ) : (
                /* ── Case B: no orgs for this type OR manual mode → text input ── */
                <div>
                  {/* Info banner if no orgs in DB for this type */}
                  {!hasOrgsForType && !manualMode && (
                    <div style={{ padding: '10px 14px', background: 'var(--amber-s)', borderRadius: 'var(--r)', border: '1px solid #fcd34d', fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>⚠️</span>
                      <span>No {selectedOrg?.label}s added yet. <a href="/organizations" style={{ color: '#92400e', fontWeight: 800 }}>Add one in Organizations →</a> or type below.</span>
                    </div>
                  )}

                  <Input
                    value={orgName}
                    onChange={e => { setOrgName(e.target.value); if (orgNameErr) setOrgNameErr('') }}
                    placeholder={selectedOrg?.placeholder}
                    icon={selectedOrg?.icon}
                    error={orgNameErr}
                    required
                  />

                  {/* Back to dropdown link — only if orgs exist */}
                  {hasOrgsForType && manualMode && (
                    <button onClick={() => { setManualMode(false); setOrgName('') }}
                      style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--blue)', fontWeight: 600, padding: 0 }}>
                      ← Back to dropdown
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Expiry ── */}
          <div style={{ marginBottom: 24 }}>
            <Input label="Link Expiry Date (optional)" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} icon="📅" />
          </div>

          {/* ── Fields ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: .5 }}>Select Fields *</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setFields([...ALL_FIELDS])} style={{ fontSize:11,fontWeight:700,color:'var(--blue)',background:'var(--blue-s)',border:'none',padding:'4px 10px',borderRadius:6,cursor:'pointer' }}>All</button>
                <button onClick={() => setFields([])} style={{ fontSize:11,fontWeight:700,color:'var(--ink2)',background:'var(--paper3)',border:'none',padding:'4px 10px',borderRadius:6,cursor:'pointer' }}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {ALL_FIELDS.map(f => {
                const on = fields.includes(f)
                return (
                  <div key={f} onClick={() => toggleField(f)}
                    style={{ padding:'10px 12px', borderRadius:'var(--r)', border:`1.5px solid ${on?'var(--blue)':'var(--border)'}`, background:on?'var(--blue-s)':'var(--paper)', cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'all .15s' }}>
                    <div style={{ width:16,height:16,borderRadius:4,border:`2px solid ${on?'var(--blue)':'var(--border2)'}`,background:on?'var(--blue)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      {on && <span style={{ color:'#fff',fontSize:10,fontWeight:900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:11 }}>{ICONS[f]}</span>
                    <span style={{ fontSize:12,fontWeight:on?700:500,color:on?'var(--blue)':'var(--ink2)' }}>{f}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop:8, fontSize:12, color:'var(--ink3)' }}>{fields.length} of {ALL_FIELDS.length} fields selected</div>
          </div>

          <Btn size="lg" onClick={handleGenerate} disabled={loading}>
            {loading ? '⏳ Generating...' : '🔗 Generate Link'}
          </Btn>

          {/* ── Result ── */}
          {result && (
            <div className="anim-fade-up" style={{ marginTop:20, background:'var(--paper2)', borderRadius:'var(--rl)', border:'1.5px solid var(--blue-m)', padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--ink2)', textTransform:'uppercase', letterSpacing:.4 }}>Generated Link</span>
                  <div style={{ fontSize:11, color:'var(--ink3)', marginTop:3 }}>
                    {selectedOrg?.icon} {orgName} · {role}
                  </div>
                </div>
                <Badge type="teal" dot>Active</Badge>
              </div>
              <div style={{ background:'var(--paper)', borderRadius:'var(--r)', padding:'12px 14px', border:'1px solid var(--border)', marginBottom:12, fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--ink2)', wordBreak:'break-all', lineHeight:1.6 }}>
                {result.url}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <Btn size="sm" onClick={copy}>{copied ? '✓ Copied!' : '📋 Copy'}</Btn>
                <Btn size="sm" variant="teal" onClick={() => toast.success('WhatsApp share opened!')}>💬 WhatsApp</Btn>
                <Btn size="sm" variant="ghost" onClick={() => toast.success('Email share opened!')}>✉ Email</Btn>
                <Btn size="sm" variant="soft" onClick={() => toast.success('QR Code generated!')}>📱 QR Code</Btn>
              </div>
            </div>
          )}

          {/* ── History ── */}
          <div style={{ marginTop:32 }}>
            <h3 style={{ fontFamily:'Outfit,sans-serif', fontSize:16, fontWeight:800, color:'var(--ink)', marginBottom:12 }}>Recent Links ({configs.length})</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {configs.slice(0, 6).map(l => (
                <div key={l.id} style={{ padding:'12px 14px', borderRadius:'var(--r)', border:'1px solid var(--border)', background:'var(--paper)', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:'var(--blue-s)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🔗</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{l.school_name}</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:3 }}>
                      <Badge type={l.role==='Student'?'blue':l.role==='Staff'?'teal':'amber'}>{l.role}</Badge>
                      <span style={{ fontSize:11, color:'var(--ink3)' }}>{l.fields?.length} fields</span>
                      <span style={{ fontSize:11, color:'var(--ink3)' }}>· {l.is_active ? 'Active' : 'Paused'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(`${BASE_URL}/form/${l.url_id}`).catch(() => {}); toast.success('Copied!') }}
                    style={{ padding:'5px 10px', borderRadius:6, border:'1.5px solid var(--border)', background:'transparent', cursor:'pointer', fontSize:11, fontWeight:700, color:'var(--ink2)' }}>
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        <div style={{ padding:24, background:'var(--paper2)', position:'sticky', top:64, height:'calc(100vh - 64px)', overflowY:'auto' }}>
          <h3 style={{ fontFamily:'Outfit,sans-serif', fontSize:15, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>Live Form Preview</h3>
          <p style={{ fontSize:12, color:'var(--ink3)', marginBottom:16 }}>What the user sees when they open the link.</p>

          <div style={{ background:'var(--paper)', borderRadius:'var(--rl)', border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
            <div style={{ background:'var(--blue)', padding:'16px 18px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:9, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:13, color:'#fff', overflow:'hidden' }}>
                {(() => {
                  const sel = filteredOrgs.find(o => o.name === orgName)
                  return sel?.logo_url
                    ? <img src={sel.logo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                    : previewName ? previewName.slice(0,2).toUpperCase() : selectedOrg ? selectedOrg.icon : '🏢'
                })()}
              </div>
              <div>
                <div style={{ fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:700, color:'#fff' }}>{previewName}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.75)', marginTop:1 }}>
                  {orgType && <span style={{ opacity:.8 }}>{selectedOrg?.icon} {orgType} · </span>}
                  {role} ID Card Form
                </div>
              </div>
            </div>
            <div style={{ padding:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#92400e', background:'var(--amber-s)', borderRadius:6, padding:'8px 12px', marginBottom:14 }}>⚠ Please fill all fields correctly</div>
              {fields.length === 0
                ? <div style={{ textAlign:'center', color:'var(--ink3)', fontSize:13, padding:'20px 0' }}>Select fields to see preview</div>
                : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {fields.slice(0,5).map(f => (
                      <div key={f}>
                        <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.4, marginBottom:4 }}>{f.replace(/([A-Z])/g,' $1').trim()} *</div>
                        <div style={{ background:'var(--paper2)', borderRadius:6, padding:'8px 10px', fontSize:12, color:'var(--ink3)', border:'1px solid var(--border)' }}>Enter {f.replace(/([A-Z])/g,' $1').trim().toLowerCase()}...</div>
                      </div>
                    ))}
                    {fields.length > 5 && <div style={{ fontSize:11, color:'var(--ink3)', textAlign:'center' }}>+{fields.length-5} more fields...</div>}
                  </div>
              }
            </div>
          </div>

          {/* Selected org info */}
          {orgName && (
            <div style={{ marginTop:16, padding:'14px 16px', background:'var(--paper)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.4, marginBottom:8 }}>Selected Organization</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:24 }}>{selectedOrg?.icon}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{orgName}</div>
                  <div style={{ fontSize:11, color:'var(--ink3)', marginTop:2 }}>{selectedOrg?.label}</div>
                </div>
              </div>
            </div>
          )}

          {/* QR mockup */}
          {result && (
            <div style={{ marginTop:16, background:'var(--paper)', borderRadius:'var(--r)', border:'1px solid var(--border)', padding:16, textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink2)', marginBottom:10 }}>📱 QR Code</div>
              <div style={{ width:80, height:80, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                {Array.from({length:49}, (_,i) => (
                  <div key={i} style={{ borderRadius:1, background:(Math.sin(i*3.7+1)*Math.cos(i*2.1))>0?'var(--ink)':'transparent', aspectRatio:1 }} />
                ))}
              </div>
              <div style={{ fontSize:10, color:'var(--ink3)', marginTop:8 }}>Scan to open form</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}