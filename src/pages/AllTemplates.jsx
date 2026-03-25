import { useState, useRef } from 'react'
import { useSubmissions } from '../hooks/useSubmissions'
import { useOrganizations } from '../hooks/useOrganizations'
import { useNavigate } from 'react-router-dom'
import { useCardTemplates } from '../hooks/useCardtemplates'
import { Badge, Btn, Card, Spinner, EmptyState, ConfirmDialog } from '../components/shared/index'
import IDCard, { TEMPLATES } from '../components/idcard/IDCard'
import toast from 'react-hot-toast'

export default function AllTemplates() {
  const { submissions, loading, deleteSubmission } = useSubmissions()
  const { organizations } = useOrganizations()
  const navigate = useNavigate()
  const { templates } = useCardTemplates()
  const [templateId,    setTemplateId]    = useState('T1')
  const [customTemplate, setCustomTemplate] = useState(null)
  const [school,     setSchool]     = useState('All')
  const [deleteId,   setDeleteId]   = useState(null)
  const [leftOpen,   setLeftOpen]   = useState(false)  // mobile drawer for template selector
  const [rightOpen,  setRightOpen]  = useState(false)  // mobile drawer for format/download
  const cardRefs = useRef({})

  const approved  = submissions.filter(s => s.status === 'approved')
  const orgNames  = organizations.map(o => o.name)
  const subNames  = approved.map(s => s.school_name).filter(Boolean)
  const schools   = ['All', ...new Set([...orgNames, ...subNames])]
  const filtered  = school === 'All' ? approved : approved.filter(s => s.school_name === school)

  const downloadCard = async (sub) => {
    const el = document.getElementById(`card-${sub.id}`)
    if (!el) { toast.error('Card not found'); return }
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas  = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' })
      const link    = document.createElement('a')
      link.download = `${sub.name?.replace(/\s+/g,'_')}_IDCard.png`
      link.href     = canvas.toDataURL('image/png')
      link.click()
      toast.success(`Downloaded ${sub.name}'s card`)
    } catch (err) {
      console.error(err)
      toast.error('Download failed')
    }
  }

  const downloadAllZip = async () => {
    if (filtered.length === 0) { toast.error('No cards to download'); return }
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: JSZip }       = await import('jszip')
      const zip = new JSZip()
      toast('Generating ZIP...', { icon:'⏳' })
      for (const sub of filtered) {
        const el = document.getElementById(`card-${sub.id}`)
        if (!el) continue
        const canvas  = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        const dataUrl = canvas.toDataURL('image/png')
        const base64  = dataUrl.split(',')[1]
        zip.file(`${sub.name?.replace(/\s+/g,'_')}_IDCard.png`, base64, { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.download = `ID_Cards_${school.replace(/\s+/g,'_')}.zip`
      link.href = URL.createObjectURL(blob)
      link.click()
      toast.success(`Downloaded ${filtered.length} cards as ZIP`)
    } catch (err) {
      console.error(err)
      toast.error('ZIP generation failed')
    }
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}><Spinner size={36}/></div>

  // Shared template selector content
  const TemplateSelectorContent = () => (
    <div>
      {templates.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10, padding:'0 4px' }}>My Templates</div>
          {templates.map(t => {
            const c = t.config || {}
            const isSelected = customTemplate?.id === t.id
            return (
              <div key={t.id}
                onClick={() => { setCustomTemplate(t); setTemplateId(null); setLeftOpen(false) }}
                style={{ borderRadius:'var(--r)', border:`2px solid ${isSelected?'var(--blue)':'var(--border)'}`, overflow:'hidden', marginBottom:8, cursor:'pointer', transition:'all .18s', boxShadow:isSelected?'0 0 0 3px rgba(35,82,255,.15)':'none' }}>
                <div style={{ height:56, background:c.headerStyle==='gradient'?`linear-gradient(135deg,${c.c1||'#555'},${c.c2||'#333'})`:(c.c1||'#555'), display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 10px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#fff', letterSpacing:.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{t.name}</span>
                  <div style={{ display:'flex', gap:3 }}>
                    {c.c1 && <div style={{ width:10, height:10, borderRadius:'50%', background:c.c1, border:'1.5px solid rgba(255,255,255,.5)' }}/>}
                    {c.c2 && <div style={{ width:10, height:10, borderRadius:'50%', background:c.c2, border:'1.5px solid rgba(255,255,255,.5)' }}/>}
                  </div>
                </div>
                <div style={{ padding:'5px 8px', fontSize:10, fontWeight:600, color:isSelected?'var(--blue)':'var(--ink3)', background:isSelected?'var(--blue-s)':'var(--paper)', display:'flex', justifyContent:'space-between' }}>
                  <span>{isSelected?'✓ Selected':'Click to select'}</span>
                  <span>{c.visibleFields?.length||0} fields</span>
                </div>
              </div>
            )
          })}
          <div style={{ height:1, background:'var(--border)', margin:'12px 4px 14px' }}/>
        </>
      )}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10, padding:'0 4px' }}>Built-in</div>
      {Object.entries(TEMPLATES).map(([id, t]) => {
        const isSelected = !customTemplate && templateId===id
        return (
          <div key={id} onClick={() => { setTemplateId(id); setCustomTemplate(null); setLeftOpen(false) }}
            style={{ borderRadius:'var(--r)', border:`2px solid ${isSelected?'var(--blue)':'var(--border)'}`, overflow:'hidden', marginBottom:10, cursor:'pointer', transition:'all .18s', boxShadow:isSelected?'0 0 0 3px rgba(35,82,255,.15)':'none' }}>
            <div style={{ height:72, background:`linear-gradient(135deg,${t.c1},${t.c2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', letterSpacing:.3, textTransform:'uppercase' }}>
              {t.name}
            </div>
            <div style={{ padding:'6px 8px', fontSize:11, fontWeight:600, color:isSelected?'var(--blue)':'var(--ink2)', background:isSelected?'var(--blue-s)':'var(--paper)' }}>
              {isSelected ? '✓ Selected' : 'Click to select'}
            </div>
          </div>
        )
      })}
    </div>
  )

  // Shared format/download content
  const FormatDownloadContent = () => (
    <>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Select Format</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[['1-per-page','Single'],['2-per-page','2 per page'],['4-per-page','4 per page'],['6-per-page','6 per page']].map(([id,label]) => (
          <div key={id} style={{ border:'2px solid var(--border)', borderRadius:'var(--r)', padding:10, cursor:'pointer', transition:'all .15s', textAlign:'center' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue)';e.currentTarget.style.background='var(--blue-s)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='transparent'}}>
            <div style={{ height:32, background:'var(--paper3)', borderRadius:5, marginBottom:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.3 }}>{label}</div>
            <div style={{ fontSize:10, fontWeight:600, color:'var(--ink2)' }}>{label}</div>
          </div>
        ))}
      </div>
      <button onClick={downloadAllZip}
        style={{ width:'100%', padding:'12px 8px', borderRadius:'var(--r)', background:'#1a1a2e', color:'#fff', border:'none', fontSize:12, fontWeight:800, cursor:'pointer', letterSpacing:.3, transition:'all .18s', lineHeight:1.4, marginTop:16 }}
        onMouseEnter={e=>e.target.style.background='var(--blue)'}
        onMouseLeave={e=>e.target.style.background='#1a1a2e'}>
        ⬇ Download All as ZIP
      </button>
    </>
  )

  return (
    <div className="anim-fade-up" style={{ paddingTop:64, minHeight:'100vh' }}>
      <style>{`
        .at-layout { display: grid; grid-template-columns: 200px 1fr 160px; min-height: calc(100vh - 64px); }
        .at-left-panel { display: block; background: var(--paper); border-right: 1px solid var(--border); padding: 20px 12px; overflow-y: auto; }
        .at-right-panel { display: flex; background: var(--paper); border-left: 1px solid var(--border); padding: 20px 12px; flex-direction: column; gap: 12px; }
        .at-mobile-btns { display: none; gap: 8px; }
        .at-mobile-drawer { display: none; }

        @media (max-width: 900px) {
          .at-layout { grid-template-columns: 1fr !important; }
          .at-left-panel { display: none !important; }
          .at-right-panel { display: none !important; }
          .at-mobile-btns { display: flex !important; }
        }
        .at-mobile-drawer.open { display: block !important; }

        @media (max-width: 600px) {
          .at-cards-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="at-layout">
        {/* Left: Template selector (desktop) */}
        <div className="at-left-panel">
          <TemplateSelectorContent />
        </div>

        {/* Center: Cards */}
        <div style={{ padding:16, background:'var(--paper2)', overflowY:'auto', overflowX:'hidden' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
            <button onClick={() => navigate(-1)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', background:'var(--paper)', color:'var(--ink2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .18s', flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.color='var(--blue)'; e.currentTarget.style.background='var(--blue-s)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--ink2)'; e.currentTarget.style.background='var(--paper)' }}>
              ← Back
            </button>

            {/* Mobile-only drawer buttons */}
            <div className="at-mobile-btns">
              <button onClick={()=>setLeftOpen(true)} style={{ padding:'8px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', background:'var(--paper)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                🎨 Template
              </button>
              <button onClick={()=>setRightOpen(true)} style={{ padding:'8px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', background:'var(--paper)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                ⬇ Download
              </button>
            </div>

            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Select School</div>
              <select value={school} onChange={e => setSchool(e.target.value)}
                style={{ padding:'8px 12px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', fontSize:13, color:'var(--ink)', background:'var(--paper)', outline:'none', cursor:'pointer' }}>
                {schools.map(s => <option key={s} value={s}>{s === 'All' ? '-- All Schools --' : s}</option>)}
              </select>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <Badge type={filtered.length > 0 ? 'teal' : 'gray'}>{filtered.length} approved</Badge>
              <button onClick={() => navigate('/card-builder')}
                style={{ padding:'8px 12px', borderRadius:'var(--r)', border:'1.5px dashed var(--blue-m)', background:'var(--blue-s)', color:'var(--blue)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                + New Template
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="🪪" title="No approved cards yet" desc="Approve submissions in the Admin panel to see ID cards here." action={<Btn onClick={() => window.history.back()}>← Go to Admin</Btn>} />
          ) : (
            <div className="at-cards-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:22 }}>
              {filtered.map(sub => (
                <div key={sub.id} style={{ display:'flex', justifyContent:'center' }}>
                  <IDCard
                    ref={el => cardRefs.current[sub.id] = el}
                    submission={sub}
                    templateId={customTemplate ? null : templateId}
                    customConfig={customTemplate?.config || null}
                    orgLogo={organizations.find(o => o.name === sub.school_name)?.logo_url || null}
                    showActions
                    onDownload={() => downloadCard(sub)}
                    onDelete={() => setDeleteId(sub.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Format & Download (desktop) */}
        <div className="at-right-panel">
          <FormatDownloadContent />
        </div>
      </div>

      {/* Mobile: Template drawer overlay */}
      {leftOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex' }}>
          <div style={{ flex:1, background:'rgba(0,0,0,.4)' }} onClick={()=>setLeftOpen(false)}/>
          <div style={{ width:240, background:'var(--paper)', overflowY:'auto', padding:20, boxShadow:'-4px 0 24px rgba(0,0,0,.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>Templates</span>
              <button onClick={()=>setLeftOpen(false)} style={{ border:'none', background:'transparent', fontSize:20, cursor:'pointer', color:'var(--ink3)' }}>✕</button>
            </div>
            <TemplateSelectorContent />
          </div>
        </div>
      )}

      {/* Mobile: Format/Download drawer overlay */}
      {rightOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex' }}>
          <div style={{ flex:1, background:'rgba(0,0,0,.4)' }} onClick={()=>setRightOpen(false)}/>
          <div style={{ width:260, background:'var(--paper)', overflowY:'auto', padding:20, boxShadow:'-4px 0 24px rgba(0,0,0,.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>Download</span>
              <button onClick={()=>setRightOpen(false)} style={{ border:'none', background:'transparent', fontSize:20, cursor:'pointer', color:'var(--ink3)' }}>✕</button>
            </div>
            <FormatDownloadContent />
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteSubmission(deleteId)} title="Delete ID Card" message="This will permanently delete this submission and ID card." confirmLabel="Delete" danger />
    </div>
  )
}