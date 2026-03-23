import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubmissions } from '../hooks/useSubmissions'
import { useOrganizations } from '../hooks/useOrganizations'
import { useCardTemplates } from '../hooks/useCardTemplates'
import { Btn, Spinner } from '../components/shared/index'
import toast from 'react-hot-toast'

/* ─── Default config ─────────────────────────────────────────── */
const DEFAULT_CONFIG = {
  c1: '#555555', c2: '#333333', accent: '#f5f5f5',
  layout: 'portrait',
  photoShape: 'rounded',
  showBarcode: false,
  showQR: false,
  fontSize: 'md',
  headerStyle: 'solid',
  logoPosition: 'left',
  borderStyle: 'none',
  visibleFields: [],
  fieldOrder: [],   // NEW — stores drag-and-drop order
}

const ALL_FIELDS = [
  { key:'name',             label:'Full Name',        icon:'👤' },
  { key:'class',            label:'Class',            icon:'🏫' },
  { key:'section',          label:'Section',          icon:'📌' },
  { key:'roll_number',      label:'Roll Number',      icon:'🎯' },
  { key:'admission_number', label:'Admission No.',    icon:'🔢' },
  { key:'date_of_birth',    label:'Date of Birth',    icon:'🎂' },
  { key:'blood_group',      label:'Blood Group',      icon:'🩸' },
  { key:'contact_number',   label:'Contact Number',   icon:'📱' },
  { key:'emergency_contact',label:'Emergency Contact',icon:'🚨' },
  { key:'address',          label:'Address',          icon:'📍' },
  { key:'designation',      label:'Designation',      icon:'💼' },
  { key:'department',       label:'Department',       icon:'🏢' },
  { key:'mode_of_transport',label:'Transport Mode',   icon:'🚌' },
]

const FONT_SIZES = { sm:{name:11,value:12}, md:{name:13,value:14}, lg:{name:15,value:16} }

/* ─── Live Card Preview ──────────────────────────────────────── */
function CardPreview({ config, sub, orgName }) {
  const fs   = FONT_SIZES[config.fontSize] || FONT_SIZES.md
  const name = orgName || sub?.school_name || 'Organization Name'

  /* Use fieldOrder if set, else visibleFields order */
  const orderedFields = (config.fieldOrder?.length > 0
    ? config.fieldOrder.filter(k => config.visibleFields.includes(k))
    : config.visibleFields
  ).map(k => ALL_FIELDS.find(f => f.key === k)).filter(Boolean).filter(f => f.key !== 'name')

  const photoStyle = {
    width:64, height:80, overflow:'hidden', flexShrink:0,
    border:`2px solid ${config.c1}`,
    background:config.accent,
    display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius: config.photoShape==='circle'?'50%': config.photoShape==='square'?4:10,
  }
  const headerBg   = config.headerStyle==='solid' ? config.c1 : `linear-gradient(135deg,${config.c1},${config.c2})`
  const cardBorder = config.borderStyle==='none' ? 'none' : config.borderStyle==='thick' ? `3px solid ${config.c1}` : `1px solid #e8eaf0`

  return (
    <div id="preview-card" style={{ width:config.layout==='landscape'?380:280, background:'#fff', borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,.15)', border:cardBorder, fontFamily:'Instrument Sans,sans-serif', transition:'all .3s' }}>
      <div style={{ background:headerBg, padding:'14px 16px', display:'flex', alignItems:'center', gap:10, justifyContent:config.logoPosition==='center'?'center':'flex-start', flexDirection:config.logoPosition==='center'?'column':'row' }}>
        <div style={{ width:36, height:36, borderRadius:8, background:'rgba(255,255,255,.22)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:13, color:'#fff', flexShrink:0 }}>
          {name.slice(0,2).toUpperCase()}
        </div>
        <div style={{ textAlign:config.logoPosition==='center'?'center':'left' }}>
          <div style={{ fontFamily:'Outfit,sans-serif', fontSize:fs.name+1, fontWeight:800, color:'#fff', lineHeight:1.3 }}>{name}</div>
          <div style={{ fontSize:fs.name-2, color:'rgba(255,255,255,.75)', marginTop:1 }}>{sub?.role||'Student'} Identity Card</div>
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', gap:12, marginBottom:12 }}>
          <div style={photoStyle}>
            {sub?.photo_url ? <img src={sub.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/> : <span style={{ fontSize:28 }}>👤</span>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:fs.value+1, fontWeight:800, color:'#0b0f1e', lineHeight:1.2, marginBottom:4 }}>{sub?.name||'Full Name'}</div>
            {sub?.designation && <div style={{ fontSize:fs.name, color:config.c1, fontWeight:700, marginBottom:3 }}>{sub.designation}</div>}
            {sub?.class && <div style={{ fontSize:fs.name, color:'#666' }}>Class {sub.class}{sub.section?`-${sub.section}`:''}</div>}
            {sub?.roll_number && <div style={{ fontSize:fs.name, color:'#666' }}>Roll No: {sub.roll_number}</div>}
          </div>
        </div>
        {orderedFields.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:config.layout==='landscape'?'1fr 1fr 1fr':'1fr 1fr', gap:8, paddingTop:10, borderTop:'1px solid #f0f0f0' }}>
            {orderedFields.map(f => {
              const val = sub?.[f.key]
              return val ? (
                <div key={f.key} style={f.key==='address'?{gridColumn:'1/-1'}:{}}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.4 }}>{f.label}</div>
                  <div style={{ fontSize:fs.name, fontWeight:600, color:'#1a1a2e', marginTop:1 }}>{val}</div>
                </div>
              ) : null
            })}
          </div>
        )}
      </div>
      <div style={{ background:`${config.c1}18`, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${config.c1}22` }}>
        {config.showBarcode && (
          <div style={{ display:'flex', gap:1.5, alignItems:'flex-end' }}>
            {Array.from({length:22},(_,i)=><div key={i} style={{ width:1.5+Math.abs(Math.sin(i*2.3)), height:16+Math.abs(Math.cos(i*1.7))*10, background:config.c1, opacity:.7, borderRadius:1 }}/>)}
          </div>
        )}
        {config.showQR && (
          <div style={{ width:36, height:36, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:1 }}>
            {Array.from({length:25},(_,i)=><div key={i} style={{ borderRadius:1, background:(Math.sin(i*3.7)*Math.cos(i*2.1))>0?config.c1:'transparent', aspectRatio:1 }}/>)}
          </div>
        )}
        <div style={{ fontSize:9, fontFamily:'JetBrains Mono,monospace', color:config.c1, fontWeight:600, opacity:.8 }}>
          {(sub?.id||'ID000000').slice(0,8).toUpperCase()}
        </div>
      </div>
    </div>
  )
}

/* ─── Drag-and-drop field list ───────────────────────────────── */
function DraggableFields({ config, setConfig }) {
  const dragItem  = useRef(null)
  const dragOver  = useRef(null)

  /* Ordered list of currently visible fields */
  const orderedVisible = (config.fieldOrder?.length > 0
    ? config.fieldOrder.filter(k => config.visibleFields.includes(k))
    : config.visibleFields
  ).map(k => ALL_FIELDS.find(f => f.key === k)).filter(Boolean)

  /* Fields not yet added */
  const unselected = ALL_FIELDS.filter(f => !config.visibleFields.includes(f.key))

  const toggleField = (key) => {
    setConfig(p => {
      const isOn = p.visibleFields.includes(key)
      const newVisible = isOn ? p.visibleFields.filter(k=>k!==key) : [...p.visibleFields, key]
      const newOrder   = isOn
        ? (p.fieldOrder||[]).filter(k=>k!==key)
        : [...(p.fieldOrder||p.visibleFields), key]
      return { ...p, visibleFields: newVisible, fieldOrder: newOrder }
    })
  }

  const onDragStart = (e, idx) => {
    dragItem.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragEnter = (e, idx) => { dragOver.current = idx }
  const onDragEnd   = () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
      dragItem.current = null; dragOver.current = null; return
    }
    const newOrder = [...orderedVisible.map(f=>f.key)]
    const [moved]  = newOrder.splice(dragItem.current, 1)
    newOrder.splice(dragOver.current, 0, moved)
    dragItem.current = null; dragOver.current = null
    setConfig(p => ({ ...p, fieldOrder: newOrder }))
  }

  return (
    <div>
      {/* Active fields — draggable */}
      {orderedVisible.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
            Active Fields — drag to reorder
          </div>
          {orderedVisible.map((f, idx) => (
            <div
              key={f.key}
              draggable
              onDragStart={e => onDragStart(e, idx)}
              onDragEnter={e => onDragEnter(e, idx)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--blue)', background:'var(--blue-s)', cursor:'grab', marginBottom:6, transition:'all .15s', userSelect:'none' }}>
              {/* Drag handle */}
              <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0, opacity:.5 }}>
                {[0,1,2].map(i=><div key={i} style={{ width:14, height:2, background:'var(--blue)', borderRadius:2 }}/>)}
              </div>
              <span style={{ fontSize:13 }}>{f.icon}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--blue)' }}>{f.label}</span>
              <span style={{ fontSize:10, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace' }}>#{idx+1}</span>
              {/* Remove */}
              <button onClick={() => toggleField(f.key)}
                style={{ width:20, height:20, borderRadius:'50%', border:'none', background:'rgba(35,82,255,.15)', color:'var(--blue)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      {orderedVisible.length > 0 && unselected.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <div style={{ flex:1, height:1, background:'var(--border)' }}/>
          <span style={{ fontSize:11, color:'var(--ink3)', fontWeight:600 }}>Add more fields</span>
          <div style={{ flex:1, height:1, background:'var(--border)' }}/>
        </div>
      )}

      {/* Unselected fields — click to add */}
      {unselected.length > 0 && (
        <div style={{ marginBottom:8 }}>
          {orderedVisible.length === 0 && (
            <p style={{ fontSize:12, color:'var(--ink3)', marginBottom:10, lineHeight:1.5 }}>
              Click fields below to add them. Drag active fields to reorder.
            </p>
          )}
          {unselected.map(f => (
            <div key={f.key} onClick={() => toggleField(f.key)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', background:'var(--paper)', cursor:'pointer', marginBottom:6, transition:'all .15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='var(--blue-s)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--paper)' }}>
              <span style={{ fontSize:13 }}>{f.icon}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:400, color:'var(--ink2)' }}>{f.label}</span>
              <span style={{ fontSize:16, color:'var(--ink3)' }}>+</span>
            </div>
          ))}
        </div>
      )}

      {orderedVisible.length === 0 && unselected.length === 0 && (
        <p style={{ fontSize:12, color:'var(--ink3)' }}>All fields added.</p>
      )}
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────────── */
function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' }}>
      <span style={{ fontSize:13, color:'var(--ink2)', fontWeight:500 }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <input type="color" value={value} onChange={e=>onChange(e.target.value)}
          style={{ width:32, height:32, borderRadius:8, border:'1.5px solid var(--border)', padding:2, cursor:'pointer', background:'none' }}/>
        <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'var(--ink3)' }}>{value}</span>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:10, paddingBottom:6, borderBottom:'1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  )
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display:'flex', background:'var(--paper3)', borderRadius:8, padding:3, gap:2 }}>
      {options.map(o=>(
        <button key={o.value} onClick={()=>onChange(o.value)}
          style={{ flex:1, padding:'6px 8px', borderRadius:6, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s', background:value===o.value?'var(--paper)':'transparent', color:value===o.value?'var(--blue)':'var(--ink3)', boxShadow:value===o.value?'0 1px 4px rgba(0,0,0,.1)':'none', fontFamily:'inherit' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Main builder ───────────────────────────────────────────── */
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
  const [activeTab,    setActiveTab]    = useState('style')

  const approved   = submissions.filter(s => s.status === 'approved')
  const previewSub = approved[previewIdx] || null
  const orgName    = organizations.find(o => o.id === selectedOrg)?.name || previewSub?.school_name || ''

  const upd = useCallback((key, val) => setConfig(p => ({ ...p, [key]: val })), [])

  const handleSave = async () => {
    if (!templateName.trim()) { toast.error('Enter a template name'); return }
    if (config.visibleFields.length === 0) { toast.error('Add at least one field in the Fields tab'); return }
    setSaving(true)
    try {
      await saveTemplate({ name: templateName.trim(), org_id: selectedOrg||null, org_name: orgName||null, config })
      toast.success('Template saved!')
      navigate('/templates')
    } catch (err) { toast.error(err.message || 'Failed to save template') }
    finally { setSaving(false) }
  }

  if (subLoading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><Spinner size={40}/></div>

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', paddingTop:64, background:'var(--paper2)' }}>

      {/* ── Top bar ── */}
      <div style={{ height:56, background:'var(--paper)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={()=>navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--ink3)', padding:'4px 8px' }}>←</button>
          <input value={templateName} onChange={e=>setTemplateName(e.target.value)}
            style={{ border:'none', borderBottom:'2px solid var(--blue)', fontSize:16, fontWeight:700, color:'var(--ink)', background:'transparent', outline:'none', fontFamily:'Outfit,sans-serif', minWidth:220, padding:'4px 0' }}
            placeholder="Enter template name..."/>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--ink3)' }}>Live preview with real data</span>
          <Btn variant="ghost" size="sm" onClick={()=>navigate(-1)}>Cancel</Btn>
          <Btn size="sm" onClick={handleSave} disabled={saving}>{saving?'⏳ Saving...':'💾 Save Template'}</Btn>
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'300px 1fr 280px', overflow:'hidden' }}>

        {/* ── LEFT: Controls ── */}
        <div style={{ background:'var(--paper)', borderRight:'1px solid var(--border)', overflowY:'auto', padding:'20px 18px' }}>
          {/* Tabs */}
          <div style={{ display:'flex', background:'var(--paper3)', borderRadius:8, padding:3, marginBottom:20 }}>
            {[['style','🎨 Style'],['fields','📋 Fields'],['settings','⚙ Settings']].map(([id,label])=>(
              <button key={id} onClick={()=>setActiveTab(id)}
                style={{ flex:1, padding:'7px 4px', borderRadius:6, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s', background:activeTab===id?'var(--paper)':'transparent', color:activeTab===id?'var(--blue)':'var(--ink3)', fontFamily:'inherit', boxShadow:activeTab===id?'0 1px 4px rgba(0,0,0,.1)':'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* STYLE TAB */}
          {activeTab==='style' && (
            <>
              <Section title="Organization">
                <select value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', fontSize:13, color:'var(--ink)', background:'var(--paper)', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                  <option value="">-- No specific org --</option>
                  {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Section>
              <Section title="Colors">
                <ColorRow label="Primary"   value={config.c1}     onChange={v=>upd('c1',v)}/>
                <ColorRow label="Secondary" value={config.c2}     onChange={v=>upd('c2',v)}/>
                <ColorRow label="Accent"    value={config.accent} onChange={v=>upd('accent',v)}/>
              </Section>
              <Section title="Header Style">
                <ToggleGroup value={config.headerStyle} onChange={v=>upd('headerStyle',v)}
                  options={[{value:'gradient',label:'Gradient'},{value:'solid',label:'Solid'}]}/>
              </Section>
              <Section title="Logo Position">
                <ToggleGroup value={config.logoPosition} onChange={v=>upd('logoPosition',v)}
                  options={[{value:'left',label:'Left'},{value:'center',label:'Center'}]}/>
              </Section>
              <Section title="Photo Shape">
                <ToggleGroup value={config.photoShape} onChange={v=>upd('photoShape',v)}
                  options={[{value:'square',label:'Square'},{value:'rounded',label:'Rounded'},{value:'circle',label:'Circle'}]}/>
              </Section>
              <Section title="Border">
                <ToggleGroup value={config.borderStyle} onChange={v=>upd('borderStyle',v)}
                  options={[{value:'none',label:'None'},{value:'thin',label:'Thin'},{value:'thick',label:'Thick'}]}/>
              </Section>
            </>
          )}

          {/* FIELDS TAB — drag and drop */}
          {activeTab==='fields' && (
            <DraggableFields config={config} setConfig={setConfig}/>
          )}

          {/* SETTINGS TAB */}
          {activeTab==='settings' && (
            <>
              <Section title="Layout">
                <ToggleGroup value={config.layout} onChange={v=>upd('layout',v)}
                  options={[{value:'portrait',label:'Portrait'},{value:'landscape',label:'Landscape'}]}/>
              </Section>
              <Section title="Font Size">
                <ToggleGroup value={config.fontSize} onChange={v=>upd('fontSize',v)}
                  options={[{value:'sm',label:'Small'},{value:'md',label:'Medium'},{value:'lg',label:'Large'}]}/>
              </Section>
              <Section title="Footer">
                {[['showBarcode','Show Barcode'],['showQR','Show QR Code']].map(([key,label])=>(
                  <label key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', cursor:'pointer', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:13, color:'var(--ink2)', fontWeight:500 }}>{label}</span>
                    <div onClick={()=>upd(key,!config[key])}
                      style={{ width:40, height:22, borderRadius:11, background:config[key]?'var(--blue)':'var(--border2)', transition:'background .2s', cursor:'pointer', position:'relative' }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:2, transition:'left .2s', left:config[key]?'20px':'2px', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                    </div>
                  </label>
                ))}
              </Section>
            </>
          )}
        </div>

        {/* ── CENTER: Live Preview ── */}
        <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 24px', gap:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--paper)', borderRadius:'var(--r)', padding:'8px 16px', border:'1px solid var(--border)', boxShadow:'var(--shadow)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--teal)', animation:'pulseDot 2s infinite' }}/>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--ink2)' }}>Live Preview</span>
            <span style={{ fontSize:11, color:'var(--ink3)' }}>— updates instantly</span>
          </div>

          <CardPreview config={config} sub={previewSub} orgName={orgName}/>

          {/* Field order hint */}
          {config.visibleFields.length > 0 && (
            <div style={{ padding:'10px 14px', background:'var(--blue-s)', borderRadius:'var(--r)', border:'1px solid var(--blue-m)', fontSize:12, color:'var(--blue)', fontWeight:600, maxWidth:380, width:'100%', textAlign:'center' }}>
              📋 {config.visibleFields.length} field{config.visibleFields.length!==1?'s':''} selected · Go to Fields tab to drag and reorder
            </div>
          )}

          {/* Preview submission switcher */}
          {approved.length > 0 && (
            <div style={{ background:'var(--paper)', borderRadius:'var(--rl)', padding:16, border:'1px solid var(--border)', width:'100%', maxWidth:380 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Preview with</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                {approved.map((s,i)=>(
                  <div key={s.id} onClick={()=>setPreviewIdx(i)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:'var(--r)', border:`1.5px solid ${previewIdx===i?'var(--blue)':'var(--border)'}`, background:previewIdx===i?'var(--blue-s)':'var(--paper)', cursor:'pointer', transition:'all .15s' }}>
                    {s.photo_url
                      ? <img src={s.photo_url} style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt=""/>
                      : <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--blue-s)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--blue)', flexShrink:0 }}>{(s.name||'?').slice(0,2).toUpperCase()}</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:previewIdx===i?'var(--blue)':'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'var(--ink3)' }}>{s.school_name} · {s.role}</div>
                    </div>
                    {previewIdx===i && <span style={{ fontSize:14, color:'var(--blue)' }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {approved.length === 0 && (
            <div style={{ padding:'16px 20px', background:'var(--amber-s)', borderRadius:'var(--r)', border:'1px solid #fcd34d', fontSize:13, color:'#92400e', fontWeight:600, textAlign:'center', maxWidth:380, width:'100%' }}>
              ⚠ No approved submissions yet. Approve some in Admin panel to preview with real data.
            </div>
          )}
        </div>

        {/* ── RIGHT: Config summary ── */}
        <div style={{ background:'var(--paper)', borderLeft:'1px solid var(--border)', overflowY:'auto', padding:'20px 16px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:14 }}>Current Config</div>
          {[
            ['Layout',  config.layout],
            ['Photo',   config.photoShape],
            ['Font',    config.fontSize],
            ['Header',  config.headerStyle],
            ['Border',  config.borderStyle],
            ['Barcode', config.showBarcode?'On':'Off'],
            ['QR Code', config.showQR?'On':'Off'],
            ['Fields',  config.visibleFields.length===0?'⚠ None':''+config.visibleFields.length+' added'],
          ].map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:7, paddingBottom:7, borderBottom:'1px solid var(--border)' }}>
              <span style={{ color:'var(--ink3)' }}>{k}</span>
              <span style={{ color:v.startsWith('⚠')?'var(--red)':'var(--ink)', fontWeight:600 }}>{v}</span>
            </div>
          ))}

          {config.visibleFields.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, margin:'16px 0 10px' }}>Field Order</div>
              {(config.fieldOrder?.length>0?config.fieldOrder.filter(k=>config.visibleFields.includes(k)):config.visibleFields).map((key,i)=>{
                const f = ALL_FIELDS.find(x=>x.key===key)
                return f ? (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginBottom:5 }}>
                    <span style={{ color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace', fontSize:11, minWidth:18 }}>#{i+1}</span>
                    <span style={{ fontSize:13 }}>{f.icon}</span>
                    <span style={{ color:'var(--ink)', fontWeight:500 }}>{f.label}</span>
                  </div>
                ) : null
              })}
            </>
          )}

          <div style={{ height:1, background:'var(--border)', margin:'16px 0' }}/>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Colors</div>
          {[['Primary',config.c1],['Secondary',config.c2],['Accent',config.accent]].map(([label,color])=>(
            <div key={label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:24, height:24, borderRadius:6, background:color, border:'1px solid var(--border)', flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{label}</div>
                <div style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--ink3)' }}>{color}</div>
              </div>
            </div>
          ))}

          {config.visibleFields.length === 0 && (
            <div style={{ marginTop:16, padding:'10px 12px', background:'var(--amber-s)', borderRadius:'var(--r)', border:'1px solid #fcd34d', fontSize:12, color:'#92400e', fontWeight:600 }}>
              ⚠ Go to Fields tab and add at least one field.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}