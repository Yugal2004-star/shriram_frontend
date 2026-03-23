import { useState, useRef } from 'react'
import { useSubmissions } from '../hooks/useSubmissions'
import { useOrganizations } from '../hooks/useOrganizations'
import { useNavigate } from 'react-router-dom'
import { useCardTemplates } from '../hooks/useCardTemplates'
import { Badge, Btn, Card, Spinner, EmptyState, ConfirmDialog } from '../components/shared/index'
import IDCard, { TEMPLATES } from '../components/idcard/IDCard'
import toast from 'react-hot-toast'

export default function AllTemplates() {
  const { submissions, loading, deleteSubmission } = useSubmissions()
  const { organizations } = useOrganizations()
  const navigate = useNavigate()
  const { templates } = useCardTemplates()
  const [templateId,    setTemplateId]    = useState('T1')
  const [customTemplate, setCustomTemplate] = useState(null)  // saved DB template
  const [school,     setSchool]     = useState('All')
  const [deleteId,   setDeleteId]   = useState(null)
  const cardRefs = useRef({})

  const approved  = submissions.filter(s => s.status === 'approved')
  const orgNames  = organizations.map(o => o.name)
  const subNames  = approved.map(s => s.school_name).filter(Boolean)
  const schools   = ['All', ...new Set([...orgNames, ...subNames])]
  const filtered  = school === 'All' ? approved : approved.filter(s => s.school_name === school)

  /* Download single card as image */
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

  /* Download all as ZIP */
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

  return (
    <div className="anim-fade-up" style={{ paddingTop:80, minHeight:'100vh' }}>
      <div style={{ display:'grid', gridTemplateColumns:'180px 1fr 150px', minHeight:'calc(100vh - 64px)' }}>

        {/* ── Left: Template selector ── */}
        <div style={{ background:'var(--paper)', borderRight:'1px solid var(--border)', padding:'20px 12px', overflowY:'auto' }}>
          
          {/* Saved templates from DB */}
          {templates.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10, padding:'0 4px' }}>My Templates</div>
              {templates.map(t => {
                const c = t.config || {}
                const isSelected = customTemplate?.id === t.id
                return (
                  <div key={t.id}
                    onClick={() => { setCustomTemplate(t); setTemplateId(null) }}
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

          {/* Built-in templates */}
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10, padding:'0 4px' }}>Built-in</div>
          {Object.entries(TEMPLATES).map(([id, t]) => {
            const isSelected = !customTemplate && templateId===id
            return (
              <div key={id} onClick={() => { setTemplateId(id); setCustomTemplate(null) }}
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

          <button onClick={()=>navigate('/card-builder')}
            style={{ width:'100%', padding:'10px 8px', borderRadius:'var(--r)', border:'1.5px dashed var(--blue-m)', background:'var(--blue-s)', color:'var(--blue)', fontSize:12, fontWeight:700, cursor:'pointer', marginTop:4, fontFamily:'inherit' }}>
            + Create New Template
          </button>
        </div>

        {/* ── Center: Cards ── */}
        <div style={{ padding:24, background:'var(--paper2)', overflowY:'auto' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22, flexWrap:'wrap' }}>
            <button onClick={() => navigate(-1)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', background:'var(--paper)', color:'var(--ink2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .18s', flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.color='var(--blue)'; e.currentTarget.style.background='var(--blue-s)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--ink2)'; e.currentTarget.style.background='var(--paper)' }}>
              ← Back
            </button>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Select School</div>
              <select value={school} onChange={e => setSchool(e.target.value)}
                style={{ padding:'9px 14px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', fontSize:13, color:'var(--ink)', background:'var(--paper)', outline:'none', cursor:'pointer' }}>
                {schools.map(s => <option key={s} value={s}>{s === 'All' ? '-- All Schools --' : s}</option>)}
              </select>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
<span style={{ fontSize:13, color:'var(--ink3)', fontWeight:600 }}>{filtered.length} cards</span>
              <Badge type={filtered.length > 0 ? 'teal' : 'gray'}>{filtered.length} approved</Badge>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="🪪" title="No approved cards yet" desc="Approve submissions in the Admin panel to see ID cards here." action={<Btn onClick={() => window.history.back()}>← Go to Admin</Btn>} />
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
              {filtered.map(sub => (
                <IDCard
                  key={sub.id}
                  ref={el => cardRefs.current[sub.id] = el}
                  submission={sub}
                  templateId={customTemplate ? null : templateId}
                  customConfig={customTemplate?.config || null}
                  orgLogo={organizations.find(o => o.name === sub.school_name)?.logo_url || null}
                  showActions
                  onDownload={() => downloadCard(sub)}
                  onDelete={() => setDeleteId(sub.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Format & Download ── */}
        <div style={{ background:'var(--paper)', borderLeft:'1px solid var(--border)', padding:'20px 12px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Select Format</div>
          {[['1-per-page','Single'],['2-per-page','2 per page'],['4-per-page','4 per page'],['6-per-page','6 per page']].map(([id,label]) => (
            <div key={id} style={{ border:'2px solid var(--border)', borderRadius:'var(--r)', padding:10, cursor:'pointer', transition:'all .15s', textAlign:'center' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue)';e.currentTarget.style.background='var(--blue-s)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='transparent'}}>
              <div style={{ height:40, background:'var(--paper3)', borderRadius:6, marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.3 }}>{label}</div>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--ink2)' }}>{label}</div>
            </div>
          ))}
          <div style={{ marginTop:'auto' }}>
            <button onClick={downloadAllZip}
              style={{ width:'100%', padding:'12px 8px', borderRadius:'var(--r)', background:'#1a1a2e', color:'#fff', border:'none', fontSize:12, fontWeight:800, cursor:'pointer', letterSpacing:.3, transition:'all .18s', lineHeight:1.4 }}
              onMouseEnter={e=>e.target.style.background='var(--blue)'}
              onMouseLeave={e=>e.target.style.background='#1a1a2e'}>
              ⬇ Download All<br/>as ZIP
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteSubmission(deleteId)} title="Delete ID Card" message="This will permanently delete this submission and ID card." confirmLabel="Delete" danger />
    </div>
    
  )
}