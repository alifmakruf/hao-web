import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense } from 'react'

import { HouseModel }    from './components/scene/HouseModel'
import { SkyBackground } from './components/scene/SkyBackground'
import { SensorPanel }   from './components/ui/SensorPanel'
import { ModeSelector }  from './components/ui/ModeSelector'
import { DeviceCard }    from './components/ui/DeviceCard'
import { NotifToast }    from './components/ui/NotifToast'

import { useSkyTheme }    from './hooks/useSkyTheme'
import { useDeviceStatus } from './hooks/useDeviceStatus'
import { useSimsNotif }   from './hooks/useSimsNotif'

function SceneSetup() {
  const { ambient, sunColor, isMalam } = useSkyTheme()

  return (
    <>
      <SkyBackground />
      <ambientLight intensity={ambient} color={sunColor} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={ambient}
        color={sunColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Bintang muncul saat malam */}
      {isMalam && <Stars radius={80} depth={40} count={3000} factor={3} fade />}
    </>
  )
}

// Komponen yang mengaktifkan semua hooks global
function GlobalHooks() {
  useDeviceStatus()  // subscribe Firebase
  useSimsNotif()     // generate notif dari sensor
  return null
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Semua hooks global */}
      <GlobalHooks />

      {/* ──── 3D Canvas ──── */}
      <Canvas
        shadows
        camera={{ position: [8, 8, 8], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <SceneSetup />
          <HouseModel />
          <OrbitControls
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={4}
            maxDistance={20}
            enablePan={true}
          />
        </Suspense>
      </Canvas>

      {/* ──── Panel UI overlay (di atas Canvas) ──── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: 240,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: 'linear-gradient(to right, rgba(0,0,0,0.65), transparent)',
        pointerEvents: 'none',
      }}>
        {/* Header */}
        <div style={{ pointerEvents: 'auto' }}>
          <h1 style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: 'white',
            fontFamily: 'sans-serif',
            letterSpacing: '0.02em',
          }}>HAO System</h1>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif' }}>
            Home Automation
          </p>
        </div>

        {/* Sensor */}
        <div style={{ pointerEvents: 'auto' }}>
          <SensorPanel />
        </div>

        {/* Mode selector */}
        <div style={{ pointerEvents: 'auto' }}>
          <ModeSelector />
        </div>

        {/* Device control */}
        <div style={{ pointerEvents: 'auto', overflowY: 'auto', flex: 1 }}>
          <DeviceCard />
        </div>
      </div>

      {/* ──── Toast alert pojok kanan ──── */}
      <NotifToast />
    </div>
  )
}