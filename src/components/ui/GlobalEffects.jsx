/**
 * GlobalEffects.jsx — Optimized v3 (mobile-adaptive)
 *
 * Perubahan dari v2:
 *  - AmbientOrbs: skip filter:blur di medium/low tier (ganti opacity saja)
 *  - CursorGlow: skip total di touchscreen (hover:none)
 *  - CornerHUD: tetap, sudah pure CSS dan sangat ringan
 *  - Vignette: tetap
 *  - Semua `will-change` hanya pada elemen yang benar-benar animate
 */

import { useEffect, useRef, useState } from 'react'
import { useDevicePerf } from '../../hooks/useDevicePerf'

// ── Custom cursor glow — HANYA aktif di area canvas/scene ─────────────────
function CursorGlow() {
  const dotRef   = useRef()
  const trailRef = useRef()
  const posRef   = useRef({ x: -200, y: -200 })
  const trailPos = useRef({ x: -200, y: -200 })
  const [active, setActive] = useState(false)

  useEffect(() => {
    // Skip seluruhnya di touchscreen
    if (window.matchMedia('(hover: none)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const dot   = dotRef.current
    const trail = trailRef.current
    if (!dot || !trail) return

    const onMove = (e) => { posRef.current = { x: e.clientX, y: e.clientY } }
    const onEnterCanvas = () => setActive(true)
    const onLeaveCanvas = () => setActive(false)

    window.addEventListener('mousemove', onMove, { passive: true })

    const attachToCanvas = () => {
      document.querySelectorAll('canvas').forEach(c => {
        c.addEventListener('mouseenter', onEnterCanvas)
        c.addEventListener('mouseleave', onLeaveCanvas)
      })
    }
    attachToCanvas()
    const retryTimer = setTimeout(attachToCanvas, 500)

    let rafId
    const animate = () => {
      const { x, y } = posRef.current
      trailPos.current.x += (x - trailPos.current.x) * 0.1
      trailPos.current.y += (y - trailPos.current.y) * 0.1
      if (dot)   dot.style.transform   = `translate(${x - 4}px, ${y - 4}px)`
      if (trail) trail.style.transform = `translate(${trailPos.current.x - 20}px, ${trailPos.current.y - 20}px)`
      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(retryTimer)
      window.removeEventListener('mousemove', onMove)
      document.querySelectorAll('canvas').forEach(c => {
        c.removeEventListener('mouseenter', onEnterCanvas)
        c.removeEventListener('mouseleave', onLeaveCanvas)
      })
    }
  }, [])

  const visibility = active ? 'visible' : 'hidden'
  return (
    <>
      <div ref={dotRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: 8, height: 8, borderRadius: '50%',
        background: 'rgba(99,184,255,1)',
        boxShadow: '0 0 10px rgba(99,184,255,0.7)',
        pointerEvents: 'none', zIndex: 99999,
        willChange: 'transform', mixBlendMode: 'difference', visibility,
      }} />
      <div ref={trailRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: 40, height: 40, borderRadius: '50%',
        border: '1px solid rgba(99,184,255,0.6)',
        pointerEvents: 'none', zIndex: 99998,
        willChange: 'transform', mixBlendMode: 'difference', visibility,
      }} />
    </>
  )
}

// ── Corner HUD — pure CSS, tidak berubah ──────────────────────────────────
function CornerHUD() {
  const corners = [
    { style: { top: 0,    left: 0  }, rotate: '0deg'   },
    { style: { top: 0,    right: 0 }, rotate: '90deg'  },
    { style: { bottom: 0, right: 0 }, rotate: '180deg' },
    { style: { bottom: 0, left: 0  }, rotate: '270deg' },
  ]
  return (
    <>
      {corners.map((c, i) => (
        <div key={i} style={{
          position: 'fixed', ...c.style,
          width: 44, height: 44,
          pointerEvents: 'none', zIndex: 9991,
          transform: `rotate(${c.rotate})`,
          opacity: 0,
          animation: `hao-corner-in 0.5s ${0.15 + i * 0.08}s ease forwards`,
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path d="M4 4 L16 4" stroke="rgba(99,184,255,0.45)" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M4 4 L4 16" stroke="rgba(99,184,255,0.45)" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="4" cy="4" r="2" fill="rgba(99,184,255,0.6)"/>
          </svg>
        </div>
      ))}
    </>
  )
}

// ── Ambient orbs — adaptive: high=blur, medium/low=opacity only ───────────
function AmbientOrbs({ useOrbBlur }) {
  const orbs = [
    { size: 320, x: '8%',  y: '25%', color: 'rgba(29,158,117,0.045)',  delay: '0s',  dur: '20s' },
    { size: 380, x: '78%', y: '55%', color: 'rgba(99,184,255,0.035)',  delay: '7s',  dur: '24s' },
    { size: 220, x: '50%', y: '88%', color: 'rgba(167,139,250,0.04)',  delay: '3s',  dur: '17s' },
    { size: 180, x: '88%', y: '12%', color: 'rgba(29,158,117,0.03)',   delay: '11s', dur: '22s' },
  ]
  return (
    <>
      {orbs.map((orb, i) => (
        <div key={i} style={{
          position: 'fixed',
          left: orb.x, top: orb.y,
          width: orb.size, height: orb.size,
          borderRadius: '50%',
          // Tanpa blur: hanya radial-gradient opacity — jauh lebih ringan di GPU
          background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', zIndex: 1,
          animation: `hao-orb-drift ${orb.dur} ${orb.delay} ease-in-out infinite alternate`,
          // filter:blur hanya kalau high tier — di mobile ini penyebab frame drop utama
          ...(useOrbBlur ? { filter: 'blur(50px)', willChange: 'transform' } : { willChange: 'transform' }),
        }} />
      ))}
    </>
  )
}

// ── Vignette ──────────────────────────────────────────────────────────────
function Vignette() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9,
      pointerEvents: 'none',
      background: 'radial-gradient(ellipse 110% 110% at 50% 50%, transparent 45%, rgba(0,0,0,0.3) 100%)',
    }} />
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export function GlobalEffects({ enabled = true }) {
  const { isMobile, useOrbBlur } = useDevicePerf()
  if (!enabled) return null
  return (
    <>
      <Vignette />
      <AmbientOrbs useOrbBlur={useOrbBlur} />
      <CornerHUD />
      {/* CursorGlow: skip di HP touchscreen, tidak berguna dan buang RAF */}
      {!isMobile && <CursorGlow />}
    </>
  )
}
