import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSubmissions } from '../hooks/useSubmissions'
import { formConfigsApi } from '../lib/api'
import { Btn, Modal, Spinner } from '../components/shared/index'
import toast from 'react-hot-toast'

/* ═══════════════════════════════════════════════════════════════
   MODULE-LEVEL CONSTANTS & HELPERS
═══════════════════════════════════════════════════════════════ */
const FIELD_META = {
  Name:                 { label:'Full Name',          icon:'👤', type:'text',     required:true  },
  ClassN:               { label:'Class',              icon:'🏫', type:'text',     required:false },
  Section:              { label:'Section',            icon:'📌', type:'text',     required:false },
  DateofBirth:          { label:'Date of Birth',      icon:'🎂', type:'date',     required:false },
  AdmissionNumber:      { label:'Admission Number',   icon:'🔢', type:'text',     required:false },
  RollNumber:           { label:'Roll Number',        icon:'🎯', type:'text',     required:false },
  ContactNumber:        { label:'Contact Number',     icon:'📱', type:'tel',      required:false },
  EmergencyContact:     { label:'Emergency Contact',  icon:'🚨', type:'tel',      required:false },
  BloodGroup:           { label:'Blood Group',        icon:'🩸', type:'select',   required:false,
    options:['','A+','A-','B+','B-','AB+','AB-','O+','O-'] },
  Address:              { label:'Address',            icon:'📍', type:'textarea', required:false },
  ModeOfTransportation: { label:'Mode of Transport', icon:'🚌', type:'select',   required:false,
    options:['','School Bus','Auto Rickshaw','Private Vehicle','Walking','Bicycle','Public Transport'] },
  Designation:          { label:'Designation',       icon:'💼', type:'text',     required:false },
  AadharCard:           { label:'Aadhar Card Number',icon:'🪪', type:'text',     required:false },
  Department:           { label:'Department',         icon:'🏢', type:'text',     required:false },
}

const inputStyle = (hasErr) => ({
  width:'100%', padding:'11px 14px', borderRadius:'var(--r)',
  border:`1.5px solid ${hasErr?'var(--red)':'var(--border)'}`,
  fontSize:14, color:'var(--ink)', background:'var(--paper)',
  outline:'none', transition:'all .18s', fontFamily:'inherit', boxSizing:'border-box',
})
const onFocusField = e => { e.target.style.borderColor='var(--blue)'; e.target.style.boxShadow='0 0 0 3px rgba(35,82,255,.1)' }
const onBlurField  = (e, hasErr) => { e.target.style.borderColor=hasErr?'var(--red)':'var(--border)'; e.target.style.boxShadow='none' }

/* ── Crop helpers ──────────────────────────────────────────────── */
async function autoCropImage(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const A=3/4; let sw,sh,sx,sy
      if (img.width/img.height>A) { sh=img.height; sw=Math.round(sh*A); sx=Math.round((img.width-sw)/2); sy=0 }
      else { sw=img.width; sh=Math.round(sw/A); sx=0; sy=Math.round((img.height-sh)/2) }
      const c=document.createElement('canvas'); c.width=sw; c.height=sh
      c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,sw,sh)
      resolve(c.toDataURL('image/jpeg',0.92))
    }
    img.src=dataUrl
  })
}
async function applyCrop(dataUrl,crop,dW,dH) {
  return new Promise(resolve => {
    const img=new Image()
    img.onload=()=>{
      const sx=img.naturalWidth/dW, sy=img.naturalHeight/dH
      const c=document.createElement('canvas')
      c.width=Math.round(crop.w*sx); c.height=Math.round(crop.h*sy)
      c.getContext('2d').drawImage(img,crop.x*sx,crop.y*sy,crop.w*sx,crop.h*sy,0,0,c.width,c.height)
      resolve(c.toDataURL('image/jpeg',0.92))
    }
    img.src=dataUrl
  })
}

const HANDLES=[{id:'nw',cx:0,cy:0},{id:'n',cx:.5,cy:0},{id:'ne',cx:1,cy:0},{id:'e',cx:1,cy:.5},{id:'se',cx:1,cy:1},{id:'s',cx:.5,cy:1},{id:'sw',cx:0,cy:1},{id:'w',cx:0,cy:.5}]
const CURSORS={nw:'nw-resize',n:'n-resize',ne:'ne-resize',e:'e-resize',se:'se-resize',s:'s-resize',sw:'sw-resize',w:'w-resize'}
const ASPECT=3/4, MIN_W=60

/* ── CropModal ─────────────────────────────────────────────────── */
function CropModal({ open, imageUrl, onDone, onClose }) {
  const imgRef=useRef(null), dragRef=useRef(null)
  const [mode,setMode]=useState(null)
  const [imgSize,setImgSize]=useState({w:1,h:1})
  const [crop,setCrop]=useState({x:0,y:0,w:100,h:133})
  const [loaded,setLoaded]=useState(false)
  const [autoResult,setAutoResult]=useState(null)
  const [applying,setApplying]=useState(false)

  useEffect(()=>{ if(!open) return; setMode(null); setLoaded(false); setAutoResult(null) },[open,imageUrl])

  const onImgLoad=useCallback(()=>{
    if(!imgRef.current) return
    const r=imgRef.current.getBoundingClientRect()
    const iw=r.width,ih=r.height; setImgSize({w:iw,h:ih})
    const cw=Math.round(iw*.65),ch=Math.round(cw/ASPECT)
    setCrop({x:Math.round((iw-cw)/2),y:Math.round((ih-Math.min(ch,ih))/2),w:cw,h:Math.min(ch,ih)}); setLoaded(true)
  },[])

  const pickAuto=async()=>{ setMode('auto'); if(!autoResult){ const r=await autoCropImage(imageUrl); setAutoResult(r) } }
  const pickCustom=()=>{ setMode('custom'); setTimeout(()=>{ if(imgRef.current) onImgLoad() },50) }

  const clamp=useCallback((box)=>{
    let{x,y,w,h}=box
    w=Math.max(MIN_W,Math.min(w,imgSize.w)); h=Math.round(w/ASPECT)
    if(h>imgSize.h){h=imgSize.h;w=Math.round(h*ASPECT)}
    x=Math.max(0,Math.min(x,imgSize.w-w)); y=Math.max(0,Math.min(y,imgSize.h-h))
    return{x,y,w,h}
  },[imgSize])

  const startDrag=useCallback((e,type,hid=null)=>{
    e.preventDefault(); e.stopPropagation()
    const cx=e.touches?e.touches[0].clientX:e.clientX, cy=e.touches?e.touches[0].clientY:e.clientY
    dragRef.current={type,hid,startX:cx,startY:cy,startCrop:{...crop}}
    const onMove=ev=>{
      const mx=ev.touches?ev.touches[0].clientX:ev.clientX, my=ev.touches?ev.touches[0].clientY:ev.clientY
      const dx=mx-dragRef.current.startX, dy=my-dragRef.current.startY, sc=dragRef.current.startCrop
      setCrop(()=>{
        if(dragRef.current.type==='move') return clamp({...sc,x:sc.x+dx,y:sc.y+dy})
        const h=dragRef.current.hid; let{x,y,w,hh}={...sc,hh:sc.h}
        if(h.includes('e')) w=Math.max(MIN_W,sc.w+dx)
        if(h.includes('w')){w=Math.max(MIN_W,sc.w-dx);x=sc.x+sc.w-w}
        if(h.includes('s')) hh=Math.max(MIN_W/ASPECT,sc.h+dy)
        if(h.includes('n')){hh=Math.max(MIN_W/ASPECT,sc.h-dy);y=sc.y+sc.h-hh}
        if(h.includes('e')||h.includes('w')) hh=Math.round(w/ASPECT); else w=Math.round(hh*ASPECT)
        return clamp({x,y,w,h:hh})
      })
    }
    const onUp=()=>{ dragRef.current=null; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); window.removeEventListener('touchmove',onMove); window.removeEventListener('touchend',onUp) }
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp)
    window.addEventListener('touchmove',onMove,{passive:false}); window.addEventListener('touchend',onUp)
  },[crop,clamp])

  const handleApply=async()=>{
    setApplying(true)
    try {
      if(mode==='auto'){onDone(autoResult);onClose()}
      else{const r=await applyCrop(imageUrl,crop,imgSize.w,imgSize.h);onDone(r);onClose()}
    } catch{toast.error('Crop failed')} finally{setApplying(false)}
  }

  return (
    <Modal open={open} onClose={onClose} title="📷 Crop Your Photo" width={640}>
      <style>{`
        .crop-layout {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 14px;
          align-items: start;
        }
        .crop-image-area {
          position: relative;
          background: #111;
          border-radius: 10px;
          overflow: hidden;
          height: 280px;
          user-select: none;
        }
        .crop-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .crop-mode-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .crop-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        @media (max-width: 540px) {
          .crop-layout {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .crop-image-area {
            height: 240px !important;
          }
          .crop-controls {
            flex-direction: column;
            gap: 10px;
          }
          .crop-mode-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .crop-actions {
            flex-direction: row;
            gap: 8px;
          }
          .crop-actions > * {
            flex: 1;
          }
        }
      `}</style>
      <div className="crop-layout">
        {/* Image */}
        <div className="crop-image-area">
          <img ref={imgRef} src={imageUrl} onLoad={onImgLoad} crossOrigin="anonymous" draggable={false}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', pointerEvents:'none', opacity:mode==='auto'?.35:1, transition:'opacity .3s' }} alt=""/>
          {mode==='auto'&&(
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {!autoResult?<div style={{ color:'#fff', fontSize:13 }}>⏳ Processing...</div>
                :<img src={autoResult} style={{ maxWidth:'70%', maxHeight:'90%', borderRadius:10, border:'3px solid #2352ff' }} alt=""/>}
            </div>
          )}
          {mode==='custom'&&loaded&&(
            <>
              <div style={{ position:'absolute',left:0,right:0,top:0,height:crop.y,background:'rgba(0,0,0,.6)',pointerEvents:'none' }}/>
              <div style={{ position:'absolute',left:0,right:0,top:crop.y+crop.h,bottom:0,background:'rgba(0,0,0,.6)',pointerEvents:'none' }}/>
              <div style={{ position:'absolute',left:0,width:crop.x,top:crop.y,height:crop.h,background:'rgba(0,0,0,.6)',pointerEvents:'none' }}/>
              <div style={{ position:'absolute',left:crop.x+crop.w,right:0,top:crop.y,height:crop.h,background:'rgba(0,0,0,.6)',pointerEvents:'none' }}/>
              <div onMouseDown={e=>startDrag(e,'move')} onTouchStart={e=>startDrag(e,'move')}
                style={{ position:'absolute',left:crop.x,top:crop.y,width:crop.w,height:crop.h,border:'2px solid rgba(255,255,255,.9)',cursor:'grab',boxSizing:'border-box',touchAction:'none' }}>
                {HANDLES.map(h=><div key={h.id} onMouseDown={e=>startDrag(e,'resize',h.id)} onTouchStart={e=>startDrag(e,'resize',h.id)}
                  style={{ position:'absolute',left:`calc(${h.cx*100}% - 7px)`,top:`calc(${h.cy*100}% - 7px)`,width:14,height:14,borderRadius:3,background:'#fff',border:'2px solid #2352ff',cursor:CURSORS[h.id],zIndex:10,touchAction:'none' }}/>)}
              </div>
            </>
          )}
          {!mode&&<div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none' }}><div style={{ background:'rgba(0,0,0,.5)',color:'#fff',fontSize:12,padding:'8px 16px',borderRadius:20 }}>Select a crop option ↓</div></div>}
        </div>
        {/* Controls */}
        <div className="crop-controls">
          <div className="crop-mode-grid">
            {[['auto','⚡','Auto','Smart center'],['custom','✂️','Custom','Drag to select']].map(([m,icon,label,sub])=>(
              <div key={m} onClick={m==='auto'?pickAuto:pickCustom}
                style={{ padding:'10px 6px', borderRadius:'var(--r)', border:`2px solid ${mode===m?'#2352ff':'var(--border)'}`, background:mode===m?'var(--blue-s)':'var(--paper2)', cursor:'pointer', textAlign:'center', transition:'all .18s' }}>
                <div style={{ fontSize:20, marginBottom:3 }}>{icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:mode===m?'var(--blue)':'var(--ink)' }}>{label}</div>
                <div style={{ fontSize:10, color:'var(--ink3)', marginTop:1 }}>{sub}</div>
              </div>
            ))}
          </div>
          {mode&&<div style={{ padding:'8px 10px', background:'var(--blue-s)', borderRadius:'var(--r)', fontSize:11, color:'var(--blue)', fontWeight:600 }}>
            {mode==='auto'?'⚡ Center-cropped 3:4':'✂ Drag box · 3:4 locked'}
          </div>}
          <div style={{ padding:'8px 10px', background:'var(--paper2)', borderRadius:'var(--r)', border:'1px solid var(--border)', fontSize:11, color:'var(--ink3)' }}>📐 Portrait 3:4 ratio</div>
          <div style={{ flex:1 }}/>
          <div className="crop-actions">
            <Btn full onClick={handleApply} disabled={!mode||applying||(mode==='auto'&&!autoResult)||(mode==='custom'&&!loaded)}>
              {applying?'⏳ Applying...':'✓ Apply Crop'}
            </Btn>
            <Btn variant="ghost" full onClick={onClose} disabled={applying}>Cancel</Btn>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ── RenderField — module-level (prevents focus loss bug) ──────── */
function RenderField({ f, formData, errors, update }) {
  const meta=FIELD_META[f]; if(!meta) return null
  const val=formData[f]||'', hasErr=Boolean(errors[f])
  const label=(
    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
      {meta.icon} {meta.label}{meta.required&&<span style={{ color:'var(--red)',marginLeft:3 }}>*</span>}
    </label>
  )
  const errMsg=hasErr&&<p style={{ fontSize:11,color:'var(--red)',marginTop:4 }}>{errors[f]}</p>
  if(meta.type==='select') return(
    <div>
      {label}
      <select value={val} onChange={e=>update(f,e.target.value)} onFocus={onFocusField} onBlur={e=>onBlurField(e,hasErr)}
        style={{ ...inputStyle(hasErr),cursor:'pointer',color:val?'var(--ink)':'var(--ink3)' }}>
        {meta.options.map(o=><option key={o} value={o}>{o||`-- Select ${meta.label} --`}</option>)}
      </select>{errMsg}
    </div>
  )
  if(meta.type==='textarea') return(
    <div style={{ gridColumn:'1 / -1' }}>
      {label}
      <textarea value={val} onChange={e=>update(f,e.target.value)} onFocus={onFocusField} onBlur={e=>onBlurField(e,hasErr)}
        placeholder={`Enter ${meta.label.toLowerCase()}`} rows={3} style={{ ...inputStyle(hasErr),resize:'vertical' }}/>{errMsg}
    </div>
  )
  return(
    <div>
      {label}
      <input type={meta.type} value={val} onChange={e=>update(f,e.target.value)} onFocus={onFocusField} onBlur={e=>onBlurField(e,hasErr)}
        placeholder={meta.type==='date'?'':`Enter ${meta.label.toLowerCase()}`} style={inputStyle(hasErr)}/>{errMsg}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN — Single page form (no steps)
═══════════════════════════════════════════════════════════════ */
export default function DetailsForm() {
  const { urlId }  = useParams()
  const navigate   = useNavigate()
  const { createSubmission, checkDuplicate } = useSubmissions()

  const [config,       setConfig]       = useState(null)
  const [configLoad,   setConfigLoad]   = useState(true)
  const [notFound,     setNotFound]     = useState(false)
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
    let cancelled=false
    formConfigsApi.getByUrlId(urlId)
      .then(res  => { if(!cancelled) setConfig(res.data) })
      .catch(()  => { if(!cancelled) setNotFound(true) })
      .finally(() => { if(!cancelled) setConfigLoad(false) })
    return () => { cancelled=true }
  }, [urlId])

  const schoolName = config?.school_name ?? ''
  const hasPhoto   = config?.fields?.includes('UploadYourPhoto') ?? false

  const update = useCallback((k, v) => {
    setFormData(prev => ({ ...prev, [k]:v }))
    setErrors(prev => prev[k] ? { ...prev, [k]:'' } : prev)
    if ((k==='Name'||k==='RollNumber') && v.length>2 && schoolName) {
      checkDuplicate(schoolName, k==='Name'?v:'', k==='RollNumber'?v:'',
        dup => setDupWarn(dup?`⚠ A record for "${v}" already exists at ${schoolName}.`:''), null)
    } else if (k==='ContactNumber' && v.length===10) {
      checkDuplicate(schoolName,'','',dup=>{
        if(dup) setErrors(prev=>({...prev,ContactNumber:'⚠ This contact number is already registered.'}))
      },v)
    } else if (v.length<=2 && k==='Name') setDupWarn('')
  }, [checkDuplicate, schoolName])

  const handlePhoto = e => {
    const file=e.target.files?.[0]; if(!file) return
    if(file.size>5*1024*1024){toast.error('File too large. Max 5MB.');return}
    const r=new FileReader()
    r.onload=ev=>{ setPhotoRaw(ev.target.result); setShowCrop(true) }
    r.readAsDataURL(file); e.target.value=''
  }

  /* Validate ALL fields at once */
  const validateAll = () => {
    const e={}
    const dataFields = config.fields.filter(f => f!=='UploadYourPhoto')
    dataFields.forEach(f => {
      const meta=FIELD_META[f]; if(!meta) return
      if(meta.required && !formData[f]?.trim()) e[f]=`${meta.label} is required`
      if((f==='ContactNumber'||f==='EmergencyContact') && formData[f] && !/^\d{10}$/.test(formData[f]))
        e[f]='Enter a valid 10-digit number'
      if(f==='ContactNumber' && errors[f]?.includes('already registered')) e[f]=errors[f]
    })
    if(hasPhoto && !photoCropped) e.photo='Profile photo is required'
    if(!accepted) e.accept='You must accept the declaration to proceed'
    setErrors(e)
    return Object.keys(e).length===0
  }

  const handleSubmitClick = () => {
    if(!validateAll()){
      toast.error('Please fix the errors before submitting')
      /* Scroll to first error */
      setTimeout(()=>{
        const el = document.querySelector('[data-has-error="true"]')
        el?.scrollIntoView({ behavior:'smooth', block:'center' })
      }, 100)
      return
    }
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const sub = await createSubmission({ formConfigId:config.id, schoolName:config.school_name, role:config.role, ...formData }, photoCropped)
      setShowConfirm(false)
      navigate('/success', { state:{ submission:sub, school:config.school_name, role:config.role } })
    } catch(err) { toast.error(err.message||'Submission failed. Please try again.') }
    finally { setSubmitting(false) }
  }

  /* ── Loading / error states ── */
  if (configLoad) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',gap:16,background:'linear-gradient(135deg,#f0f4ff,#f5f6fc)' }}>
      <Spinner size={44}/><p style={{ fontSize:14,color:'var(--ink3)',fontWeight:600 }}>Loading form...</p>
    </div>
  )
  if (notFound) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',gap:16,background:'linear-gradient(135deg,#f0f4ff,#f5f6fc)',padding:24 }}>
      <div style={{ fontSize:64 }}>🔗</div>
      <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:24,fontWeight:900,color:'var(--ink)',textAlign:'center' }}>Link Not Found or Expired</h2>
      <p style={{ color:'var(--ink3)',fontSize:14,textAlign:'center',maxWidth:320 }}>This form link is invalid or has expired. Please contact your school administrator.</p>
    </div>
  )

  const dataFields = config.fields.filter(f => f!=='UploadYourPhoto')

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(150deg,#f0f4ff 0%,#eef0f8 50%,#f5f6fc 100%)', padding:'72px 12px 48px' }}>
      <style>{`
        .df-wrap { max-width: 700px; margin: 0 auto; }
        .df-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .df-confirm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 600px) {
          .df-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .df-confirm-grid { grid-template-columns: 1fr !important; }
          .df-header-meta { display: none !important; }
          .df-photo-preview { flex-direction: column !important; align-items: center !important; }
          .df-photo-preview img { width: 90px !important; height: 114px !important; }
        }
      `}</style>

      <div className="df-wrap">

        {/* ── School header ── */}
        <div className="anim-fade-up" style={{ background:'linear-gradient(135deg,#2352ff,#1538d4)', borderRadius:16, padding:'18px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14, boxShadow:'0 8px 32px rgba(35,82,255,.25)' }}>
          <div style={{ width:50,height:50,borderRadius:14,background:'rgba(255,255,255,.18)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Outfit,sans-serif',fontWeight:900,fontSize:18,color:'#fff',flexShrink:0,border:'2px solid rgba(255,255,255,.25)' }}>
            {config.school_name.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontFamily:'Outfit,sans-serif',fontSize:17,fontWeight:800,color:'#fff',letterSpacing:-.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{config.school_name}</div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2 }}>{config.role} ID Card Registration Form</div>
          </div>
          <div className="df-header-meta" style={{ textAlign:'right',flexShrink:0 }}>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.6)',fontWeight:600 }}>FIELDS</div>
            <div style={{ fontFamily:'Outfit,sans-serif',fontSize:20,fontWeight:800,color:'#fff' }}>{config.fields.length}</div>
          </div>
        </div>

        {/* ── Dup warning ── */}
        {dupWarn && (
          <div style={{ background:'var(--amber-s)',borderRadius:'var(--r)',padding:'10px 14px',marginBottom:12,fontSize:13,color:'#92400e',fontWeight:600,border:'1px solid #fcd34d',display:'flex',alignItems:'center',gap:8 }}>
            <span>⚠️</span>{dupWarn}
          </div>
        )}

        {/* ── Main form card ── */}
        <div className="anim-fade-up" style={{ background:'var(--paper)', borderRadius:16, border:'1px solid var(--border)', boxShadow:'0 8px 32px rgba(35,82,255,.1)', overflow:'hidden' }}>

          {/* Card header */}
          <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)', background:'var(--paper2)' }}>
            <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:18,fontWeight:800,color:'var(--ink)',margin:0 }}>📋 Personal Information</h2>
            <p style={{ fontSize:12,color:'var(--ink3)',marginTop:4,marginBottom:0 }}>Fill in all your details below. Fields marked with * are required.</p>
          </div>

          <div style={{ padding:'20px' }}>

            {/* ── Photo upload (if enabled) — at top so it's prominent ── */}
            {hasPhoto && (
              <div style={{ marginBottom:24, paddingBottom:24, borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:.5,marginBottom:10 }}>📷 Profile Photo *</div>
                {!photoCropped ? (
                  <div onClick={()=>fileRef.current?.click()}
                    style={{ border:`2px dashed ${errors.photo?'var(--red)':'var(--border2)'}`,borderRadius:12,padding:'28px 16px',textAlign:'center',cursor:'pointer',background:'var(--paper2)',transition:'all .2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#2352ff';e.currentTarget.style.background='var(--blue-s)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=errors.photo?'var(--red)':'var(--border2)';e.currentTarget.style.background='var(--paper2)'}}>
                    <div style={{ fontSize:40,marginBottom:8 }}>📷</div>
                    <div style={{ fontSize:14,fontWeight:700,color:'var(--ink2)',marginBottom:4 }}>Tap to upload your photo</div>
                    <div style={{ fontSize:12,color:'var(--ink3)' }}>JPG, PNG or WEBP · Max 5MB</div>
                    <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} style={{ display:'none' }}/>
                  </div>
                ) : (
                  <div className="df-photo-preview" style={{ display:'flex',gap:16,alignItems:'flex-start',padding:16,background:'linear-gradient(135deg,var(--teal-s),var(--blue-s))',borderRadius:12,border:'1.5px solid #00c48c' }}>
                    <div style={{ position:'relative',flexShrink:0 }}>
                      <img src={photoCropped} alt="Preview" style={{ width:80,height:100,objectFit:'cover',borderRadius:12,border:'3px solid #2352ff',boxShadow:'0 4px 16px rgba(35,82,255,.2)',display:'block' }}/>
                      <div style={{ position:'absolute',top:-8,right:-8,width:24,height:24,borderRadius:'50%',background:'#00c48c',border:'3px solid white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:900 }}>✓</div>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:'var(--ink)',marginBottom:4 }}>Photo ready ✓</div>
                      <div style={{ fontSize:12,color:'var(--ink2)',marginBottom:12,lineHeight:1.5 }}>Cropped to 3:4 ratio for your ID card.</div>
                      <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                        <Btn size="sm" variant="soft"  onClick={()=>setShowCrop(true)}>✂ Re-crop</Btn>
                        <Btn size="sm" variant="ghost" onClick={()=>fileRef.current?.click()}>🔄 Change</Btn>
                        <Btn size="sm" variant="ghost" style={{ color:'var(--red)' }} onClick={()=>{setPhotoCropped(null);setPhotoRaw(null)}}>🗑 Remove</Btn>
                      </div>
                      <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} style={{ display:'none' }}/>
                    </div>
                  </div>
                )}
                {errors.photo && <p data-has-error="true" style={{ fontSize:12,color:'var(--red)',marginTop:6,fontWeight:600 }}>{errors.photo}</p>}
              </div>
            )}

            {/* ── All data fields in one grid ── */}
            <div className="df-grid">
              {dataFields.map(f => (
                <div key={f} data-has-error={Boolean(errors[f])?'true':'false'}>
                  <RenderField f={f} formData={formData} errors={errors} update={update}/>
                </div>
              ))}
            </div>

            {/* ── Declaration checkbox ── */}
            <div style={{ marginTop:24, paddingTop:20, borderTop:'1px solid var(--border)' }}>
              <div
                style={{ background:accepted?'var(--teal-s)':'var(--paper2)', borderRadius:'var(--r)', padding:'14px 16px', border:`1.5px solid ${accepted?'#00c48c':'var(--border)'}`, marginBottom:4, transition:'all .2s', cursor:'pointer' }}
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
              {errors.accept&&<p data-has-error="true" style={{ fontSize:12,color:'var(--red)',marginTop:4,fontWeight:600 }}>{errors.accept}</p>}
            </div>

            {/* ── Submit button ── */}
            <div style={{ marginTop:20 }}>
              <Btn variant="teal" full onClick={handleSubmitClick} disabled={submitting} style={{ fontSize:16, padding:'14px', borderRadius:12 }}>
                {submitting ? '⏳ Submitting...' : '✓ Submit Form'}
              </Btn>
            </div>
          </div>
        </div>

        <p style={{ textAlign:'center',fontSize:11,color:'var(--ink3)',marginTop:16 }}>
          🔒 Your data is securely stored and will only be used for ID card generation.
        </p>
      </div>

      {/* ── Crop modal ── */}
      {photoRaw && <CropModal open={showCrop} imageUrl={photoRaw} onDone={setPhotoCropped} onClose={()=>setShowCrop(false)}/>}

      {/* ── Confirm submission modal ── */}
      <Modal open={showConfirm} onClose={()=>!submitting&&setShowConfirm(false)} title="Confirm Submission" width={520}>
        <p style={{ fontSize:13,color:'var(--ink3)',marginBottom:16 }}>Please review your details before submitting. You cannot edit after submission.</p>
        <div style={{ background:'var(--paper2)',borderRadius:12,padding:16,marginBottom:14,maxHeight:'50vh',overflowY:'auto' }}>
          {/* Photo + name */}
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14,paddingBottom:14,borderBottom:'1px solid var(--border)' }}>
            {photoCropped
              ? <img src={photoCropped} style={{ width:52,height:66,objectFit:'cover',borderRadius:8,border:'2px solid #2352ff',flexShrink:0 }} alt=""/>
              : <div style={{ width:52,height:66,borderRadius:8,background:'var(--blue-s)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>👤</div>
            }
            <div>
              <div style={{ fontFamily:'Outfit,sans-serif',fontSize:17,fontWeight:800,color:'var(--ink)' }}>{formData.Name||'—'}</div>
              <div style={{ fontSize:12,color:'var(--ink3)',marginTop:2 }}>{config.role} · {config.school_name}</div>
            </div>
          </div>
          {/* All filled fields */}
          <div className="df-confirm-grid">
            {dataFields.filter(f => { const v=formData[f]; return v&&v.trim?.() }).map(f => {
              const meta=FIELD_META[f]; if(!meta) return null
              return (
                <div key={f} style={{ background:'var(--paper)',borderRadius:8,padding:'8px 10px',border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:9,fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:.4 }}>{meta.label}</div>
                  <div style={{ fontSize:13,fontWeight:600,color:'var(--ink)',marginTop:2,wordBreak:'break-word' }}>{formData[f]}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <Btn variant="ghost" full onClick={()=>setShowConfirm(false)} disabled={submitting}>← Edit</Btn>
          <Btn variant="teal"  full onClick={handleConfirm} disabled={submitting}>
            {submitting?'⏳ Submitting...':'✓ Confirm & Submit'}
          </Btn>
        </div>
      </Modal>
    </div>
  )
}