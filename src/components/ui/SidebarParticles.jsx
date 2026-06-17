/**
 * SidebarParticles.jsx
 * Efek partikel ringan untuk sidebar — menggantikan efek sword-slash shine.
 * Titik-titik kecil melayang ke atas secara acak, mirip dengan LoadingScreen
 * tapi lebih pelan dan subtle agar tidak mengganggu UI.
 */

import { useMemo } from 'react'

/**
 * @param {object} props
 * @param {'left'|'right'} props.side - sisi sidebar, menentukan warna aksen edge
 * @param {number} [props.count=14] - jumlah partikel (ringan, jangan > 20)
 */
export function SidebarParticles({ side = 'left', count = 14 }) {
  // Generate partikel sekali, tidak re-render tiap frame
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,          // % dari lebar sidebar
      size: 1.5 + Math.random() * 2.5,    // px
      delay: Math.random() * 8,           // s — spread supaya tidak bareng
      duration: 6 + Math.random() * 6,   // s — lebih pelan dari loading screen
      opacity: 0.12 + Math.random() * 0.22,
      // Warna sedikit berbeda kiri/kanan untuk variasi
      hue: side === 'left'
        ? (Math.random() > 0.5 ? '29,158,117' : '99,184,255') // teal / blue
        : (Math.random() > 0.5 ? '99,184,255' : '180,130,255'), // blue / purple
    })),
  [count, side])

  // Edge accent — garis tipis di tepi sidebar, pulsating pelan
  const edgeStyle = {
    position: 'absolute',
    top: '10%',
    [side === 'left' ? 'right' : 'left']: 0,
    width: 1,
    height: '80%',
    background: side === 'left'
      ? 'linear-gradient(180deg, transparent 0%, rgba(29,158,117,0.35) 30%, rgba(99,184,255,0.5) 50%, rgba(29,158,117,0.35) 70%, transparent 100%)'
      : 'linear-gradient(180deg, transparent 0%, rgba(99,184,255,0.35) 30%, rgba(180,130,255,0.5) 50%, rgba(99,184,255,0.35) 70%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 201,
    animation: 'hao-sidebar-particle-edge 4s ease-in-out infinite',
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: 200,
    }}>
      {/* Partikel melayang */}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: '-6px',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `rgba(${p.hue},${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(${p.hue},${p.opacity * 0.8})`,
            animation: `hao-sidebar-particle-rise ${p.duration}s ${p.delay}s ease-out infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}

      {/* Edge accent line */}
      <div style={edgeStyle} />
    </div>
  )
}
