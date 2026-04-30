import { Html } from '@react-three/drei'
import { useEffect, useState } from 'react'

// Warna per tipe notifikasi
const TYPE_STYLE = {
  danger:  { bg: '#FCEBEB', border: '#E24B4A', text: '#501313' },
  warning: { bg: '#FAEEDA', border: '#EF9F27', text: '#412402' },
  hot:     { bg: '#FAECE7', border: '#D85A30', text: '#4A1B0C' },
  warm:    { bg: '#FAEEDA', border: '#BA7517', text: '#412402' },
  cold:    { bg: '#E6F1FB', border: '#378ADD', text: '#042C53' },
  info:    { bg: '#E1F5EE', border: '#1D9E75', text: '#04342C' },
}

export function SimsNotif({ notif }) {
  const [visible, setVisible] = useState(false)
  const [bounce, setBounce]   = useState(false)

  // Animasi muncul saat pertama kali render
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50)
    const t2 = setTimeout(() => setBounce(true),  100)
    const t3 = setTimeout(() => setBounce(false), 400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const style = TYPE_STYLE[notif.type] || TYPE_STYLE.info

  return (
    <Html
      position={notif.position || [0, 3, 0]}
      center
      zIndexRange={[100, 0]}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        color: style.text,
        padding: '5px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontFamily: 'sans-serif',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transform: visible
          ? bounce ? 'translateY(-4px) scale(1.05)' : 'translateY(0) scale(1)'
          : 'translateY(10px) scale(0.8)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        <span style={{ fontSize: 14 }}>{notif.icon}</span>
        <span>{notif.message}</span>
      </div>
    </Html>
  )
}