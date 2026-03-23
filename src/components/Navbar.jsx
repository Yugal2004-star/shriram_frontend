import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './shared/index'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { to: '/dashboard',     label: 'Dashboard'      },
  { to: '/organizations', label: 'Organizations'  },
  { to: '/add-template',  label: 'Customize Format'  },
  { to: '/admin',         label: 'Admin'           },
  { to: '/templates',     label: 'All Templates'  },
  { to: '/about',         label: 'About Us'        },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { pathname }      = useLocation()
  const navigate          = useNavigate()

  const handleLogout = async () => {
    await signOut()
    toast.success('Logged out successfully')
  }

  return (
    <nav style={{ position:'fixed', top:0, left:0, right:0, height:64, background:'rgba(255,255,255,.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px' }}>

      {/* Brand */}
      <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <div style={{ width:38, height:38, background:'var(--blue)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:14, color:'#fff', letterSpacing:-1 }}>SI</div>
        <span style={{ fontFamily:'Outfit,sans-serif', fontWeight:800, fontSize:17, color:'var(--ink)', letterSpacing:-.4 }}>Shriram ID Cards</span>
      </Link>

      {/* Links */}
      {user && (
        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
          {NAV_LINKS.map(n => {
            const active = pathname.startsWith(n.to)
            return (
              <Link key={n.to} to={n.to}
                style={{ padding:'8px 13px', borderRadius:8, fontSize:13, fontWeight:600, color:active?'var(--blue)':'var(--ink2)', background:active?'var(--blue-s)':'transparent', textDecoration:'none', transition:'all .18s' }}>
                {n.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Right side */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {user ? (
          <>
            <div style={{ position:'relative', cursor:'pointer' }}>
              <span style={{ fontSize:22 }}>🔔</span>
              <span style={{ position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:'50%', background:'var(--red)', border:'2px solid var(--paper)' }} />
            </div>
            <Avatar name={user.email} size={34} style={{ cursor:'pointer' }} />
            <button onClick={handleLogout}
              style={{ padding:'8px 18px', borderRadius:8, border:'1.5px solid var(--border2)', background:'transparent', fontSize:13, fontWeight:700, color:'var(--ink2)', cursor:'pointer', transition:'all .18s' }}
              onMouseEnter={e=>{ e.target.style.color='var(--red)'; e.target.style.borderColor='var(--red)'; e.target.style.background='var(--red-s)' }}
              onMouseLeave={e=>{ e.target.style.color='var(--ink2)'; e.target.style.borderColor='var(--border2)'; e.target.style.background='transparent' }}>
              Log Out
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              if (pathname === '/') {
                document.getElementById('login-box')?.scrollIntoView({ behavior: 'smooth' })
              } else {
                navigate('/')
                setTimeout(() => document.getElementById('login-box')?.scrollIntoView({ behavior: 'smooth' }), 100)
              }
            }}
            style={{ padding:'8px 18px', borderRadius:8, background:'var(--blue)', color:'#fff', fontSize:13, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .18s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-d)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--blue)'}>
            Login
          </button>
        )}
      </div>
    </nav>
  )
}