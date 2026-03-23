import { forwardRef } from 'react'

const TEMPLATES = {
  T1: { name: 'Royal Blue',  c1: '#2352ff', c2: '#1538d4', accent: '#e8ecff' },
  T2: { name: 'Emerald',     c1: '#059669', c2: '#047857', accent: '#d1fae5' },
  T3: { name: 'Deep Maroon', c1: '#9f1239', c2: '#881337', accent: '#ffe4e6' },
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: .4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginTop: 1 }}>{value}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   New prop: orgLogo — just the logo_url string from organizations
   Pass it from AllTemplates: orgLogo={org?.logo_url}
   Everything else is unchanged.
───────────────────────────────────────────────────────────── */
const IDCard = forwardRef(function IDCard(
  { submission, templateId = 'T1', customConfig = null, orgLogo = null, showActions = true, onDelete, onDownload },
  ref
) {
  /* Use customConfig from DB if provided, else fall back to built-in TEMPLATES */
  const t = customConfig
    ? { c1: customConfig.c1||'#2352ff', c2: customConfig.c2||'#1538d4', accent: customConfig.accent||'#e8ecff' }
    : (TEMPLATES[templateId] || TEMPLATES.T1)
  const sub = submission || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div ref={ref} id={`card-${sub.id}`}
        style={{ width: 280, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.12)', border: '1px solid #e8eaf0', fontFamily: 'Instrument Sans,sans-serif' }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,${t.c1},${t.c2})`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Logo — real logo if available, otherwise initials */}
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: 13, color: '#fff', flexShrink: 0, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,.25)' }}>
            {orgLogo
              ? <img src={orgLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" crossOrigin="anonymous" />
              : (sub.school_name || 'SC').slice(0, 2).toUpperCase()
            }
          </div>

          <div>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{sub.school_name || 'School Name'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', marginTop: 1 }}>{sub.role || 'Student'} Identity Card</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 64, height: 80, borderRadius: 8, border: `2px solid ${t.c1}`, overflow: 'hidden', flexShrink: 0, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {sub.photo_url
                ? <img src={sub.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <span style={{ fontSize: 28 }}>👤</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 800, color: '#0b0f1e', lineHeight: 1.2, marginBottom: 4 }}>{sub.name || 'Full Name'}</div>
              {sub.designation    && <div style={{ fontSize: 11, color: t.c1, fontWeight: 700, marginBottom: 3 }}>{sub.designation}</div>}
              {sub.class          && <div style={{ fontSize: 11, color: '#666' }}>Class {sub.class}{sub.section ? `-${sub.section}` : ''}</div>}
              {sub.roll_number    && <div style={{ fontSize: 11, color: '#666' }}>Roll No: {sub.roll_number}</div>}
              {sub.admission_number && <div style={{ fontSize: 11, color: '#666' }}>Adm: {sub.admission_number}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
            <Row label="Date of Birth" value={sub.date_of_birth}     />
            <Row label="Blood Group"   value={sub.blood_group}       />
            <Row label="Contact"       value={sub.contact_number}    />
            <Row label="Emergency"     value={sub.emergency_contact} />
            <Row label="Department"    value={sub.department}        />
            <Row label="Transport"     value={sub.mode_of_transport} />
            {sub.address && <div style={{ gridColumn: '1/-1' }}><Row label="Address" value={sub.address} /></div>}
          </div>
        </div>

        {/* Footer barcode */}
        <div style={{ background: `linear-gradient(135deg,${t.c1}18,${t.c2}10)`, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${t.c1}22` }}>
          <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
            {Array.from({ length: 22 }, (_, i) => (
              <div key={i} style={{ width: 1.5 + Math.abs(Math.sin(i * 2.3)) * 1, height: 16 + Math.abs(Math.cos(i * 1.7)) * 10, background: t.c1, opacity: .7, borderRadius: 1 }} />
            ))}
          </div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono,monospace', color: t.c1, fontWeight: 600, opacity: .8 }}>
            {(sub.id || 'ID000000').slice(0, 8).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={onDownload} style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#e0faf2', color: '#00875f', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => e.target.style.background = '#00c48c'} onMouseLeave={e => e.target.style.background = '#e0faf2'}>
            ↓ Download
          </button>
          <button onClick={onDelete} style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => e.target.style.background = '#ef4444'} onMouseLeave={e => e.target.style.background = '#fee2e2'}>
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  )
})

export default IDCard
export { TEMPLATES }