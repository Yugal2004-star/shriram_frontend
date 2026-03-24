import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubmissions } from '../hooks/useSubmissions'
import { useOrganizations } from '../hooks/useOrganizations'
import { useCardTemplates } from '../hooks/useCardtemplates'
import { Btn, Spinner } from '../components/shared/index'
import { uploadBgImage } from '../lib/supabase'
import toast from 'react-hot-toast'

/* ═══════════════════════════════════════════════════════════
   CARD SIZE PRESETS  (width × height in px)
═══════════════════════════════════════════════════════════ */
const SIZE_PRESETS = {
  standard:   { label:'Standard',   w:340, h:480 },
  large:      { label:'Large',      w:400, h:560 },
  small:      { label:'Small',      w:280, h:400 },
  landscape:  { label:'Landscape',  w:500, h:320 },
  square:     { label:'Square',     w:380, h:380 },
}

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

/* Default positions scale to standard 340×480 */
const DEFAULT_FIELD_POSITIONS = {
  name:              { x:110, y:100 },
  class:             { x:110, y:130 },
  section:           { x:200, y:130 },
  roll_number:       { x:110, y:155 },
  admission_number:  { x:110, y:178 },
  date_of_birth:     { x:16,  y:220 },
  blood_group:       { x:175, y:220 },
  contact_number:    { x:16,  y:255 },
  emergency_contact: { x:16,  y:288 },
  address:           { x:16,  y:320 },
  designation:       { x:110, y:118 },
  department:        { x:110, y:140 },
  mode_of_transport: { x:16,  y:355 },
}

const DEFAULT_CONFIG = {
  c1:             '#2352ff',
  c2:             '#1538d4',
  accent:         '#e8ecff',
  photoShape:     'rounded',
  showHeader:     true,
  showBarcode:    true,
  headerStyle:    'gradient',
  logoPosition:   'left',
  borderStyle:    'thin',
  fontSize:       'md',
  orientation:    'portrait',   // 'portrait' | 'landscape'
  sizePreset:     'standard',   // key of SIZE_PRESETS
  cardW:          340,          // actual width used (saved)
  cardH:          480,          // actual height used (saved)
  bgImage:        null,         // base64 data URL of background image
  bgOpacity:      0.15,         // 0–1 overlay opacity
  bgFit:          'cover',      // 'cover' | 'contain' | 'repeat'
  visibleFields:  ['name','class','roll_number','blood_group','contact_number'],
  fieldPositions: {},
  photoX:         16,
  photoY:         90,
  photoSize:      72,
}

/* ═══════════════════════════════════════════════════════════
   CARD CANVAS
═══════════════════════════════════════════════════════════ */
function CardCanvas({ config, sub, orgName, onMove, selected, onSelect }) {
  const dragRef  = useRef(null)
  const canvasRef= useRef(null)

  const CW = config.cardW || 340
  const CH = config.cardH || 480

  const headerBg   = config.headerStyle === 'gradient'
    ? `linear-gradient(135deg,${config.c1},${config.c2})` : config.c1
  const cardBorder = config.borderStyle === 'none'  ? 'none'
    : config.borderStyle === 'thick' ? `3px solid ${config.c1}` : `1.5px solid ${config.c1}55`
  const photoRadius= config.photoShape === 'circle' ? '50%'
    : config.photoShape === 'square' ? 4 : 10

  const getFieldPos = (key) =>
    config.fieldPositions?.[key] || DEFAULT_FIELD_POSITIONS[key] || { x:20, y:200 }

  const startDrag = (e, key, currentX, currentY) => {
    e.preventDefault(); e.stopPropagation()
    onSelect(key)
    dragRef.current = { key, startMouseX:e.clientX, startMouseY:e.clientY, startX:currentX, startY:currentY }
    const onMouseMove = (ev) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startMouseX
      const dy = ev.clientY - dragRef.current.startMouseY
      const pw  = config.photoSize || 72
      const ph  = Math.round(pw * 4 / 3)
      const maxX = key==='__photo__' ? CW - pw  : CW - 80
      const maxY = key==='__photo__' ? CH - ph - 30 : CH - 20
      onMove(key, Math.round(Math.max(0,Math.min(maxX, dragRef.current.startX+dx))),
                  Math.round(Math.max(0,Math.min(maxY, dragRef.current.startY+dy))))
    }
    const onMouseUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const visibleFields  = ALL_FIELDS.filter(f => config.visibleFields.includes(f.key))
  const pw = config.photoSize || 72
  const ph = Math.round(pw * 4 / 3)
  const px = config.photoX ?? 16
  const py = config.photoY ?? 90
  const isPhotoSel = selected === '__photo__'
  const headerH = config.orientation === 'landscape' ? 64 : 80

  return (
    <div ref={canvasRef}
      style={{ position:'relative', width:CW, height:CH, background:'#fff',
        borderRadius:16, overflow:'hidden', border:cardBorder,
        boxShadow:'0 12px 48px rgba(0,0,0,.18)', userSelect:'none',
        flexShrink:0, fontFamily:'Instrument Sans,sans-serif' }}>

      {/* ── Background image ── */}
      {config.bgImage && (
        <div style={{ position:'absolute', inset:0, zIndex:0,
          backgroundImage:`url(${config.bgImage})`,
          backgroundSize: config.bgFit === 'repeat' ? 'auto' : config.bgFit,
          backgroundRepeat: config.bgFit === 'repeat' ? 'repeat' : 'no-repeat',
          backgroundPosition:'center',
          opacity: config.bgOpacity ?? 0.15,
          pointerEvents:'none' }}/>
      )}

      {/* ── Header ── */}
      {config.showHeader !== false && (
        <div style={{ position:'relative', zIndex:1, background:headerBg,
          height:headerH, display:'flex', alignItems:'center', gap:12, padding:'0 16px',
          justifyContent:config.logoPosition==='center'?'center':'flex-start',
          flexDirection:config.logoPosition==='center'?'column':'row' }}>
          <div style={{ width:40, height:40, borderRadius:10,
            background:'rgba(255,255,255,.22)', display:'flex', alignItems:'center',
            justifyContent:'center', fontFamily:'Outfit,sans-serif', fontWeight:900,
            fontSize:14, color:'#fff', flexShrink:0 }}>
            {(orgName || sub?.school_name || 'SC').slice(0,2).toUpperCase()}
          </div>
          <div style={{ textAlign:config.logoPosition==='center'?'center':'left' }}>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:800, color:'#fff', lineHeight:1.3 }}>
              {orgName || sub?.school_name || 'Organization Name'}
            </div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.75)', marginTop:2 }}>
              {sub?.role||'Student'} Identity Card
            </div>
          </div>
        </div>
      )}

      {/* ── Photo ── */}
      <div onMouseDown={e => startDrag(e,'__photo__',px,py)}
        style={{ position:'absolute', left:px, top:py, width:pw, height:ph, zIndex:15,
          borderRadius:photoRadius, border:`2.5px solid ${config.c1}`,
          outline: isPhotoSel ? `2px dashed ${config.c1}` : 'none',
          outlineOffset:3, background:config.accent,
          display:'flex', alignItems:'center', justifyContent:'center',
          overflow:'hidden', cursor:'grab',
          boxShadow: isPhotoSel ? `0 0 0 4px ${config.c1}33` : 'none',
          transition:'box-shadow .15s' }}>
        {sub?.photo_url
          ? <img src={sub.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover', pointerEvents:'none' }} alt=""/>
          : <span style={{ fontSize:Math.round(pw*0.38), pointerEvents:'none' }}>👤</span>
        }
        {isPhotoSel && (
          <div style={{ position:'absolute', bottom:-20, left:0, fontSize:9, color:config.c1,
            fontWeight:700, whiteSpace:'nowrap', background:'#fff', padding:'2px 6px',
            borderRadius:4, border:`1px solid ${config.c1}44`, pointerEvents:'none' }}>
            ↕↔ drag to move
          </div>
        )}
      </div>

      {/* ── Text fields ── */}
      {visibleFields.map(f => {
        const pos  = getFieldPos(f.key)
        const val  = sub?.[f.key] || `[${f.label}]`
        const isSel= selected === f.key
        return (
          <div key={f.key} onMouseDown={e => startDrag(e,f.key,pos.x,pos.y)}
            style={{ position:'absolute', left:pos.x, top:pos.y, zIndex:isSel?60:10,
              padding:'3px 7px', borderRadius:5, minWidth:55,
              border:isSel?`1.5px dashed ${config.c1}`:'1.5px dashed transparent',
              background:isSel?`${config.c1}11`:'transparent',
              cursor:'grab', transition:'border .15s, background .15s' }}>
            <div style={{ fontSize:8, fontWeight:700, color:'#aaa',
              textTransform:'uppercase', letterSpacing:.4 }}>{f.label}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', marginTop:1, whiteSpace:'nowrap' }}>{val}</div>
            {isSel && (
              <div style={{ position:'absolute', top:-16, left:0, fontSize:9, color:config.c1,
                fontWeight:700, whiteSpace:'nowrap', background:'#fff', padding:'1px 5px',
                borderRadius:4, border:`1px solid ${config.c1}44`, pointerEvents:'none' }}>
                ↕↔ drag
              </div>
            )}
          </div>
        )
      })}

      {/* ── Barcode ── */}
      {config.showBarcode && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:5,
          background:`${config.c1}12`, padding:'7px 14px',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          borderTop:`1px solid ${config.c1}22` }}>
          <div style={{ display:'flex', gap:1.5, alignItems:'flex-end' }}>
            {Array.from({length:28},(_,i) => (
              <div key={i} style={{ width:1.5, height:9+Math.abs(Math.sin(i*2.3))*11,
                background:config.c1, opacity:.6, borderRadius:1 }}/>
            ))}
          </div>
          <div style={{ fontSize:9, fontFamily:'JetBrains Mono,monospace', color:config.c1, fontWeight:600, opacity:.8 }}>
            {(sub?.id||'ID000000').slice(0,8).toUpperCase()}
          </div>
        </div>
      )}

      {/* Empty hint */}
      {visibleFields.length === 0 && (
        <div style={{ position:'absolute', left:100, top:110, color:'#ddd',
          fontSize:12, fontWeight:600, lineHeight:1.8, zIndex:20 }}>
          ← Add fields<br/>from left panel
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN BUILDER
═══════════════════════════════════════════════════════════ */
export default function IDCardBuilder() {
  const navigate = useNavigate()
  const { submissions, loading: subLoading } = useSubmissions()
  const { organizations }                    = useOrganizations()
  const { saveTemplate }                     = useCardTemplates()

  const [config,       setConfig]       = useState(DEFAULT_CONFIG)
  const [templateName, setTemplateName] = useState('')
  const [selectedOrg,  setSelectedOrg]  = useState('')
  const [previewIdx,   setPreviewIdx]   = useState(0)
  const [saving,       setSaving]       = useState(false)
  const [bgUploading,  setBgUploading]  = useState(false)
  const [activeTab,    setActiveTab]    = useState('fields')
  const [selected,     setSelected]     = useState(null)
  const bgInputRef = useRef(null)

  const approved   = submissions.filter(s => s.status === 'approved')
  const previewSub = approved[previewIdx] || null
  const orgName    = organizations.find(o => o.id === selectedOrg)?.name || previewSub?.school_name || ''

  const upd = useCallback((key, val) => setConfig(p => ({ ...p, [key]: val })), [])

  const onMove = useCallback((key, x, y) => {
    if (key === '__photo__') {
      setConfig(p => ({ ...p, photoX:x, photoY:y }))
    } else {
      setConfig(p => ({ ...p, fieldPositions: { ...(p.fieldPositions||{}), [key]: {x,y} } }))
    }
  }, [])

  const toggleField = (key) => {
    setConfig(p => {
      const on = p.visibleFields.includes(key)
      return { ...p, visibleFields: on ? p.visibleFields.filter(k=>k!==key) : [...p.visibleFields, key] }
    })
    if (!config.visibleFields.includes(key)) setSelected(key)
  }

  /* Apply a size preset — also resets positions */
  const applyPreset = (presetKey) => {
    const preset = SIZE_PRESETS[presetKey]
    if (!preset) return
    setConfig(p => ({
      ...p,
      sizePreset: presetKey,
      cardW: preset.w,
      cardH: preset.h,
      orientation: preset.h > preset.w ? 'portrait' : 'landscape',
      fieldPositions: {},
      photoX: 16,
      photoY: preset.h > preset.w ? 90 : 16,
      photoSize: 72,
    }))
    toast(`Card size changed to ${preset.label}`)
  }

  /* Manual W/H sliders */
  const setCardW = (w) => setConfig(p => ({ ...p, cardW:w, sizePreset:'custom' }))
  const setCardH = (h) => setConfig(p => ({ ...p, cardH:h, sizePreset:'custom' }))

  /* Flip orientation */
  const flipOrientation = () => {
    setConfig(p => ({
      ...p,
      cardW: p.cardH,
      cardH: p.cardW,
      orientation: p.cardH > p.cardW ? 'portrait' : 'landscape',
      fieldPositions: {},
      photoX: 16,
      photoY: 16,
      photoSize: p.photoSize,
    }))
    toast('Orientation flipped — positions reset')
  }

  /* Background image upload → Supabase Storage → save public URL only */
  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { toast.error('Image too large. Max 3MB.'); return }
    setBgUploading(true)
    try {
      const url = await uploadBgImage(file)
      upd('bgImage', url)            // saves only the URL string — not base64
      toast.success('Background image uploaded')
    } catch (err) {
      console.error(err)
      toast.error('Upload failed. Check your Supabase storage bucket.')
    } finally {
      setBgUploading(false)
      e.target.value = ''
    }
  }

  const resetLayout = () => {
    setConfig(p => ({ ...p, fieldPositions:{}, photoX:16, photoY:90, photoSize:72 }))
    toast.success('Layout reset')
  }

  const handleSave = async () => {
    if (!templateName.trim()) { toast.error('Enter a template name'); return }
    if (config.visibleFields.length === 0) { toast.error('Add at least one field'); return }
    setSaving(true)
    try {
      await saveTemplate({ name:templateName.trim(), org_id:selectedOrg||null, org_name:orgName||null, config })
      toast.success(`"${templateName.trim()}" saved!`)
      navigate('/templates')
    } catch (err) { toast.error(err.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  if (subLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <Spinner size={40}/>
    </div>
  )

  const CW = config.cardW || 340
  const CH = config.cardH || 480

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', paddingTop:64, background:'var(--paper2)' }}>

      {/* ── TOP BAR ── */}
      <div style={{ height:56, background:'var(--paper)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 20px', flexShrink:0, gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0 }}>
          <button onClick={() => navigate(-1)}
            style={{ padding:'6px 12px', borderRadius:8, border:'1.5px solid var(--border)',
              background:'var(--paper2)', color:'var(--ink2)', fontSize:13, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>← Back</button>
          <input value={templateName} onChange={e => setTemplateName(e.target.value)}
            placeholder="Template name..."
            style={{ flex:1, border:'1.5px solid var(--border)', borderRadius:8, fontSize:14,
              fontWeight:700, color:'var(--ink)', background:'var(--paper2)', outline:'none',
              fontFamily:'Outfit,sans-serif', padding:'7px 12px', transition:'border .15s' }}
            onFocus={e => e.target.style.borderColor='#2352ff'}
            onBlur={e  => e.target.style.borderColor='var(--border)'}/>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          {/* Card size indicator */}
          <div style={{ fontSize:11, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace',
            background:'var(--paper2)', border:'1px solid var(--border)', borderRadius:6,
            padding:'4px 8px', whiteSpace:'nowrap' }}>
            {CW}×{CH} · {config.orientation}
          </div>
          {approved.length > 1 && (
            <select value={previewIdx} onChange={e => setPreviewIdx(Number(e.target.value))}
              style={{ padding:'5px 8px', borderRadius:7, border:'1.5px solid var(--border)',
                background:'var(--paper)', color:'var(--ink)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              {approved.map((s,i) => <option key={s.id} value={i}>{s.name}</option>)}
            </select>
          )}
          <button onClick={resetLayout}
            style={{ padding:'6px 12px', borderRadius:8, border:'1.5px solid var(--border)',
              background:'transparent', color:'var(--ink2)', fontSize:12, cursor:'pointer',
              fontFamily:'inherit', fontWeight:600 }}>↺ Reset</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:'7px 18px', borderRadius:8, border:'none',
              background:saving?'var(--border2)':'#2352ff', color:'#fff',
              fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {saving ? '⏳ Saving...' : '💾 Save Template'}
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'268px 1fr', overflow:'hidden' }}>

        {/* ══ LEFT PANEL ══ */}
        <div style={{ background:'var(--paper)', borderRight:'1px solid var(--border)',
          overflowY:'auto', display:'flex', flexDirection:'column' }}>

          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {[['fields','📋 Fields'],['style','🎨 Style'],['canvas','📐 Canvas'],['settings','⚙ More']].map(([id,label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ flex:1, padding:'10px 2px', border:'none', fontSize:10, fontWeight:700,
                  cursor:'pointer', background:'transparent',
                  color:activeTab===id?'var(--blue)':'var(--ink3)',
                  borderBottom:activeTab===id?'2px solid var(--blue)':'2px solid transparent',
                  fontFamily:'inherit', transition:'color .15s' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding:'14px 12px', flex:1 }}>

            {/* ── FIELDS TAB ── */}
            {activeTab === 'fields' && (
              <div>
                <p style={{ fontSize:11, color:'var(--ink3)', marginBottom:12, lineHeight:1.6 }}>
                  Click + to add. Click a field on the card, then drag to reposition.
                </p>
                {config.visibleFields.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Active</div>
                    {ALL_FIELDS.filter(f => config.visibleFields.includes(f.key)).map(f => {
                      const isSel = selected === f.key
                      const pos   = config.fieldPositions?.[f.key] || DEFAULT_FIELD_POSITIONS[f.key] || {x:20,y:200}
                      return (
                        <div key={f.key} onClick={() => setSelected(isSel?null:f.key)}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px',
                            borderRadius:8, border:`1.5px solid ${isSel?'var(--blue)':'var(--border)'}`,
                            background:isSel?'var(--blue-s)':'var(--paper2)',
                            cursor:'pointer', marginBottom:5, transition:'all .15s' }}>
                          <span style={{ fontSize:14 }}>{f.icon}</span>
                          <span style={{ flex:1, fontSize:12, fontWeight:600, color:isSel?'var(--blue)':'var(--ink2)' }}>{f.label}</span>
                          <span style={{ fontSize:10, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace' }}>{pos.x},{pos.y}</span>
                          <button onClick={e=>{e.stopPropagation();toggleField(f.key)}}
                            style={{ width:18, height:18, borderRadius:'50%', border:'none',
                              background:'var(--red-s)', color:'var(--red)', cursor:'pointer',
                              fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Add Fields</div>
                {ALL_FIELDS.filter(f => !config.visibleFields.includes(f.key)).map(f => (
                  <div key={f.key} onClick={() => toggleField(f.key)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px',
                      borderRadius:8, border:'1.5px solid var(--border)', background:'var(--paper)',
                      cursor:'pointer', marginBottom:5, transition:'all .15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue)';e.currentTarget.style.background='var(--blue-s)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--paper)'}}>
                    <span style={{ fontSize:14 }}>{f.icon}</span>
                    <span style={{ flex:1, fontSize:12, color:'var(--ink2)' }}>{f.label}</span>
                    <span style={{ fontSize:18, color:'var(--ink3)', lineHeight:1 }}>+</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── STYLE TAB ── */}
            {activeTab === 'style' && (
              <div>
                {/* Org */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Organization</div>
                  <select value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--border)',
                      background:'var(--paper)', color:'var(--ink)', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
                    <option value="">-- No specific org --</option>
                    {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                {/* Colors */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Colors</div>
                  {[['Primary',config.c1,v=>upd('c1',v)],['Secondary',config.c2,v=>upd('c2',v)],['Accent',config.accent,v=>upd('accent',v)]].map(([l,v,fn])=>(
                    <div key={l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:12, color:'var(--ink2)' }}>{l}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <input type="color" value={v} onChange={e=>fn(e.target.value)} style={{ width:26, height:26, borderRadius:6, border:'1.5px solid var(--border)', padding:2, cursor:'pointer' }}/>
                        <span style={{ fontSize:10, fontFamily:'JetBrains Mono,monospace', color:'var(--ink3)' }}>{v}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Header */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Header</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {['gradient','solid'].map(v=>(
                      <button key={v} onClick={()=>upd('headerStyle',v)}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${config.headerStyle===v?'var(--blue)':'var(--border)'}`, background:config.headerStyle===v?'var(--blue-s)':'transparent', color:config.headerStyle===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{v}</button>
                    ))}
                  </div>
                </div>
                {/* Photo */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Photo</div>
                  <div onClick={()=>setSelected(selected==='__photo__'?null:'__photo__')}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                      borderRadius:8, border:`1.5px solid ${selected==='__photo__'?'var(--blue)':'var(--border)'}`,
                      background:selected==='__photo__'?'var(--blue-s)':'var(--paper2)',
                      cursor:'pointer', marginBottom:10, transition:'all .15s' }}>
                    <span style={{ fontSize:16 }}>🖼</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:600, color:selected==='__photo__'?'var(--blue)':'var(--ink2)' }}>Photo</span>
                    <span style={{ fontSize:10, color:'var(--ink3)' }}>{config.photoSize||72}×{Math.round((config.photoSize||72)*4/3)}px</span>
                    <span style={{ fontSize:10, fontWeight:700, color:selected==='__photo__'?'var(--blue)':'var(--ink3)' }}>{selected==='__photo__'?'✓':'Select'}</span>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'var(--ink3)' }}>Size</span>
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--blue)', fontWeight:700 }}>{config.photoSize||72}px</span>
                    </div>
                    <input type="range" min={40} max={180} step={4} value={config.photoSize||72}
                      onChange={e=>upd('photoSize',Number(e.target.value))} style={{ width:'100%', accentColor:'#2352ff' }}/>
                  </div>
                  <div style={{ fontSize:10, color:'var(--ink3)', marginBottom:5, fontWeight:600 }}>Shape</div>
                  <div style={{ display:'flex', gap:6 }}>
                    {['square','rounded','circle'].map(v=>(
                      <button key={v} onClick={()=>upd('photoShape',v)}
                        style={{ flex:1, padding:'7px 4px', borderRadius:8, border:`1.5px solid ${config.photoShape===v?'var(--blue)':'var(--border)'}`, background:config.photoShape===v?'var(--blue-s)':'transparent', color:config.photoShape===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{v}</button>
                    ))}
                  </div>
                </div>
                {/* Border */}
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Border</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {['none','thin','thick'].map(v=>(
                      <button key={v} onClick={()=>upd('borderStyle',v)}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${config.borderStyle===v?'var(--blue)':'var(--border)'}`, background:config.borderStyle===v?'var(--blue-s)':'transparent', color:config.borderStyle===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── CANVAS TAB (NEW) ── */}
            {activeTab === 'canvas' && (
              <div>

                {/* Orientation flip */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Orientation</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { if (config.cardH <= config.cardW) return; flipOrientation() }}
                      style={{ flex:1, padding:'10px 8px', borderRadius:8,
                        border:`1.5px solid ${(config.cardH||480)>(config.cardW||340)?'var(--blue)':'var(--border)'}`,
                        background:(config.cardH||480)>(config.cardW||340)?'var(--blue-s)':'transparent',
                        color:(config.cardH||480)>(config.cardW||340)?'var(--blue)':'var(--ink3)',
                        fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      <div style={{ fontSize:18, marginBottom:3 }}>🪪</div>
                      Portrait
                    </button>
                    <button onClick={() => { if (config.cardW > config.cardH) return; flipOrientation() }}
                      style={{ flex:1, padding:'10px 8px', borderRadius:8,
                        border:`1.5px solid ${(config.cardW||340)>(config.cardH||480)?'var(--blue)':'var(--border)'}`,
                        background:(config.cardW||340)>(config.cardH||480)?'var(--blue-s)':'transparent',
                        color:(config.cardW||340)>(config.cardH||480)?'var(--blue)':'var(--ink3)',
                        fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      <div style={{ fontSize:18, marginBottom:3 }}>💳</div>
                      Landscape
                    </button>
                  </div>
                </div>

                {/* Size presets */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Size Presets</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {Object.entries(SIZE_PRESETS).map(([key, preset]) => {
                      const isSel = config.sizePreset === key
                      return (
                        <div key={key} onClick={() => applyPreset(key)}
                          style={{ padding:'8px 10px', borderRadius:8,
                            border:`1.5px solid ${isSel?'var(--blue)':'var(--border)'}`,
                            background:isSel?'var(--blue-s)':'var(--paper2)',
                            cursor:'pointer', transition:'all .15s', textAlign:'center' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:isSel?'var(--blue)':'var(--ink2)', marginBottom:2 }}>{preset.label}</div>
                          <div style={{ fontSize:10, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace' }}>{preset.w}×{preset.h}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Manual width/height sliders */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Custom Size</div>
                  {[['Width', config.cardW||340, setCardW, 200, 600],
                    ['Height', config.cardH||480, setCardH, 200, 700]].map(([label, val, setter, min, max]) => (
                    <div key={label} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:11, color:'var(--ink3)' }}>{label}</span>
                        <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--blue)', fontWeight:700 }}>{val}px</span>
                      </div>
                      <input type="range" min={min} max={max} step={10} value={val}
                        onChange={e => setter(Number(e.target.value))}
                        style={{ width:'100%', accentColor:'#2352ff' }}/>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--ink3)', marginTop:2 }}>
                        <span>{min}px</span><span>{max}px</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize:10, color:'var(--ink3)', marginTop:4, padding:'6px 8px', background:'var(--paper2)', borderRadius:6, border:'1px solid var(--border)' }}>
                    ⚠ Changing size resets field positions. Use Reset button after.
                  </div>
                </div>

                {/* Background image */}
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Background Image</div>

                  {config.bgImage ? (
                    <div style={{ marginBottom:10 }}>
                      {/* Preview thumbnail */}
                      <div style={{ width:'100%', height:80, borderRadius:8, overflow:'hidden', marginBottom:8, border:'1px solid var(--border)', position:'relative' }}>
                        <img src={config.bgImage} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="bg preview"/>
                        <button onClick={() => upd('bgImage', null)}
                          style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%',
                            border:'none', background:'rgba(0,0,0,.6)', color:'#fff', cursor:'pointer',
                            fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      </div>
                      {/* Opacity slider */}
                      <div style={{ marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:11, color:'var(--ink3)' }}>Opacity</span>
                          <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--blue)', fontWeight:700 }}>{Math.round((config.bgOpacity||0.15)*100)}%</span>
                        </div>
                        <input type="range" min={5} max={100} step={5}
                          value={Math.round((config.bgOpacity||0.15)*100)}
                          onChange={e => upd('bgOpacity', Number(e.target.value)/100)}
                          style={{ width:'100%', accentColor:'#2352ff' }}/>
                      </div>
                      {/* Fit mode */}
                      <div style={{ fontSize:10, color:'var(--ink3)', marginBottom:5, fontWeight:600 }}>Fit</div>
                      <div style={{ display:'flex', gap:6 }}>
                        {['cover','contain','repeat'].map(v=>(
                          <button key={v} onClick={()=>upd('bgFit',v)}
                            style={{ flex:1, padding:'6px 4px', borderRadius:7, border:`1.5px solid ${config.bgFit===v?'var(--blue)':'var(--border)'}`, background:config.bgFit===v?'var(--blue-s)':'transparent', color:config.bgFit===v?'var(--blue)':'var(--ink3)', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{v}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => !bgUploading && bgInputRef.current?.click()}
                      style={{ width:'100%', padding:'20px 12px', borderRadius:8,
                        border:`2px dashed ${bgUploading?'var(--blue)':'var(--border)'}`,
                        background:bgUploading?'var(--blue-s)':'var(--paper2)',
                        cursor:bgUploading?'not-allowed':'pointer', textAlign:'center', transition:'all .15s' }}
                      onMouseEnter={e=>{ if(!bgUploading){e.currentTarget.style.borderColor='var(--blue)';e.currentTarget.style.background='var(--blue-s)'}}}
                      onMouseLeave={e=>{ if(!bgUploading){e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--paper2)'}}}>
                      <div style={{ fontSize:24, marginBottom:6 }}>{bgUploading?'⏳':'🖼'}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--ink2)', marginBottom:3 }}>
                        {bgUploading ? 'Uploading...' : 'Upload Background'}
                      </div>
                      <div style={{ fontSize:11, color:'var(--ink3)' }}>JPG, PNG · Max 3MB</div>
                    </div>
                  )}
                  <input ref={bgInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={handleBgUpload} style={{ display:'none' }}/>
                </div>
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
              <div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Logo Position</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {['left','center'].map(v=>(
                      <button key={v} onClick={()=>upd('logoPosition',v)}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${config.logoPosition===v?'var(--blue)':'var(--border)'}`, background:config.logoPosition===v?'var(--blue-s)':'transparent', color:config.logoPosition===v?'var(--blue)':'var(--ink3)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{v}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Font Size</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[['sm','Small'],['md','Med'],['lg','Large']].map(([v,l])=>(
                      <button key={v} onClick={()=>upd('fontSize',v)}
                        style={{ flex:1, padding:'8px 4px', borderRadius:8, border:`1.5px solid ${config.fontSize===v?'var(--blue)':'var(--border)'}`, background:config.fontSize===v?'var(--blue-s)':'transparent', color:config.fontSize===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{l}</button>
                    ))}
                  </div>
                </div>
                {/* Show Header toggle */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize:12, color:'var(--ink2)', fontWeight:600 }}>Show Header</div>
                    <div style={{ fontSize:10, color:'var(--ink3)', marginTop:1 }}>College name, logo & role</div>
                  </div>
                  <div onClick={()=>upd('showHeader',!(config.showHeader!==false))}
                    style={{ width:38, height:22, borderRadius:11, background:config.showHeader!==false?'var(--blue)':'var(--border2)', transition:'background .2s', cursor:'pointer', position:'relative', flexShrink:0 }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:config.showHeader!==false?18:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                  </div>
                </div>

                {/* Show Barcode toggle */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize:12, color:'var(--ink2)', fontWeight:600 }}>Show Barcode</div>
                    <div style={{ fontSize:10, color:'var(--ink3)', marginTop:1 }}>Footer barcode strip</div>
                  </div>
                  <div onClick={()=>upd('showBarcode',!config.showBarcode)}
                    style={{ width:38, height:22, borderRadius:11, background:config.showBarcode?'var(--blue)':'var(--border2)', transition:'background .2s', cursor:'pointer', position:'relative', flexShrink:0 }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:config.showBarcode?18:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ CENTER: Card Canvas ══ */}
        <div style={{ overflowY:'auto', display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'flex-start', padding:'28px 24px',
          gap:16, background:'var(--paper2)' }}
          onClick={() => setSelected(null)}>

          <div style={{ display:'flex', alignItems:'center', gap:12, background:'var(--paper)',
            borderRadius:10, padding:'7px 16px', border:'1px solid var(--border)', fontSize:11,
            flexWrap:'wrap', justifyContent:'center' }}>
            <span style={{ color:'var(--blue)', fontWeight:700 }}>●</span>
            <span style={{ color:'var(--ink3)' }}>Click photo or field → drag to move</span>
            <span style={{ color:'var(--border)' }}>|</span>
            <span style={{ color:'var(--ink3)' }}>📐 Canvas tab to resize or flip</span>
            <span style={{ color:'var(--border)' }}>|</span>
            <span style={{ color:'var(--ink3)' }}>🖼 Add background in Canvas tab</span>
          </div>

          <div onClick={e => e.stopPropagation()}>
            <CardCanvas config={config} sub={previewSub} orgName={orgName}
              onMove={onMove} selected={selected} onSelect={setSelected}/>
          </div>

          {selected && (
            <div style={{ padding:'8px 16px', background:'var(--blue-s)', borderRadius:8,
              border:'1px solid var(--blue-m)', fontSize:12, color:'var(--blue)', fontWeight:600 }}>
              {selected==='__photo__'
                ? '🖼 Photo selected — drag on card · resize in Style tab'
                : `✦ ${ALL_FIELDS.find(f=>f.key===selected)?.label} selected — drag on card`}
            </div>
          )}

          {approved.length === 0 && (
            <div style={{ padding:'10px 16px', background:'var(--amber-s)', borderRadius:8,
              border:'1px solid #fcd34d', fontSize:12, color:'#92400e', fontWeight:600 }}>
              ⚠ No approved submissions — showing placeholder data
            </div>
          )}
        </div>
      </div>
    </div>
  )
}