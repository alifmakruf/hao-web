import { useEffect, useState } from 'react'

const TIPS = [
  '💡 Lampu otomatis menyala saat LDR mendeteksi gelap',
  '🌡 Mode Adaptif menyesuaikan suhu ruangan secara pintar',
  '🌀 Kipas nyala otomatis kalau suhu di atas 30°C',
  '☠ Sensor gas akan membunyikan peringatan darurat',
  '🔄 Mode Auto mengikuti kondisi sensor secara real-time',
  '🧠 Mode Adaptif belajar dari pola waktu dan sensor',
  '🏠 Klik mesh 3D untuk toggle lampu secara langsung',
  '🌙 Malam hari, threshold lampu lebih sensitif',
  '📡 Data sensor dikirim via MQTT dari ESP32',
  '⚡ n8n memproses logika otomasi di balik layar',
]

// Diamond Sims plumbob SVG
function Plumbob({ pulse }) {
  return (
    <svg
      width="64"
      height="80"
      viewBox="0 0 64 80"
      style={{
        filter: 'drop-shadow(0 0 12px #1D9E75) drop-shadow(0 0 24px #1D9E7588)',
        animation: pulse ? 'plumbob-float 2s ease-in-out infinite' : 'none',
      }}
    >
      {/* Top diamond */}
      <polygon points="32,2 54,30 32,42 10,30" fill="#1D9E75" opacity="0.95" />
      <polygon points="32,2 54,30 32,42"        fill="#185FA5" opacity="0.6"  />
      <polygon points="32,2 10,30  32,42"        fill="#24c48e" opacity="0.5"  />
      {/* Bottom diamond */}
      <polygon points="10,30 54,30 32,78"        fill="#14754f" opacity="0.9"  />
      <polygon points="32,42 54,30 32,78"        fill="#0d5c3a" opacity="0.7"  />
      <polygon points="32,42 10,30  32,78"        fill="#1a8f5e" opacity="0.8"  />
      {/* Highlight */}
      <polygon points="32,6  50,28 32,20"        fill="white"   opacity="0.2"  />
    </svg>
  )
}

// Diamond progress bar ala The Sims
function SimsProgressBar({ progress }) {
  const total    = 20
  const filled   = Math.round((progress / 100) * total)

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

export function LoadingScreen({ onDone, onHidden }) {
  const [progress,   setProgress]   = useState(0)
  const [tipIndex,   setTipIndex]   = useState(0)
  const [fadeOut,    setFadeOut]     = useState(false)
  const [visible,    setVisible]     = useState(true)

  // Progress bar naik pelan-pelan, lalu tunggu onDone
  useEffect(() => {
    let current = 0
    const interval = setInterval(() => {
      // Makin lambat mendekati 90% — nunggu scene beneran siap
      const step = current < 60 ? 2.5 : current < 85 ? 0.8 : 0.2
      current = Math.min(current + step, 90)
      setProgress(current)
      if (current >= 90) clearInterval(interval)
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

  // onDone dipanggil dari luar ketika 3D scene ready
  useEffect(() => {
    if (!onDone) return
    setProgress(100)
    const t1 = setTimeout(() => setFadeOut(true),  300)
    const t2 = setTimeout(() => {
      setVisible(false)
      onHidden?.()   // ← panggil ini setelah benar-benar hilang
    }, 1100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes plumbob-float {
          0%, 100% { transform: translateY(0px)   rotate(0deg);   }
          50%       { transform: translateY(-8px)  rotate(3deg);   }
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
        opacity:    fadeOut ? 0 : 1,
        transition: fadeOut ? 'opacity 0.8s ease' : 'none',
        pointerEvents: fadeOut ? 'none' : 'all',
      }}>

        {/* Logo + Plumbob */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Plumbob pulse={progress < 100} />
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

        {/* Progress bar diamond */}
        <SimsProgressBar progress={progress} />

        {/* Tips */}
        <div style={{
          maxWidth: 320, textAlign: 'center',
          minHeight: 40,
        }}>
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

        {/* Versi kecil di bawah */}
        <div style={{
          position: 'absolute', bottom: 24,
          fontSize: 11, color: 'rgba(255,255,255,0.2)',
          fontFamily: 'sans-serif', letterSpacing: '0.1em',
        }}>
          HAO v1.0 · ESP32 + Firebase + HiveMQ
        </div>
      </div>
    </>
  )
}