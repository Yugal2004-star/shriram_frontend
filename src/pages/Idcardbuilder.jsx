import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubmissions } from '../hooks/useSubmissions'
import { useOrganizations } from '../hooks/useOrganizations'
import { useCardTemplates } from '../hooks/useCardtemplates'
import { Btn, Spinner } from '../components/shared/index'
import toast from 'react-hot-toast'

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const CARD_W = 340   // card canvas px
const CARD_H = 480   // card canvas px

const ALL_FIELDS = [
  { key:'name',             label:'Full Name',         icon:'👤' },
  { key:'class',            label:'Class',             icon:'🏫' },
  { key:'section',          label:'Section',           icon:'📌' },
  { key:'roll_number',      label:'Roll No.',          icon:'🎯' },
  { key:'admission_number', label:'Admission No.',     icon:'🔢' },
  { key:'date_of_birth',    label:'Date of Birth',     icon:'🎂' },
  { key:'blood_group',      label:'Blood Group',       icon:'🩸' },
  { key:'contact_number',   label:'Contact',           icon:'📱' },
  { key:'emergency_contact',label:'Emergency Contact', icon:'🚨' },
  { key:'address',          label:'Address',           icon:'📍' },
  { key:'designation',      label:'Designation',       icon:'💼' },
  { key:'department',       label:'Department',        icon:'🏢' },
  { key:'mode_of_transport',label:'Transport',         icon:'🚌' },
]

const DEFAULT_POSITIONS = {
  name:              { x: 120, y: 115 },
  class:             { x: 120, y: 145 },
  section:           { x: 200, y: 145 },
  roll_number:       { x: 120, y: 165 },
  admission_number:  { x: 120, y: 185 },
  date_of_birth:     { x: 20,  y: 225 },
  blood_group:       { x: 180, y: 225 },
  contact_number:    { x: 20,  y: 260 },
  emergency_contact: { x: 20,  y: 295 },
  address:           { x: 20,  y: 330 },
  designation:       { x: 120, y: 135 },
  department:        { x: 120, y: 155 },
  mode_of_transport: { x: 20,  y: 365 },
}

const DEFAULT_CONFIG = {
  c1: '#2352ff', c2: '#1538d4', accent: '#e8ecff',
  photoShape: 'rounded',
  showBarcode: true,
  headerStyle: 'gradient',
  logoPosition: 'left',
  borderStyle: 'thin',
  fontSize: 'md',
  visibleFields: ['name','class','roll_number','blood_group','contact_number'],
  fieldPositions: {},   // { key: {x,y} }
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display:'flex', background:'var(--paper3)', borderRadius:8, padding:3, gap:2 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{ flex:1, padding:'5px 4px', borderRadius:6, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s', background:value===o.value?'var(--paper)':'transparent', color:value===o.value?'var(--blue)':'var(--ink3)', fontFamily:'inherit' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:12, color:'var(--ink2)' }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width:28, height:28, borderRadius:6, border:'1.5px solid var(--border)', padding:2, cursor:'pointer' }}/>
        <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--ink3)' }}>{value}</span>
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:12, color:'var(--ink2)' }}>{label}</span>
      <div onClick={() => onChange(!value)}
        style={{ width:36, height:20, borderRadius:10, background:value?'var(--blue)':'var(--border2)', transition:'background .2s', cursor:'pointer', position:'relative', flexShrink:0 }}>
        <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:value?18:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.25)' }}/>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.7, marginBottom:8, paddingBottom:5, borderBottom:'2px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   INTERACTIVE CARD CANVAS
   — Fields are rendered directly on the card
   — Each field can be dragged to any position
   — Clicking a field in the left panel adds/removes it
═══════════════════════════════════════════════════════════════ */
function CardCanvas({ config, sub, orgName, onPositionChange, selectedField, onSelectField }) {
  const canvasRef = useRef(null)
  const dragRef   = useRef(null)
  const [dragging, setDragging] = useState(null)

  const headerBg = config.headerStyle === 'gradient'
    ? `linear-gradient(135deg,${config.c1},${config.c2})`
    : config.c1

  const cardBorder = config.borderStyle === 'none' ? 'none'
    : config.borderStyle === 'thick' ? `3px solid ${config.c1}`
    : `1.5px solid ${config.c1}44`

  const photoRadius = config.photoShape === 'circle' ? '50%'
    : config.photoShape === 'square' ? 4 : 10

  const getPos = (key) => {
    const saved = config.fieldPositions?.[key]
    return saved || DEFAULT_POSITIONS[key] || { x: 20, y: 200 }
  }

  /* ── Drag start ── */
  const onFieldMouseDown = (e, key) => {
    e.preventDefault()
    e.stopPropagation()
    onSelectField(key)
    const rect   = canvasRef.current.getBoundingClientRect()
    const pos    = getPos(key)
    dragRef.current = {
      key,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX:   pos.x,
      startPosY:   pos.y,
      rect,
    }
    setDragging(key)

    const onMove = (ev) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startMouseX
      const dy = ev.clientY - dragRef.current.startMouseY
      const nx = Math.max(0, Math.min(CARD_W - 80, dragRef.current.startPosX + dx))
      const ny = Math.max(0, Math.min(CARD_H - 20, dragRef.current.startPosY + dy))
      onPositionChange(dragRef.current.key, { x: Math.round(nx), y: Math.round(ny) })
    }

    const onUp = () => {
      dragRef.current = null
      setDragging(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const visibleFields = ALL_FIELDS.filter(f => config.visibleFields.includes(f.key))

  return (
    <div ref={canvasRef}
      style={{ position:'relative', width:CARD_W, height:CARD_H, background:'#fff', borderRadius:16, overflow:'hidden', border:cardBorder, boxShadow:'0 12px 48px rgba(0,0,0,.18)', userSelect:'none', flexShrink:0 }}>

      {/* ── Header ── */}
      <div style={{ background:headerBg, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, justifyContent:config.logoPosition==='center'?'center':'flex-start', flexDirection:config.logoPosition==='center'?'column':'row', height:80 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:'rgba(255,255,255,.22)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:15, color:'#fff', flexShrink:0, border:'1.5px solid rgba(255,255,255,.3)' }}>
          {(orgName||sub?.school_name||'SC').slice(0,2).toUpperCase()}
        </div>
        <div style={{ textAlign:config.logoPosition==='center'?'center':'left' }}>
          <div style={{ fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:800, color:'#fff', lineHeight:1.3 }}>
            {orgName || sub?.school_name || 'Organization Name'}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.75)', marginTop:2 }}>
            {sub?.role||'Student'} Identity Card
          </div>
        </div>
      </div>

      {/* ── Photo area (fixed) ── */}
      <div style={{ position:'absolute', left:16, top:95, width:72, height:92, borderRadius:photoRadius, border:`2.5px solid ${config.c1}`, background:config.accent, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        {sub?.photo_url
          ? <img src={sub.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
          : <span style={{ fontSize:32 }}>👤</span>
        }
      </div>

      {/* ── Draggable fields ── */}
      {visibleFields.map(f => {
        const pos  = getPos(f.key)
        const val  = sub?.[f.key] || `[${f.label}]`
        const isDragging  = dragging === f.key
        const isSelected  = selectedField === f.key

        return (
          <div
            key={f.key}
            onMouseDown={e => onFieldMouseDown(e, f.key)}
            style={{
              position:    'absolute',
              left:        pos.x,
              top:         pos.y,
              cursor:      isDragging ? 'grabbing' : 'grab',
              zIndex:      isDragging ? 100 : isSelected ? 50 : 10,
              padding:     '3px 6px',
              borderRadius: 5,
              border:      isSelected ? `1.5px dashed ${config.c1}` : '1.5px dashed transparent',
              background:  isSelected ? `${config.c1}12` : isDragging ? `${config.c1}18` : 'transparent',
              transition:  isDragging ? 'none' : 'border .15s, background .15s',
              minWidth:    60,
            }}>
            <div style={{ fontSize:8, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:.4, lineHeight:1 }}>{f.label}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', marginTop:1, whiteSpace:'nowrap' }}>{val}</div>

            {/* Drag indicator */}
            {isSelected && !isDragging && (
              <div style={{ position:'absolute', top:-14, left:0, fontSize:9, color:config.c1, fontWeight:700, whiteSpace:'nowrap', background:'#fff', padding:'1px 5px', borderRadius:4, border:`1px solid ${config.c1}44`, boxShadow:'0 1px 4px rgba(0,0,0,.1)' }}>
                drag to move
              </div>
            )}
          </div>
        )
      })}

      {/* ── Barcode footer ── */}
      {config.showBarcode && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, background:`${config.c1}14`, padding:'8px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${config.c1}22` }}>
          <div style={{ display:'flex', gap:1.5, alignItems:'flex-end' }}>
            {Array.from({length:28},(_,i) => (
              <div key={i} style={{ width:1.5, height:10+Math.abs(Math.sin(i*2.3))*12, background:config.c1, opacity:.65, borderRadius:1 }}/>
            ))}
          </div>
          <div style={{ fontSize:9, fontFamily:'JetBrains Mono,monospace', color:config.c1, fontWeight:600, opacity:.8 }}>
            {(sub?.id||'ID000000').slice(0,8).toUpperCase()}
          </div>
        </div>
      )}

      {/* ── Empty state hint ── */}
      {visibleFields.length === 0 && (
        <div style={{ position:'absolute', left:100, top:120, right:16, color:'#ccc', fontSize:12, fontWeight:600, lineHeight:1.7 }}>
          ← Add fields from<br/>the left panel
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN BUILDER
═══════════════════════════════════════════════════════════════ */
export default function IDCardBuilder() {
  const navigate = useNavigate()
  const { submissions, loading: subLoading } = useSubmissions()
  const { organizations }                    = useOrganizations()
  const { saveTemplate }                     = useCardTemplates()

  const [config,        setConfig]        = useState(DEFAULT_CONFIG)
  const [templateName,  setTemplateName]  = useState('')
  const [selectedOrg,   setSelectedOrg]   = useState('')
  const [previewIdx,    setPreviewIdx]    = useState(0)
  const [saving,        setSaving]        = useState(false)
  const [activeTab,     setActiveTab]     = useState('fields')
  const [selectedField, setSelectedField] = useState(null)

  const approved   = submissions.filter(s => s.status === 'approved')
  const previewSub = approved[previewIdx] || null
  const orgName    = organizations.find(o => o.id === selectedOrg)?.name || previewSub?.school_name || ''

  const upd = useCallback((key, val) => setConfig(p => ({ ...p, [key]: val })), [])

  const toggleField = (key) => {
    setConfig(p => {
      const on = p.visibleFields.includes(key)
      return { ...p, visibleFields: on ? p.visibleFields.filter(k => k !== key) : [...p.visibleFields, key] }
    })
    if (!config.visibleFields.includes(key)) setSelectedField(key)
  }

  const onPositionChange = useCallback((key, pos) => {
    setConfig(p => ({
      ...p,
      fieldPositions: { ...(p.fieldPositions||{}), [key]: pos }
    }))
  }, [])

  const resetPositions = () => {
    setConfig(p => ({ ...p, fieldPositions: {} }))
    toast.success('Positions reset to default')
  }

  const handleSave = async () => {
    if (!templateName.trim()) { toast.error('Enter a template name'); return }
    if (config.visibleFields.length === 0) { toast.error('Add at least one field'); return }
    setSaving(true)
    try {
      await saveTemplate({ name: templateName.trim(), org_id: selectedOrg||null, org_name: orgName||null, config })
      toast.success('Template saved!')
      navigate('/templates')
    } catch (err) { toast.error(err.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  if (subLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><Spinner size={40}/></div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', paddingTop:64, background:'var(--paper2)' }}>

      {/* ── Top bar ── */}
      <div style={{ height:54, background:'var(--paper)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button onClick={() => navigate(-1)}
            style={{ background:'var(--paper2)', border:'1px solid var(--border)', cursor:'pointer', color:'var(--ink2)', fontSize:14, padding:'6px 12px', borderRadius:8, fontFamily:'inherit', fontWeight:600 }}>
            ← Back
          </button>
          <input value={templateName} onChange={e => setTemplateName(e.target.value)}
            style={{ border:'none', borderBottom:'2px solid #2352ff', fontSize:15, fontWeight:700, color:'#fff', background:'transparent', outline:'none', fontFamily:'Outfit,sans-serif', minWidth:220, padding:'4px 0' }}
            placeholder="Template name..."/>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {approved.length > 1 && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'#666' }}>Preview:</span>
              <select value={previewIdx} onChange={e => setPreviewIdx(Number(e.target.value))}
                style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--paper)', color:'var(--ink)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                {approved.map((s,i) => <option key={s.id} value={i}>{s.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={resetPositions}
            style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--ink2)', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
            ↺ Reset layout
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:'7px 18px', borderRadius:8, border:'none', background:'#2352ff', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:saving?.6:1 }}>
            {saving ? '⏳ Saving...' : '💾 Save Template'}
          </button>
        </div>
      </div>

      {/* ── Main: Left panel + Center canvas ── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'260px 1fr', overflow:'hidden' }}>

        {/* ══ LEFT PANEL ══ */}
        <div style={{ background:'var(--paper)', borderRight:'1px solid var(--border)', overflowY:'auto', display:'flex', flexDirection:'column' }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {[['fields','📋 Fields'],['style','🎨 Style'],['settings','⚙ More']].map(([id,label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ flex:1, padding:'11px 4px', border:'none', fontSize:11, fontWeight:700, cursor:'pointer', background:'transparent', color:activeTab===id?'var(--ink)':'var(--ink3)', borderBottom:activeTab===id?'2px solid var(--blue)':'2px solid transparent', fontFamily:'inherit', transition:'all .15s' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding:'16px 14px', flex:1 }}>

            {/* ── FIELDS TAB ── */}
            {activeTab === 'fields' && (
              <div>
                <p style={{ fontSize:11, color:'var(--ink3)', marginBottom:14, lineHeight:1.6 }}>
                  Click to add/remove · Selected field is highlighted on the card · Drag it on the card to position
                </p>

                {/* Active fields */}
                {config.visibleFields.length > 0 && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Active — click card field to select, then drag</div>
                    {ALL_FIELDS.filter(f => config.visibleFields.includes(f.key)).map(f => {
                      const isSelected = selectedField === f.key
                      const pos = config.fieldPositions?.[f.key] || DEFAULT_POSITIONS[f.key] || { x:20, y:200 }
                      return (
                        <div key={f.key}
                          onClick={() => setSelectedField(isSelected ? null : f.key)}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:`1.5px solid ${isSelected?'var(--blue)':'var(--border)'}`, background:isSelected?'var(--blue-s)':'var(--paper2)', cursor:'pointer', marginBottom:5, transition:'all .15s' }}>
                          <span style={{ fontSize:14 }}>{f.icon}</span>
                          <span style={{ flex:1, fontSize:12, fontWeight:600, color:isSelected?'var(--blue)':'var(--ink2)' }}>{f.label}</span>
                          <span style={{ fontSize:10, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace' }}>{pos.x},{pos.y}</span>
                          <button onClick={e => { e.stopPropagation(); toggleField(f.key) }}
                            style={{ width:18, height:18, borderRadius:'50%', border:'none', background:'rgba(255,80,80,.2)', color:'#f87', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add fields */}
                <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Add Fields</div>
                {ALL_FIELDS.filter(f => !config.visibleFields.includes(f.key)).map(f => (
                  <div key={f.key} onClick={() => toggleField(f.key)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--paper)', cursor:'pointer', marginBottom:5, transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='var(--blue-s)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--paper)' }}>
                    <span style={{ fontSize:14 }}>{f.icon}</span>
                    <span style={{ flex:1, fontSize:12, color:'var(--ink2)' }}>{f.label}</span>
                    <span style={{ fontSize:16, color:'var(--ink3)' }}>+</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── STYLE TAB ── */}
            {activeTab === 'style' && (
              <div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Organization</div>
                  <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--paper)', color:'var(--ink)', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
                    <option value="">-- No specific org --</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Colors</div>
                  {[['Primary',config.c1,v=>upd('c1',v)],['Secondary',config.c2,v=>upd('c2',v)],['Accent BG',config.accent,v=>upd('accent',v)]].map(([l,v,fn])=>(
                    <div key={l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:12, color:'var(--ink2)' }}>{l}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <input type="color" value={v} onChange={e=>fn(e.target.value)}
                          style={{ width:26, height:26, borderRadius:6, border:'1px solid var(--border)', padding:2, cursor:'pointer', background:'none' }}/>
                        <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--ink3)' }}>{v}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Header Style</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {['gradient','solid'].map(v => (
                      <button key={v} onClick={() => upd('headerStyle',v)}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${config.headerStyle===v?'var(--blue)':'var(--border)'}`, background:config.headerStyle===v?'var(--blue-s)':'transparent', color:config.headerStyle===v?'var(--blue)':'var(--ink3)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Photo Shape</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {['square','rounded','circle'].map(v => (
                      <button key={v} onClick={() => upd('photoShape',v)}
                        style={{ flex:1, padding:'8px 4px', borderRadius:8, border:`1.5px solid ${config.photoShape===v?'var(--blue)':'var(--border)'}`, background:config.photoShape===v?'var(--blue-s)':'transparent', color:config.photoShape===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Border</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {['none','thin','thick'].map(v => (
                      <button key={v} onClick={() => upd('borderStyle',v)}
                        style={{ flex:1, padding:'8px 4px', borderRadius:8, border:`1.5px solid ${config.borderStyle===v?'var(--blue)':'var(--border)'}`, background:config.borderStyle===v?'var(--blue-s)':'transparent', color:config.borderStyle===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
              <div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Logo Position</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {['left','center'].map(v => (
                      <button key={v} onClick={() => upd('logoPosition',v)}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${config.logoPosition===v?'var(--blue)':'var(--border)'}`, background:config.logoPosition===v?'var(--blue-s)':'transparent', color:config.logoPosition===v?'var(--blue)':'var(--ink3)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Font Size</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[['sm','Small'],['md','Medium'],['lg','Large']].map(([v,l]) => (
                      <button key={v} onClick={() => upd('fontSize',v)}
                        style={{ flex:1, padding:'8px 4px', borderRadius:8, border:`1.5px solid ${config.fontSize===v?'var(--blue)':'var(--border)'}`, background:config.fontSize===v?'var(--blue-s)':'transparent', color:config.fontSize===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  {[['showBarcode','Show Barcode']].map(([k,l]) => (
                    <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:12, color:'var(--ink2)' }}>{l}</span>
                      <div onClick={() => upd(k,!config[k])}
                        style={{ width:36, height:20, borderRadius:10, background:config[k]?'var(--blue)':'var(--border2)', transition:'background .2s', cursor:'pointer', position:'relative' }}>
                        <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:config[k]?18:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.15)' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ CENTER: Card Canvas ══ */}
        <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', gap:20, background:'var(--paper2)' }}
          onClick={() => setSelectedField(null)}>

          {/* Hint bar */}
          <div style={{ display:'flex', alignItems:'center', gap:16, background:'var(--paper)', borderRadius:10, padding:'8px 20px', border:'1px solid var(--border)', fontSize:12 }}>
            <span style={{ color:'#2352ff' }}>●</span>
            <span style={{ color:'var(--ink3)' }}>Click a field on the card to select it</span>
            <span style={{ color:'var(--border)' }}>|</span>
            <span style={{ color:'var(--ink3)' }}>Drag it anywhere on the card</span>
            <span style={{ color:'var(--border)' }}>|</span>
            <span style={{ color:'var(--ink3)' }}>Add/remove fields from the left panel</span>
          </div>

          {/* The card canvas */}
          <div onClick={e => e.stopPropagation()}>
            <CardCanvas
              config={config}
              sub={previewSub}
              orgName={orgName}
              onPositionChange={onPositionChange}
              selectedField={selectedField}
              onSelectField={setSelectedField}
            />
          </div>

          {/* No submissions warning */}
          {approved.length === 0 && (
            <div style={{ padding:'10px 18px', background:'var(--amber-s)', borderRadius:8, border:'1px solid #fcd34d', fontSize:12, color:'#92400e', fontWeight:600 }}>
              ⚠ No approved submissions — preview shows placeholder data
            </div>
          )}

          {/* Selected field info */}
          {selectedField && (
            <div style={{ padding:'10px 18px', background:'var(--blue-s)', borderRadius:8, border:'1px solid var(--blue-m)', fontSize:12, color:'var(--blue)', fontWeight:600 }}>
              ✦ {ALL_FIELDS.find(f=>f.key===selectedField)?.label} selected — drag it on the card to reposition
            </div>
          )}
        </div>
      </div>
    </div>
  )
}