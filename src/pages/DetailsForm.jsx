import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSubmissions } from '../hooks/useSubmissions'
import { formConfigsApi } from '../lib/api'
import { Btn, Modal, Spinner } from '../components/shared/index'
import toast from 'react-hot-toast'

/* ─────────────────────────────────────────────────────────────────
   MODULE-LEVEL HELPERS
───────────────────────────────────────────────────────────────── */
const FIELD_META = {
  Name:                 { label: 'Full Name',           icon: '👤', type: 'text',     required: true  },
  ClassN:               { label: 'Class',               icon: '🏫', type: 'text',     required: true  },
  Section:              { label: 'Section',             icon: '📌', type: 'text',     required: false },
  DateofBirth:          { label: 'Date of Birth',       icon: '🎂', type: 'date',     required: false },
  AdmissionNumber:      { label: 'Admission Number',    icon: '🔢', type: 'text',     required: false },
  RollNumber:           { label: 'Roll Number',         icon: '🎯', type: 'text',     required: false },
  ContactNumber:        { label: 'Contact Number',      icon: '📱', type: 'tel',      required: false },
  EmergencyContact:     { label: 'Emergency Contact',   icon: '🚨', type: 'tel',      required: false },
  BloodGroup:           { label: 'Blood Group',         icon: '🩸', type: 'select',   required: false,
    options: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  Address:              { label: 'Address',             icon: '📍', type: 'textarea', required: false },
  ModeOfTransportation: { label: 'Mode of Transport',  icon: '🚌', type: 'select',   required: false,
    options: ['', 'School Bus', 'Auto Rickshaw', 'Private Vehicle', 'Walking', 'Bicycle', 'Public Transport'] },
  Designation:          { label: 'Designation',        icon: '💼', type: 'text',     required: true  },
  AadharCard:           { label: 'Aadhar Card Number', icon: '🪪', type: 'text',     required: false },
  Department:           { label: 'Department',          icon: '🏢', type: 'text',     required: false },
}

function buildSteps(fields) {
  const dataFields = fields.filter(f => f !== 'UploadYourPhoto')
  const hasPhoto   = fields.includes('UploadYourPhoto')
  const steps      = []
  for (let i = 0; i < dataFields.length; i += 4) steps.push(dataFields.slice(i, i + 4))
  steps.push(hasPhoto ? ['__PHOTO__', '__CONFIRM__'] : ['__CONFIRM__'])
  return steps
}

const inputStyle = (hasErr) => ({
  width: '100%', padding: '11px 14px', borderRadius: 'var(--r)',
  border: `1.5px solid ${hasErr ? 'var(--red)' : 'var(--border)'}`,
  fontSize: 14, color: 'var(--ink)', background: 'var(--paper)',
  outline: 'none', transition: 'all .18s', fontFamily: 'inherit',
})
const onFocusField = e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(35,82,255,.1)' }
const onBlurField  = (e, hasErr) => { e.target.style.borderColor = hasErr ? 'var(--red)' : 'var(--border)'; e.target.style.boxShadow = 'none' }

/* ── Auto-crop: smart center 3:4 crop ──────────────────────────── */
async function autoCropImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ASPECT = 3 / 4
      let sw, sh, sx, sy
      if (img.width / img.height > ASPECT) {
        sh = img.height; sw = Math.round(sh * ASPECT)
        sx = Math.round((img.width - sw) / 2); sy = 0
      } else {
        sw = img.width; sh = Math.round(sw / ASPECT)
        sx = 0; sy = Math.round((img.height - sh) / 2)
      }
      const canvas = document.createElement('canvas')
      canvas.width = sw; canvas.height = sh
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = dataUrl
  })
}

/* ── Apply custom crop ──────────────────────────────────────────── */
async function applyCrop(dataUrl, crop, displayW, displayH) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scaleX = img.naturalWidth  / displayW
      const scaleY = img.naturalHeight / displayH
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(crop.w * scaleX)
      canvas.height = Math.round(crop.h * scaleY)
      canvas.getContext('2d').drawImage(img,
        crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY,
        0, 0, canvas.width, canvas.height
      )
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = dataUrl
  })
}

const HANDLES = [
  { id:'nw', cx:0,   cy:0   }, { id:'n',  cx:0.5, cy:0   }, { id:'ne', cx:1,   cy:0   },
  { id:'e',  cx:1,   cy:0.5 }, { id:'se', cx:1,   cy:1   }, { id:'s',  cx:0.5, cy:1   },
  { id:'sw', cx:0,   cy:1   }, { id:'w',  cx:0,   cy:0.5 },
]
const CURSORS = { nw:'nw-resize',n:'n-resize',ne:'ne-resize',e:'e-resize',se:'se-resize',s:'s-resize',sw:'sw-resize',w:'w-resize' }
const ASPECT = 3 / 4
const MIN_W  = 60

/* ══════════════════════════════════════════════════════════════════
   CropModal — everything on ONE screen, no sub-screens
   Left half  = image (either full preview or crop canvas)
   Right half = controls that change based on selected mode
══════════════════════════════════════════════════════════════════ */
function CropModal({ open, imageUrl, onDone, onClose }) {
  const imgRef       = useRef(null)
  const dragRef      = useRef(null)

  const [mode,        setMode]        = useState(null)        // null | 'auto' | 'custom'
  const [imgSize,     setImgSize]     = useState({ w:1, h:1 })
  const [crop,        setCrop]        = useState({ x:0,y:0,w:100,h:133 })
  const [loaded,      setLoaded]      = useState(false)
  const [autoResult,  setAutoResult]  = useState(null)
  const [applying,    setApplying]    = useState(false)

  /* Reset every time modal opens */
  useEffect(() => {
    if (!open) return
    setMode(null)
    setLoaded(false)
    setAutoResult(null)
    setApplying(false)
  }, [open, imageUrl])

  /* Measure image once loaded, centre the crop box */
  const onImgLoad = useCallback(() => {
    if (!imgRef.current) return
    const r  = imgRef.current.getBoundingClientRect()
    const iw = r.width, ih = r.height
    setImgSize({ w: iw, h: ih })
    const cw = Math.round(iw * 0.65)
    const ch = Math.round(cw / ASPECT)
    setCrop({ x: Math.round((iw-cw)/2), y: Math.round((ih - Math.min(ch,ih))/2), w:cw, h: Math.min(ch,ih) })
    setLoaded(true)
  }, [])

  /* Switch to auto — generate result immediately */
  const pickAuto = async () => {
    setMode('auto')
    if (!autoResult) {
      const r = await autoCropImage(imageUrl)
      setAutoResult(r)
    }
  }

  /* Switch to custom — show drag canvas */
  const pickCustom = () => {
    setMode('custom')
    /* re-measure in case img rendered differently */
    setTimeout(() => { if (imgRef.current) onImgLoad() }, 50)
  }

  /* Clamp crop inside image */
  const clamp = useCallback((box) => {
    let { x, y, w, h } = box
    w = Math.max(MIN_W, Math.min(w, imgSize.w))
    h = Math.round(w / ASPECT)
    if (h > imgSize.h) { h = imgSize.h; w = Math.round(h * ASPECT) }
    x = Math.max(0, Math.min(x, imgSize.w - w))
    y = Math.max(0, Math.min(y, imgSize.h - h))
    return { x, y, w, h }
  }, [imgSize])

  /* Drag handlers */
  const startDrag = useCallback((e, type, handleId=null) => {
    e.preventDefault(); e.stopPropagation()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    dragRef.current = { type, handleId, startX:cx, startY:cy, startCrop:{ ...crop } }

    const onMove = (ev) => {
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY
      const dx = mx - dragRef.current.startX
      const dy = my - dragRef.current.startY
      const sc = dragRef.current.startCrop
      setCrop(() => {
        if (dragRef.current.type === 'move') return clamp({ ...sc, x: sc.x+dx, y: sc.y+dy })
        const hid = dragRef.current.handleId
        let { x, y, w, h } = sc
        if (hid.includes('e'))  w = Math.max(MIN_W, sc.w+dx)
        if (hid.includes('w')) { w = Math.max(MIN_W, sc.w-dx); x = sc.x+sc.w-w }
        if (hid.includes('s'))  h = Math.max(MIN_W/ASPECT, sc.h+dy)
        if (hid.includes('n')) { h = Math.max(MIN_W/ASPECT, sc.h-dy); y = sc.y+sc.h-h }
        if (hid.includes('e')||hid.includes('w')) h = Math.round(w/ASPECT)
        else w = Math.round(h*ASPECT)
        return clamp({ x, y, w, h })
      })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive:false })
    window.addEventListener('touchend', onUp)
  }, [crop, clamp])

  const handleApply = async () => {
    setApplying(true)
    try {
      if (mode === 'auto') {
        onDone(autoResult); onClose()
      } else {
        const result = await applyCrop(imageUrl, crop, imgSize.w, imgSize.h)
        onDone(result); onClose()
      }
    } catch { toast.error('Crop failed') }
    finally { setApplying(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="📷 Crop Your Photo" width={640}>
      <style>{`
        .crop-modal-grid { display: grid; grid-template-columns: 1fr 220px; gap: 16px; align-items: start; }
        @media (max-width: 600px) {
          .crop-modal-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* ── Single screen: left = image, right = controls ── */}
      <div className="crop-modal-grid">

        {/* ── LEFT: Image area ── */}
        <div style={{ position:'relative', background:'#111', borderRadius:10, overflow:'hidden', height:300, userSelect:'none' }}>

          {/* Image — always visible */}
          <img
            ref={imgRef}
            src={imageUrl}
            onLoad={onImgLoad}
            crossOrigin="anonymous"
            draggable={false}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', pointerEvents:'none',
              /* Dim the image slightly when auto mode so preview stands out */
              opacity: mode === 'auto' ? 0.35 : 1, transition:'opacity .3s'
            }}
            alt=""
          />

          {/* AUTO MODE: show cropped result centered on top of dimmed image */}
          {mode === 'auto' && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {!autoResult
                ? <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>⏳ Processing...</div>
                : <img src={autoResult} alt="Auto crop"
                    style={{ maxWidth:'70%', maxHeight:'90%', objectFit:'contain', borderRadius:10, border:'3px solid #2352ff', boxShadow:'0 4px 24px rgba(35,82,255,.4)' }} />
              }
            </div>
          )}

          {/* CUSTOM MODE: dark overlay + crop box with handles */}
          {mode === 'custom' && loaded && (
            <>
              {/* 4-piece dark overlay */}
              <div style={{ position:'absolute', left:0, right:0, top:0, height:crop.y, background:'rgba(0,0,0,.6)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', left:0, right:0, top:crop.y+crop.h, bottom:0, background:'rgba(0,0,0,.6)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', left:0, width:crop.x, top:crop.y, height:crop.h, background:'rgba(0,0,0,.6)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', left:crop.x+crop.w, right:0, top:crop.y, height:crop.h, background:'rgba(0,0,0,.6)', pointerEvents:'none' }}/>

              {/* Crop box */}
              <div
                onMouseDown={e => startDrag(e,'move')}
                onTouchStart={e => startDrag(e,'move')}
                style={{ position:'absolute', left:crop.x, top:crop.y, width:crop.w, height:crop.h, border:'2px solid rgba(255,255,255,.9)', cursor:'grab', boxSizing:'border-box' }}>
                {/* Rule of thirds */}
                {[1/3,2/3].map(f=><div key={`v${f}`} style={{ position:'absolute',left:`${f*100}%`,top:0,bottom:0,width:1,background:'rgba(255,255,255,.25)',pointerEvents:'none' }}/>)}
                {[1/3,2/3].map(f=><div key={`h${f}`} style={{ position:'absolute',top:`${f*100}%`,left:0,right:0,height:1,background:'rgba(255,255,255,.25)',pointerEvents:'none' }}/>)}
                {/* Corner brackets */}
                {[{top:0,left:0,borderTop:'3px solid #2352ff',borderLeft:'3px solid #2352ff'},{top:0,right:0,borderTop:'3px solid #2352ff',borderRight:'3px solid #2352ff'},{bottom:0,left:0,borderBottom:'3px solid #2352ff',borderLeft:'3px solid #2352ff'},{bottom:0,right:0,borderBottom:'3px solid #2352ff',borderRight:'3px solid #2352ff'}].map((s,i)=>(
                  <div key={i} style={{ position:'absolute',width:16,height:16,pointerEvents:'none',...s }}/>
                ))}
                {/* 8 handles */}
                {HANDLES.map(h=>(
                  <div key={h.id}
                    onMouseDown={e=>startDrag(e,'resize',h.id)}
                    onTouchStart={e=>startDrag(e,'resize',h.id)}
                    style={{ position:'absolute',left:`calc(${h.cx*100}% - 6px)`,top:`calc(${h.cy*100}% - 6px)`,width:12,height:12,borderRadius:2,background:'#fff',border:'2px solid #2352ff',cursor:CURSORS[h.id],zIndex:10,boxShadow:'0 1px 4px rgba(0,0,0,.4)' }}/>
                ))}
              </div>

              {/* Size badge */}
              <div style={{ position:'absolute',bottom:8,right:8,background:'rgba(0,0,0,.7)',color:'#fff',fontSize:10,fontFamily:'JetBrains Mono,monospace',padding:'3px 8px',borderRadius:6,pointerEvents:'none' }}>
                {crop.w}×{crop.h}
              </div>
            </>
          )}

          {/* No mode selected: faint hint overlay */}
          {!mode && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ background:'rgba(0,0,0,.5)', color:'#fff', fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:20 }}>
                Select a crop option →
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Controls ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* Mode selector tabs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:4 }}>
            <div onClick={pickAuto}
              style={{ padding:'12px 8px', borderRadius:'var(--r)', border:`2px solid ${mode==='auto'?'#2352ff':'var(--border)'}`, background: mode==='auto'?'var(--blue-s)':'var(--paper2)', cursor:'pointer', textAlign:'center', transition:'all .18s' }}>
              <div style={{ fontSize:22, marginBottom:4 }}>⚡</div>
              <div style={{ fontSize:12, fontWeight:700, color: mode==='auto'?'var(--blue)':'var(--ink)' }}>Auto</div>
              <div style={{ fontSize:10, color:'var(--ink3)', marginTop:2, lineHeight:1.4 }}>Smart center crop</div>
            </div>
            <div onClick={pickCustom}
              style={{ padding:'12px 8px', borderRadius:'var(--r)', border:`2px solid ${mode==='custom'?'#2352ff':'var(--border)'}`, background: mode==='custom'?'var(--blue-s)':'var(--paper2)', cursor:'pointer', textAlign:'center', transition:'all .18s' }}>
              <div style={{ fontSize:22, marginBottom:4 }}>✂️</div>
              <div style={{ fontSize:12, fontWeight:700, color: mode==='custom'?'var(--blue)':'var(--ink)' }}>Custom</div>
              <div style={{ fontSize:10, color:'var(--ink3)', marginTop:2, lineHeight:1.4 }}>Drag to select</div>
            </div>
          </div>

          {/* Context info based on mode */}
          {!mode && (
            <div style={{ padding:'12px', background:'var(--paper2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:12, color:'var(--ink3)', lineHeight:1.6 }}>
                Click <strong>Auto</strong> for instant smart crop, or <strong>Custom</strong> to drag and select the exact area.
              </div>
            </div>
          )}

          {mode === 'auto' && (
            <div style={{ padding:'10px 12px', background:'var(--blue-s)', borderRadius:'var(--r)', fontSize:12, color:'var(--blue)', fontWeight:600, lineHeight:1.5 }}>
              ⚡ Center-cropped to 3:4 ratio automatically.
            </div>
          )}

          {mode === 'custom' && (
            <div style={{ padding:'10px 12px', background:'var(--blue-s)', borderRadius:'var(--r)', fontSize:12, color:'var(--blue)', fontWeight:600, lineHeight:1.5 }}>
              ✂ Drag the box to move · Drag handles to resize · 3:4 locked
            </div>
          )}

          {/* Ratio badge */}
          <div style={{ padding:'8px 12px', background:'var(--paper2)', borderRadius:'var(--r)', border:'1px solid var(--border)', fontSize:11, color:'var(--ink3)', display:'flex', alignItems:'center', gap:6 }}>
            <span>📐</span>
            <span>Portrait 3:4 — ID card standard</span>
          </div>

          {/* Spacer */}
          <div style={{ flex:1 }}/>

          {/* Action buttons */}
          <Btn
            full
            onClick={handleApply}
            disabled={!mode || applying || (mode==='auto' && !autoResult) || (mode==='custom' && !loaded)}
            style={{ marginTop:'auto' }}>
            {applying ? '⏳ Applying...' : '✓ Apply Crop'}
          </Btn>
          <Btn variant="ghost" full onClick={onClose} disabled={applying}>
            Cancel
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

/* ── RenderField ────────────────────────────────────────────────── */
function RenderField({ f, formData, errors, update }) {
  const meta   = FIELD_META[f]
  if (!meta) return null
  const val    = formData[f] || ''
  const hasErr = Boolean(errors[f])
  const label  = (
    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
      {meta.icon} {meta.label}{meta.required && <span style={{ color:'var(--red)', marginLeft:3 }}>*</span>}
    </label>
  )
  const errMsg = hasErr && <p style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{errors[f]}</p>

  if (meta.type === 'select') return (
    <div>
      {label}
      <select value={val} onChange={e=>update(f,e.target.value)} onFocus={onFocusField} onBlur={e=>onBlurField(e,hasErr)}
        style={{ ...inputStyle(hasErr), cursor:'pointer', color: val?'var(--ink)':'var(--ink3)' }}>
        {meta.options.map(o=><option key={o} value={o}>{o||`-- Select ${meta.label} --`}</option>)}
      </select>
      {errMsg}
    </div>
  )
  if (meta.type === 'textarea') return (
    <div style={{ gridColumn:'1 / -1' }}>
      {label}
      <textarea value={val} onChange={e=>update(f,e.target.value)} onFocus={onFocusField} onBlur={e=>onBlurField(e,hasErr)}
        placeholder={`Enter ${meta.label.toLowerCase()}`} rows={3} style={{ ...inputStyle(hasErr), resize:'vertical' }} />
      {errMsg}
    </div>
  )
  return (
    <div>
      {label}
      <input type={meta.type} value={val} onChange={e=>update(f,e.target.value)} onFocus={onFocusField} onBlur={e=>onBlurField(e,hasErr)}
        placeholder={meta.type==='date'?'':`Enter ${meta.label.toLowerCase()}`} style={inputStyle(hasErr)} />
      {errMsg}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Main DetailsForm
══════════════════════════════════════════════════════════════════ */
export default function DetailsForm() {
  const { urlId }  = useParams()
  const navigate   = useNavigate()
  const { createSubmission, checkDuplicate } = useSubmissions()

  const [config,       setConfig]       = useState(null)
  const [configLoad,   setConfigLoad]   = useState(true)
  const [notFound,     setNotFound]     = useState(false)
  const [step,         setStep]         = useState(0)
  const [formData,     setFormData]     = useState({})
  const [errors,       setErrors]       = useState({})
  const [accepted,     setAccepted]     = useState(false)
  const [dupWarn,      setDupWarn]      = useState('')
  const [photoRaw,     setPhotoRaw]     = useState(null)
  const [photoCropped, setPhotoCropped] = useState(null)
  const [showCrop,     setShowCrop]     = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!urlId) { setNotFound(true); setConfigLoad(false); return }
    let cancelled = false
    formConfigsApi.getByUrlId(urlId)
      .then(res  => { if (!cancelled) setConfig(res.data) })
      .catch(()  => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setConfigLoad(false) })
    return () => { cancelled = true }
  }, [urlId])

  const schoolName = config?.school_name ?? ''

  const update = useCallback((k, v) => {
    setFormData(prev => ({ ...prev, [k]: v }))
    setErrors(prev => prev[k] ? { ...prev, [k]: '' } : prev)
    if ((k==='Name'||k==='RollNumber') && v.length>2 && schoolName) {
      checkDuplicate(schoolName, k==='Name'?v:'', k==='RollNumber'?v:'',
        (dup) => setDupWarn(dup?`⚠ A record for "${v}" already exists at ${schoolName}.`:''), null)
    } else if (k==='ContactNumber' && v.length===10) {
      checkDuplicate(schoolName,'','',(dup)=>{
        if (dup) setErrors(prev=>({...prev, ContactNumber:'⚠ This contact number is already registered.'}))
      }, v)
    } else if (v.length<=2 && k==='Name') setDupWarn('')
  }, [checkDuplicate, schoolName])

  if (configLoad) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',gap:16,background:'linear-gradient(135deg,#f0f4ff,#f5f6fc)' }}>
      <Spinner size={44}/><p style={{ fontSize:14,color:'var(--ink3)',fontWeight:600 }}>Loading form...</p>
    </div>
  )
  if (notFound) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',gap:16,background:'linear-gradient(135deg,#f0f4ff,#f5f6fc)',padding:24 }}>
      <div style={{ fontSize:64 }}>🔗</div>
      <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:26,fontWeight:900,color:'var(--ink)',textAlign:'center' }}>Link Not Found or Expired</h2>
      <p style={{ color:'var(--ink3)',fontSize:14,textAlign:'center',maxWidth:320 }}>This form link is invalid or has expired. Please contact your school administrator.</p>
    </div>
  )

  const steps             = buildSteps(config.fields)
  const hasPhoto          = config.fields.includes('UploadYourPhoto')
  const totalSteps        = steps.length
  const currentStepFields = steps[step] || []
  const isLastStep        = step === totalSteps - 1
  const isConfirmStep     = currentStepFields.includes('__CONFIRM__')
  const isPhotoStep       = currentStepFields.includes('__PHOTO__')
  const pct               = Math.round((step / totalSteps) * 100)

  const handlePhoto = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5*1024*1024) { toast.error('File too large. Max 5MB.'); return }
    const reader = new FileReader()
    reader.onload = ev => { setPhotoRaw(ev.target.result); setShowCrop(true) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const validateStep = () => {
    const e = {}
    currentStepFields.forEach(f => {
      if (f.startsWith('__')) return
      const meta = FIELD_META[f]; if (!meta) return
      if (meta.required && !formData[f]?.trim()) e[f] = `${meta.label} is required`
      if ((f==='ContactNumber'||f==='EmergencyContact') && formData[f] && !/^\d{10}$/.test(formData[f]))
        e[f] = 'Enter a valid 10-digit number'
      if (f==='ContactNumber' && errors[f]?.includes('already registered')) e[f] = errors[f]
    })
    if (isConfirmStep) {
      if (hasPhoto && !photoCropped) e.photo  = 'Profile photo is required'
      if (!accepted)                 e.accept = 'You must accept the declaration to proceed'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goNext = () => {
    if (!validateStep()) { toast.error('Please fix the errors before continuing'); return }
    if (isLastStep) { setShowConfirm(true); return }
    setStep(s=>s+1); window.scrollTo({ top:0, behavior:'smooth' })
  }
  const goBack = () => { setStep(s=>s-1); window.scrollTo({ top:0, behavior:'smooth' }) }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const sub = await createSubmission({ formConfigId:config.id, schoolName:config.school_name, role:config.role, ...formData }, photoCropped)
      setShowConfirm(false)
      navigate('/success', { state:{ submission:sub, school:config.school_name, role:config.role } })
    } catch (err) { toast.error(err.message||'Submission failed. Please try again.') }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(150deg,#f0f4ff 0%,#eef0f8 50%,#f5f6fc 100%)', display:'flex', justifyContent:'center', padding:'84px 16px 48px' }}>
      <div style={{ width:'100%', maxWidth:680 }}>

        {/* School header */}
        <div className="anim-fade-up" style={{ background:'linear-gradient(135deg,#2352ff,#1538d4)', borderRadius:'var(--rxl)', padding:'22px 28px', marginBottom:20, display:'flex', alignItems:'center', gap:18, boxShadow:'0 8px 32px rgba(35,82,255,.25)' }}>
          <div style={{ width:56,height:56,borderRadius:16,background:'rgba(255,255,255,.18)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Outfit,sans-serif',fontWeight:900,fontSize:20,color:'#fff',flexShrink:0,border:'2px solid rgba(255,255,255,.25)' }}>
            {config.school_name.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Outfit,sans-serif',fontSize:19,fontWeight:800,color:'#fff',letterSpacing:-.3 }}>{config.school_name}</div>
            <div style={{ fontSize:12,color:'rgba(255,255,255,.75)',marginTop:3,display:'flex',alignItems:'center',gap:8 }}>
              <span>{config.role} ID Card Registration Form</span>
              <span style={{ background:'rgba(255,255,255,.2)',padding:'2px 9px',borderRadius:10,fontSize:10,fontWeight:700 }}>OFFICIAL</span>
            </div>
          </div>
          <div style={{ textAlign:'right',flexShrink:0 }}>
            <div style={{ fontSize:11,color:'rgba(255,255,255,.6)',fontWeight:600 }}>FIELDS</div>
            <div style={{ fontFamily:'Outfit,sans-serif',fontSize:22,fontWeight:800,color:'#fff' }}>{config.fields.length}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="anim-fade-up" style={{ background:'var(--paper)',borderRadius:'var(--rl)',padding:'18px 24px',marginBottom:16,border:'1px solid var(--border)',boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
            <span style={{ fontSize:13,fontWeight:700,color:'var(--ink2)' }}>{isConfirmStep?'✅ Final Step — Review & Submit':`Step ${step+1} of ${totalSteps}`}</span>
            <span style={{ fontSize:12,color:'var(--ink3)',fontFamily:'JetBrains Mono,monospace' }}>{pct}% complete</span>
          </div>
          <div style={{ height:6,background:'var(--paper3)',borderRadius:4,overflow:'hidden' }}>
            <div style={{ width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#2352ff,#00c48c)',borderRadius:4,transition:'width .4s ease' }}/>
          </div>
          <div style={{ display:'flex',gap:6,marginTop:12,justifyContent:'center' }}>
            {steps.map((_,i)=>(
              <div key={i} onClick={()=>{ if(i<step) setStep(i) }}
                style={{ width:i===step?24:8,height:8,borderRadius:4,background:i<step?'#00c48c':i===step?'#2352ff':'var(--paper3)',transition:'all .3s',cursor:i<step?'pointer':'default' }}/>
            ))}
          </div>
        </div>

        {/* Dup warning */}
        {dupWarn && (
          <div className="anim-slide-down" style={{ background:'var(--amber-s)',borderRadius:'var(--r)',padding:'12px 16px',marginBottom:14,fontSize:13,color:'#92400e',fontWeight:600,border:'1px solid #fcd34d',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:18 }}>⚠️</span>{dupWarn}
          </div>
        )}

        {/* Form card */}
        <div className="anim-fade-up" style={{ background:'var(--paper)',borderRadius:'var(--rxl)',border:'1px solid var(--border)',boxShadow:'0 12px 48px rgba(35,82,255,.14)',overflow:'hidden' }}>
          <div style={{ padding:'22px 28px',borderBottom:'1px solid var(--border)',background:'var(--paper2)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <div>
              <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:20,fontWeight:800,color:'var(--ink)',letterSpacing:-.3 }}>
                {isConfirmStep?'📋 Review Your Details':isPhotoStep?'📷 Upload Your Photo':'Personal Information'}
              </h2>
              <p style={{ fontSize:12,color:'var(--ink3)',marginTop:3 }}>
                {isConfirmStep?'Please check everything is correct before submitting.':'Fields marked with * are required.'}
              </p>
            </div>
            <div style={{ background:'var(--blue-s)',color:'var(--blue)',fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700,padding:'6px 12px',borderRadius:8 }}>
              {step+1}/{totalSteps}
            </div>
          </div>

          <div style={{ padding:'28px' }}>
            <style>{`
              .df-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
              .df-confirm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .df-modal-confirm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              @media (max-width: 600px) {
                .df-fields-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
                .df-confirm-grid { grid-template-columns: 1fr !important; }
                .df-modal-confirm-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
            {!isConfirmStep && !isPhotoStep && (
              <div className="df-fields-grid">
                {currentStepFields.map(f=><RenderField key={f} f={f} formData={formData} errors={errors} update={update}/>)}
              </div>
            )}

            {isPhotoStep && (
              <div>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:.5,marginBottom:12 }}>Profile Photo *</div>
                {!photoCropped ? (
                  <div onClick={()=>fileRef.current?.click()}
                    style={{ border:'2px dashed var(--border2)',borderRadius:'var(--rl)',padding:'44px 24px',textAlign:'center',cursor:'pointer',background:'var(--paper2)',transition:'all .2s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor='#2352ff'; e.currentTarget.style.background='var(--blue-s)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.background='var(--paper2)' }}>
                    <div style={{ fontSize:52,marginBottom:12 }}>📷</div>
                    <div style={{ fontSize:15,fontWeight:700,color:'var(--ink2)',marginBottom:6 }}>Click to upload your photo</div>
                    <div style={{ fontSize:12,color:'var(--ink3)' }}>JPG, PNG or WEBP · Max 5MB</div>
                    <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} style={{ display:'none' }}/>
                  </div>
                ) : (
                  <div style={{ display:'flex',gap:24,alignItems:'flex-start',padding:24,background:'linear-gradient(135deg,var(--teal-s),var(--blue-s))',borderRadius:'var(--rl)',border:'1.5px solid #00c48c' }}>
                    <div style={{ position:'relative',flexShrink:0 }}>
                      <img src={photoCropped} alt="Preview" style={{ width:110,height:140,objectFit:'cover',borderRadius:14,border:'3px solid #2352ff',boxShadow:'0 4px 16px rgba(35,82,255,.2)' }}/>
                      <div style={{ position:'absolute',top:-8,right:-8,width:26,height:26,borderRadius:'50%',background:'#00c48c',border:'3px solid white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff',fontWeight:900 }}>✓</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15,fontWeight:700,color:'var(--ink)',marginBottom:4 }}>Photo cropped successfully ✓</div>
                      <div style={{ fontSize:12,color:'var(--ink2)',marginBottom:16,lineHeight:1.5 }}>Your photo is ready for the ID card.</div>
                      <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                        <Btn size="sm" variant="soft"  onClick={()=>setShowCrop(true)}>✂ Re-crop</Btn>
                        <Btn size="sm" variant="ghost" onClick={()=>fileRef.current?.click()}>🔄 Change</Btn>
                        <Btn size="sm" variant="ghost" style={{ color:'var(--red)' }} onClick={()=>{ setPhotoCropped(null); setPhotoRaw(null) }}>🗑 Remove</Btn>
                      </div>
                      <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} style={{ display:'none' }}/>
                    </div>
                  </div>
                )}
                {errors.photo && <p style={{ fontSize:12,color:'var(--red)',marginTop:8,fontWeight:600 }}>{errors.photo}</p>}
              </div>
            )}

            {isConfirmStep && (
              <div>
                <div style={{ background:'var(--paper2)',borderRadius:'var(--rl)',padding:20,marginBottom:20,border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex',gap:16,alignItems:'flex-start',marginBottom:16 }}>
                    {photoCropped && <img src={photoCropped} style={{ width:72,height:90,objectFit:'cover',borderRadius:10,border:'2px solid #2352ff',flexShrink:0 }} alt=""/>}
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Outfit,sans-serif',fontSize:20,fontWeight:800,color:'var(--ink)' }}>{formData.Name||'—'}</div>
                      <div style={{ fontSize:13,color:'var(--ink3)',marginTop:3 }}>{config.role} · {config.school_name}</div>
                    </div>
                  </div>
                  <div className="df-confirm-grid">
                  </div>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:10,background:'var(--blue-s)',borderRadius:'var(--r)',padding:'10px 14px',marginBottom:18,fontSize:12,color:'var(--blue)',fontWeight:600 }}>
                  <span>✏</span><span>Need to change something? Click the step dots above to go back and edit.</span>
                </div>
                <div style={{ background:accepted?'var(--teal-s)':'var(--paper2)',borderRadius:'var(--r)',padding:'16px 18px',border:`1.5px solid ${accepted?'#00c48c':'var(--border)'}`,marginBottom:4,transition:'all .2s',cursor:'pointer' }}
                  onClick={()=>setAccepted(a=>!a)}>
                  <label style={{ display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer' }}>
                    <div style={{ width:20,height:20,borderRadius:5,border:`2px solid ${accepted?'#00c48c':'var(--border2)'}`,background:accepted?'#00c48c':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1,transition:'all .15s' }}>
                      {accepted&&<span style={{ color:'#fff',fontSize:12,fontWeight:900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13,color:'var(--ink2)',lineHeight:1.6,fontWeight:500,pointerEvents:'none' }}>
                      I hereby declare that all information provided above is <strong>true and correct</strong>. I accept responsibility for any false information submitted.
                    </span>
                  </label>
                </div>
                {errors.accept&&<p style={{ fontSize:12,color:'var(--red)',marginTop:6,fontWeight:600 }}>{errors.accept}</p>}
              </div>
            )}

            <div style={{ display:'flex',gap:10,marginTop:28 }}>
              {step>0&&<Btn variant="ghost" onClick={goBack} style={{ minWidth:100 }}>← Back</Btn>}
              <Btn variant={isLastStep?'teal':'primary'} full onClick={goNext} disabled={submitting} style={{ fontSize:15 }}>
                {submitting?'⏳ Submitting...':isLastStep?'✓ Submit Form':'Continue →'}
              </Btn>
            </div>
          </div>
        </div>

        <p style={{ textAlign:'center',fontSize:12,color:'var(--ink3)',marginTop:20 }}>
          🔒 Your data is securely stored and will only be used for ID card generation.
        </p>
      </div>

      {photoRaw && <CropModal open={showCrop} imageUrl={photoRaw} onDone={setPhotoCropped} onClose={()=>setShowCrop(false)}/>}

      <Modal open={showConfirm} onClose={()=>!submitting&&setShowConfirm(false)} title="Confirm Submission" width={560}>
        <p style={{ fontSize:13,color:'var(--ink3)',marginBottom:20 }}>Once submitted you cannot edit your details. Please review carefully.</p>
        <div style={{ background:'var(--paper2)',borderRadius:'var(--rl)',padding:20,marginBottom:16 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:16,paddingBottom:16,borderBottom:'1px solid var(--border)' }}>
            {photoCropped
              ? <img src={photoCropped} style={{ width:60,height:80,objectFit:'cover',borderRadius:10,border:'2px solid #2352ff',flexShrink:0 }} alt=""/>
              : <div style={{ width:60,height:80,borderRadius:10,background:'var(--blue-s)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0 }}>👤</div>
            }
            <div>
              <div style={{ fontFamily:'Outfit,sans-serif',fontSize:19,fontWeight:800,color:'var(--ink)' }}>{formData.Name||'—'}</div>
              <div style={{ fontSize:12,color:'var(--ink3)',marginTop:3 }}>{config.role} · {config.school_name}</div>
            </div>
          </div>
          <div className="df-modal-confirm-grid">
          </div>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <Btn variant="ghost" full onClick={()=>setShowConfirm(false)} disabled={submitting}>← Edit Details</Btn>
          <Btn variant="teal"  full onClick={handleConfirm} disabled={submitting}>
            {submitting?'⏳ Submitting...':'✓ Confirm & Submit'}
          </Btn>
        </div>
      </Modal>
    </div>
  )
}