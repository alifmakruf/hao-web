import { useEffect, useState, useRef } from 'react'

const TIPS = [
  '💡 Lampu otomatis menyala saat LDR mendeteksi gelap',
  '☠ Sensor gas akan membunyikan peringatan darurat',
  '🔄 Mode Auto mengikuti kondisi sensor secara real-time',
  '🧠 Mode Adaptif belajar dari pola waktu dan sensor',
  '🏠 Klik mesh 3D untuk toggle lampu secara langsung',
  '🌙 Malam hari, threshold lampu lebih sensitif',
  '📡 Data sensor dikirim via MQTT dari ESP32',
  '⚡ n8n memproses logika otomasi di balik layar',
]

function Logo({ pulse }) {
  return (
    <img
      src="/logo.png"
      alt="HAO Logo"
      style={{
        width: 160,
        height: 160,
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 16px rgba(0,180,255,0.6)) drop-shadow(0 0 32px rgba(0,180,255,0.3))',
        animation: pulse ? 'logo-float 2.5s ease-in-out infinite' : 'none',
      }}
    />
  )
}

function SimsProgressBar({ progress }) {
  const total  = 20
  const filled = Math.round((progress / 100) * total)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
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
                  : 'rgba(255,255,255,0.1)',
                border: `1px solid ${isFilled ? '#1D9E75' : 'rgba(255,255,255,0.15)'}`,
                boxShadow: isFilled ? '0 0 6px #1D9E7588' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          )
        })}
      </div>
      <div style={{
        fontSize: 12, color: 'rgba(255,255,255,0.5)',
        fontFamily: 'sans-serif', letterSpacing: '0.08em',
      }}>
        {progress < 100 ? `${Math.round(progress)}%` : 'Siap!'}
      </div>
    </div>
  )
}

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

  // Polling: tunggu sceneReady DAN progress >= 90 sebelum finish
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
        @keyframes logo-float {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-8px); }
        }
        @keyframes tip-fade {
          0%   { opacity: 0; transform: translateY(6px);  }
          15%  { opacity: 1; transform: translateY(0px);  }
          85%  { opacity: 1; transform: translateY(0px);  }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #080c18 0%, #0c1224 50%, #060a14 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 32,
        opacity:       fadeOut ? 0 : 1,
        transition:    fadeOut ? 'opacity 0.8s ease' : 'none',
        pointerEvents: fadeOut ? 'none' : 'all',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Logo pulse={progress < 100} />
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 28, fontWeight: 800, color: 'white',
              fontFamily: 'sans-serif', letterSpacing: '0.05em',
            }}>
              HAO System
            </div>
            <div style={{
              fontSize: 13, color: '#1D9E75',
              fontFamily: 'sans-serif', marginTop: 4,
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              Home Automation
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <SimsProgressBar progress={progress} />

        {/* Tips */}
        <div style={{ maxWidth: 320, textAlign: 'center', minHeight: 40 }}>
          <p
            key={tipIndex}
            style={{
              margin: 0,
              fontSize: 13, color: 'rgba(255,255,255,0.5)',
              fontFamily: 'sans-serif', lineHeight: 1.6,
              animation: 'tip-fade 2.5s ease forwards',
            }}
          >
            {TIPS[tipIndex]}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 24,
          fontSize: 11, color: 'rgba(255,255,255,0.2)',
          fontFamily: 'sans-serif', letterSpacing: '0.1em',
        }}>
          HAO v1.45· ESP32 + Firebase + HiveMQ
        </div>
      </div>
    </>
  )
}