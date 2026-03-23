import { forwardRef } from 'react'

/* ── Built-in templates (used when no customConfig) ── */
const TEMPLATES = {
  T1: { name: 'Royal Blue',  c1: '#2352ff', c2: '#1538d4', accent: '#e8ecff' },
  T2: { name: 'Emerald',     c1: '#059669', c2: '#047857', accent: '#d1fae5' },
  T3: { name: 'Deep Maroon', c1: '#9f1239', c2: '#881337', accent: '#ffe4e6' },
}

/* ── All field definitions — matches IDCardBuilder exactly ── */
const ALL_FIELDS = [
  { key:'name',             label:'Full Name'         },
  { key:'class',            label:'Class'             },
  { key:'section',          label:'Section'           },
  { key:'roll_number',      label:'Roll No.'          },
  { key:'admission_number', label:'Admission No.'     },
  { key:'date_of_birth',    label:'Date of Birth'     },
  { key:'blood_group',      label:'Blood Group'       },
  { key:'contact_number',   label:'Contact'           },
  { key:'emergency_contact',label:'Emergency Contact' },
  { key:'address',          label:'Address'           },
  { key:'designation',      label:'Designation'       },
  { key:'department',       label:'Department'        },
  { key:'mode_of_transport',label:'Transport'         },
]

/* ── Default positions — matches IDCardBuilder exactly ── */
const DEFAULT_POSITIONS = {
  name:              { x: 110, y: 100 },
  class:             { x: 110, y: 130 },
  section:           { x: 200, y: 130 },
  roll_number:       { x: 110, y: 155 },
  admission_number:  { x: 110, y: 178 },
  date_of_birth:     { x: 16,  y: 220 },
  blood_group:       { x: 175, y: 220 },
  contact_number:    { x: 16,  y: 255 },
  emergency_contact: { x: 16,  y: 288 },
  address:           { x: 16,  y: 320 },
  designation:       { x: 110, y: 118 },
  department:        { x: 110, y: 140 },
  mode_of_transport: { x: 16,  y: 355 },
}

/* ══════════════════════════════════════════════════════════════
   IDCard — renders in two modes:

   MODE 1 — customConfig provided (from IDCardBuilder / DB):
     Renders card at 340×480 with exact positions, photo size/pos,
     visible fields, border style, header style, photo shape, barcode
     — exactly matching what was designed in the builder.

   MODE 2 — templateId provided (built-in T1/T2/T3):
     Renders the classic fixed-layout 280px card.
══════════════════════════════════════════════════════════════ */
const IDCard = forwardRef(function IDCard(
  { submission, templateId = 'T1', customConfig = null, orgLogo = null,
    showActions = true, onDelete, onDownload },
  ref
) {
  const sub = submission || {}

  /* ── MODE 1: Custom template from builder ── */
  if (customConfig) {
    const c            = customConfig
    const c1           = c.c1     || '#2352ff'
    const c2           = c.c2     || '#1538d4'
    const accent       = c.accent || '#e8ecff'

    const headerBg     = c.headerStyle === 'gradient'
      ? `linear-gradient(135deg,${c1},${c2})` : c1

    const cardBorder   = c.borderStyle === 'none'  ? 'none'
      : c.borderStyle === 'thick' ? `3px solid ${c1}` : `1.5px solid ${c1}55`

    const photoRadius  = c.photoShape === 'circle'  ? '50%'
      : c.photoShape === 'square' ? 4 : 10

    const pw = c.photoSize || 72
    const ph = Math.round(pw * 4 / 3)
    const px = c.photoX ?? 16
    const py = c.photoY ?? 90

    const visibleFields = ALL_FIELDS.filter(f =>
      (c.visibleFields || []).includes(f.key)
    )

    const getPos = (key) =>
      c.fieldPositions?.[key] || DEFAULT_POSITIONS[key] || { x: 20, y: 200 }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        {/* Card — 340×480 matches builder exactly */}
        <div
          ref={ref}
          id={`card-${sub.id}`}
          style={{
            position:     'relative',
            width:        340,
            height:       480,
            background:   '#fff',
            borderRadius: 16,
            overflow:     'hidden',
            border:       cardBorder,
            boxShadow:    '0 4px 20px rgba(0,0,0,.12)',
            fontFamily:   'Instrument Sans,sans-serif',
          }}>

          {/* Header */}
          <div style={{
            background:     headerBg,
            height:         80,
            display:        'flex',
            alignItems:     'center',
            gap:            12,
            padding:        '0 16px',
            justifyContent: c.logoPosition === 'center' ? 'center' : 'flex-start',
            flexDirection:  c.logoPosition === 'center' ? 'column' : 'row',
          }}>
            <div style={{
              width:46, height:46, borderRadius:10,
              background:'rgba(255,255,255,.22)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:15,
              color:'#fff', flexShrink:0, overflow:'hidden',
              border:'1.5px solid rgba(255,255,255,.3)',
            }}>
              {orgLogo
                ? <img src={orgLogo} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" crossOrigin="anonymous"/>
                : (sub.school_name || 'SC').slice(0,2).toUpperCase()
              }
            </div>
            <div style={{ textAlign: c.logoPosition === 'center' ? 'center' : 'left' }}>
              <div style={{ fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:800, color:'#fff', lineHeight:1.3 }}>
                {sub.school_name || 'Organization'}
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.75)', marginTop:2 }}>
                {sub.role || 'Student'} Identity Card
              </div>
            </div>
          </div>

          {/* Photo — exact position + size from builder */}
          <div style={{
            position:     'absolute',
            left:         px,
            top:          py,
            width:        pw,
            height:       ph,
            borderRadius: photoRadius,
            border:       `2.5px solid ${c1}`,
            background:   accent,
            overflow:     'hidden',
            display:      'flex',
            alignItems:   'center',
            justifyContent:'center',
          }}>
            {sub.photo_url
              ? <img src={sub.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
              : <span style={{ fontSize: Math.round(pw * 0.38) }}>👤</span>
            }
          </div>

          {/* Fields — rendered at exact saved positions */}
          {visibleFields.map(f => {
            const pos = getPos(f.key)
            const val = sub[f.key]
            if (!val) return null
            return (
              <div key={f.key} style={{
                position:'absolute', left:pos.x, top:pos.y,
                padding:'2px 6px',
              }}>
                <div style={{ fontSize:8, fontWeight:700, color:'#bbb',
                  textTransform:'uppercase', letterSpacing:.4 }}>{f.label}</div>
                <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e',
                  marginTop:1, whiteSpace:'nowrap' }}>{val}</div>
              </div>
            )
          })}

          {/* Barcode */}
          {c.showBarcode !== false && (
            <div style={{
              position:'absolute', bottom:0, left:0, right:0,
              background:`${c1}12`, padding:'8px 16px',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              borderTop:`1px solid ${c1}22`,
            }}>
              <div style={{ display:'flex', gap:1.5, alignItems:'flex-end' }}>
                {Array.from({length:28},(_,i) => (
                  <div key={i} style={{ width:1.5, height:10+Math.abs(Math.sin(i*2.3))*12,
                    background:c1, opacity:.6, borderRadius:1 }}/>
                ))}
              </div>
              <div style={{ fontSize:9, fontFamily:'JetBrains Mono,monospace',
                color:c1, fontWeight:600, opacity:.8 }}>
                {(sub.id||'ID000000').slice(0,8).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {showActions && (
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <button onClick={onDownload}
              style={{ flex:1, padding:'8px', borderRadius:8, background:'#e0faf2',
                color:'#00875f', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}
              onMouseEnter={e=>e.target.style.background='#00c48c'}
              onMouseLeave={e=>e.target.style.background='#e0faf2'}>
              ↓ Download
            </button>
            <button onClick={onDelete}
              style={{ flex:1, padding:'8px', borderRadius:8, background:'#fee2e2',
                color:'#b91c1c', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}
              onMouseEnter={e=>e.target.style.background='#ef4444'}
              onMouseLeave={e=>e.target.style.background='#fee2e2'}>
              🗑 Delete
            </button>
          </div>
        )}
      </div>
    )
  }

  /* ── MODE 2: Built-in template (T1 / T2 / T3) ── */
  const t = TEMPLATES[templateId] || TEMPLATES.T1

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <div ref={ref} id={`card-${sub.id}`}
        style={{ width:280, background:'#fff', borderRadius:14, overflow:'hidden',
          boxShadow:'0 4px 20px rgba(0,0,0,.12)', border:'1px solid #e8eaf0',
          fontFamily:'Instrument Sans,sans-serif' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${t.c1},${t.c2})`,
          padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:8, background:'rgba(255,255,255,.22)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:13, color:'#fff',
            flexShrink:0, overflow:'hidden', border:'1.5px solid rgba(255,255,255,.25)' }}>
            {orgLogo
              ? <img src={orgLogo} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" crossOrigin="anonymous"/>
              : (sub.school_name || 'SC').slice(0,2).toUpperCase()
            }
          </div>
          <div>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:800, color:'#fff', lineHeight:1.3 }}>
              {sub.school_name || 'School Name'}
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.75)', marginTop:1 }}>
              {sub.role || 'Student'} Identity Card
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', gap:12, marginBottom:12 }}>
            <div style={{ width:64, height:80, borderRadius:8, border:`2px solid ${t.c1}`,
              overflow:'hidden', flexShrink:0, background:t.accent,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              {sub.photo_url
                ? <img src={sub.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                : <span style={{ fontSize:28 }}>👤</span>
              }
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:800,
                color:'#0b0f1e', lineHeight:1.2, marginBottom:4 }}>
                {sub.name || 'Full Name'}
              </div>
              {sub.designation    && <div style={{ fontSize:11, color:t.c1, fontWeight:700, marginBottom:3 }}>{sub.designation}</div>}
              {sub.class          && <div style={{ fontSize:11, color:'#666' }}>Class {sub.class}{sub.section?`-${sub.section}`:''}</div>}
              {sub.roll_number    && <div style={{ fontSize:11, color:'#666' }}>Roll No: {sub.roll_number}</div>}
              {sub.admission_number && <div style={{ fontSize:11, color:'#666' }}>Adm: {sub.admission_number}</div>}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8,
            paddingTop:10, borderTop:'1px solid #f0f0f0' }}>
            {[
              ['Date of Birth', sub.date_of_birth],
              ['Blood Group',   sub.blood_group],
              ['Contact',       sub.contact_number],
              ['Emergency',     sub.emergency_contact],
              ['Department',    sub.department],
              ['Transport',     sub.mode_of_transport],
            ].map(([label, value]) => value ? (
              <div key={label}>
                <div style={{ fontSize:9, fontWeight:700, color:'#999',
                  textTransform:'uppercase', letterSpacing:.4 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', marginTop:1 }}>{value}</div>
              </div>
            ) : null)}
            {sub.address && (
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#999',
                  textTransform:'uppercase', letterSpacing:.4 }}>Address</div>
                <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', marginTop:1 }}>{sub.address}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background:`linear-gradient(135deg,${t.c1}18,${t.c2}10)`,
          padding:'10px 16px', display:'flex', justifyContent:'space-between',
          alignItems:'center', borderTop:`1px solid ${t.c1}22` }}>
          <div style={{ display:'flex', gap:1.5, alignItems:'flex-end' }}>
            {Array.from({length:22},(_,i) => (
              <div key={i} style={{ width:1.5+Math.abs(Math.sin(i*2.3))*1,
                height:16+Math.abs(Math.cos(i*1.7))*10, background:t.c1,
                opacity:.7, borderRadius:1 }}/>
            ))}
          </div>
          <div style={{ fontSize:9, fontFamily:'JetBrains Mono,monospace',
            color:t.c1, fontWeight:600, opacity:.8 }}>
            {(sub.id||'ID000000').slice(0,8).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <button onClick={onDownload}
            style={{ flex:1, padding:'8px', borderRadius:8, background:'#e0faf2',
              color:'#00875f', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}
            onMouseEnter={e=>e.target.style.background='#00c48c'}
            onMouseLeave={e=>e.target.style.background='#e0faf2'}>
            ↓ Download
          </button>
          <button onClick={onDelete}
            style={{ flex:1, padding:'8px', borderRadius:8, background:'#fee2e2',
              color:'#b91c1c', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}
            onMouseEnter={e=>e.target.style.background='#ef4444'}
            onMouseLeave={e=>e.target.style.background='#fee2e2'}>
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  )
})

export default IDCard
export { TEMPLATES }