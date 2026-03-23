import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSubmissions } from '../hooks/useSubmissions'
import { useFormConfigs } from '../hooks/useFormConfigs'
import { Card, Badge, Btn, Avatar, Spinner, EmptyState } from '../components/shared/index'

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

export default function Dashboard() {
  const { user }                              = useAuth()
  const { submissions, loading: subLoading }  = useSubmissions()
  const { configs, loading: cfgLoading }      = useFormConfigs()
  const navigate                              = useNavigate()

  const approved  = submissions.filter(s => s.status === 'approved').length
  const pending   = submissions.filter(s => s.status === 'pending').length
  const rejected  = submissions.filter(s => s.status === 'rejected').length
  const schools   = [...new Set(submissions.map(s => s.school_name))].length
  const recent    = [...submissions].slice(0, 6)

  const stats = [
    { label:'Total Submissions', val: submissions.length, icon:'📋', color:'var(--blue)',   bg:'var(--blue-s)',   sub:'All time' },
    { label:'Approved',          val: approved,           icon:'✅', color:'#00875f',       bg:'var(--teal-s)',  sub:`${submissions.length?Math.round(approved/submissions.length*100):0}% rate` },
    { label:'Pending Review',    val: pending,            icon:'⏳', color:'#b45309',       bg:'var(--amber-s)', sub:'Needs attention' },
    { label:'Schools Served',    val: schools,            icon:'🏫', color:'var(--blue)',   bg:'var(--blue-s)',  sub:`${configs.length} active links` },
  ]

  if (subLoading || cfgLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <Spinner size={36}/>
    </div>
  )

  return (
    <div className="anim-fade-up" style={{ padding:'40px', paddingTop:104 }}>
      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:13, color:'var(--ink3)', fontWeight:600, marginBottom:4 }}>
          📅 {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        </div>
        <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:32, fontWeight:900, color:'var(--ink)', letterSpacing:-.5 }}>
          Good morning, Admin 👋
        </h1>
        <p style={{ fontSize:15, color:'var(--ink2)', marginTop:4 }}>Here's your platform overview.</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding:22 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:12 }}>{s.icon}</div>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:34, fontWeight:900, color:s.color, letterSpacing:-1 }}>{s.val}</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginTop:2 }}>{s.label}</div>
            <div style={{ fontSize:11, color:'var(--ink3)', marginTop:3 }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>
        {/* Quick Actions */}
        <Card style={{ padding:26 }}>
          <h3 style={{ fontFamily:'Outfit,sans-serif', fontSize:17, fontWeight:800, color:'var(--ink)', marginBottom:18 }}>Quick Actions</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { icon:'🔗', title:'Generate New Link',   desc:'Create form link for a school',       page:'/add-template', color:'var(--blue)',  bg:'var(--blue-s)' },
              { icon:'✅', title:'Review Submissions',  desc:`${pending} pending approvals`,         page:'/admin',        color:'#b45309',     bg:'var(--amber-s)' },
              { icon:'🪪', title:'View ID Cards',       desc:'Preview & download all cards',         page:'/templates',    color:'#00875f',     bg:'var(--teal-s)' },
              { icon:'📋', title:'Customize Format',       desc:'Configure new card template',          page:'/add-template', color:'var(--blue)',  bg:'var(--blue-s)' },
            ].map(a => (
              <div key={a.title} onClick={() => navigate(a.page)}
                style={{ display:'flex', alignItems:'center', gap:14, padding:14, borderRadius:'var(--r)', border:'1px solid var(--border)', cursor:'pointer', transition:'all .18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=a.color; e.currentTarget.style.background=a.bg }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='transparent' }}>
                <div style={{ width:38, height:38, borderRadius:10, background:a.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{a.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{a.title}</div>
                  <div style={{ fontSize:12, color:'var(--ink3)', marginTop:1 }}>{a.desc}</div>
                </div>
                <span style={{ fontSize:16, color:'var(--ink3)' }}>→</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Status breakdown */}
        <Card style={{ padding:26 }}>
          <h3 style={{ fontFamily:'Outfit,sans-serif', fontSize:17, fontWeight:800, color:'var(--ink)', marginBottom:18 }}>Submission Status</h3>
          {[
            { label:'Approved', val:approved, total:submissions.length, color:'var(--teal)' },
            { label:'Pending',  val:pending,  total:submissions.length, color:'var(--amber)' },
            { label:'Rejected', val:rejected, total:submissions.length, color:'var(--red)' },
          ].map(s => (
            <div key={s.label} style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13, fontWeight:600, color:'var(--ink2)' }}>
                <span>{s.label}</span>
                <span style={{ fontFamily:'JetBrains Mono,monospace', color:s.color }}>{s.val}/{submissions.length}</span>
              </div>
              <div style={{ height:8, background:'var(--paper3)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${submissions.length?Math.round(s.val/submissions.length*100):0}%`, height:'100%', background:s.color, borderRadius:4, transition:'width .6s ease' }}/>
              </div>
            </div>
          ))}
          {pending > 0 && (
            <div style={{ marginTop:16, padding:14, background:'var(--amber-s)', borderRadius:'var(--r)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>💡</span>
              <span style={{ fontSize:12, color:'#92400e', fontWeight:600 }}>{pending} submissions need your review in the Admin panel.</span>
            </div>
          )}
        </Card>
      </div>

      {/* Recent */}
      <Card style={{ padding:26 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontFamily:'Outfit,sans-serif', fontSize:17, fontWeight:800, color:'var(--ink)' }}>Recent Submissions</h3>
          <Btn size="sm" variant="ghost" onClick={() => navigate('/admin')}>View All →</Btn>
        </div>
        {recent.length === 0
          ? <EmptyState icon="📭" title="No submissions yet" desc="Share form links with schools to start collecting data." action={<Btn onClick={() => navigate('/add-template')}>Generate First Link →</Btn>} />
          : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Name','School','Role','Status','Date'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, borderBottom:'2px solid var(--border)', background:'var(--paper2)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {recent.map(s => (
                <tr key={s.id} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--paper2)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={s.name} size={32} src={s.photo_url}/>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'var(--ink2)' }}>{s.school_name}</td>
                  <td style={{ padding:'12px 14px' }}><Badge type={s.role==='Student'?'blue':s.role==='Staff'?'teal':'amber'}>{s.role}</Badge></td>
                  <td style={{ padding:'12px 14px' }}><Badge type={s.status==='approved'?'teal':s.status==='pending'?'amber':'red'} dot>{s.status}</Badge></td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'var(--ink3)', fontFamily:'JetBrains Mono,monospace' }}>{fmtDate(s.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
