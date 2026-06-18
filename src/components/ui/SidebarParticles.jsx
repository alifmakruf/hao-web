/**
 * SidebarParticles.jsx — optimized v2
 * Perubahan:
 *  - count dikontrol dari luar (useDevicePerf)
 *  - boxShadow dihapus di medium/low — ini trigger GPU paint tiap animasi frame
 *  - willChange hanya transform (bukan transform+opacity — dua property = 2 layer)
 */

import { useMemo } from 'react'
import { useDevicePerf } from '../../hooks/useDevicePerf'

export function SidebarParticles({ side = 'left' }) {
  const { particleCount, tier } = useDevicePerf()

  const particles = useMemo(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x:        5 + Math.random() * 90,
      size:     1.5 + Math.random() * 2.5,
      delay:    Math.random() * 8,
      duration: 6 + Math.random() * 6,
      opacity:  0.12 + Math.random() * 0.22,
      hue: side === 'left'
        ? (Math.random() > 0.5 ? '29,158,117' : '99,184,255')
        : (Math.random() > 0.5 ? '99,184,255' : '180,130,255'),
    })),
  [particleCount, side])

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
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 200 }}>
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
            // boxShadow hanya high tier — di medium/low ini trigger repaint tiap frame animasi
            ...(tier === 'high' ? { boxShadow: `0 0 ${p.size * 2}px rgba(${p.hue},${p.opacity * 0.8})` } : {}),
            animation: `hao-sidebar-particle-rise ${p.duration}s ${p.delay}s ease-out infinite`,
            // Hanya transform — satu composite layer, tidak dobel
            willChange: 'transform',
          }}
        />
      ))}
      <div style={edgeStyle} />
    </div>
  )
}
