import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './shared/index'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { to: '/dashboard',     label: 'Dashboard',       icon: '📊' },
  { to: '/organizations', label: 'Organizations',   icon: '🏢' },
  { to: '/add-template',  label: 'Customize Format', icon: '🎨' },
  { to: '/admin',         label: 'Admin',            icon: '⚙' },
  { to: '/templates',     label: 'All Templates',   icon: '🪪' },
  { to: '/about',         label: 'About Us',         icon: 'ℹ' },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { pathname }      = useLocation()
  const navigate          = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const handleLogout = async () => {
    await signOut()
    setMenuOpen(false)
    toast.success('Logged out successfully')
  }

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <>
      <style>{`
        .nb-links { display: flex; align-items: center; gap: 2px; }
        .nb-right  { display: flex; align-items: center; gap: 12px; }
        .nb-burger { display: none !important; }
        .nb-brand-text { display: inline !important; }

        @media (max-width: 960px) {
          .nb-links { display: none !important; }
          .nb-right  { display: none !important; }
          .nb-burger { display: flex !important; }
        }
        @media (max-width: 400px) {
          .nb-brand-text { display: none !important; }
        }

        .nb-mobile-drawer {
          position: fixed; top: 64px; left: 0; right: 0;
          background: rgba(255,255,255,.98);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          z-index: 998;
          padding: 12px 16px 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,.12);
          flex-direction: column; gap: 4px;
          max-height: calc(100vh - 64px);
          overflow-y: auto;
          display: none;
        }
        .nb-mobile-drawer.open { display: flex !important; }
      `}</style>

      <nav style={{ position:'fixed', top:0, left:0, right:0, height:64, background:'rgba(255,255,255,.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', gap:12 }}>

        {/* Brand */}
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:38, height:38, background:'var(--blue)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif', fontWeight:900, fontSize:14, color:'#fff', letterSpacing:-1, flexShrink:0 }}>SI</div>
          <span className="nb-brand-text" style={{ fontFamily:'Outfit,sans-serif', fontWeight:800, fontSize:17, color:'var(--ink)', letterSpacing:-.4 }}>Shriram ID Cards</span>
        </Link>

        {/* Desktop nav links */}
        {user && (
          <div className="nb-links" style={{ flex:1, justifyContent:'center' }}>
            {NAV_LINKS.map(n => {
              const active = pathname.startsWith(n.to)
              return (
                <Link key={n.to} to={n.to}
                  style={{ padding:'8px 11px', borderRadius:8, fontSize:13, fontWeight:600, color:active?'var(--blue)':'var(--ink2)', background:active?'var(--blue-s)':'transparent', textDecoration:'none', transition:'all .18s', whiteSpace:'nowrap' }}>
                  {n.label}
                </Link>
              )
            })}
          </div>
        )}

        {/* Desktop right */}
        <div className="nb-right">
          {user ? (
            <>
              <div style={{ position:'relative', cursor:'pointer' }}>
                <span style={{ fontSize:22 }}>🔔</span>
                <span style={{ position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:'50%', background:'var(--red)', border:'2px solid var(--paper)' }}/>
              </div>
              <Avatar name={user.email} size={34} style={{ cursor:'pointer' }}/>
              <button onClick={handleLogout}
                style={{ padding:'8px 16px', borderRadius:8, border:'1.5px solid var(--border2)', background:'transparent', fontSize:13, fontWeight:700, color:'var(--ink2)', cursor:'pointer', transition:'all .18s', whiteSpace:'nowrap' }}
                onMouseEnter={e=>{ e.target.style.color='var(--red)'; e.target.style.borderColor='var(--red)'; e.target.style.background='var(--red-s)' }}
                onMouseLeave={e=>{ e.target.style.color='var(--ink2)'; e.target.style.borderColor='var(--border2)'; e.target.style.background='transparent' }}>
                Log Out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (pathname === '/') document.getElementById('login-box')?.scrollIntoView({ behavior:'smooth' })
                else { navigate('/'); setTimeout(() => document.getElementById('login-box')?.scrollIntoView({ behavior:'smooth' }), 100) }
              }}
              style={{ padding:'8px 18px', borderRadius:8, background:'var(--blue)', color:'#fff', fontSize:13, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .18s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--blue-d)'}
              onMouseLeave={e => e.currentTarget.style.background='var(--blue)'}>
              Login
            </button>
          )}
        </div>

        {/* Hamburger button (mobile only) */}
        <button className="nb-burger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
          style={{ flexDirection:'column', gap:5, padding:8, borderRadius:8, border:'1.5px solid var(--border)', background:'transparent', cursor:'pointer', alignItems:'center', justifyContent:'center', width:40, height:40, flexShrink:0 }}>
          <span style={{ display:'block', width:18, height:2, background:menuOpen?'var(--blue)':'var(--ink2)', borderRadius:2, transition:'all .2s', transform:menuOpen?'rotate(45deg) translate(5px,5px)':'none' }}/>
          <span style={{ display:'block', width:18, height:2, background:menuOpen?'transparent':'var(--ink2)', borderRadius:2, transition:'opacity .2s' }}/>
          <span style={{ display:'block', width:18, height:2, background:menuOpen?'var(--blue)':'var(--ink2)', borderRadius:2, transition:'all .2s', transform:menuOpen?'rotate(-45deg) translate(5px,-5px)':'none' }}/>
        </button>
      </nav>

      {/* Mobile drawer */}
      <div ref={menuRef} className={`nb-mobile-drawer${menuOpen?' open':''}`}>
        {user ? (
          <>
            {/* User info */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--paper2)', borderRadius:10, marginBottom:8, border:'1px solid var(--border)' }}>
              <Avatar name={user.email} size={36}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>
                <div style={{ fontSize:11, color:'var(--ink3)', marginTop:1 }}>Admin Account</div>
              </div>
              <div style={{ position:'relative' }}>
                <span style={{ fontSize:22 }}>🔔</span>
                <span style={{ position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:'50%', background:'var(--red)', border:'2px solid white' }}/>
              </div>
            </div>

            {/* Links */}
            {NAV_LINKS.map(n => {
              const active = pathname.startsWith(n.to)
              return (
                <Link key={n.to} to={n.to}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, fontSize:14, fontWeight:600, color:active?'var(--blue)':'var(--ink)', background:active?'var(--blue-s)':'transparent', textDecoration:'none', transition:'all .15s', border:`1px solid ${active?'rgba(35,82,255,.2)':'transparent'}` }}>
                  <span style={{ fontSize:18, width:24, textAlign:'center' }}>{n.icon}</span>
                  <span style={{ flex:1 }}>{n.label}</span>
                  {active && <span style={{ fontSize:8, color:'var(--blue)' }}>●</span>}
                </Link>
              )
            })}

            <div style={{ height:1, background:'var(--border)', margin:'8px 0' }}/>

            <button onClick={handleLogout}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, fontSize:14, fontWeight:700, color:'var(--red)', background:'var(--red-s)', border:'1px solid rgba(239,68,68,.2)', cursor:'pointer', fontFamily:'inherit', width:'100%', textAlign:'left' }}>
              <span style={{ fontSize:18, width:24, textAlign:'center' }}>🚪</span>
              Log Out
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              setMenuOpen(false)
              if (pathname === '/') document.getElementById('login-box')?.scrollIntoView({ behavior:'smooth' })
              else { navigate('/'); setTimeout(() => document.getElementById('login-box')?.scrollIntoView({ behavior:'smooth' }), 100) }
            }}
            style={{ padding:'13px', borderRadius:10, background:'var(--blue)', color:'#fff', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', width:'100%' }}>
            Login →
          </button>
        )}
      </div>
    </>
  )
}