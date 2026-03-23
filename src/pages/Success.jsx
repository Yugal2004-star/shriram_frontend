import { useLocation } from 'react-router-dom'
import { Btn, Card } from '../components/shared/index'

export default function Success() {
  const { state }  = useLocation()
  const sub        = state?.submission || {}
  const school     = state?.school || sub.school_name || 'Your School'
  const role       = state?.role   || sub.role        || 'Student'
  const refId      = sub.id ? sub.id.slice(0, 8).toUpperCase() : 'REF' + Math.random().toString(36).substr(2, 5).toUpperCase()

  const fields = [
    ['Full Name',     sub.name],
    ['School',        sub.school_name || school],
    ['Role',          sub.role        || role],
    ['Class',         sub.class],
    ['Section',       sub.section],
    ['Roll Number',   sub.roll_number],
    ['Contact',       sub.contact_number],
    ['Blood Group',   sub.blood_group],
    ['Designation',   sub.designation],
    ['Department',    sub.department],
  ].filter(([, v]) => v)

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(150deg,#f0f4ff 0%,#eef0f8 50%,#f5f6fc 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 16px', paddingTop:100 }}>
      <div style={{ width:'100%', maxWidth:560 }}>

        {/* ── Success card ── */}
        <Card style={{ padding:'44px 40px', textAlign:'center', overflow:'hidden', position:'relative' }}>

          {/* Background decoration */}
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'var(--teal-s)', opacity:.6 }}/>
          <div style={{ position:'absolute', bottom:-30, left:-30, width:120, height:120, borderRadius:'50%', background:'var(--blue-s)', opacity:.5 }}/>

          {/* Tick */}
          <div className="anim-scale-in" style={{ width:84, height:84, borderRadius:'50%', background:'var(--teal-s)', border:'3px solid var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, margin:'0 auto 24px', position:'relative', boxShadow:'0 8px 24px rgba(0,196,140,.2)' }}>
            ✓
          </div>

          <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:36, fontWeight:900, color:'var(--teal)', letterSpacing:-1.2, marginBottom:10, position:'relative' }}>
            Submitted!
          </h1>
          <p style={{ fontSize:15, color:'var(--ink2)', lineHeight:1.7, marginBottom:28, maxWidth:380, margin:'0 auto 28px', position:'relative' }}>
            Your details have been submitted successfully. The admin will review and generate your ID card shortly.
          </p>

          {/* Reference ID */}
          <div style={{ background:'var(--paper2)', borderRadius:'var(--r)', padding:'14px 20px', border:'1px solid var(--border)', display:'inline-flex', alignItems:'center', gap:14, marginBottom:28, position:'relative' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5 }}>Reference ID</span>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:16, fontWeight:800, color:'var(--blue)', letterSpacing:1 }}>{refId}</span>
          </div>

          {/* Submitted details preview */}
          {fields.length > 0 && (
            <div style={{ background:'var(--paper2)', borderRadius:'var(--rl)', padding:20, border:'1px solid var(--border)', textAlign:'left', marginBottom:24, position:'relative' }}>
              <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom: fields.length > 0 ? 16 : 0 }}>
                {sub.photo_url && (
                  <img src={sub.photo_url} style={{ width:64, height:84, objectFit:'cover', borderRadius:10, border:'2px solid var(--blue)', flexShrink:0 }} alt=""/>
                )}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Your Submitted Details</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {fields.map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize:10, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:.3 }}>{k}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginTop:1 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info note */}
          <div style={{ background:'var(--blue-s)', borderRadius:'var(--r)', padding:'12px 16px', marginBottom:28, fontSize:13, color:'var(--blue)', fontWeight:600, textAlign:'left', display:'flex', gap:10, alignItems:'flex-start', position:'relative' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>📋</span>
            <span>Save your Reference ID: <strong>{refId}</strong>. You may need it to check your ID card status with the school admin.</span>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, position:'relative' }}>
            <Btn variant="teal" full size="lg" onClick={() => window.print()}>🖨 Print Confirmation</Btn>
          </div>
        </Card>

        {/* ── What happens next ── */}
        <Card style={{ padding:24, marginTop:16 }}>
          <h3 style={{ fontFamily:'Outfit,sans-serif', fontSize:15, fontWeight:800, color:'var(--ink)', marginBottom:14 }}>What happens next?</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              ['✅', 'Your form is submitted', 'The school admin has received your details.'],
              ['🔍', 'Admin reviews your details', 'They will verify and approve your submission.'],
              ['🪪', 'ID card is generated', 'Your ID card will be created once approved.'],
              ['📬', 'You will be notified', 'Contact your school to collect your ID card.'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 12px', borderRadius:'var(--r)', background:'var(--paper2)', border:'1px solid var(--border)' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{title}</div>
                  <div style={{ fontSize:12, color:'var(--ink3)', marginTop:1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  )
}