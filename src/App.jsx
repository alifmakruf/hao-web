/**
 * App.jsx — Full merged version
 * Menggabungkan:
 *  - 3D scene (Canvas, HouseModel, SkyBackground, Rain, ShootingStars)
 *  - Sidebar (SensorPanel, ModeSelector, DeviceCard)
 *  - WeatherPanel, IconButton, CameraController
 *  - useMQTT (HiveMQ), useDeviceStatus, useSimsNotif
 *  - ConnectionStatus bar (Firebase + MQTT)
 *  - Lite Mode toggle (matikan efek berat)
 */

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useState, useRef, useEffect } from 'react'

import { HouseModel }    from './components/scene/HouseModel'
import { SkyBackground } from './components/scene/SkyBackground'
import { SensorPanel }   from './components/ui/SensorPanel'
import { ModeSelector }  from './components/ui/ModeSelector'
import { DeviceCard }    from './components/ui/DeviceCard'
import { NotifToast }    from './components/ui/NotifToast'
import { Rain }          from './components/scene/Rain'
import { ShootingStars } from './components/scene/ShootingStars'

import { useSkyTheme }     from './hooks/useSkyTheme'
import { useDeviceStatus } from './hooks/useDeviceStatus'
import { useSimsNotif }    from './hooks/useSimsNotif'
import { useMQTT }         from './hooks/useMQTT'
import { useHAOStore }     from './store'
import { SceneSelector }   from './components/ui/SceneSelector'
import { TaskPanel }       from './components/ui/TaskPanel'

// ─────────────────────────────────────────────────────────────────────────────
const WEATHER_OPTIONS = [
  { id: 'auto',   label: 'Auto (LDR)', icon: '🔄' },
  { id: 'sunny',  label: 'Cerah',      icon: '☀️' },
  { id: 'cloudy', label: 'Mendung',    icon: '☁️' },
  { id: 'rainy',  label: 'Hujan',      icon: '🌧️' },
  { id: 'night',  label: 'Malam',      icon: '🌙' },
]

const DEFAULT_CAM_POS    = [3.5, 4.5, 3.5]
const DEFAULT_CAM_TARGET = [0.3, 0, 0.5]
const SIDEBAR_WIDTH      = 270

// ── Scene lighting + weather effects ─────────────────────────────────────────
function SceneSetup({ weather }) {
  const { ambient, sunColor, isMalam } = useSkyTheme()
  const { liteMode } = useHAOStore()

  const weatherConfig = {
    auto:   { amb: Math.max(ambient, 0.35), sun: sunColor,  night: isMalam },
    sunny:  { amb: 1.0,  sun: '#ffffff',    night: false },
    cloudy: { amb: 0.45, sun: '#b0c4d8',    night: false },
    rainy:  { amb: 0.25, sun: '#8899aa',    night: false },
    night:  { amb: 0.06, sun: '#1a2040',    night: true  },
  }
  const cfg = weatherConfig[weather] || weatherConfig.auto

  return (
    <>
      <SkyBackground weatherOverride={weather} />
      <ambientLight intensity={cfg.amb} color={cfg.sun} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={Math.max(cfg.amb, 0.4)}
        color={cfg.sun}
        castShadow={!liteMode}
        shadow-mapSize-width={liteMode ? 256 : 1024}
        shadow-mapSize-height={liteMode ? 256 : 1024}
      />
      <directionalLight position={[-5, 2, -5]} intensity={0.3} color="#ffffff" />
      {/* Lite mode: matikan Stars, Rain, ShootingStars */}
      {!liteMode && cfg.night && <Stars radius={80} depth={40} count={3000} factor={3} fade />}
      {!liteMode && <Rain active={weather === 'rainy'} count={2500} />}
      {!liteMode && <ShootingStars active={cfg.night} />}
    </>
  )
}

// ── Global hooks (dipanggil sekali, level atas) ───────────────────────────────
function AppInitializer() {
  useMQTT()
  useDeviceStatus()
  useSimsNotif()
  return null
}

// ── Kamera animasi top-down / perspektif ─────────────────────────────────────
function CameraController({ isAnchored, orbitRef }) {
  useEffect(() => {
    const controls = orbitRef.current
    if (!controls) return
    if (isAnchored) {
      const duration = 600
      const start    = performance.now()
      const fromPos    = controls.object.position.clone()
      const fromTarget = controls.target.clone()
      const toPos    = { x: 0.3, y: 3.5, z: 0.001 }
      const toTarget = { x: 0.3, y: 0,   z: 0.6   }
      const animate = (now) => {
        const t    = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - t, 3)
        controls.object.position.set(
          fromPos.x + (toPos.x - fromPos.x) * ease,
          fromPos.y + (toPos.y - fromPos.y) * ease,
          fromPos.z + (toPos.z - fromPos.z) * ease,
        )
        controls.target.set(
          fromTarget.x + (toTarget.x - fromTarget.x) * ease,
          fromTarget.y + (toTarget.y - fromTarget.y) * ease,
          fromTarget.z + (toTarget.z - fromTarget.z) * ease,
        )
        controls.update()
        if (t < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
      controls.minPolarAngle = 0
      controls.maxPolarAngle = 0.05
    } else {
      controls.minPolarAngle = 0.3
      controls.maxPolarAngle = Math.PI / 2.2
    }
  }, [isAnchored, orbitRef])
  return null
}

// ── Icon button dengan tooltip ────────────────────────────────────────────────
function IconButton({ onClick, title, children, active }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={title}
        style={{
          width: 38, height: 38, borderRadius: 10,
          border: `1px solid ${active ? 'rgba(99,184,255,0.6)' : 'rgba(255,255,255,0.25)'}`,
          background: active
            ? 'rgba(99,184,255,0.2)'
            : hovered ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {children}
      </button>
      {hovered && (
        <div style={{
          position: 'absolute', bottom: -28, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', color: 'white',
          fontSize: 11, padding: '3px 8px', borderRadius: 6,
          whiteSpace: 'nowrap', fontFamily: 'sans-serif', pointerEvents: 'none',
          zIndex: 2000,
        }}>
          {title}
        </div>
      )}
    </div>
  )
}

// ── Dropdown pilihan cuaca ────────────────────────────────────────────────────
function WeatherPanel({ weather, onChange, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 46, right: 0,
      background: 'rgba(10,14,26,0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 14, padding: '10px 8px', minWidth: 170,
      zIndex: 1500, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <p style={{
        margin: '0 0 8px 8px', fontSize: 11, fontWeight: 700,
        color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif',
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>Cuaca</p>
      {WEATHER_OPTIONS.map(({ id, label, icon }) => {
        const isActive = weather === id
        return (
          <button
            key={id}
            onClick={() => { onChange(id); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 12px',
              background: isActive ? 'rgba(99,184,255,0.15)' : 'transparent',
              border: isActive ? '1px solid rgba(99,184,255,0.3)' : '1px solid transparent',
              borderRadius: 9, color: 'white',
              cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 13,
              marginBottom: 3, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
            <span style={{ fontWeight: isActive ? 600 : 400 }}>{label}</span>
            {isActive && <span style={{ marginLeft: 'auto', color: '#63b8ff', fontSize: 16 }}>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Status bar Firebase + MQTT (pojok kanan atas, di bawah tombol icon) ───────
function ConnectionStatus() {
  const { firebaseConnected, mqttStatus } = useHAOStore()
  const mqttColor = {
    connected:    '#22c55e',
    connecting:   '#f59e0b',
    error:        '#ef4444',
    disconnected: '#6b7280',
  }[mqttStatus] ?? '#6b7280'

  return (
    <div style={{
      position: 'absolute',
      top: 62,
      right: 16,
      zIndex: 1000,
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      padding: '5px 11px',
      borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Firebase */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: firebaseConnected ? '#22c55e' : '#ef4444',
          boxShadow: firebaseConnected ? '0 0 6px #22c55e' : 'none',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif' }}>
          Firebase
        </span>
      </span>

      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>|</span>

      {/* MQTT */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: mqttColor,
          boxShadow: mqttStatus === 'connected' ? `0 0 6px ${mqttColor}` : 'none',
          display: 'inline-block',
          animation: mqttStatus === 'connecting' ? 'hao-pulse 1s infinite' : 'none',
        }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif' }}>
          MQTT{mqttStatus === 'connecting' ? ' ...' : ''}
        </span>
      </span>

      <style>{`
        @keyframes hao-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
      `}</style>
    </div>
  )
}

// ── App utama ─────────────────────────────────────────────────────────────────
export default function App() {
  const { firebaseConnected, liteMode, setLiteMode } = useHAOStore()

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAnchored,   setIsAnchored]   = useState(false)
  const [showWeather,  setShowWeather]  = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [showTask,     setShowTask]     = useState(false)

  const [weather, setWeatherState] = useState(
    () => localStorage.getItem('hao-weather') || 'auto'
  )
  const setWeather = (val) => {
    setWeatherState(val)
    localStorage.setItem('hao-weather', val)
  }

  const savedCam = (() => {
    try { return JSON.parse(localStorage.getItem('hao-camera')) } catch { return null }
  })()

  const orbitRef   = useRef()
  const weatherRef = useRef()

  // Restore kamera dari localStorage
  useEffect(() => {
    const controls = orbitRef.current
    if (!controls || !savedCam) return
    controls.object.position.set(...savedCam.pos)
    controls.target.set(...savedCam.target)
    controls.update()
  }, []) // eslint-disable-line

  // Simpan posisi kamera setiap 2 detik
  useEffect(() => {
    const id = setInterval(() => {
      const controls = orbitRef.current
      if (!controls) return
      const p = controls.object.position
      const t = controls.target
      localStorage.setItem('hao-camera', JSON.stringify({
        pos:    [p.x, p.y, p.z],
        target: [t.x, t.y, t.z],
      }))
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // Tutup dropdown cuaca saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (weatherRef.current && !weatherRef.current.contains(e.target))
        setShowWeather(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Toggle top-down / perspektif
  const toggleAnchor = () => {
    const next = !isAnchored
    setIsAnchored(next)
    if (!next) {
      const controls = orbitRef.current
      if (!controls) return
      const duration = 500
      const start    = performance.now()
      const fromPos    = controls.object.position.clone()
      const fromTarget = controls.target.clone()
      const toPos    = { x: DEFAULT_CAM_POS[0],    y: DEFAULT_CAM_POS[1],    z: DEFAULT_CAM_POS[2] }
      const toTarget = { x: DEFAULT_CAM_TARGET[0], y: DEFAULT_CAM_TARGET[1], z: DEFAULT_CAM_TARGET[2] }
      const animate = (now) => {
        const t    = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - t, 3)
        controls.object.position.set(
          fromPos.x + (toPos.x - fromPos.x) * ease,
          fromPos.y + (toPos.y - fromPos.y) * ease,
          fromPos.z + (toPos.z - fromPos.z) * ease,
        )
        controls.target.set(
          fromTarget.x + (toTarget.x - fromTarget.x) * ease,
          fromTarget.y + (toTarget.y - fromTarget.y) * ease,
          fromTarget.z + (toTarget.z - fromTarget.z) * ease,
        )
        controls.update()
        if (t < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
      controls.minPolarAngle = 0.3
      controls.maxPolarAngle = Math.PI / 2.2
    }
  }

  const activeWeather = WEATHER_OPTIONS.find(w => w.id === weather)
  const showSidebar   = sidebarOpen && !isFullscreen

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif' }}>

      {/* Inisialisasi semua hooks (MQTT + Firebase + Notif) */}
      <AppInitializer />

      {/* ── 3D Canvas ── */}
      <Canvas
        shadows={!liteMode}
        frameloop={liteMode ? 'demand' : 'always'}
        camera={{ position: savedCam ? savedCam.pos : DEFAULT_CAM_POS, fov: 50 }}
        style={{
          width: '100%', height: '100%',
          clipPath: showSidebar
            ? `inset(0 0 0 ${SIDEBAR_WIDTH}px)`
            : 'none',
          transition: 'clip-path 0.32s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Suspense fallback={null}>
          <SceneSetup weather={weather} />
          <HouseModel />
          <OrbitControls
            ref={orbitRef}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={2}
            maxDistance={24}
            enablePan={true}
          />
          <CameraController isAnchored={isAnchored} orbitRef={orbitRef} />
        </Suspense>
      </Canvas>

      {/* ── Sidebar kiri ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        height: '100%',
        width: showSidebar ? SIDEBAR_WIDTH : 0,
        overflow: 'hidden',
        transition: 'width 0.32s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 99999,
        isolation: 'isolate'
      }}>
        <div style={{
          width: SIDEBAR_WIDTH,
          height: '100%',
          background: 'linear-gradient(160deg, rgba(8,12,24,0.92) 0%, rgba(12,18,36,0.88) 100%)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #1D9E75, #185FA5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>🏠</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '0.01em' }}>
                  HAO System
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                  Home Automation
                </div>
              </div>
            </div>

            {/* Badge status Firebase */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 12, padding: '5px 10px', borderRadius: 20,
              background: firebaseConnected ? 'rgba(29,158,117,0.15)' : 'rgba(186,117,23,0.15)',
              border: `1px solid ${firebaseConnected ? 'rgba(29,158,117,0.35)' : 'rgba(186,117,23,0.35)'}`,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: firebaseConnected ? '#1D9E75' : '#EF9F27',
                boxShadow: firebaseConnected ? '0 0 6px #1D9E75' : '0 0 6px #EF9F27',
              }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: firebaseConnected ? '#1D9E75' : '#EF9F27' }}>
                {firebaseConnected ? 'Firebase Terhubung' : 'Mode Lokal'}
              </span>
            </div>
          </div>

          {/* Sensor */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Sensor
            </div>
            <SensorPanel />
          </div>

          {/* Mode */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Mode Sistem
            </div>
            <ModeSelector />
          </div>

          {/* Scene */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Scene
            </div>
            <SceneSelector />
          </div>

          {/* Device */}
          <div style={{ padding: '16px 16px 16px', flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Perangkat
            </div>
            <DeviceCard />
          </div>
        </div>
      </div>

      {/* ── Tombol toggle sidebar ── */}
      <button
        onClick={() => setSidebarOpen(v => !v)}
        title={showSidebar ? 'Tutup sidebar' : 'Buka sidebar'}
        style={{
          position: 'absolute',
          top: '50%',
          left: showSidebar ? SIDEBAR_WIDTH : 0,
          transform: 'translateY(-50%)',
          transition: 'left 0.32s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 200,
          width: 20, height: 56,
          background: 'rgba(20,28,50,0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderLeft: showSidebar ? 'none' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: '0 8px 8px 0',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)',
          fontSize: 12, padding: 0,
        }}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          {showSidebar ? (
            <path d="M7 2L2 8L7 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M3 2L8 8L3 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
      </button>

      {/* ── Tombol kanan atas ── */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {/* Lite Mode — ditambahkan sebelum Weather */}
        <IconButton
          onClick={() => setLiteMode(!liteMode)}
          title={liteMode ? 'Mode Normal' : 'Mode Lite'}
          active={liteMode}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5"/>
            <path d="M8 4v4l3 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </IconButton>

        {/* Weather picker */}
        <div ref={weatherRef} style={{ position: 'relative' }}>
          <IconButton onClick={() => setShowWeather(v => !v)} title="Cuaca" active={showWeather || weather !== 'auto'}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>{activeWeather?.icon ?? '🌤️'}</span>
          </IconButton>
          {showWeather && (
            <WeatherPanel weather={weather} onChange={setWeather} onClose={() => setShowWeather(false)} />
          )}
        </div>

        {/* Top-down / perspektif */}
        <IconButton onClick={toggleAnchor} title={isAnchored ? 'Kembali ke Perspektif' : 'Top-Down View'} active={isAnchored}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="2" stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.6" fill="none"/>
            <line x1="9" y1="2" x2="9" y2="16" stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.2" strokeDasharray="2 2"/>
            <line x1="2" y1="9" x2="16" y2="9" stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.2" strokeDasharray="2 2"/>
            <circle cx="9" cy="9" r="2" fill={isAnchored ? '#ff6363' : 'white'}/>
          </svg>
        </IconButton>

        {/* Fullscreen */}
        <IconButton onClick={toggleFullscreen} title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'} active={isFullscreen}>
          {isFullscreen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 2v4H2M12 2v4h4M6 16v-4H2M12 16v-4h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 6V2h4M12 2h4v4M16 12v4h-4M6 16H2v-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </IconButton>
      </div>

      {/* ── Status koneksi Firebase + MQTT ── */}
      <ConnectionStatus />

      {/* Burger button pojok kanan bawah */}
      <button
        onClick={() => setShowTask(v => !v)}
        title="Task Harian"
        style={{
          position: 'absolute', bottom: 60, right: 16,
          zIndex: 99998,
          width: 46, height: 46, borderRadius: 14,
          background: showTask
            ? 'rgba(29,158,117,0.8)' : 'rgba(8,12,24,0.9)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${showTask
            ? 'rgba(29,158,117,0.6)' : 'rgba(255,255,255,0.15)'}`,
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          transition: 'all 0.2s',
        }}
      >
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: showTask ? (i === 1 ? 0 : 18) : 18,
            height: 2, borderRadius: 2,
            background: 'white',
            transition: 'all 0.2s',
            opacity: showTask && i === 1 ? 0 : 1,
          }} />
        ))}
      </button>

      {/* Task Panel */}
      {showTask && <TaskPanel onClose={() => setShowTask(false)} />}

      {/* ── Toast notifikasi ── */}
      <NotifToast />

      <style>{`
        .sidebar-clip-area {
          position: absolute;
          top: 0; left: 0;
          width: ${showSidebar ? SIDEBAR_WIDTH : 0}px;
          height: 100%;
          z-index: 300;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}