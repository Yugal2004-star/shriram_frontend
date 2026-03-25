import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubmissions } from '../hooks/useSubmissions'
import { Badge, Btn, Card, Avatar, Modal, Spinner, EmptyState, ConfirmDialog } from '../components/shared/index'
import toast from 'react-hot-toast'

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

export default function Admin() {
  const { submissions, loading, updateStatus, bulkUpdateStatus, deleteSubmission } = useSubmissions()
  const navigate = useNavigate()

  const [search,     setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState('All')
  const [filterSch,  setFilterSch]  = useState('All')
  const [filterStat, setFilterStat] = useState('All')
  const [sortBy,     setSortBy]     = useState('date_desc')
  const [selected,   setSelected]   = useState([])
  const [viewSub,    setViewSub]    = useState(null)
  const [deleteId,   setDeleteId]   = useState(null)

  const schools = useMemo(() => ['All', ...new Set(submissions.map(s => s.school_name).filter(Boolean))], [submissions])

  const filtered = useMemo(() => {
    let list = [...submissions]
    if (search)           list = list.filter(s => (s.name||'').toLowerCase().includes(search.toLowerCase()) || (s.school_name||'').toLowerCase().includes(search.toLowerCase()))
    if (filterRole!=='All') list = list.filter(s => s.role === filterRole)
    if (filterSch !=='All') list = list.filter(s => s.school_name === filterSch)
    if (filterStat!=='All') list = list.filter(s => s.status === filterStat)
    if (sortBy==='date_desc') list.sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at))
    if (sortBy==='date_asc')  list.sort((a,b)=>new Date(a.submitted_at)-new Date(b.submitted_at))
    if (sortBy==='name_asc')  list.sort((a,b)=>(a.name||'').localeCompare(b.name||''))
    return list
  }, [submissions, search, filterRole, filterSch, filterStat, sortBy])

  const toggleSelect = id => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id])
  const toggleAll    = () => setSelected(selected.length===filtered.length ? [] : filtered.map(s=>s.id))

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}><Spinner size={36}/></div>

  return (
    <div className="anim-fade-up">
      <style>{`
        .admin-wrap { padding: 40px; padding-top: 104px; }
        .admin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
        .admin-header-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .admin-col-contact, .admin-col-school, .admin-col-date { display: table-cell; }
        .admin-filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .admin-filter-select { padding: 9px 12px; border-radius: var(--r); border: 1.5px solid var(--border); font-size: 13px; color: var(--ink2); background: var(--paper); outline: none; cursor: pointer; }

        @media (max-width: 900px) {
          .admin-wrap { padding: 20px !important; padding-top: 80px !important; }
          .admin-col-date { display: none !important; }
        }
        @media (max-width: 700px) {
          .admin-header { flex-direction: column !important; gap: 14px !important; }
          .admin-header-btns { width: 100%; }
          .admin-col-contact { display: none !important; }
          .admin-col-school { max-width: 90px !important; font-size: 11px !important; }
          .admin-filter-select { font-size: 12px; padding: 7px 8px; }
        }
        @media (max-width: 480px) {
          .admin-col-school { display: none !important; }
        }
      `}</style>

      <div className="admin-wrap">
        <div className="admin-header">
          <div>
            <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:28, fontWeight:900, color:'var(--ink)', letterSpacing:-.5 }}>Admin Panel</h1>
            <p style={{ fontSize:14, color:'var(--ink2)', marginTop:4 }}>{submissions.length} total submissions · {submissions.filter(s=>s.status==='pending').length} pending</p>
          </div>
          <div className="admin-header-btns">
            <Btn variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Btn>
            <Btn variant="ghost" size="sm" onClick={() => navigate('/templates')}>🪪 View ID Cards</Btn>
            <Btn size="sm" onClick={() => navigate('/add-template')}>+ New Link</Btn>
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {[['All','all',submissions.length],['Pending','amber',submissions.filter(s=>s.status==='pending').length],['Approved','teal',submissions.filter(s=>s.status==='approved').length],['Rejected','red',submissions.filter(s=>s.status==='rejected').length]].map(([l,t,c])=>(
            <div key={l} onClick={()=>setFilterStat(l==='All'?'All':l.toLowerCase())}
              style={{ padding:'7px 14px', borderRadius:'var(--r)', border:`2px solid ${filterStat===(l==='All'?'All':l.toLowerCase())?'var(--blue)':'var(--border)'}`, background:filterStat===(l==='All'?'All':l.toLowerCase())?'var(--blue-s)':'var(--paper)', cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'all .15s' }}>
              <span style={{ fontSize:13, fontWeight:700, color:filterStat===(l==='All'?'All':l.toLowerCase())?'var(--blue)':'var(--ink2)' }}>{l}</span>
              <span style={{ background:'var(--paper3)', color:'var(--ink2)', fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>{c}</span>
            </div>
          ))}
        </div>

        <Card style={{ padding:0, overflow:'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', background:'var(--paper2)' }}>
            <div className="admin-filters">
              {/* Search */}
              <div style={{ position:'relative', flex:1, minWidth:180 }}>
                <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'var(--ink3)' }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or school..."
                  style={{ width:'100%', padding:'9px 14px 9px 36px', borderRadius:'var(--r)', border:'1.5px solid var(--border)', fontSize:13, color:'var(--ink)', background:'var(--paper)', outline:'none', boxSizing:'border-box' }}
                  onFocus={e=>{e.target.style.borderColor='var(--blue)';e.target.style.boxShadow='0 0 0 3px rgba(35,82,255,.1)'}}
                  onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}/>
              </div>
              {/* Filters */}
              {[['Role',filterRole,setFilterRole,['All','Student','Staff','Employee']],['School',filterSch,setFilterSch,schools],['Sort',sortBy,setSortBy,[['date_desc','Newest First'],['date_asc','Oldest First'],['name_asc','Name A-Z']]]].map(([lbl,val,setter,opts])=>(
                <select key={lbl} className="admin-filter-select" value={val} onChange={e=>setter(e.target.value)}>
                  {opts.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{lbl==='Role'&&o==='All'?'All Roles':lbl==='School'&&o==='All'?'All Schools':o}</option>)}
                </select>
              ))}
              <Btn size="sm" variant="ghost" onClick={()=>navigate('/templates')}>Show Templates →</Btn>
            </div>
            {/* Bulk actions */}
            {selected.length > 0 && (
              <div style={{ display:'flex', gap:8, padding:'8px 12px', background:'var(--blue-s)', borderRadius:'var(--r)', border:'1px solid var(--blue-m)', marginTop:10, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--blue)' }}>{selected.length} selected</span>
                <button onClick={()=>bulkUpdateStatus(selected,'approved').then(()=>setSelected([]))} style={{ fontSize:12,fontWeight:700,color:'#00875f',background:'var(--teal-s)',border:'none',padding:'4px 10px',borderRadius:6,cursor:'pointer' }}>✓ Approve All</button>
                <button onClick={()=>bulkUpdateStatus(selected,'rejected').then(()=>setSelected([]))} style={{ fontSize:12,fontWeight:700,color:'#b91c1c',background:'var(--red-s)',border:'none',padding:'4px 10px',borderRadius:6,cursor:'pointer' }}>✕ Reject All</button>
                <button onClick={()=>setSelected([])} style={{ fontSize:12,fontWeight:700,color:'var(--ink3)',background:'var(--paper3)',border:'none',padding:'4px 10px',borderRadius:6,cursor:'pointer' }}>Clear</button>
              </div>
            )}
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState icon="🔍" title="No results found" desc="Try adjusting your search or filters." />
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:360 }}>
                <thead>
                  <tr style={{ background:'var(--paper2)' }}>
                    <th style={{ padding:'11px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, borderBottom:'2px solid var(--border)' }}>
                      <input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={toggleAll} style={{ accentColor:'var(--blue)' }}/>
                    </th>
                    {['Name','Contact','School','Role','Status','Submitted','Actions'].map(h=>(
                      <th key={h} className={h==='Contact'?'admin-col-contact':h==='Submitted'?'admin-col-date':h==='School'?'admin-col-school':''} style={{ padding:'11px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, borderBottom:'2px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} style={{ borderBottom:'1px solid var(--border)', transition:'background .15s', cursor:'pointer' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--paper2)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 12px' }}>
                        <input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggleSelect(s.id)} onClick={e=>e.stopPropagation()} style={{ accentColor:'var(--blue)' }}/>
                      </td>
                      <td style={{ padding:'11px 12px' }} onClick={()=>setViewSub(s)}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar name={s.name||''} size={32} src={s.photo_url}/>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{s.name||'—'}</div>
                            <div style={{ fontSize:10, fontFamily:'JetBrains Mono,monospace', color:'var(--ink3)', marginTop:1 }}>{s.id.slice(0,8).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="admin-col-contact" style={{ padding:'11px 12px', fontSize:13, color:'var(--ink2)' }}>{s.contact_number||'—'}</td>
                      <td className="admin-col-school" style={{ padding:'11px 12px', fontSize:13, color:'var(--ink2)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.school_name}</td>
                      <td style={{ padding:'11px 12px' }}><Badge type={s.role==='Student'?'blue':s.role==='Staff'?'teal':'amber'}>{s.role}</Badge></td>
                      <td style={{ padding:'11px 12px' }}><Badge type={s.status==='approved'?'teal':s.status==='pending'?'amber':'red'} dot>{s.status}</Badge></td>
                      <td className="admin-col-date" style={{ padding:'11px 12px', fontSize:12, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>{fmtDate(s.submitted_at)}</td>
                      <td style={{ padding:'11px 12px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={e=>{e.stopPropagation();setViewSub(s)}} title="View" style={{ width:30,height:30,borderRadius:7,border:'none',background:'var(--blue-s)',color:'var(--blue)',cursor:'pointer',fontSize:14 }}>👁</button>
                          {s.status!=='approved' && <button onClick={e=>{e.stopPropagation();updateStatus(s.id,'approved')}} title="Approve" style={{ width:30,height:30,borderRadius:7,border:'none',background:'var(--teal-s)',color:'#00875f',cursor:'pointer',fontSize:14 }}>✓</button>}
                          {s.status!=='rejected' && <button onClick={e=>{e.stopPropagation();updateStatus(s.id,'rejected')}} title="Reject" style={{ width:30,height:30,borderRadius:7,border:'none',background:'var(--red-s)',color:'#b91c1c',cursor:'pointer',fontSize:14 }}>✕</button>}
                          <button onClick={e=>{e.stopPropagation();setDeleteId(s.id)}} title="Delete" style={{ width:30,height:30,borderRadius:7,border:'none',background:'var(--paper3)',color:'var(--ink3)',cursor:'pointer',fontSize:14 }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination stub */}
          <div style={{ padding:'14px 16px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, background:'var(--paper2)' }}>
            <span style={{ fontSize:13, color:'var(--ink3)' }}>Showing {filtered.length} of {submissions.length} submissions</span>
            <div style={{ display:'flex', gap:6 }}>
              {[1,2,3].map(p=>(
                <button key={p} style={{ width:32,height:32,borderRadius:8,border:'1.5px solid',borderColor:p===1?'var(--blue)':'var(--border)',background:p===1?'var(--blue)':'var(--paper)',color:p===1?'#fff':'var(--ink2)',fontSize:13,fontWeight:700,cursor:'pointer' }}>{p}</button>
              ))}
            </div>
          </div>
        </Card>

        {/* View detail modal */}
        <Modal open={!!viewSub} onClose={()=>setViewSub(null)} title="Submission Details" width={560}>
          {viewSub && (
            <div>
              <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:20, padding:16, background:'var(--paper2)', borderRadius:'var(--rl)', flexWrap:'wrap' }}>
                {viewSub.photo_url
                  ? <img src={viewSub.photo_url} style={{ width:80,height:100,objectFit:'cover',borderRadius:10,border:'2px solid var(--blue)',flexShrink:0 }} alt=""/>
                  : <Avatar name={viewSub.name||''} size={80} style={{ borderRadius:10, flexShrink:0 }}/>
                }
                <div>
                  <div style={{ fontFamily:'Outfit,sans-serif',fontSize:20,fontWeight:800,color:'var(--ink)' }}>{viewSub.name}</div>
                  <div style={{ fontSize:13,color:'var(--ink3)',marginTop:4 }}>{viewSub.school_name}</div>
                  <div style={{ display:'flex',gap:8,marginTop:8,flexWrap:'wrap' }}>
                    <Badge type={viewSub.role==='Student'?'blue':viewSub.role==='Staff'?'teal':'amber'}>{viewSub.role}</Badge>
                    <Badge type={viewSub.status==='approved'?'teal':viewSub.status==='pending'?'amber':'red'} dot>{viewSub.status}</Badge>
                  </div>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:20 }}>
                {[['Contact',viewSub.contact_number],['Blood Group',viewSub.blood_group],['Class',viewSub.class],['Section',viewSub.section],['Roll Number',viewSub.roll_number],['Admission No',viewSub.admission_number],['Date of Birth',viewSub.date_of_birth],['Emergency',viewSub.emergency_contact],['Designation',viewSub.designation],['Department',viewSub.department],['Address',viewSub.address],['Transport',viewSub.mode_of_transport]].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k} style={{ background:'var(--paper2)',borderRadius:8,padding:'10px 12px' }}>
                    <div style={{ fontSize:10,fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:.4 }}>{k}</div>
                    <div style={{ fontSize:13,fontWeight:600,color:'var(--ink)',marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
                {viewSub.status!=='approved' && <Btn variant="teal" full onClick={()=>{updateStatus(viewSub.id,'approved');setViewSub(null)}}>✓ Approve</Btn>}
                {viewSub.status!=='rejected' && <Btn variant="danger" full onClick={()=>{updateStatus(viewSub.id,'rejected');setViewSub(null)}}>✕ Reject</Btn>}
                <Btn variant="ghost" onClick={()=>setViewSub(null)}>Close</Btn>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete confirm */}
        <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={()=>deleteSubmission(deleteId)} title="Delete Submission" message="This will permanently delete this submission. This action cannot be undone." confirmLabel="Delete" danger />
      </div>
    </div>
  )
}