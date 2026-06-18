/**
 * DonghuaClouds.jsx
 * Awan gaya novel donghua / xianxia yang melayang di langit.
 * Dirender sebagai HTML overlay di depan Canvas — tidak perlu Three.js mesh.
 *
 * Fitur:
 *  - 3 layer kedalaman (jauh, tengah, dekat) untuk parallax feel
 *  - Warna & opacity otomatis menyesuaikan phase waktu (useSkyTheme)
 *  - SVG shape organik — bukan ellipse biasa, tapi cloud dengan tonjolan khas donghua
 *  - Gradien & rim-light sesuai arah matahari
 *  - Ringan: pure CSS animation, tidak ada canvas/WebGL tambahan
 */

import { useMemo } from 'react'
import { useSkyTheme } from '../../hooks/useSkyTheme'

// ── Phase config ──────────────────────────────────────────────────────────────
// Setiap phase siang/sore punya palet awan yang beda
function useCloudPhase() {
  const jam = new Date().getHours()
  const { isMalam } = useSkyTheme()

  return useMemo(() => {
    if (isMalam || jam >= 21 || jam < 5) {
      return null // malam → tidak tampil
    }

    if (jam >= 5 && jam < 7) {
      // Subuh — awan tipis keunguan, langit masih gelap
      return {
        label: 'subuh',
        base:    'rgba(200,180,230,',   // ungu pucat
        rim:     'rgba(255,180,120,',   // oranye fajar di tepi
        shadow:  'rgba(80,60,120,',
        opacity:  0.55,
        count:    5,
        speed:    0.55,
      }
    }
    if (jam >= 7 && jam < 10) {
      // Pagi — awan putih kebiruan, cerah tapi masih lembut
      return {
        label: 'pagi',
        base:    'rgba(235,245,255,',
        rim:     'rgba(200,225,255,',
        shadow:  'rgba(150,180,220,',
        opacity:  0.7,
        count:    6,
        speed:    0.45,
      }
    }
    if (jam >= 10 && jam < 15) {
      // Siang — awan putih bersih, solid, fluffy donghua
      return {
        label: 'siang',
        base:    'rgba(255,255,255,',
        rim:     'rgba(220,238,255,',
        shadow:  'rgba(170,195,230,',
        opacity:  0.82,
        count:    7,
        speed:    0.4,
      }
    }
    if (jam >= 15 && jam < 18) {
      // Sore — awan keemasan, rim-light oranye
      return {
        label: 'sore',
        base:    'rgba(255,235,195,',
        rim:     'rgba(255,185,80,',
        shadow:  'rgba(180,100,60,',
        opacity:  0.78,
        count:    6,
        speed:    0.5,
      }
    }
    if (jam >= 18 && jam < 19) {
      // Maghrib — awan merah-oranye dramatis, sedikit awan
      return {
        label: 'maghrib',
        base:    'rgba(255,180,100,',
        rim:     'rgba(255,120,60,',
        shadow:  'rgba(120,50,30,',
        opacity:  0.65,
        count:    4,
        speed:    0.6,
      }
    }
    if (jam >= 19 && jam < 21) {
      // Senja — awan biru tua, hampir malam
      return {
        label: 'senja',
        base:    'rgba(130,150,200,',
        rim:     'rgba(160,130,200,',
        shadow:  'rgba(40,50,100,',
        opacity:  0.45,
        count:    4,
        speed:    0.5,
      }
    }
    return null
  }, [jam, isMalam])
}

// ── SVG cloud shapes (donghua style) ─────────────────────────────────────────
// Berbagai bentuk awan organik — tidak simetris, ada tonjolan kecil khas xianxia
const CLOUD_PATHS = [
  // Awan besar lebar — seperti awan kapas bertingkat
  `M0,60 
   C10,45 25,20 50,18 
   C55,5  75,0  90,12 
   C100,2 118,0 130,14
   C140,4 158,2 168,18
   C185,8 200,20 205,38
   C215,32 228,35 232,50
   C235,62 225,74 210,72
   C205,82 192,86 178,80
   C168,92 148,94 132,84
   C118,96 98,96  80,86
   C62,96  42,90  28,80
   C12,84  -2,74  0,60 Z`,

  // Awan panjang tipis — seperti selendang awan di gunung
  `M0,40
   C8,28 20,14 40,12
   C52,4 70,2  88,10
   C98,2 120,0 140,8
   C155,1 175,4 188,16
   C202,10 218,18 222,32
   C228,42 220,56 206,56
   C198,66 180,70 162,62
   C148,72 128,74 108,66
   C90,74 68,72 50,62
   C32,70 12,62  0,50 Z`,

  // Awan kecil gemuk — dotong khas donghua
  `M0,44
   C4,30 18,12 38,10
   C46,2 62,0  74,10
   C82,2 98,4  108,16
   C116,6 132,10 138,24
   C146,18 158,26 158,40
   C160,52 150,64 134,64
   C124,74 106,76 88,68
   C72,76 52,74  36,66
   C18,72 0,62  0,50 Z`,

  // Awan besar dengan tiga puncak — sangat khas xianxia
  `M0,62
   C6,46 18,24 36,20
   C42,8 60,4  74,14
   C80,4 96,0  110,10
   C118,0 136,0 148,14
   C154,4 170,6 180,20
   C196,14 212,28 216,46
   C224,38 236,46 238,58
   C240,72 228,84 212,82
   C204,92 186,96 168,88
   C154,98 132,100 112,90
   C94,100 72,98  52,88
   C32,96  10,84  0,70 Z`,

  // Awan panjang meliuk — seperti awan di lukisan Cina
  `M0,36
   C10,22 30,8  54,8
   C64,0 84,2  98,12
   C108,4 130,2 148,12
   C160,4 182,8 196,22
   C210,16 228,26 232,40
   C236,52 224,64 206,62
   C196,70 174,72 154,62
   C138,70 112,68 90,60
   C72,68 46,66  24,56
   C8,62 -4,52  0,42 Z`,
]

// ── Single cloud component ─────────────────────────────────────────────────────
function CloudShape({ cloud, phase }) {
  const pathIdx = cloud.pathIdx
  const path    = CLOUD_PATHS[pathIdx % CLOUD_PATHS.length]

  // Dimensi berdasarkan layer (jauh=kecil, dekat=besar)
  const w = cloud.baseWidth * cloud.scale
  const h = cloud.baseHeight * cloud.scale

  // Warna per layer — layer jauh lebih transparan
  const layerAlpha  = cloud.layer === 0 ? 0.55 : cloud.layer === 1 ? 0.78 : 1.0
  const shadowAlpha = cloud.layer === 0 ? 0.20 : cloud.layer === 1 ? 0.30 : 0.40
  const rimAlpha    = cloud.layer === 0 ? 0.35 : cloud.layer === 1 ? 0.55 : 0.75

  const baseColor   = phase.base   + (phase.opacity * layerAlpha)  + ')'
  const rimColor    = phase.rim    + (phase.opacity * rimAlpha)     + ')'
  const shadowColor = phase.shadow + (phase.opacity * shadowAlpha)  + ')'

  // Arah rim-light berdasarkan waktu (pagi=kiri atas, siang=atas, sore=kanan bawah)
  const jam = new Date().getHours()
  const rimX = jam < 12 ? '20%' : jam < 16 ? '50%' : '80%'
  const rimY = jam < 17 ? '15%' : '65%'

  const animName = `cloud-drift-${cloud.id}`
  const duration = cloud.duration
  const delay    = cloud.delay
  const drift    = cloud.driftX // seberapa jauh bergerak horizontal

  return (
    <>
      <style>{`
        @keyframes ${animName} {
          0%   { transform: translateX(0px) translateY(0px); }
          30%  { transform: translateX(${drift * 0.4}px) translateY(${cloud.driftY * 0.5}px); }
          60%  { transform: translateX(${drift * 0.7}px) translateY(${-cloud.driftY * 0.3}px); }
          100% { transform: translateX(${drift}px) translateY(0px); }
        }
      `}</style>

      <div style={{
        position: 'absolute',
        left:     `${cloud.x}%`,
        top:      `${cloud.y}%`,
        width:    w,
        height:   h,
        animation: `${animName} ${duration}s ${delay}s ease-in-out infinite alternate`,
        willChange: 'transform',
        filter: cloud.layer === 2
          ? `drop-shadow(0 4px 12px ${shadowColor}) drop-shadow(0 -2px 6px ${rimColor})`
          : `drop-shadow(0 3px 8px ${shadowColor})`,
        pointerEvents: 'none',
      }}>
        <svg
          viewBox="0 0 240 100"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Gradien utama awan — base + rim-light */}
            <radialGradient
              id={`cg-${cloud.id}`}
              cx={rimX} cy={rimY} r="75%"
            >
              <stop offset="0%"   stopColor={rimColor}  />
              <stop offset="45%"  stopColor={baseColor} />
              <stop offset="100%" stopColor={shadowColor} />
            </radialGradient>

            {/* Subtle inner glow */}
            <filter id={`cf-${cloud.id}`} x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Shadow layer — sedikit offset ke bawah */}
          <path
            d={path}
            fill={shadowColor}
            transform="translate(3, 5) scale(0.99)"
            style={{ filter: 'blur(4px)' }}
          />

          {/* Main cloud body */}
          <path
            d={path}
            fill={`url(#cg-${cloud.id})`}
            filter={`url(#cf-${cloud.id})`}
          />

          {/* Rim-light stroke — tepi awan menyala seperti xianxia */}
          {cloud.layer >= 1 && (
            <path
              d={path}
              fill="none"
              stroke={rimColor}
              strokeWidth={cloud.layer === 2 ? 1.5 : 0.8}
              opacity={0.6}
            />
          )}
        </svg>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function DonghuaClouds() {
  const phase = useCloudPhase()

  // Generate awan — seed stabil (useMemo tanpa deps yg berubah)
  // Layer 0 = jauh (kecil, lambat), Layer 1 = tengah, Layer 2 = dekat (besar, cepat)
  const clouds = useMemo(() => {
    if (!phase) return []

    const count = phase.count
    const result = []

    // Distribusi layer: 40% jauh, 40% tengah, 20% dekat
    const layers = [
      ...Array(Math.ceil(count * 0.4)).fill(0),
      ...Array(Math.ceil(count * 0.4)).fill(1),
      ...Array(Math.max(1, Math.floor(count * 0.2))).fill(2),
    ].slice(0, count)

    // Posisi Y per layer — jauh lebih tinggi di layar
    const yRanges = [
      [2, 22],   // layer 0 jauh: di atas
      [10, 35],  // layer 1 tengah
      [18, 42],  // layer 2 dekat
    ]

    layers.forEach((layer, i) => {
      const scale = layer === 0 ? 0.5 + Math.random() * 0.3
                  : layer === 1 ? 0.75 + Math.random() * 0.35
                  : 1.0 + Math.random() * 0.4

      const [yMin, yMax] = yRanges[layer]

      // Spread x merata supaya tidak menumpuk
      const xBase = (i / count) * 110 - 10
      const xJitter = (Math.random() - 0.5) * 18

      result.push({
        id:         i,
        layer,
        pathIdx:    i % CLOUD_PATHS.length,
        x:          Math.max(-8, Math.min(95, xBase + xJitter)),
        y:          yMin + Math.random() * (yMax - yMin),
        scale,
        baseWidth:  280,
        baseHeight: 110,
        // Drift jarak berdasarkan layer (jauh=sedikit, dekat=banyak)
        driftX: (layer === 0 ? 8 : layer === 1 ? 14 : 22) * (Math.random() > 0.5 ? 1 : -1),
        driftY: 2 + Math.random() * 4,
        duration: (layer === 0 ? 18 : layer === 1 ? 13 : 9) + Math.random() * 6,
        delay:    Math.random() * 8,
      })
    })

    // Sort by layer — layer jauh duluan (z-order)
    return result.sort((a, b) => a.layer - b.layer)
  }, [phase?.label]) // re-generate hanya jika phase berubah (subuh→pagi, dll)

  if (!phase || clouds.length === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,          // di depan canvas, di belakang sidebar
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {clouds.map(cloud => (
        <CloudShape key={cloud.id} cloud={cloud} phase={phase} />
      ))}
    </div>
  )
}
