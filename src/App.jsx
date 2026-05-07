import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useState, useRef, useEffect } from 'react'

import { HouseModel }    from './components/scene/HouseModel'
import { SkyBackground } from './components/scene/SkyBackground'
import { SensorPanel }   from './components/ui/SensorPanel'
import { ModeSelector }  from './components/ui/ModeSelector'
import { DeviceCard }    from './components/ui/DeviceCard'
import { NotifToast }    from './components/ui/NotifToast'

import { useSkyTheme }     from './hooks/useSkyTheme'
import { useDeviceStatus } from './hooks/useDeviceStatus'
import { useSimsNotif }    from './hooks/useSimsNotif'
import { useHAOStore }     from './store'

function SceneSetup() {
  const { ambient, sunColor, isMalam } = useSkyTheme()
  const ambientSafe = Math.max(ambient, 0.35)
  return (
    <>
      <SkyBackground />
      <ambientLight intensity={ambientSafe} color={sunColor} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={Math.max(ambient, 0.5)}
        color={sunColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 2, -5]} intensity={0.3} color="#ffffff" />
      {isMalam && <Stars radius={80} depth={40} count={3000} factor={3} fade />}
    </>
  )
}

function GlobalHooks() {
  useDeviceStatus()
  useSimsNotif()
  return null
}

// Komponen kamera — handle transisi ke top-down view
function CameraController({ isAnchored, orbitRef }) {
  useEffect(() => {
    const controls = orbitRef.current
    if (!controls) return

    if (isAnchored) {
      // Animasi kamera ke posisi tepat di atas (sumbu Y)
      const duration = 600
      const start = performance.now()
      const fromPos = controls.object.position.clone()
      const fromTarget = controls.target.clone()

      // Target ke tengah denah, kamera lurus ke atas
      const toPos    = { x: 0.3,  y: 3.5, z: 0.001 }
      const toTarget = { x: 0.3,  y: 0, z: 0.6   }

      const animate = (now) => {
        const t = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - t, 3) // ease out cubic

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

      // Kunci rotasi saat top-down
      controls.minPolarAngle = 0
      controls.maxPolarAngle = 0.05
    } else {
      // Kembalikan bebas rotasi
      controls.minPolarAngle = 0.3
      controls.maxPolarAngle = Math.PI / 2.2
    }
  }, [isAnchored, orbitRef])

  return null
}

// Tombol dengan tooltip
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
          width: 38, height: 38,
          borderRadius: 10,
          border: `1px solid ${active ? 'rgba(99,184,255,0.6)' : 'rgba(255,255,255,0.25)'}`,
          background: active
            ? 'rgba(99,184,255,0.2)'
            : hovered ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {children}
      </button>
      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: -28,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)',
          color: 'white',
          fontSize: 11,
          padding: '3px 8px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          fontFamily: 'sans-serif',
          pointerEvents: 'none',
        }}>
          {title}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { firebaseConnected } = useHAOStore()
  const [isFullscreen, setIsFullscreen]   = useState(false)
  const [isAnchored, setIsAnchored]       = useState(false)
  const orbitRef = useRef()

  // Fullscreen handler
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

  // Toggle anchor — jika sudah anchor, klik lagi untuk kembali ke view normal
  const toggleAnchor = () => {
    const next = !isAnchored
    setIsAnchored(next)
    if (!next) {
      // Reset ke posisi perspektif default
      const controls = orbitRef.current
      if (!controls) return
      const duration = 500
      const start = performance.now()
      const fromPos = controls.object.position.clone()
      const fromTarget = controls.target.clone()
      const toPos = { x: 8, y: 8, z: 8 }
      const toTarget = { x: 0, y: 0, z: 0 }
      const animate = (now) => {
        const t = Math.min((now - start) / duration, 1)
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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <GlobalHooks />

      <Canvas
        shadows
        camera={{ position: [8, 8, 8], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <SceneSetup />
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

      {/* Panel kiri */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        height: '100%',
        width: isFullscreen ? 0 : 240,
        padding: isFullscreen ? 0 : 16,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 16,
        background: isFullscreen ? 'transparent' : 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)',
        pointerEvents: 'none',
        transition: 'width 0.35s ease, padding 0.35s ease',
      }}>
        <div style={{ pointerEvents: 'auto', opacity: isFullscreen ? 0 : 1, transition: 'opacity 0.2s' }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white', fontFamily: 'sans-serif' }}>
            HAO System
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif' }}>
            Home Automation
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            marginTop: 6, padding: '2px 8px', borderRadius: 20,
            background: firebaseConnected ? 'rgba(29,158,117,0.2)' : 'rgba(186,117,23,0.2)',
            border: `1px solid ${firebaseConnected ? 'rgba(29,158,117,0.4)' : 'rgba(186,117,23,0.4)'}`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: firebaseConnected ? '#1D9E75' : '#EF9F27' }} />
            <span style={{ fontSize: 10, color: firebaseConnected ? '#1D9E75' : '#EF9F27', fontFamily: 'sans-serif' }}>
              {firebaseConnected ? 'Firebase OK' : 'Mode Lokal'}
            </span>
          </div>
        </div>
        <div style={{ pointerEvents: 'auto', opacity: isFullscreen ? 0 : 1, transition: 'opacity 0.2s' }}>
          <SensorPanel />
        </div>
        <div style={{ pointerEvents: 'auto', opacity: isFullscreen ? 0 : 1, transition: 'opacity 0.2s' }}>
          <ModeSelector />
        </div>
        <div style={{ pointerEvents: 'auto', opacity: isFullscreen ? 0 : 1, transition: 'opacity 0.2s', overflowY: 'auto', flex: 1 }}>
          <DeviceCard />
        </div>
      </div>

      {/* Tombol kanan atas — anchor + fullscreen berdampingan */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        zIndex: 1000,
        display: 'flex', gap: 8,
      }}>
        {/* Tombol Top-Down View */}
        <IconButton onClick={toggleAnchor} title={isAnchored ? 'Kembali ke Perspektif' : 'Top-Down View'} active={isAnchored}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            {/* Ikon denah dari atas: kotak dengan crosshair */}
            <rect x="2" y="2" width="14" height="14" rx="2"
              stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.6" fill="none"/>
            <line x1="9" y1="2" x2="9" y2="16"
              stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.2" strokeDasharray="2 2"/>
            <line x1="2" y1="9" x2="16" y2="9"
              stroke={isAnchored ? '#ff6363' : 'white'} strokeWidth="1.2" strokeDasharray="2 2"/>
            <circle cx="9" cy="9" r="2"
              fill={isAnchored ? '#ff6363' : 'white'}/>
          </svg>
        </IconButton>

        {/* Tombol Fullscreen */}
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

      <NotifToast />
    </div>
  )
}