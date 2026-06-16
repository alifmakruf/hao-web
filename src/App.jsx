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
import { AutomationPanel } from './components/ui/AutomationPanel'
import { TaskPanel }       from './components/ui/TaskPanel'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { useAutomation } from './hooks/useAutomation'
import { TechFrame } from './components/scene/TechFrame'
import { AuthPanel }  from './components/ui/AuthPanel'
import { GuestPanel } from './components/ui/GuestPanel'
import { TokenPanel } from './components/ui/TokenPanel'
import { useAuth }    from './hooks/useAuth'
import { usePresence } from './hooks/usePresence'
import { WeatherWidget } from './components/ui/WeatherWidget'
import { useActivityLog } from './hooks/useActivityLog'
import { ActivityLogModal } from './components/ui/ActivityLogModal'

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
const SIDEBAR_WIDTH       = 270
const RIGHT_SIDEBAR_WIDTH = 260

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
  useAutomation()
  usePresence()
  useActivityLog()
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
  const { firebaseConnected, liteMode, setLiteMode, hideNotif, setHideNotif, authRole } = useHAOStore()
  const { login, logout, loginGuest, logoutGuest, createToken } = useAuth()
  const [sceneReady, setSceneReady] = useState(false)
  const [loadingDone,  setLoadingDone]  = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAnchored,   setIsAnchored]   = useState(false)
  const [showWeather,  setShowWeather]  = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [showTask,     setShowTask]     = useState(false)
  const [showAuth,     setShowAuth]     = useState(false)
  const [showGuest,    setShowGuest]    = useState(false)
  const [showToken,    setShowToken]    = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const authRef   = useRef()
  const guestRef  = useRef()
  const tokenRef  = useRef()

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

  // Close auth/guest/token panels when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (authRef.current  && !authRef.current.contains(e.target))  setShowAuth(false)
      if (guestRef.current && !guestRef.current.contains(e.target)) setShowGuest(false)
      if (tokenRef.current && !tokenRef.current.contains(e.target)) setShowToken(false)
      if (weatherRef.current && !weatherRef.current.contains(e.target)) setShowWeather(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

  const activeWeather    = WEATHER_OPTIONS.find(w => w.id === weather)
  const showSidebar      = sidebarOpen && !isFullscreen && !rightSidebarOpen
  const showRightSidebar = rightSidebarOpen && !isFullscreen && !sidebarOpen

  const toggleLeftSidebar = () => {
    if (!sidebarOpen) { setRightSidebarOpen(false); setSidebarOpen(true) }
    else setSidebarOpen(false)
  }
  const toggleRightSidebar = () => {
    if (!rightSidebarOpen) { setSidebarOpen(false); setRightSidebarOpen(true) }
    else setRightSidebarOpen(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <LoadingScreen 
        sceneReady={sceneReady}
        onHidden={() => setLoadingDone(true)}
      />
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
            : showRightSidebar
            ? `inset(0 ${RIGHT_SIDEBAR_WIDTH}px 0 0)`
            : 'none',
          transition: 'clip-path 0.32s cubic-bezier(0.4,0,0.2,1)',
        }}
        onCreated={() => setSceneReady(true)}
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
          <TechFrame />
          <CameraController isAnchored={isAnchored} orbitRef={orbitRef} />
        </Suspense>
      </Canvas>
      
    {loadingDone && (
      <>

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

            {/* Auth role banner */}
            {authRole === 'viewer' && (
              <div style={{ margin: '12px 16px 0', padding: '7px 10px', borderRadius: 9, background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>👁</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,200,80,0.9)' }}>View Only</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Login / pakai token untuk kontrol</div>
                </div>
              </div>
            )}
            {authRole === 'guest' && (
              <div style={{ margin: '12px 16px 0', padding: '7px 10px', borderRadius: 9, background: 'rgba(99,184,255,0.08)', border: '1px solid rgba(99,184,255,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>👥</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(99,184,255,0.9)' }}>Guest</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Akses kontrol aktif</div>
                </div>
              </div>
            )}
            {authRole === 'admin' && (
              <div style={{ margin: '12px 16px 0', padding: '7px 10px', borderRadius: 9, background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>🔑</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(29,158,117,0.9)' }}>Admin</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Akses penuh</div>
                </div>
              </div>
            )}

            {/* Sensor */}
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Sensor
              </div>
              <SensorPanel />
            </div>

            {/* Mode, Automation, Device — disabled overlay kalau viewer */}
            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {authRole === 'viewer' && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(2px)',
                  borderRadius: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'not-allowed',
                }}>
                  <span style={{ fontSize: 28 }}>🔒</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', textAlign: 'center', padding: '0 24px' }}>
                    Login atau masukkan token guest untuk mengontrol perangkat
                  </span>
                </div>
              )}

              {/* Mode */}
              <div style={{ padding: '16px 16px 0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Mode Sistem
                </div>
                <ModeSelector />
              </div>

              {/* Automation */}
              <div style={{ padding: '16px 16px 0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Otomasi
                </div>
                <AutomationPanel />
              </div>

              {/* Device */}
              <div style={{ padding: '16px 16px 16px', flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Perangkat
                </div>
                <DeviceCard />
                <div style={{marginTop: 100}}>-----</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tombol toggle sidebar ── */}
        <button
          onClick={toggleLeftSidebar}
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

        {/* ── Tombol kanan atas — hanya Fullscreen & TopDown (selalu tampil) ── */}
        {!isFullscreen && (
          <div style={{
            position: 'absolute', top: 16, right: 16,
            zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center',
          }}>
            {/* Top-down / perspektif */}
            <IconButton onClick={toggleAnchor} title={isAnchored ? 'Kembali ke Perspektif' : 'Top-Down View'} active={isAnchored}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="2" stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.6" fill="none"/>
                <line x1="9" y1="2" x2="9" y2="16" stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.2" strokeDasharray="2 2"/>
                <line x1="2" y1="9" x2="16" y2="9" stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.2" strokeDasharray="2 2"/>
                <circle cx="9" cy="9" r="2" fill={isAnchored ? '#ff6363' : 'white'}/>
              </svg>
            </IconButton>

            {/* Toggle sidebar kanan */}
            <IconButton onClick={toggleRightSidebar} title={showRightSidebar ? 'Tutup panel' : 'Buka panel'} active={showRightSidebar}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
                <line x1="11" y1="2" x2="11" y2="16" stroke="white" strokeWidth="1.5"/>
                <line x1="13" y1="6" x2="15" y2="9" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="13" y1="12" x2="15" y2="9" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </IconButton>
          </div>
        )}

        {/* Tombol fullscreen — selalu di pojok kanan atas, meski fullscreen */}
        <div style={{ position: 'absolute', top: 16, right: isFullscreen ? 16 : (showRightSidebar ? RIGHT_SIDEBAR_WIDTH + 16 : 16), zIndex: 9999, transition: 'right 0.32s cubic-bezier(0.4,0,0.2,1)' }}>
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

        {/* ── Sidebar kanan ── */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          height: '100%',
          width: showRightSidebar ? RIGHT_SIDEBAR_WIDTH : 0,
          overflow: 'hidden',
          transition: 'width 0.32s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 99999,
        }}>
          <div style={{
            width: RIGHT_SIDEBAR_WIDTH,
            height: '100%',
            background: 'linear-gradient(160deg, rgba(8,12,24,0.92) 0%, rgba(12,18,36,0.88) 100%)',
            backdropFilter: 'blur(16px)',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto', overflowX: 'hidden',
          }}>

            {/* Header */}
            <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Panel Kontrol
              </div>
            </div>

            {/* ── Status Koneksi ── */}
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Koneksi
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Firebase */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif' }}>Firebase</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: firebaseConnected ? '#22c55e' : '#ef4444', boxShadow: firebaseConnected ? '0 0 6px #22c55e' : 'none' }} />
                    <span style={{ fontSize: 11, color: firebaseConnected ? '#22c55e' : '#ef4444' }}>{firebaseConnected ? 'Terhubung' : 'Putus'}</span>
                  </div>
                </div>
                {/* MQTT */}
                {(() => {
                  const { mqttStatus } = useHAOStore.getState()
                  const mqttColor = { connected: '#22c55e', connecting: '#f59e0b', error: '#ef4444', disconnected: '#6b7280' }[mqttStatus] ?? '#6b7280'
                  const mqttLabel = { connected: 'Terhubung', connecting: 'Menghubungkan...', error: 'Error', disconnected: 'Terputus' }[mqttStatus] ?? 'Terputus'
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>MQTT</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: mqttColor, boxShadow: mqttStatus === 'connected' ? `0 0 6px ${mqttColor}` : 'none' }} />
                        <span style={{ fontSize: 11, color: mqttColor }}>{mqttLabel}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* ── Lite Mode ── */}
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Performa
              </div>
              <button
                onClick={() => setLiteMode(!liteMode)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: liteMode ? 'rgba(99,184,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${liteMode ? 'rgba(99,184,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: liteMode ? '#63b8ff' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.2s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Mode Lite</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>{liteMode ? 'Aktif — efek dimatikan' : 'Nonaktif'}</div>
                </div>
                <div style={{ marginLeft: 'auto', width: 28, height: 16, borderRadius: 8, background: liteMode ? '#63b8ff' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: liteMode ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                </div>
              </button>

              {/* ── Hide Notif ── */}
              <button
                onClick={() => setHideNotif(!hideNotif)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, marginTop: 6,
                  background: hideNotif ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${hideNotif ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: hideNotif ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.2s',
                }}
              >
                {/* Eye icon with optional slash */}
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  {hideNotif ? (
                    <>
                      <path d="M1 1l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M6.5 3.2C7 3.07 7.5 3 8 3c3.5 0 6 4 6 4s-.7 1.2-1.9 2.3M3.6 5.6C2.4 6.7 2 8 2 8s2.5 4 6 4c1.1 0 2-.3 2.8-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
                    </>
                  ) : (
                    <>
                      <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
                    </>
                  )}
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Sembunyikan Notif</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>
                    {hideNotif ? 'Aktif — indikator jadi ikon kecil' : 'Nonaktif — label penuh tampil'}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', width: 28, height: 16, borderRadius: 8, background: hideNotif ? '#a78bfa' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: hideNotif ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                </div>
              </button>
            </div>

            {/* ── Cuaca Lokasi Anda ── */}
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Cuaca Lokasi Anda
              </div>
              <WeatherWidget />
            </div>

            {/* ── Efek Cuaca Scene ── */}
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Efek Cuaca Scene
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {WEATHER_OPTIONS.map(({ id, label, icon }) => (
                  <button key={id} onClick={() => setWeather(id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
                    background: weather === id ? 'rgba(99,184,255,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${weather === id ? 'rgba(99,184,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: weather === id ? 'white' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{icon}</span>
                    <span style={{ fontSize: 12, fontWeight: weather === id ? 600 : 400 }}>{label}</span>
                    {weather === id && <span style={{ marginLeft: 'auto', color: '#63b8ff', fontSize: 14 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Task Harian ── */}
            {/* <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Task Harian
              </div>
              <TaskPanel inline />
            </div> */}

            {/* ── Log Aktivitas ── */}
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Aktivitas
              </div>
              <button
                onClick={() => setShowActivityLog(true)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.2s', fontFamily: 'sans-serif',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <span style={{ fontSize: 16 }}>📜</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Log Aktivitas</div>
                  <div style={{ fontSize: 10, opacity: 0.5 }}>Riwayat perubahan admin & guest</div>
                </div>
              </button>
            </div>

            {/* ── Auth ── */}
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Akun
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Guest */}
                <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${authRole === 'guest' ? 'rgba(99,184,255,0.3)' : 'rgba(255,255,255,0.07)'}`, background: authRole === 'guest' ? 'rgba(99,184,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
                  <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>👥</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: authRole === 'guest' ? '#63b8ff' : 'rgba(255,255,255,0.6)' }}>
                      {authRole === 'guest' ? 'Guest (aktif)' : 'Guest'}
                    </span>
                    {authRole === 'guest' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#63b8ff', boxShadow: '0 0 5px #63b8ff', marginLeft: 'auto' }} />}
                  </div>
                  <div style={{ padding: '0 12px 10px' }}>
                    <GuestPanel onClose={() => {}} inline />
                  </div>
                </div>

                {/* Admin */}
                <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${authRole === 'admin' ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.07)'}`, background: authRole === 'admin' ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.03)' }}>
                  <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🔑</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: authRole === 'admin' ? '#1D9E75' : 'rgba(255,255,255,0.6)' }}>
                      {authRole === 'admin' ? 'Admin (aktif)' : 'Admin'}
                    </span>
                    {authRole === 'admin' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75', boxShadow: '0 0 5px #1D9E75', marginLeft: 'auto' }} />}
                  </div>
                  <div style={{ padding: '0 12px 10px' }}>
                    <AuthPanel onClose={() => {}} inline />
                  </div>
                </div>

                {/* Token — admin only */}
                {authRole === 'admin' && (
                  <div style={{ borderRadius: 10, border: '1px solid rgba(255,200,80,0.2)', background: 'rgba(255,200,80,0.05)' }}>
                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>🎟</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,200,80,0.8)' }}>Buat Token Guest</span>
                    </div>
                    <div style={{ padding: '0 12px 10px' }}>
                      <TokenPanel onClose={() => {}} inline />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ height: 20, marginTop: 100 }} />
          </div>
        </div>

        {/* Toggle sidebar kanan */}
        {!isFullscreen && (
          <button
            onClick={toggleRightSidebar}
            title={showRightSidebar ? 'Tutup panel kanan' : 'Buka panel kanan'}
            style={{
              position: 'absolute',
              top: '50%',
              right: showRightSidebar ? RIGHT_SIDEBAR_WIDTH : 0,
              transform: 'translateY(-50%)',
              transition: 'right 0.32s cubic-bezier(0.4,0,0.2,1)',
              zIndex: 200,
              width: 20, height: 56,
              background: 'rgba(20,28,50,0.92)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRight: showRightSidebar ? 'none' : '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px 0 0 8px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 12, padding: 0,
            }}
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              {showRightSidebar ? (
                <path d="M3 2L8 8L3 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M7 2L2 8L7 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        )}

        {/* ── Toast notifikasi ── */}
        <NotifToast />
      </>
    )}
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

      {/* ── Modal Log Aktivitas ── */}
      {showActivityLog && (
        <ActivityLogModal onClose={() => setShowActivityLog(false)} />
      )}
    </div>
  )
}