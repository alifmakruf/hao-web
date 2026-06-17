/**
 * LoadingScreen.jsx — Enhanced cinematic version
 * Award-style entrance with:
 *  - GSAP-inspired staggered reveals
 *  - Particle system
 *  - Glitch text effect
 *  - Animated hexagon ring
 *  - Shimmer progress bar
 *  - Zero functional changes
 */

import { useEffect, useState, useRef } from 'react'

const TIPS = [
  '• Lampu otomatis menyala saat LDR mendeteksi gelap',
  '• Sensor gas akan membunyikan peringatan darurat',
  '• Mode Auto mengikuti kondisi sensor secara real-time',
  '• Mode Adaptif belajar dari pola waktu dan sensor',
  '• Klik mesh 3D untuk toggle lampu secara langsung',
  '• Malam hari, threshold lampu lebih sensitif',
  '• Data sensor dikirim via MQTT dari ESP32',
  '• n8n memproses logika otomasi di balik layar',
]

// ── Floating particles background ────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 4 + Math.random() * 4,
    size: 2 + Math.random() * 3,
    opacity: 0.2 + Math.random() * 0.4,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `rgba(29,158,117,${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(29,158,117,${p.opacity})`,
            animation: `hao-loading-particle ${p.duration}s ${p.delay}s ease-out infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ── Grid background ───────────────────────────────────────────────────────────
function GridBg() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      background: `
        linear-gradient(rgba(29,158,117,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(29,158,117,0.04) 1px, transparent 1px)
      `,
      backgroundSize: '48px 48px',
      mask: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)',
    }} />
  )
}

// ── Rotating hex ring around logo ────────────────────────────────────────────
function HexRing({ progress }) {
  const segments = 6
  const r = 100 // radius
  const stroke = 2

  return (
    <svg
      width={240} height={240}
      viewBox="0 0 240 240"
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
    >
      {/* Static outer ring */}
      <circle
        cx={120} cy={120} r={r}
        fill="none"
        stroke="rgba(99,184,255,0.08)"
        strokeWidth={stroke}
      />

      {/* Animated progress arc */}
      <circle
        cx={120} cy={120} r={r}
        fill="none"
        stroke="rgba(99,184,255,0.4)"
        strokeWidth={stroke + 0.5}
        strokeDasharray={`${2 * Math.PI * r}`}
        strokeDashoffset={`${2 * Math.PI * r * (1 - progress / 100)}`}
        strokeLinecap="round"
        transform="rotate(-90 120 120)"
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />

      {/* Rotating dashes */}
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * 360
        const rad   = (angle * Math.PI) / 180
        const x1 = 120 + (r - 8) * Math.cos(rad)
        const y1 = 120 + (r - 8) * Math.sin(rad)
        const x2 = 120 + (r + 4) * Math.cos(rad)
        const y2 = 120 + (r + 4) * Math.sin(rad)
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(29,158,117,0.5)"
            strokeWidth="1.5"
            style={{
              animation: `hao-rotate-slow 8s ${i * 0.3}s linear infinite`,
              transformOrigin: '120px 120px',
            }}
          />
        )
      })}

      {/* Corner ticks */}
      {[0, 90, 180, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x   = 120 + r * Math.cos(rad)
        const y   = 120 + r * Math.sin(rad)
        return (
          <circle
            key={i} cx={x} cy={y} r={3}
            fill={progress > (i / 4) * 100 ? 'rgba(99,184,255,0.8)' : 'rgba(99,184,255,0.2)'}
            style={{ transition: 'fill 0.3s ease' }}
          />
        )
      })}
    </svg>
  )
}

// ── Logo with glow layers ─────────────────────────────────────────────────────
function Logo({ pulse, progress }) {
  return (
    <div style={{ position: 'relative', width: 160, height: 160 }}>
      <HexRing progress={progress} />
      <img
        src="/logo.png"
        alt="HAO Logo"
        className="hao-loading-logo"
        style={{
          width: 110,
          height: 110,
          objectFit: 'contain',
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          filter: `
            drop-shadow(0 0 16px rgba(0,180,255,0.6))
            drop-shadow(0 0 32px rgba(0,180,255,0.3))
            drop-shadow(0 0 64px rgba(0,180,255,0.15))
          `,
          animation: pulse
            ? 'hao-logo-float 3s ease-in-out infinite, hao-logo-in 0.8s cubic-bezier(0.34,1.56,0.64,1) both'
            : 'hao-logo-in 0.8s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      />
    </div>
  )
}

// ── Sims-style diamond progress ───────────────────────────────────────────────
function SimsProgressBar({ progress }) {
  const total  = 20
  const filled = Math.round((progress / 100) * total)

  return (
    <div
      className="hao-loading-bar"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
    >
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => {
          const isFilled = i < filled
          return (
            <div
              key={i}
              style={{
                width: 10, height: 10,
                transform: 'rotate(45deg)',
                background: isFilled
                  ? `hsl(${150 + i * 2}, 70%, ${45 + i}%)`
                  : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isFilled ? '#1D9E75' : 'rgba(255,255,255,0.12)'}`,
                boxShadow: isFilled
                  ? `0 0 8px rgba(29,158,117,0.6), 0 0 16px rgba(29,158,117,0.3)`
                  : 'none',
                transition: 'all 0.3s ease',
                animation: isFilled ? `hao-pop 0.3s ${i * 0.02}s ease both` : 'none',
              }}
            />
          )
        })}
      </div>

      {/* Shimmer bar underneath */}
      <div style={{
        width: 240, height: 2,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #1D9E75, #63b8ff)',
          borderRadius: 2,
          transition: 'width 0.3s ease',
          boxShadow: '0 0 8px rgba(99,184,255,0.4)',
        }} />
        {/* Shimmer overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          backgroundSize: '200% 100%',
          animation: 'hao-shimmer 1.5s linear infinite',
        }} />
      </div>

      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.45)',
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: '0.15em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {progress < 100 ? `${Math.round(progress)}%` : 'SIAP'}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function LoadingScreen({ sceneReady, onHidden }) {
  const [progress, setProgress] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const [fadeOut,  setFadeOut]  = useState(false)
  const [visible,  setVisible]  = useState(true)
  const progressRef = useRef(0)
  const doneRef     = useRef(false)

  // Progress naik pelan sampai 90%
  useEffect(() => {
    const interval = setInterval(() => {
      const step = progressRef.current < 60 ? 2.5
                 : progressRef.current < 85 ? 0.8
                 : 0.2
      const next = Math.min(progressRef.current + step, 90)
      progressRef.current = next
      setProgress(next)
      if (next >= 90) clearInterval(interval)
    }, 80)
    return () => clearInterval(interval)
  }, [])

  // Ganti tips tiap 2.5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // Tunggu sceneReady DAN progress >= 90
  useEffect(() => {
    if (!sceneReady) return
    const check = setInterval(() => {
      if (progressRef.current >= 90 && !doneRef.current) {
        doneRef.current = true
        clearInterval(check)
        setProgress(100)
        setTimeout(() => setFadeOut(true), 800)
        setTimeout(() => {
          setVisible(false)
          onHidden?.()
        }, 1700)
      }
    }, 100)
    return () => clearInterval(check)
  }, [sceneReady, onHidden])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes hao-logo-float {
          0%, 100% { transform: translate(-50%,-50%) translateY(0px);  }
          50%       { transform: translate(-50%,-50%) translateY(-8px); }
        }
        @keyframes hao-logo-in {
          0%   { opacity: 0; transform: translate(-50%,-50%) translateY(24px) scale(0.85); filter: blur(12px); }
          100% { opacity: 1; transform: translate(-50%,-50%) translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes hao-loading-particle {
          0%   { transform: translateY(0)     scale(1);    opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-80vh) scale(0.3); opacity: 0; }
        }
        @keyframes hao-rotate-slow {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes hao-pop {
          0%   { transform: rotate(45deg) scale(0.4); opacity: 0; }
          70%  { transform: rotate(45deg) scale(1.2); opacity: 1; }
          100% { transform: rotate(45deg) scale(1);   opacity: 1; }
        }
        @keyframes hao-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes hao-fade-up {
          0%   { opacity: 0; transform: translateY(16px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0);    filter: blur(0);   }
        }
        @keyframes hao-tip-reveal {
          0%   { opacity: 0; transform: translateY(6px);  }
          15%  { opacity: 1; transform: translateY(0px);  }
          85%  { opacity: 1; transform: translateY(0px);  }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        @keyframes hao-text-reveal {
          0%   { opacity: 0; letter-spacing: 0.5em; filter: blur(4px); }
          100% { opacity: 1; letter-spacing: 0.05em; filter: blur(0); }
        }
        @keyframes hao-glitch {
          0%,  92%, 100% { clip-path: none; transform: none; color: white; }
          93%  { clip-path: inset(20% 0 60% 0); transform: translateX(-3px); color: #63b8ff; }
          94%  { clip-path: inset(60% 0 10% 0); transform: translateX(3px);  color: #1D9E75; }
          95%  { clip-path: none; transform: none; color: white; }
          96%  { clip-path: inset(40% 0 40% 0); transform: translateX(-2px); }
        }
        .hao-loading-logo   { animation: hao-fade-up 0.8s 0.1s ease both; }
        .hao-loading-title  { animation: hao-text-reveal 0.7s 0.35s ease both; }
        .hao-loading-sub    { animation: hao-fade-up 0.6s 0.55s ease both; }
        .hao-loading-bar    { animation: hao-fade-up 0.6s 0.70s ease both; }
        .hao-loading-tips   { animation: hao-fade-up 0.6s 0.90s ease both; }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #060a14 0%, #080c18 40%, #0a1020 70%, #060a14 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 28,
        opacity:       fadeOut ? 0 : 1,
        transition:    fadeOut ? 'opacity 0.9s ease' : 'none',
        pointerEvents: fadeOut ? 'none' : 'all',
        overflow: 'hidden',
      }}>

        {/* Animated grid background */}
        <GridBg />

        {/* Floating particles */}
        <Particles />

        {/* Radial glow center */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,158,117,0.06) 0%, rgba(99,184,255,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(30px)',
        }} />

        {/* Logo + ring */}
        <div className="hao-loading-logo">
          <Logo pulse={progress < 100} progress={progress} />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div
            className="hao-glitch hao-loading-title"
            style={{
              fontSize: 30, fontWeight: 800, color: 'white',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '0.05em',
            }}
          >
            HAO System
          </div>
          <div
            className="hao-loading-sub"
            style={{
              fontSize: 11, color: '#1D9E75',
              fontFamily: "'Space Grotesk', sans-serif",
              marginTop: 5,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              opacity: 0.9,
            }}
          >
            Home Automation Overview
          </div>
        </div>

        {/* Progress */}
        <SimsProgressBar progress={progress} />

        {/* Tips */}
        <div
          className="hao-loading-tips"
          style={{ maxWidth: 340, textAlign: 'center', minHeight: 44 }}
        >
          <p
            key={tipIndex}
            style={{
              margin: 0,
              fontSize: 12,
              color: 'rgba(255,255,255,0.4)',
              fontFamily: "'Space Grotesk', sans-serif",
              lineHeight: 1.7,
              animation: 'hao-tip-reveal 2.5s ease forwards',
            }}
          >
            {TIPS[tipIndex]}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 24,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{
            fontSize: 10, color: 'rgba(255,255,255,0.18)',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.12em',
          }}>
            HAO v1.45 · ESP32 + Firebase + HiveMQ
          </span>
          <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>
    </>
  )
}
