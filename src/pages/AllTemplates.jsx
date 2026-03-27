import { useState, useRef, useEffect } from 'react'
import { useSubmissions } from '../hooks/useSubmissions'
import { useOrganizations } from '../hooks/useOrganizations'
import { useNavigate } from 'react-router-dom'
import { useCardTemplates } from '../hooks/useCardtemplates'
import { Badge, Btn, Spinner, EmptyState, ConfirmDialog } from '../components/shared/index'
import IDCard, { TEMPLATES } from '../components/idcard/IDCard'
import toast from 'react-hot-toast'

/* ── Responsive hook ─────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

/* ── Scale-to-fit card wrapper ───────────────────────────── */
function CardWrapper({ sub, templateId, customConfig, orgLogo, onDownload, onDelete, cardRefs }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)

  /* natural card width from config or built-in */
  const naturalW = customConfig?.cardW || 340

  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return
      const available = wrapRef.current.offsetWidth
      if (available < naturalW) {
        setScale(available / naturalW)
      } else {
        setScale(1)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [naturalW])

  const naturalH = customConfig?.cardH || 480
  const scaledH  = Math.round(naturalH * scale)

  return (
    <div ref={wrapRef} style={{ width:'100%' }}>
      {/* Height shim so the wrapper takes correct space after scaling */}
      <div style={{ height: scaledH, position:'relative', overflow:'visible' }}>
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: naturalW,
          position:'absolute', top:0, left:0,
        }}>
          <IDCard
            ref={el => { if (cardRefs) cardRefs.current[sub.id] = el }}
            submission={sub}
            templateId={templateId}
            customConfig={customConfig}
            orgLogo={orgLogo}
            showActions
            onDownload={onDownload}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  )
}

export default function AllTemplates() {
  const { submissions, loading, deleteSubmission } = useSubmissions()
  const { organizations } = useOrganizations()
  const navigate          = useNavigate()
  const { templates }     = useCardTemplates()

  const [templateId,     setTemplateId]     = useState('T1')
  const [customTemplate, setCustomTemplate] = useState(null)
  const [school,         setSchool]         = useState('All')
  const [deleteId,       setDeleteId]       = useState(null)
  const [leftOpen,       setLeftOpen]       = useState(false)
  const [rightOpen,      setRightOpen]      = useState(false)
  const cardRefs = useRef({})

  const winW     = useWindowWidth()
  const isMobile = winW < 700
  const isTablet = winW >= 700 && winW < 1100

  const approved = submissions.filter(s => s.status === 'approved')
  const orgNames = organizations.map(o => o.name)
  const subNames = approved.map(s => s.school_name).filter(Boolean)
  const schools  = ['All', ...new Set([...orgNames, ...subNames])]
  const filtered = school === 'All' ? approved : approved.filter(s => s.school_name === school)

  /* Natural card width for column sizing */
  const cardNatW = customTemplate?.config?.cardW || 340
  /* How many columns fit at current window, accounting for panels */
  const panelW   = isMobile ? 0 : isTablet ? 180 : 200
  const rightW   = isMobile ? 0 : 160
  const centerW  = winW - panelW - rightW - 48  // 48px padding
  const cols     = Math.max(1, Math.floor(centerW / (cardNatW + 22)))

  const downloadCard = async (sub) => {
    const el = document.getElementById(`card-${sub.id}`)
    if (!el) { toast.error('Card not found'); return }
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, { scale:3, useCORS:true, backgroundColor:'#ffffff' })
      const link   = document.createElement('a')
      link.download = `${sub.name?.replace(/\s+/g,'_')}_IDCard.png`
      link.href     = canvas.toDataURL('image/png')
      link.click()
      toast.success(`Downloaded ${sub.name}'s card`)
    } catch { toast.error('Download failed') }
  }

  const downloadAllZip = async () => {
    if (!filtered.length) { toast.error('No cards to download'); return }
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: JSZip }       = await import('jszip')
      const zip = new JSZip()
      toast('Generating ZIP...', { icon:'⏳' })
      for (const sub of filtered) {
        const el = document.getElementById(`card-${sub.id}`)
        if (!el) continue
        const canvas  = await html2canvas(el, { scale:2, useCORS:true, backgroundColor:'#ffffff' })
        const base64  = canvas.toDataURL('image/png').split(',')[1]
        zip.file(`${sub.name?.replace(/\s+/g,'_')}_IDCard.png`, base64, { base64:true })
      }
      const blob = await zip.generateAsync({ type:'blob' })
      const link = document.createElement('a')
      link.download = `ID_Cards_${school.replace(/\s+/g,'_')}.zip`
      link.href     = URL.createObjectURL(blob)
      link.click()
      toast.success(`Downloaded ${filtered.length} cards as ZIP`)
    } catch { toast.error('ZIP generation failed') }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <Spinner size={36}/>
    </div>
  )

  /* ── Reusable template list ── */
  const TemplateSelectorContent = () => (
    <div>
      {templates.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase',
            letterSpacing:.5, marginBottom:10, padding:'0 4px' }}>My Templates</div>
          {templates.map(t => {
            const c          = t.config || {}
            const isSelected = customTemplate?.id === t.id
            const bgStyle    = c.headerStyle === 'gradient'
              ? `linear-gradient(135deg,${c.c1||'#555'},${c.c2||'#333'})`
              : (c.c1 || '#555')
            return (
              <div key={t.id}
                onClick={() => { setCustomTemplate(t); setTemplateId(null); setLeftOpen(false) }}
                style={{ borderRadius:'var(--r)', border:`2px solid ${isSelected?'var(--blue)':'var(--border)'}`,
                  overflow:'hidden', marginBottom:8, cursor:'pointer', transition:'all .18s',
                  boxShadow:isSelected?'0 0 0 3px rgba(35,82,255,.15)':'none' }}>
                <div style={{ height:48, background:bgStyle, display:'flex',
                  alignItems:'center', justifyContent:'space-between', padding:'0 10px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#fff', overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{t.name}</span>
                  <div style={{ display:'flex', gap:3 }}>
                    {c.c1 && <div style={{ width:9, height:9, borderRadius:'50%', background:c.c1, border:'1.5px solid rgba(255,255,255,.5)' }}/>}
                    {c.c2 && <div style={{ width:9, height:9, borderRadius:'50%', background:c.c2, border:'1.5px solid rgba(255,255,255,.5)' }}/>}
                  </div>
                </div>
                <div style={{ padding:'5px 8px', fontSize:10, fontWeight:600,
                  color:isSelected?'var(--blue)':'var(--ink3)',
                  background:isSelected?'var(--blue-s)':'var(--paper)',
                  display:'flex', justifyContent:'space-between' }}>
                  <span>{isSelected?'✓ Selected':'Click to select'}</span>
                  <span>{c.visibleFields?.length||0} fields</span>
                </div>
              </div>
            )
          })}
          <div style={{ height:1, background:'var(--border)', margin:'12px 4px 14px' }}/>
        </>
      )}

      <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase',
        letterSpacing:.5, marginBottom:10, padding:'0 4px' }}>Built-in</div>
      {Object.entries(TEMPLATES).map(([id, t]) => {
        const isSelected = !customTemplate && templateId === id
        return (
          <div key={id}
            onClick={() => { setTemplateId(id); setCustomTemplate(null); setLeftOpen(false) }}
            style={{ borderRadius:'var(--r)', border:`2px solid ${isSelected?'var(--blue)':'var(--border)'}`,
              overflow:'hidden', marginBottom:10, cursor:'pointer', transition:'all .18s',
              boxShadow:isSelected?'0 0 0 3px rgba(35,82,255,.15)':'none' }}>
            <div style={{ height:56, background:`linear-gradient(135deg,${t.c1},${t.c2})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase' }}>
              {t.name}
            </div>
            <div style={{ padding:'5px 8px', fontSize:11, fontWeight:600,
              color:isSelected?'var(--blue)':'var(--ink2)',
              background:isSelected?'var(--blue-s)':'var(--paper)' }}>
              {isSelected ? '✓ Selected' : 'Click to select'}
            </div>
          </div>
        )
      })}

      <button onClick={() => { navigate('/card-builder'); setLeftOpen(false) }}
        style={{ width:'100%', padding:'10px 8px', borderRadius:'var(--r)',
          border:'1.5px dashed var(--blue-m)', background:'var(--blue-s)',
          color:'var(--blue)', fontSize:12, fontWeight:700, cursor:'pointer',
          marginTop:4, fontFamily:'inherit' }}>
        + Create New Template
      </button>
    </div>
  )

  /* ── Reusable download panel ── */
  const FormatDownloadContent = () => (
    <>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase',
        letterSpacing:.5, marginBottom:10 }}>Select Format</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[['1-per-page','Single'],['2-per-page','2/page'],['4-per-page','4/page'],['6-per-page','6/page']].map(([id,label]) => (
          <div key={id}
            style={{ border:'2px solid var(--border)', borderRadius:'var(--r)', padding:'8px 4px',
              cursor:'pointer', transition:'all .15s', textAlign:'center' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='var(--blue-s)' }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='transparent' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
          </div>
        ))}
      </div>
      <button onClick={downloadAllZip}
        style={{ width:'100%', padding:'12px 8px', borderRadius:'var(--r)',
          background:'var(--blue)', color:'#fff', border:'none', fontSize:12,
          fontWeight:800, cursor:'pointer', letterSpacing:.3, marginTop:16, lineHeight:1.4 }}
        onMouseEnter={e=>e.target.style.background='#1538d4'}
        onMouseLeave={e=>e.target.style.background='var(--blue)'}>
        ⬇ Download All as ZIP
      </button>
    </>
  )

  /* ── Active template label ── */
  const activeLabel = customTemplate?.name
    || TEMPLATES[templateId]?.name
    || 'None'

  return (
    <div className="anim-fade-up" style={{ paddingTop:64, minHeight:'100vh', background:'var(--paper2)' }}>

      {/* ─────────────────── DESKTOP / TABLET ─────────────────── */}
      {!isMobile && (
        <div style={{
          display:'grid',
          gridTemplateColumns: isTablet ? '180px 1fr 140px' : '200px 1fr 160px',
          minHeight:'calc(100vh - 64px)',
        }}>
          {/* Left: template selector */}
          <div style={{ background:'var(--paper)', borderRight:'1px solid var(--border)',
            padding:'16px 10px', overflowY:'auto' }}>
            <TemplateSelectorContent/>
          </div>

          {/* Center: cards */}
          <div style={{ padding:'20px 16px', overflowY:'auto', overflowX:'hidden' }}>
            {/* Toolbar */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
              <button onClick={() => navigate(-1)}
                style={{ padding:'7px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--border)',
                  background:'var(--paper)', color:'var(--ink2)', fontSize:13, fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.color='var(--blue)'; e.currentTarget.style.background='var(--blue-s)' }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--ink2)'; e.currentTarget.style.background='var(--paper)' }}>
                ← Back
              </button>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>School</div>
                <select value={school} onChange={e => setSchool(e.target.value)}
                  style={{ padding:'7px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--border)',
                    fontSize:13, color:'var(--ink)', background:'var(--paper)', outline:'none', cursor:'pointer' }}>
                  {schools.map(s => <option key={s} value={s}>{s === 'All' ? '-- All Schools --' : s}</option>)}
                </select>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                <Badge type={filtered.length > 0 ? 'teal' : 'gray'}>{filtered.length} approved</Badge>
                <button onClick={() => navigate('/card-builder')}
                  style={{ padding:'7px 12px', borderRadius:'var(--r)', border:'1.5px dashed var(--blue-m)',
                    background:'var(--blue-s)', color:'var(--blue)', fontSize:12, fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  + New Template
                </button>
              </div>
            </div>

            {/* Cards grid — auto columns based on available width */}
            {filtered.length === 0 ? (
              <EmptyState icon="🪪" title="No approved cards yet"
                desc="Approve submissions in the Admin panel to see ID cards here."
                action={<Btn onClick={() => window.history.back()}>← Go to Admin</Btn>}/>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: 20,
              }}>
                {filtered.map(sub => (
                  <CardWrapper
                    key={sub.id}
                    sub={sub}
                    templateId={customTemplate ? null : templateId}
                    customConfig={customTemplate?.config || null}
                    orgLogo={organizations.find(o => o.name === sub.school_name)?.logo_url || null}
                    onDownload={() => downloadCard(sub)}
                    onDelete={() => setDeleteId(sub.id)}
                    cardRefs={cardRefs}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: format & download */}
          <div style={{ background:'var(--paper)', borderLeft:'1px solid var(--border)',
            padding:'16px 12px', display:'flex', flexDirection:'column', gap:12 }}>
            <FormatDownloadContent/>
          </div>
        </div>
      )}

      {/* ─────────────────── MOBILE ─────────────────── */}
      {isMobile && (
        <div style={{ minHeight:'calc(100vh - 64px)' }}>

          {/* Mobile sticky toolbar */}
          <div style={{ position:'sticky', top:64, zIndex:100, background:'var(--paper)',
            borderBottom:'1px solid var(--border)', padding:'10px 12px',
            display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>

            <button onClick={() => navigate(-1)}
              style={{ padding:'7px 10px', borderRadius:8, border:'1.5px solid var(--border)',
                background:'var(--paper2)', color:'var(--ink2)', fontSize:13, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit' }}>
              ←
            </button>

            {/* Active template badge */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, color:'var(--ink3)', fontWeight:600 }}>Template</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--blue)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {activeLabel}
              </div>
            </div>

            <button onClick={() => setLeftOpen(true)}
              style={{ padding:'7px 10px', borderRadius:8, border:'1.5px solid var(--border)',
                background:'var(--paper2)', color:'var(--ink2)', fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit' }}>
              🎨 Template
            </button>

            <button onClick={() => setRightOpen(true)}
              style={{ padding:'7px 10px', borderRadius:8, border:'1.5px solid var(--blue)',
                background:'var(--blue-s)', color:'var(--blue)', fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit' }}>
              ⬇ Download
            </button>
          </div>

          {/* Mobile sub-toolbar: school filter */}
          <div style={{ padding:'10px 12px', background:'var(--paper)', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <select value={school} onChange={e => setSchool(e.target.value)}
              style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)',
                fontSize:13, color:'var(--ink)', background:'var(--paper)', outline:'none', cursor:'pointer' }}>
              {schools.map(s => <option key={s} value={s}>{s === 'All' ? '-- All Schools --' : s}</option>)}
            </select>
            <Badge type={filtered.length > 0 ? 'teal' : 'gray'}>{filtered.length} approved</Badge>
          </div>

          {/* Mobile cards — single column, scale to fit */}
          <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:20 }}>
            {filtered.length === 0 ? (
              <EmptyState icon="🪪" title="No approved cards yet"
                desc="Approve submissions in the Admin panel to see ID cards here."
                action={<Btn onClick={() => window.history.back()}>← Go to Admin</Btn>}/>
            ) : (
              filtered.map(sub => (
                <CardWrapper
                  key={sub.id}
                  sub={sub}
                  templateId={customTemplate ? null : templateId}
                  customConfig={customTemplate?.config || null}
                  orgLogo={organizations.find(o => o.name === sub.school_name)?.logo_url || null}
                  onDownload={() => downloadCard(sub)}
                  onDelete={() => setDeleteId(sub.id)}
                  cardRefs={cardRefs}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Mobile drawers ── */}
      {leftOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex' }}>
          <div style={{ flex:1, background:'rgba(0,0,0,.45)' }} onClick={() => setLeftOpen(false)}/>
          <div style={{ width: Math.min(280, winW - 40), background:'var(--paper)',
            overflowY:'auto', padding:20, boxShadow:'-4px 0 24px rgba(0,0,0,.15)',
            display:'flex', flexDirection:'column', gap:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>Select Template</span>
              <button onClick={() => setLeftOpen(false)}
                style={{ border:'none', background:'transparent', fontSize:22, cursor:'pointer', color:'var(--ink3)' }}>✕</button>
            </div>
            <TemplateSelectorContent/>
          </div>
        </div>
      )}

      {rightOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex' }}>
          <div style={{ flex:1, background:'rgba(0,0,0,.45)' }} onClick={() => setRightOpen(false)}/>
          <div style={{ width: Math.min(280, winW - 40), background:'var(--paper)',
            overflowY:'auto', padding:20, boxShadow:'-4px 0 24px rgba(0,0,0,.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>Download</span>
              <button onClick={() => setRightOpen(false)}
                style={{ border:'none', background:'transparent', fontSize:22, cursor:'pointer', color:'var(--ink3)' }}>✕</button>
            </div>
            <FormatDownloadContent/>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteSubmission(deleteId)} title="Delete ID Card"
        message="This will permanently delete this submission and ID card."
        confirmLabel="Delete" danger/>
    </div>
  )
}