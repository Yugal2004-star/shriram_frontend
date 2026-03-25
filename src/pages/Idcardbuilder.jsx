import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubmissions } from '../hooks/useSubmissions'
import { useOrganizations } from '../hooks/useOrganizations'
import { useCardTemplates } from '../hooks/useCardtemplates'
import { Btn, Spinner } from '../components/shared/index'
import { uploadBgImage } from '../lib/supabase'
import toast from 'react-hot-toast'

const SNAP         = 8
const GUIDE_THRESH = 7

const SIZE_PRESETS = {
  standard:  { label:'Standard',  w:340, h:480 },
  large:     { label:'Large',     w:400, h:560 },
  small:     { label:'Small',     w:280, h:400 },
  landscape: { label:'Landscape', w:500, h:320 },
  square:    { label:'Square',    w:380, h:380 },
}

const ALL_FIELDS = [
  { key:'name',              label:'Full Name',         icon:'👤' },
  { key:'class',             label:'Class',             icon:'🏫' },
  { key:'section',           label:'Section',           icon:'📌' },
  { key:'roll_number',       label:'Roll No.',          icon:'🎯' },
  { key:'admission_number',  label:'Admission No.',     icon:'🔢' },
  { key:'date_of_birth',     label:'Date of Birth',     icon:'🎂' },
  { key:'blood_group',       label:'Blood Group',       icon:'🩸' },
  { key:'contact_number',    label:'Contact',           icon:'📱' },
  { key:'emergency_contact', label:'Emergency Contact', icon:'🚨' },
  { key:'address',           label:'Address',           icon:'📍' },
  { key:'designation',       label:'Designation',       icon:'💼' },
  { key:'department',        label:'Department',        icon:'🏢' },
  { key:'mode_of_transport', label:'Transport',         icon:'🚌' },
]

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
  c1:'#2352ff', c2:'#1538d4', accent:'#e8ecff',
  photoShape:'rounded', showHeader:true, showBarcode:true,
  headerStyle:'gradient', logoPosition:'left',
  borderStyle:'thin', fontSize:'md', orientation:'portrait',
  sizePreset:'standard', cardW:340, cardH:480,
  bgImage:null, bgOpacity:0.15, bgFit:'cover',
  visibleFields:['name','class','roll_number','blood_group','contact_number'],
  fieldPositions:{}, photoX:16, photoY:90, photoSize:72,
}

const snapTo = (v) => Math.round(v / SNAP) * SNAP

function computeGuides(dragKey, dragX, dragY, dragW, dragH, otherItems) {
  const guides = []
  const dCX = dragX + dragW / 2, dCY = dragY + dragH / 2
  const dR  = dragX + dragW,     dB  = dragY + dragH
  for (const it of otherItems) {
    const { x, y, w = 90, h = 32 } = it
    const iCX = x + w / 2, iCY = y + h / 2
    const iR  = x + w,     iB  = y + h
    const vPairs = [
      [dragX, x,   'L-L'], [dragX, iR,  'L-R'], [dCX, iCX, 'C-C'],
      [dR,   x,    'R-L'], [dR,   iR,   'R-R'],
    ]
    for (const [a, b, label] of vPairs) {
      if (Math.abs(a - b) <= GUIDE_THRESH)
        guides.push({ axis:'v', pos:b, from:Math.min(dragY,y)-8, to:Math.max(dB,iB)+8, label })
    }
    const hPairs = [
      [dragY, y,   'T-T'], [dragY, iB,  'T-B'], [dCY, iCY, 'M-M'],
      [dB,   y,    'B-T'], [dB,   iB,   'B-B'],
    ]
    for (const [a, b, label] of hPairs) {
      if (Math.abs(a - b) <= GUIDE_THRESH)
        guides.push({ axis:'h', pos:b, from:Math.min(dragX,x)-8, to:Math.max(dR,iR)+8, label })
    }
  }
  return guides
}

/* ══════════════════════════════════════════════════════════
   CARD CANVAS
══════════════════════════════════════════════════════════ */
function CardCanvas({ config, sub, orgName, onMove, selected, onSelect, multiSelected, onMultiSelect }) {
  const dragRef   = useRef(null)
  const [guides,  setGuides]  = useState([])
  const isDragging = useRef(false)
  const CW = config.cardW || 340
  const CH = config.cardH || 480
  const headerBg    = config.headerStyle==='gradient' ? `linear-gradient(135deg,${config.c1},${config.c2})` : config.c1
  const cardBorder  = config.borderStyle==='none' ? 'none' : config.borderStyle==='thick' ? `3px solid ${config.c1}` : `1.5px solid ${config.c1}55`
  const photoRadius = config.photoShape==='circle' ? '50%' : config.photoShape==='square' ? 4 : 10
  const getFieldPos = (key) => config.fieldPositions?.[key] || DEFAULT_FIELD_POSITIONS[key] || { x:20, y:200 }

  const getAllItems = useCallback((excludeKey) => {
    const items = []
    ALL_FIELDS.filter(f => config.visibleFields.includes(f.key)).forEach(f => {
      if (f.key === excludeKey) return
      const p = getFieldPos(f.key)
      items.push({ key:f.key, x:p.x, y:p.y, w:90, h:32 })
    })
    if (excludeKey !== '__photo__') {
      const pw = config.photoSize||72
      items.push({ key:'__photo__', x:config.photoX??16, y:config.photoY??90, w:pw, h:Math.round(pw*4/3) })
    }
    return items
  }, [config])

  const startDrag = (e, key, curX, curY) => {
    e.preventDefault(); e.stopPropagation()
    onSelect(key)
    isDragging.current = false
    const pw = config.photoSize||72, ph = Math.round(pw*4/3)
    const isPhoto = key==='__photo__'
    const iW = isPhoto ? pw : 90, iH = isPhoto ? ph : 32
    dragRef.current = { key, sx:e.clientX, sy:e.clientY, ox:curX, oy:curY, iW, iH }

    const onMouseMove = (ev) => {
      if (!dragRef.current) return
      isDragging.current = true
      const dx = ev.clientX - dragRef.current.sx
      const dy = ev.clientY - dragRef.current.sy
      const maxX = isPhoto ? CW-pw : CW-80
      const maxY = isPhoto ? CH-ph-30 : CH-20
      let fx = snapTo(Math.max(0, Math.min(maxX, dragRef.current.ox+dx)))
      let fy = snapTo(Math.max(0, Math.min(maxY, dragRef.current.oy+dy)))

      const others = getAllItems(key)
      const gs = computeGuides(key, fx, fy, dragRef.current.iW, dragRef.current.iH, others)

      for (const g of gs) {
        if (g.axis==='v') {
          if (g.label==='L-L'||g.label==='T-B') fx = g.pos
          if (g.label==='R-R'||g.label==='L-R') fx = g.pos - dragRef.current.iW
          if (g.label==='C-C') fx = g.pos - dragRef.current.iW/2
        }
        if (g.axis==='h') {
          if (g.label==='T-T'||g.label==='B-T') fy = g.pos
          if (g.label==='B-B'||g.label==='T-B') fy = g.pos - dragRef.current.iH
          if (g.label==='M-M') fy = g.pos - dragRef.current.iH/2
        }
      }

      setGuides(computeGuides(key, fx, fy, dragRef.current.iW, dragRef.current.iH, others))
      onMove(key, fx, fy)
    }
    const onMouseUp = () => {
      dragRef.current = null; isDragging.current = false
      setGuides([])
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const visibleFields = ALL_FIELDS.filter(f => config.visibleFields.includes(f.key))
  const pw = config.photoSize||72, ph = Math.round(pw*4/3)
  const px = config.photoX??16,   py = config.photoY??90
  const isPhotoSel = selected==='__photo__'
  const headerH = config.orientation==='landscape' ? 64 : 80

  return (
    <div style={{ position:'relative', width:CW, height:CH, background:'#fff', borderRadius:16,
      overflow:'hidden', border:cardBorder, boxShadow:'0 12px 48px rgba(0,0,0,.18)',
      userSelect:'none', flexShrink:0, fontFamily:'Instrument Sans,sans-serif' }}>

      {config.bgImage && (
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:`url(${config.bgImage})`,
          backgroundSize:config.bgFit==='repeat'?'auto':config.bgFit,
          backgroundRepeat:config.bgFit==='repeat'?'repeat':'no-repeat',
          backgroundPosition:'center', opacity:config.bgOpacity??0.15, pointerEvents:'none' }}/>
      )}

      {config.showHeader !== false && (
        <div style={{ position:'relative', zIndex:1, background:headerBg, height:headerH,
          display:'flex', alignItems:'center', gap:12, padding:'0 16px',
          justifyContent:config.logoPosition==='center'?'center':'flex-start',
          flexDirection:config.logoPosition==='center'?'column':'row' }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,.22)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:14, color:'#fff', flexShrink:0 }}>
            {(orgName||sub?.school_name||'SC').slice(0,2).toUpperCase()}
          </div>
          <div style={{ textAlign:config.logoPosition==='center'?'center':'left' }}>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:800, color:'#fff', lineHeight:1.3 }}>
              {orgName||sub?.school_name||'Organization Name'}
            </div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.75)', marginTop:2 }}>{sub?.role||'Student'} Identity Card</div>
          </div>
        </div>
      )}

      {/* Photo */}
      <div onMouseDown={e => startDrag(e,'__photo__',px,py)}
        style={{ position:'absolute', left:px, top:py, width:pw, height:ph, zIndex:15,
          borderRadius:photoRadius, border:`2.5px solid ${config.c1}`,
          outline: isPhotoSel ? `2px dashed ${config.c1}` : multiSelected?.includes('__photo__') ? '2px dashed #f59e0b' : 'none',
          outlineOffset:3, background:config.accent,
          display:'flex', alignItems:'center', justifyContent:'center',
          overflow:'hidden', cursor:'grab', boxShadow:isPhotoSel?`0 0 0 4px ${config.c1}33`:'none',
          transition:'box-shadow .15s' }}>
        {sub?.photo_url
          ? <img src={sub.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover', pointerEvents:'none' }} alt=""/>
          : <span style={{ fontSize:Math.round(pw*0.38), pointerEvents:'none' }}>👤</span>}
        {isPhotoSel && (
          <div style={{ position:'absolute', bottom:-20, left:0, fontSize:9, color:config.c1,
            fontWeight:700, whiteSpace:'nowrap', background:'#fff', padding:'2px 6px',
            borderRadius:4, border:`1px solid ${config.c1}44`, pointerEvents:'none' }}>↕↔ drag</div>
        )}
      </div>

      {/* Fields */}
      {visibleFields.map(f => {
        const pos   = getFieldPos(f.key)
        const val   = sub?.[f.key] || `[${f.label}]`
        const isSel = selected===f.key
        const isMul = multiSelected?.includes(f.key)
        return (
          <div key={f.key}
            onMouseDown={e => startDrag(e, f.key, pos.x, pos.y)}
            onClick={e => { e.stopPropagation(); if (e.shiftKey && onMultiSelect) onMultiSelect(f.key) }}
            style={{ position:'absolute', left:pos.x, top:pos.y, zIndex:isSel?60:10,
              padding:'3px 7px', borderRadius:5, minWidth:55,
              border: isSel ? `1.5px dashed ${config.c1}` : isMul ? '1.5px dashed #f59e0b' : '1.5px dashed transparent',
              background: isSel ? `${config.c1}11` : isMul ? '#fef3c722' : 'transparent',
              cursor:'grab', transition:'border .15s, background .15s' }}>
            <div style={{ fontSize:8, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:.4 }}>{f.label}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', marginTop:1, whiteSpace:'nowrap' }}>{val}</div>
            {isSel && (
              <div style={{ position:'absolute', top:-16, left:0, fontSize:9, color:config.c1,
                fontWeight:700, whiteSpace:'nowrap', background:'#fff', padding:'1px 5px',
                borderRadius:4, border:`1px solid ${config.c1}44`, pointerEvents:'none' }}>↕↔ drag</div>
            )}
          </div>
        )
      })}

      {/* Snap grid dots — only while dragging */}
      {isDragging.current && (
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:3, pointerEvents:'none', opacity:.12 }}>
          {Array.from({ length:Math.floor(CW/SNAP)+1 }, (_,i) =>
            Array.from({ length:Math.floor(CH/SNAP)+1 }, (_,j) => (
              <circle key={`${i}-${j}`} cx={i*SNAP} cy={j*SNAP} r={0.8} fill="#2352ff"/>
            ))
          )}
        </svg>
      )}

      {/* Guide lines */}
      {guides.map((g,i) => (
        <div key={i} style={{
          position:'absolute', zIndex:100, pointerEvents:'none',
          background: g.label==='C-C'||g.label==='M-M' ? '#8b5cf6' : '#ef4444',
          opacity:.9,
          ...(g.axis==='v' ? { left:g.pos, top:g.from, width:1, height:g.to-g.from }
                           : { top:g.pos, left:g.from, height:1, width:g.to-g.from })
        }}/>
      ))}

      {/* Barcode */}
      {config.showBarcode && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:5,
          background:`${config.c1}12`, padding:'7px 14px',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          borderTop:`1px solid ${config.c1}22` }}>
          <div style={{ display:'flex', gap:1.5, alignItems:'flex-end' }}>
            {Array.from({length:28},(_,i) => (
              <div key={i} style={{ width:1.5, height:9+Math.abs(Math.sin(i*2.3))*11, background:config.c1, opacity:.6, borderRadius:1 }}/>
            ))}
          </div>
          <div style={{ fontSize:9, fontFamily:'JetBrains Mono,monospace', color:config.c1, fontWeight:600, opacity:.8 }}>
            {(sub?.id||'ID000000').slice(0,8).toUpperCase()}
          </div>
        </div>
      )}

      {visibleFields.length===0 && (
        <div style={{ position:'absolute', left:100, top:110, color:'#ddd', fontSize:12, fontWeight:600, lineHeight:1.8, zIndex:20 }}>
          ← Add fields<br/>from panel
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   ALIGNMENT TOOLBAR  (MS Word / PowerPoint style)
══════════════════════════════════════════════════════════ */
function AlignIcon({ type }) {
  const s = { width:16, height:16, display:'block' }
  const map = {
    /* Align to card */
    'card-left':   <svg {...s} viewBox="0 0 16 16"><rect x="2" y="2" width="1.5" height="12" fill="currentColor" rx=".5"/><rect x="4" y="4.5" width="8" height="2.5" fill="currentColor" rx="1" opacity=".5"/><rect x="4" y="9" width="5" height="2.5" fill="currentColor" rx="1"/></svg>,
    'card-ch':     <svg {...s} viewBox="0 0 16 16"><rect x="7.25" y="1" width="1.5" height="14" fill="currentColor" rx=".5"/><rect x="3" y="4.5" width="10" height="2.5" fill="currentColor" rx="1" opacity=".5"/><rect x="4.5" y="9" width="7" height="2.5" fill="currentColor" rx="1"/></svg>,
    'card-right':  <svg {...s} viewBox="0 0 16 16"><rect x="12.5" y="2" width="1.5" height="12" fill="currentColor" rx=".5"/><rect x="4" y="4.5" width="8" height="2.5" fill="currentColor" rx="1" opacity=".5"/><rect x="7" y="9" width="5" height="2.5" fill="currentColor" rx="1"/></svg>,
    'card-top':    <svg {...s} viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="1.5" fill="currentColor" rx=".5"/><rect x="4.5" y="4" width="2.5" height="8" fill="currentColor" rx="1" opacity=".5"/><rect x="9" y="4" width="2.5" height="5" fill="currentColor" rx="1"/></svg>,
    'card-mv':     <svg {...s} viewBox="0 0 16 16"><rect x="2" y="7.25" width="12" height="1.5" fill="currentColor" rx=".5"/><rect x="4.5" y="3" width="2.5" height="10" fill="currentColor" rx="1" opacity=".5"/><rect x="9" y="5" width="2.5" height="6" fill="currentColor" rx="1"/></svg>,
    'card-bottom': <svg {...s} viewBox="0 0 16 16"><rect x="2" y="12.5" width="12" height="1.5" fill="currentColor" rx=".5"/><rect x="4.5" y="4" width="2.5" height="8" fill="currentColor" rx="1" opacity=".5"/><rect x="9" y="7" width="2.5" height="5" fill="currentColor" rx="1"/></svg>,
    /* Align group (amber) */
    'grp-left':   <svg {...s} viewBox="0 0 16 16"><rect x="2" y="2" width="1.5" height="12" fill="currentColor" rx=".5"/><rect x="4" y="3.5" width="9" height="3" fill="#f59e0b" rx="1"/><rect x="4" y="9.5" width="6" height="3" fill="#f59e0b" rx="1" opacity=".8"/></svg>,
    'grp-ch':     <svg {...s} viewBox="0 0 16 16"><rect x="7.25" y="1" width="1.5" height="14" fill="currentColor" rx=".5"/><rect x="3" y="3.5" width="10" height="3" fill="#f59e0b" rx="1"/><rect x="4.5" y="9.5" width="7" height="3" fill="#f59e0b" rx="1" opacity=".8"/></svg>,
    'grp-right':  <svg {...s} viewBox="0 0 16 16"><rect x="12.5" y="2" width="1.5" height="12" fill="currentColor" rx=".5"/><rect x="3" y="3.5" width="9" height="3" fill="#f59e0b" rx="1"/><rect x="6" y="9.5" width="6" height="3" fill="#f59e0b" rx="1" opacity=".8"/></svg>,
    'grp-top':    <svg {...s} viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="1.5" fill="currentColor" rx=".5"/><rect x="3.5" y="4" width="3" height="9" fill="#f59e0b" rx="1"/><rect x="9.5" y="4" width="3" height="6" fill="#f59e0b" rx="1" opacity=".8"/></svg>,
    'grp-mv':     <svg {...s} viewBox="0 0 16 16"><rect x="2" y="7.25" width="12" height="1.5" fill="currentColor" rx=".5"/><rect x="3.5" y="2" width="3" height="12" fill="#f59e0b" rx="1"/><rect x="9.5" y="4" width="3" height="8" fill="#f59e0b" rx="1" opacity=".8"/></svg>,
    'grp-bottom': <svg {...s} viewBox="0 0 16 16"><rect x="2" y="12.5" width="12" height="1.5" fill="currentColor" rx=".5"/><rect x="3.5" y="3" width="3" height="9" fill="#f59e0b" rx="1"/><rect x="9.5" y="6" width="3" height="6" fill="#f59e0b" rx="1" opacity=".8"/></svg>,
    /* Distribute */
    'dist-h':     <svg {...s} viewBox="0 0 16 16"><rect x="1" y="4" width="1.5" height="8" fill="currentColor" rx=".5"/><rect x="13.5" y="4" width="1.5" height="8" fill="currentColor" rx=".5"/><rect x="6" y="5" width="4" height="6" fill="#f59e0b" rx="1"/></svg>,
    'dist-v':     <svg {...s} viewBox="0 0 16 16"><rect x="4" y="1" width="8" height="1.5" fill="currentColor" rx=".5"/><rect x="4" y="13.5" width="8" height="1.5" fill="currentColor" rx=".5"/><rect x="5" y="6" width="6" height="4" fill="#f59e0b" rx="1"/></svg>,
  }
  return map[type] || null
}

function AlignToolbar({ selected, multiSelected, config, onAlignOne, onAlignMulti, onDistribute, onNudge }) {
  const CW      = config.cardW || 340
  const CH      = config.cardH || 480
  const hasOne  = !!(selected && selected !== '__photo__' || selected === '__photo__')
  const hasAny  = !!(selected)
  const hasGrp  = multiSelected && multiSelected.length >= 2
  const has3    = multiSelected && multiSelected.length >= 3
  const c1      = config.c1 || '#2352ff'

  const btn = (onClick, iconType, tip, enabled, highlight) => (
    <button title={tip} onClick={enabled ? onClick : undefined}
      style={{
        width:30, height:30, borderRadius:7, border:`1.5px solid ${highlight && enabled ? c1 : 'var(--border)'}`,
        background: highlight && enabled ? `${c1}14` : 'var(--paper)',
        color: enabled ? (highlight ? c1 : 'var(--ink2)') : 'var(--ink3)',
        cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.38,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .13s', flexShrink:0, padding:0,
      }}>
      <AlignIcon type={iconType} />
    </button>
  )

  const alignToCard = (type) => {
    if (!hasAny) return
    const key = selected
    const pos = config.fieldPositions?.[key] || DEFAULT_FIELD_POSITIONS[key] || { x:20, y:200 }
    const isPhoto = key === '__photo__'
    const pw = config.photoSize||72
    const W = isPhoto ? pw : 90
    const H = isPhoto ? Math.round(pw*4/3) : 32
    let x = pos.x, y = pos.y
    if (type==='L')  x = 0
    if (type==='CH') x = Math.round((CW-W)/2)
    if (type==='R')  x = CW-W
    if (type==='T')  y = 0
    if (type==='MV') y = Math.round((CH-H)/2)
    if (type==='B')  y = CH-H-(config.showBarcode?26:0)
    onAlignOne(key, snapTo(x), snapTo(y))
    toast.success(`Aligned to card`)
  }

  const getPos = (k) => {
    const p = config.fieldPositions?.[k] || DEFAULT_FIELD_POSITIONS[k] || { x:20, y:200 }
    const isPhoto = k==='__photo__'
    const pw = config.photoSize||72
    return { x:p.x, y:p.y, w:isPhoto?pw:90, h:isPhoto?Math.round(pw*4/3):32 }
  }

  const alignGroup = (type) => {
    if (!hasGrp) return
    const items = multiSelected.map(k => ({ key:k, ...getPos(k) }))
    let refX, refY
    if (type==='L')  refX = Math.min(...items.map(p=>p.x))
    if (type==='R')  refX = Math.max(...items.map(p=>p.x+p.w))
    if (type==='CH') refX = Math.round(items.reduce((s,p)=>s+p.x+p.w/2,0)/items.length)
    if (type==='T')  refY = Math.min(...items.map(p=>p.y))
    if (type==='B')  refY = Math.max(...items.map(p=>p.y+p.h))
    if (type==='MV') refY = Math.round(items.reduce((s,p)=>s+p.y+p.h/2,0)/items.length)
    const updates = items.map(p => {
      let nx=p.x, ny=p.y
      if (type==='L')  nx=refX
      if (type==='R')  nx=refX-p.w
      if (type==='CH') nx=refX-Math.round(p.w/2)
      if (type==='T')  ny=refY
      if (type==='B')  ny=refY-p.h
      if (type==='MV') ny=refY-Math.round(p.h/2)
      return { key:p.key, x:snapTo(nx), y:snapTo(ny) }
    })
    onAlignMulti(updates)
    toast.success('Fields aligned')
  }

  const Div = () => <div style={{ width:1, height:20, background:'var(--border)', flexShrink:0, margin:'0 2px' }}/>
  const Label = ({ t, amber }) => (
    <span style={{ fontSize:9, fontWeight:700, color:amber&&hasGrp?'#d97706':'var(--ink3)',
      textTransform:'uppercase', letterSpacing:.5, whiteSpace:'nowrap', padding:'0 4px' }}>{t}</span>
  )

  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, padding:'6px 10px',
      background:'var(--paper)', borderRadius:10, border:'1px solid var(--border)',
      boxShadow:'0 2px 8px rgba(0,0,0,.07)', flexWrap:'wrap', rowGap:6 }}>

      <Label t="To card" />
      {btn(() => alignToCard('L'),  'card-left',   'Align Left to Card',            hasAny)}
      {btn(() => alignToCard('CH'), 'card-ch',     'Center Horizontal on Card',     hasAny)}
      {btn(() => alignToCard('R'),  'card-right',  'Align Right to Card',           hasAny)}
      {btn(() => alignToCard('T'),  'card-top',    'Align Top to Card',             hasAny)}
      {btn(() => alignToCard('MV'), 'card-mv',     'Center Vertical on Card',       hasAny)}
      {btn(() => alignToCard('B'),  'card-bottom', 'Align Bottom to Card',          hasAny)}

      <Div/>
      <Label t="Group" amber />
      {btn(() => alignGroup('L'),  'grp-left',   'Align Left Edges',              hasGrp, true)}
      {btn(() => alignGroup('CH'), 'grp-ch',     'Center Horizontally',           hasGrp, true)}
      {btn(() => alignGroup('R'),  'grp-right',  'Align Right Edges',             hasGrp, true)}
      {btn(() => alignGroup('T'),  'grp-top',    'Align Top Edges',               hasGrp, true)}
      {btn(() => alignGroup('MV'), 'grp-mv',     'Center Vertically',             hasGrp, true)}
      {btn(() => alignGroup('B'),  'grp-bottom', 'Align Bottom Edges',            hasGrp, true)}

      <Div/>
      <Label t="Distribute" amber />
      {btn(() => onDistribute('h'), 'dist-h', 'Distribute Horizontally (need 3+)', has3, true)}
      {btn(() => onDistribute('v'), 'dist-v', 'Distribute Vertically (need 3+)',   has3, true)}

      <Div/>
      <Label t="Nudge" />
      {[['←',-SNAP,0,'Nudge Left'],['↑',0,-SNAP,'Nudge Up'],['↓',0,SNAP,'Nudge Down'],['→',SNAP,0,'Nudge Right']].map(([icon,dx,dy,tip]) => (
        <button key={tip} title={tip} onClick={() => hasAny && onNudge(selected,dx,dy)}
          style={{ width:30, height:30, borderRadius:7, border:'1.5px solid var(--border)',
            background:'var(--paper)', color: hasAny?'var(--ink2)':'var(--ink3)',
            cursor: hasAny?'pointer':'not-allowed', opacity: hasAny?1:0.38,
            fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, transition:'all .13s' }}>
          {icon}
        </button>
      ))}

      {/* Live position readout */}
      {selected && (() => {
        const pos = config.fieldPositions?.[selected] || DEFAULT_FIELD_POSITIONS[selected] || { x:0, y:0 }
        const pp = selected==='__photo__' ? { x:config.photoX??16, y:config.photoY??90 } : pos
        return (
          <div style={{ marginLeft:6, fontFamily:'JetBrains Mono,monospace', fontSize:10,
            color:'var(--ink3)', background:'var(--paper2)', borderRadius:6,
            padding:'3px 8px', border:'1px solid var(--border)', whiteSpace:'nowrap' }}>
            x:{pp.x} y:{pp.y}
          </div>
        )
      })()}

      {multiSelected && multiSelected.length > 0 && (
        <div style={{ marginLeft:4, fontSize:10, fontWeight:700, color:'#b45309',
          background:'#fef3c7', borderRadius:6, padding:'3px 8px',
          border:'1px solid #fcd34d', whiteSpace:'nowrap' }}>
          {multiSelected.length} selected
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN BUILDER
══════════════════════════════════════════════════════════ */
export default function IDCardBuilder() {
  const navigate = useNavigate()
  const { submissions, loading: subLoading } = useSubmissions()
  const { organizations }                    = useOrganizations()
  const { saveTemplate }                     = useCardTemplates()

  const [config,        setConfig]       = useState(DEFAULT_CONFIG)
  const [templateName,  setTemplateName] = useState('')
  const [selectedOrg,   setSelectedOrg]  = useState('')
  const [previewIdx,    setPreviewIdx]   = useState(0)
  const [saving,        setSaving]       = useState(false)
  const [bgUploading,   setBgUploading]  = useState(false)
  const [activeTab,     setActiveTab]    = useState('fields')
  const [selected,      setSelected]     = useState(null)
  const [multiSelected, setMultiSelected]= useState([])
  const [panelOpen,     setPanelOpen]    = useState(false)
  const bgInputRef = useRef(null)

  const approved   = submissions.filter(s => s.status==='approved')
  const previewSub = approved[previewIdx] || null
  const orgName    = organizations.find(o => o.id===selectedOrg)?.name || previewSub?.school_name || ''

  const upd = useCallback((key, val) => setConfig(p => ({ ...p, [key]:val })), [])

  const onMove = useCallback((key, x, y) => {
    if (key==='__photo__') setConfig(p => ({ ...p, photoX:x, photoY:y }))
    else setConfig(p => ({ ...p, fieldPositions:{ ...(p.fieldPositions||{}), [key]:{x,y} } }))
  }, [])

  const handleSelect = (key) => { setSelected(key); setMultiSelected([]) }

  const handleMultiSelect = (key) => {
    setMultiSelected(prev => {
      const next = prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key]
      if (next.length > 0) setSelected(null)
      return next
    })
  }

  const toggleField = (key) => {
    setConfig(p => {
      const on = p.visibleFields.includes(key)
      return { ...p, visibleFields: on ? p.visibleFields.filter(k=>k!==key) : [...p.visibleFields,key] }
    })
    if (!config.visibleFields.includes(key)) setSelected(key)
  }

  const applyPreset = (k) => {
    const preset = SIZE_PRESETS[k]; if (!preset) return
    setConfig(p => ({ ...p, sizePreset:k, cardW:preset.w, cardH:preset.h, orientation:preset.h>preset.w?'portrait':'landscape', fieldPositions:{}, photoX:16, photoY:preset.h>preset.w?90:16, photoSize:72 }))
    toast(`Card size: ${preset.label}`)
  }

  const setCardW = (w) => setConfig(p => ({ ...p, cardW:w, sizePreset:'custom' }))
  const setCardH = (h) => setConfig(p => ({ ...p, cardH:h, sizePreset:'custom' }))

  const flipOrientation = () => {
    setConfig(p => ({ ...p, cardW:p.cardH, cardH:p.cardW, orientation:p.cardH>p.cardW?'portrait':'landscape', fieldPositions:{}, photoX:16, photoY:16, photoSize:p.photoSize }))
    toast('Orientation flipped')
  }

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 3*1024*1024) { toast.error('Max 3MB'); return }
    setBgUploading(true)
    try { const url = await uploadBgImage(file); upd('bgImage', url); toast.success('Background uploaded') }
    catch { toast.error('Upload failed') }
    finally { setBgUploading(false); e.target.value='' }
  }

  const resetLayout = () => {
    setConfig(p => ({ ...p, fieldPositions:{}, photoX:16, photoY:90, photoSize:72 }))
    setSelected(null); setMultiSelected([])
    toast.success('Layout reset')
  }

  const handleSave = async () => {
    if (!templateName.trim()) { toast.error('Enter template name'); return }
    if (config.visibleFields.length===0) { toast.error('Add at least one field'); return }
    setSaving(true)
    try {
      await saveTemplate({ name:templateName.trim(), org_id:selectedOrg||null, org_name:orgName||null, config })
      toast.success(`"${templateName.trim()}" saved!`)
      navigate('/templates')
    } catch (err) { toast.error(err.message||'Failed') }
    finally { setSaving(false) }
  }

  /* alignment callbacks */
  const handleAlignOne   = useCallback((key,x,y) => onMove(key,x,y), [onMove])

  const handleAlignMulti = useCallback((updates) => {
    setConfig(p => {
      const fp = { ...(p.fieldPositions||{}) }
      let px = p.photoX, py2 = p.photoY
      for (const { key, x, y } of updates) {
        if (key==='__photo__') { px=x; py2=y } else fp[key]={x,y}
      }
      return { ...p, fieldPositions:fp, photoX:px, photoY:py2 }
    })
  }, [])

  const handleDistribute = useCallback((axis) => {
    if (!multiSelected || multiSelected.length < 3) return
    const getP = (k) => {
      const p = config.fieldPositions?.[k] || DEFAULT_FIELD_POSITIONS[k] || { x:20,y:200 }
      const pw = config.photoSize||72
      const isPhoto = k==='__photo__'
      return { x:p.x, y:p.y, w:isPhoto?pw:90, h:isPhoto?Math.round(pw*4/3):32 }
    }
    const items = multiSelected.map(k => ({ key:k, ...getP(k) }))
    if (axis==='h') {
      const sorted = [...items].sort((a,b)=>a.x-b.x)
      const totalW = sorted.reduce((s,i)=>s+i.w,0)
      const span   = (sorted[sorted.length-1].x+sorted[sorted.length-1].w) - sorted[0].x
      const gap    = (span-totalW)/(sorted.length-1)
      let cx = sorted[0].x
      handleAlignMulti(sorted.map(it => { const u={ key:it.key, x:snapTo(cx), y:it.y }; cx+=it.w+gap; return u }))
    } else {
      const sorted = [...items].sort((a,b)=>a.y-b.y)
      const totalH = sorted.reduce((s,i)=>s+i.h,0)
      const span   = (sorted[sorted.length-1].y+sorted[sorted.length-1].h) - sorted[0].y
      const gap    = (span-totalH)/(sorted.length-1)
      let cy = sorted[0].y
      handleAlignMulti(sorted.map(it => { const u={ key:it.key, x:it.x, y:snapTo(cy) }; cy+=it.h+gap; return u }))
    }
    toast.success('Fields distributed')
  }, [multiSelected, config, handleAlignMulti])

  const handleNudge = useCallback((key,dx,dy) => {
    if (!key) return
    const p   = key==='__photo__' ? { x:config.photoX??16, y:config.photoY??90 } : (config.fieldPositions?.[key] || DEFAULT_FIELD_POSITIONS[key] || { x:20,y:200 })
    const CW2 = config.cardW||340, CH2 = config.cardH||480
    const pw  = config.photoSize||72, ph = Math.round(pw*4/3)
    const isPhoto = key==='__photo__'
    const maxX = isPhoto ? CW2-pw : CW2-80
    const maxY = isPhoto ? CH2-ph-30 : CH2-20
    onMove(key, snapTo(Math.max(0,Math.min(maxX,p.x+dx))), snapTo(Math.max(0,Math.min(maxY,p.y+dy))))
  }, [config, onMove])

  if (subLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <Spinner size={40}/>
    </div>
  )

  const CW = config.cardW||340, CH = config.cardH||480

  const PanelContent = () => (
    <>
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {[['fields','📋'],['style','🎨'],['canvas','📐'],['settings','⚙']].map(([id,icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ flex:1, padding:'10px 2px', border:'none', fontSize:11, fontWeight:700, cursor:'pointer',
              background:'transparent', color:activeTab===id?'var(--blue)':'var(--ink3)',
              borderBottom:activeTab===id?'2px solid var(--blue)':'2px solid transparent',
              fontFamily:'inherit', transition:'color .15s' }}>
            {icon} {id.charAt(0).toUpperCase()+id.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding:'14px 12px', flex:1, overflowY:'auto' }}>

        {activeTab==='fields' && (
          <div>
            <div style={{ padding:'8px 10px', background:'var(--blue-s)', borderRadius:8, border:'1px solid var(--blue-m)', marginBottom:12, fontSize:11, color:'var(--blue)', lineHeight:1.7 }}>
              Drag fields to position •{' '}
              <strong>Shift+click</strong> 2+ fields to align them as a group
            </div>
            {config.visibleFields.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Active Fields</div>
                {ALL_FIELDS.filter(f => config.visibleFields.includes(f.key)).map(f => {
                  const isSel = selected===f.key
                  const isMul = multiSelected.includes(f.key)
                  const pos   = config.fieldPositions?.[f.key] || DEFAULT_FIELD_POSITIONS[f.key] || {x:20,y:200}
                  return (
                    <div key={f.key}
                      onClick={e => e.shiftKey ? handleMultiSelect(f.key) : handleSelect(isSel?null:f.key)}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px',
                        borderRadius:8,
                        border: isSel?`1.5px solid var(--blue)`:isMul?'1.5px solid #f59e0b':'1.5px solid var(--border)',
                        background: isSel?'var(--blue-s)':isMul?'#fef3c722':'var(--paper2)',
                        cursor:'pointer', marginBottom:5, transition:'all .15s' }}>
                      <span style={{ fontSize:13 }}>{f.icon}</span>
                      <span style={{ flex:1, fontSize:12, fontWeight:600, color:isSel?'var(--blue)':isMul?'#b45309':'var(--ink2)' }}>{f.label}</span>
                      <span style={{ fontSize:10, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace' }}>{pos.x},{pos.y}</span>
                      <button onClick={e=>{e.stopPropagation();toggleField(f.key)}}
                        style={{ width:18, height:18, borderRadius:'50%', border:'none', background:'var(--red-s)', color:'var(--red)', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Add Fields</div>
            {ALL_FIELDS.filter(f => !config.visibleFields.includes(f.key)).map(f => (
              <div key={f.key} onClick={() => { toggleField(f.key); setPanelOpen(false) }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--paper)', cursor:'pointer', marginBottom:5, transition:'all .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue)';e.currentTarget.style.background='var(--blue-s)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--paper)'}}>
                <span style={{ fontSize:13 }}>{f.icon}</span>
                <span style={{ flex:1, fontSize:12, color:'var(--ink2)' }}>{f.label}</span>
                <span style={{ fontSize:18, color:'var(--ink3)', lineHeight:1 }}>+</span>
              </div>
            ))}
          </div>
        )}

        {activeTab==='style' && (
          <div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Organization</div>
              <select value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--paper)', color:'var(--ink)', fontSize:12, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
                <option value="">-- No specific org --</option>
                {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
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
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Header Style</div>
              <div style={{ display:'flex', gap:8 }}>
                {['gradient','solid'].map(v=>(
                  <button key={v} onClick={()=>upd('headerStyle',v)}
                    style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${config.headerStyle===v?'var(--blue)':'var(--border)'}`, background:config.headerStyle===v?'var(--blue-s)':'transparent', color:config.headerStyle===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{v}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:7 }}>Photo</div>
              <div onClick={()=>setSelected(selected==='__photo__'?null:'__photo__')}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, border:`1.5px solid ${selected==='__photo__'?'var(--blue)':'var(--border)'}`, background:selected==='__photo__'?'var(--blue-s)':'var(--paper2)', cursor:'pointer', marginBottom:10, transition:'all .15s' }}>
                <span style={{ fontSize:16 }}>🖼</span>
                <span style={{ flex:1, fontSize:12, fontWeight:600, color:selected==='__photo__'?'var(--blue)':'var(--ink2)' }}>Photo</span>
                <span style={{ fontSize:10, color:'var(--ink3)' }}>{config.photoSize||72}×{Math.round((config.photoSize||72)*4/3)}px</span>
              </div>
              <div style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'var(--ink3)' }}>Size</span>
                  <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--blue)', fontWeight:700 }}>{config.photoSize||72}px</span>
                </div>
                <input type="range" min={40} max={180} step={4} value={config.photoSize||72} onChange={e=>upd('photoSize',Number(e.target.value))} style={{ width:'100%', accentColor:'#2352ff' }}/>
              </div>
              <div style={{ fontSize:10, color:'var(--ink3)', marginBottom:5, fontWeight:600 }}>Shape</div>
              <div style={{ display:'flex', gap:6 }}>
                {['square','rounded','circle'].map(v=>(
                  <button key={v} onClick={()=>upd('photoShape',v)}
                    style={{ flex:1, padding:'7px 4px', borderRadius:8, border:`1.5px solid ${config.photoShape===v?'var(--blue)':'var(--border)'}`, background:config.photoShape===v?'var(--blue-s)':'transparent', color:config.photoShape===v?'var(--blue)':'var(--ink3)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{v}</button>
                ))}
              </div>
            </div>
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

        {activeTab==='canvas' && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Orientation</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { if(config.cardH<=config.cardW) return; flipOrientation() }}
                  style={{ flex:1, padding:'10px 8px', borderRadius:8, border:`1.5px solid ${(config.cardH||480)>(config.cardW||340)?'var(--blue)':'var(--border)'}`, background:(config.cardH||480)>(config.cardW||340)?'var(--blue-s)':'transparent', color:(config.cardH||480)>(config.cardW||340)?'var(--blue)':'var(--ink3)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>🪪</div>Portrait
                </button>
                <button onClick={() => { if(config.cardW>config.cardH) return; flipOrientation() }}
                  style={{ flex:1, padding:'10px 8px', borderRadius:8, border:`1.5px solid ${(config.cardW||340)>(config.cardH||480)?'var(--blue)':'var(--border)'}`, background:(config.cardW||340)>(config.cardH||480)?'var(--blue-s)':'transparent', color:(config.cardW||340)>(config.cardH||480)?'var(--blue)':'var(--ink3)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>💳</div>Landscape
                </button>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Size Presets</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {Object.entries(SIZE_PRESETS).map(([key,preset]) => {
                  const isSel = config.sizePreset===key
                  return (
                    <div key={key} onClick={() => applyPreset(key)}
                      style={{ padding:'8px 10px', borderRadius:8, border:`1.5px solid ${isSel?'var(--blue)':'var(--border)'}`, background:isSel?'var(--blue-s)':'var(--paper2)', cursor:'pointer', transition:'all .15s', textAlign:'center' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:isSel?'var(--blue)':'var(--ink2)', marginBottom:2 }}>{preset.label}</div>
                      <div style={{ fontSize:10, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace' }}>{preset.w}×{preset.h}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Custom Size</div>
              {[['Width',config.cardW||340,setCardW,200,600],['Height',config.cardH||480,setCardH,200,700]].map(([label,val,setter,min,max]) => (
                <div key={label} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'var(--ink3)' }}>{label}</span>
                    <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--blue)', fontWeight:700 }}>{val}px</span>
                  </div>
                  <input type="range" min={min} max={max} step={10} value={val} onChange={e=>setter(Number(e.target.value))} style={{ width:'100%', accentColor:'#2352ff' }}/>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Background Image</div>
              {config.bgImage ? (
                <div style={{ marginBottom:10 }}>
                  <div style={{ width:'100%', height:80, borderRadius:8, overflow:'hidden', marginBottom:8, border:'1px solid var(--border)', position:'relative' }}>
                    <img src={config.bgImage} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="bg preview"/>
                    <button onClick={() => upd('bgImage',null)}
                      style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.6)', color:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'var(--ink3)' }}>Opacity</span>
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--blue)', fontWeight:700 }}>{Math.round((config.bgOpacity||0.15)*100)}%</span>
                    </div>
                    <input type="range" min={5} max={100} step={5} value={Math.round((config.bgOpacity||0.15)*100)} onChange={e=>upd('bgOpacity',Number(e.target.value)/100)} style={{ width:'100%', accentColor:'#2352ff' }}/>
                  </div>
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
                  style={{ width:'100%', padding:'20px 12px', borderRadius:8, border:`2px dashed ${bgUploading?'var(--blue)':'var(--border)'}`, background:bgUploading?'var(--blue-s)':'var(--paper2)', cursor:bgUploading?'not-allowed':'pointer', textAlign:'center', transition:'all .15s' }}
                  onMouseEnter={e=>{ if(!bgUploading){e.currentTarget.style.borderColor='var(--blue)';e.currentTarget.style.background='var(--blue-s)'}}}
                  onMouseLeave={e=>{ if(!bgUploading){e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--paper2)'}}}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{bgUploading?'⏳':'🖼'}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--ink2)', marginBottom:3 }}>{bgUploading?'Uploading...':'Upload Background'}</div>
                  <div style={{ fontSize:11, color:'var(--ink3)' }}>JPG, PNG · Max 3MB</div>
                </div>
              )}
              <input ref={bgInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBgUpload} style={{ display:'none' }}/>
            </div>
          </div>
        )}

        {activeTab==='settings' && (
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
            {[['showHeader','Show Header','College name, logo & role'],['showBarcode','Show Barcode','Footer barcode strip']].map(([key,title,desc])=>(
              <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize:12, color:'var(--ink2)', fontWeight:600 }}>{title}</div>
                  <div style={{ fontSize:10, color:'var(--ink3)', marginTop:1 }}>{desc}</div>
                </div>
                <div onClick={()=>upd(key,!config[key])}
                  style={{ width:38, height:22, borderRadius:11, background:config[key]?'var(--blue)':'var(--border2)', transition:'background .2s', cursor:'pointer', position:'relative', flexShrink:0 }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:config[key]?18:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', paddingTop:64, background:'var(--paper2)' }}>
      <style>{`
        .icb-layout { flex:1; display:grid; grid-template-columns:268px 1fr; overflow:hidden; }
        .icb-panel  { background:var(--paper); border-right:1px solid var(--border); overflow-y:auto; display:flex; flex-direction:column; }
        .icb-mob    { display:none !important; }
        .icb-chip   { display:inline-block; }
        @media(max-width:800px){
          .icb-layout { grid-template-columns:1fr !important; }
          .icb-panel  { display:none !important; }
          .icb-mob    { display:flex !important; }
          .icb-chip   { display:none !important; }
        }
        .icb-drawer { position:fixed; top:120px; left:0; right:0; bottom:0; background:var(--paper); z-index:500; display:none; flex-direction:column; border-top:2px solid var(--border); }
        .icb-drawer.open { display:flex !important; }
      `}</style>

      {/* Top bar */}
      <div style={{ height:56, background:'var(--paper)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', flexShrink:0, gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          <button onClick={() => navigate(-1)}
            style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--paper2)', color:'var(--ink2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>← Back</button>
          <input value={templateName} onChange={e => setTemplateName(e.target.value)}
            placeholder="Template name..."
            style={{ flex:1, border:'1.5px solid var(--border)', borderRadius:8, fontSize:14, fontWeight:700, color:'var(--ink)', background:'var(--paper2)', outline:'none', fontFamily:'Outfit,sans-serif', padding:'7px 10px', transition:'border .15s', minWidth:0 }}
            onFocus={e => e.target.style.borderColor='#2352ff'}
            onBlur={e  => e.target.style.borderColor='var(--border)'}/>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <div className="icb-chip" style={{ fontSize:11, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace', background:'var(--paper2)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', whiteSpace:'nowrap' }}>
            {CW}×{CH}
          </div>
          {approved.length > 1 && (
            <select value={previewIdx} onChange={e => setPreviewIdx(Number(e.target.value))}
              style={{ padding:'5px 8px', borderRadius:7, border:'1.5px solid var(--border)', background:'var(--paper)', color:'var(--ink)', fontSize:12, cursor:'pointer', fontFamily:'inherit', maxWidth:120 }}>
              {approved.map((s,i) => <option key={s.id} value={i}>{s.name}</option>)}
            </select>
          )}
          <button className="icb-mob" onClick={() => setPanelOpen(o=>!o)}
            style={{ padding:'6px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:panelOpen?'var(--blue-s)':'var(--paper2)', color:panelOpen?'var(--blue)':'var(--ink2)', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:700, alignItems:'center', gap:4 }}>
            {panelOpen?'✕ Close':'⚙ Edit'}
          </button>
          <button onClick={resetLayout}
            style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid var(--border)', background:'transparent', color:'var(--ink2)', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>↺ Reset</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:'7px 14px', borderRadius:8, border:'none', background:saving?'var(--border2)':'#2352ff', color:'#fff', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            {saving?'⏳':'💾 Save'}
          </button>
        </div>
      </div>

      <div className="icb-layout">
        <div className="icb-panel"><PanelContent /></div>

        <div style={{ overflowY:'auto', overflowX:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', padding:'20px 16px', gap:14, background:'var(--paper2)' }}
          onClick={() => { setSelected(null); setMultiSelected([]) }}>

          {/* Alignment toolbar */}
          <div onClick={e => e.stopPropagation()}>
            <AlignToolbar
              selected={selected}
              multiSelected={multiSelected}
              config={config}
              onAlignOne={handleAlignOne}
              onAlignMulti={handleAlignMulti}
              onDistribute={handleDistribute}
              onNudge={handleNudge}
            />
          </div>

          {/* Hint bar */}
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--paper)', borderRadius:10, padding:'6px 14px', border:'1px solid var(--border)', fontSize:11, flexWrap:'wrap', justifyContent:'center' }}>
            <span style={{ color:'var(--blue)', fontWeight:700 }}>●</span>
            <span style={{ color:'var(--ink3)' }}>Drag to move · guides snap automatically</span>
            <span style={{ color:'var(--border)' }}>|</span>
            <span style={{ color:'#f59e0b', fontWeight:700 }}>Shift+click</span>
            <span style={{ color:'var(--ink3)' }}>to select multiple → group align</span>
          </div>

          {/* Canvas */}
          <div onClick={e => e.stopPropagation()}>
            <CardCanvas
              config={config}
              sub={previewSub}
              orgName={orgName}
              onMove={onMove}
              selected={selected}
              onSelect={handleSelect}
              multiSelected={multiSelected}
              onMultiSelect={handleMultiSelect}
            />
          </div>

          {/* Selection status */}
          {(selected || multiSelected.length > 0) && (
            <div style={{ padding:'8px 16px',
              background: multiSelected.length>0 ? '#fef3c7' : 'var(--blue-s)',
              borderRadius:8,
              border:`1px solid ${multiSelected.length>0?'#fcd34d':'var(--blue-m)'}`,
              fontSize:12, color:multiSelected.length>0?'#b45309':'var(--blue)', fontWeight:600 }}>
              {multiSelected.length > 0
                ? `${multiSelected.length} fields selected — use alignment toolbar above`
                : selected==='__photo__'
                  ? '🖼 Photo selected — drag to move · use toolbar to align'
                  : `✦ ${ALL_FIELDS.find(f=>f.key===selected)?.label||''} selected — drag or nudge · use toolbar to align`}
            </div>
          )}

          {approved.length===0 && (
            <div style={{ padding:'10px 16px', background:'var(--amber-s)', borderRadius:8, border:'1px solid #fcd34d', fontSize:12, color:'#92400e', fontWeight:600 }}>
              ⚠ No approved submissions — showing placeholder data
            </div>
          )}
        </div>
      </div>

      <div className={`icb-drawer${panelOpen?' open':''}`}><PanelContent /></div>
    </div>
  )
}