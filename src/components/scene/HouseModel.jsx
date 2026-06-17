import { Flame, Thermometer, Snowflake, Skull, AlertTriangle, Wind, Lightbulb, Crown, User } from 'lucide-react'
import { useGLTF, Html } from '@react-three/drei'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { RoomLight }       from './RoomLight'
import { SimsNotif }       from './SimsNotif'
import { useHAOStore }     from '../../store'
import { useDeviceStatus } from '../../hooks/useDeviceStatus'

const DEVICE_MESH_MAP = {
  'Lampu_RuangTamu':        'lampu_ruangtamu',
  'Lampu_DapurDanKeluarga': 'lampu_dapurdankeluarga',
  'Lampu_Kamar1':           'lampu_kamar1',
  'Lampu_Kamar2':           'lampu_kamar2',
  'Lampu_Kamar3':           'lampu_kamar3',
  'Lampu_Teras':            'lampu_teras',
  'Lampu_Gerbang':          'lampu_gerbang',
  'Lampu_Garasi':           'lampu_garasi',
  'Fan_RuangTamu':          'fan_ruangtamu',
  'Fan_Kamar':              'fan_kamar',
  'Fan_Dapur':              'fan_dapur',
}

// Label display untuk setiap device key
const DEVICE_LABELS = {
  lampu_ruangtamu:        'Lampu Ruang Tamu',
  lampu_dapurdankeluarga: 'Lampu Dapur & Keluarga',
  lampu_kamar1:           'Lampu Kamar 1',
  lampu_kamar2:           'Lampu Kamar 2',
  lampu_kamar3:           'Lampu Kamar 3',
  lampu_teras:            'Lampu Teras',
  lampu_gerbang:          'Lampu Gerbang',
  lampu_garasi:           'Lampu Garasi',
  fan_ruangtamu:          'Kipas Ruang Tamu',
  fan_kamar:              'Kipas Kamar',
  fan_dapur:              'Kipas Dapur',
}

const ROOM_LIGHTS = [
  { key: 'lampu_ruangtamu',        pos: [0.33,  0.38,  0.71], color: '#ffe8a0', dist: 3.5 },
  { key: 'lampu_dapurdankeluarga', pos: [0.66,  0.38, -0.03], color: '#fff0c0', dist: 3.5 },
  { key: 'lampu_kamar1',           pos: [-0.57, 0.38,  0.85], color: '#ffd080', dist: 2.5 },
  { key: 'lampu_kamar2',           pos: [1.00,  0.38,  0.88], color: '#ffd080', dist: 2.5 },
  { key: 'lampu_kamar3',           pos: [1.69,  0.38,  0.71], color: '#ffd080', dist: 2.5 },
  { key: 'lampu_teras',            pos: [0.35,  0.38,  1.65], color: '#ffe8a0', dist: 2.0 },
  { key: 'lampu_gerbang',          pos: [-1.30, 0.38,  1.65], color: '#ffcc66', dist: 2.0 },
  { key: 'lampu_garasi',           pos: [-1.33, 0.38,  0.42], color: '#fff0c0', dist: 3.0 },
]

// Posisi tepat dari mesh DHT dan Gas di Blender
const ROOM_TEMP_LABELS = [
  { key: 'ruangtamu', label: 'Ruang Tamu', pos: [0.077,  0.62, 0.379]  },
  { key: 'kamar',     label: 'Kamar',      pos: [-0.127, 0.62, 1.155]  },
  { key: 'dapur',     label: 'Dapur',      pos: [0.174,  0.62, -0.465] },
]

// Posisi sensor gas (dari Blender)
const GAS_POS = [-0.236, 0.62, -0.465]

// ── Komponen indikator reusable (dot kecil atau label penuh) ─────────────────
function DeviceIndicator({ label, isHidden, color, bg, icon: Icon, text, tooltip }) {
  if (isHidden) {
    return (
      <div
        title={tooltip}
        style={{
          width: 12, height: 12,
          borderRadius: '50%',
          background: bg,
          border: `2px solid ${color}`,
          boxShadow: `0 0 7px ${color}cc`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'default',
          flexShrink: 0,
        }}
      >
        <Icon size={6} strokeWidth={3} color="white" />
      </div>
    )
  }
  return (
    <div style={{
      background:   bg,
      color:        'white',
      padding:      '3px 9px',
      borderRadius: 8,
      fontSize:     11,
      fontFamily:   'sans-serif',
      whiteSpace:   'nowrap',
      border:       `1px solid ${color}`,
      fontWeight:   600,
      boxShadow:    `0 0 8px ${color}55`,
      display:      'flex', alignItems: 'center', gap: 4,
    }}>
      <Icon size={11} strokeWidth={2} />
      {text}
    </div>
  )
}

export function HouseModel({ onReady }) {
  const { scene } = useGLTF('/untitled4444.glb')
  const { devices, mode, notifs, sensor, sensorRuangan, authRole, onlineUsers, hideNotif } = useHAOStore()
  const { toggleDevice } = useDeviceStatus()
  const originalMaterials = useRef({})

  // State untuk menyimpan posisi world mesh Fan dan Lampu — diambil dari GLB runtime
  const [meshPositions, setMeshPositions] = useState({})

  useEffect(() => {
    if (scene) onReady?.()
  }, [scene])

  // Clone semua material asli
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        originalMaterials.current[obj.uuid] = obj.material.clone()
      }
    })
  }, [scene])

  // ── Extract posisi world dari setiap mesh Fan_* dan Lampu_* ──────────────
  useEffect(() => {
    const positions = {}
    const worldPos  = new THREE.Vector3()
    scene.traverse((obj) => {
      const deviceKey = DEVICE_MESH_MAP[obj.name]
      if (!deviceKey) return
      // getWorldPosition mengambil posisi absolut setelah transform parent
      obj.getWorldPosition(worldPos)
      // Tambah offset Y kecil agar label muncul di atas mesh
      const yOffset = deviceKey.startsWith('fan') ? 0.18 : 0.12
      positions[deviceKey] = [worldPos.x, worldPos.y + yOffset, worldPos.z]
    })
    setMeshPositions(positions)
  }, [scene])

  // ── Update emissive material sesuai status ON/OFF ─────────────────────────
  useEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return
      const deviceKey = DEVICE_MESH_MAP[obj.name]
      if (!deviceKey) return
      const isOn = devices[deviceKey] === 'ON'
      const orig = originalMaterials.current[obj.uuid]
      if (!orig) return
      const mat = orig.clone()
      if (deviceKey.startsWith('lampu')) {
        mat.emissive          = isOn ? new THREE.Color('#ffe8a0') : new THREE.Color('#000000')
        mat.emissiveIntensity = isOn ? 1.5 : 0
      }
      if (deviceKey.startsWith('fan')) {
        mat.emissive          = isOn ? new THREE.Color('#88ddff') : new THREE.Color('#000000')
        mat.emissiveIntensity = isOn ? 0.8 : 0
      }
      obj.material = mat
    })
  }, [devices, scene])

  const canInteract = authRole === 'admin' || authRole === 'guest'

  const handleMeshClick = (e) => {
    e.stopPropagation()
    const deviceKey = DEVICE_MESH_MAP[e.object.name]
    if (!deviceKey || mode !== 'manual' || !canInteract) return
    toggleDevice(deviceKey)
  }

  const handlePointerOver = (e) => {
    if (DEVICE_MESH_MAP[e.object.name] && mode === 'manual' && canInteract)
      document.body.style.cursor = 'pointer'
  }
  const handlePointerOut = () => { document.body.style.cursor = 'default' }

  // ── Style helpers ─────────────────────────────────────────────────────────
  const getTempStyle = (suhu) => {
    const isHot  = suhu > 35
    const isWarm = suhu > 29
    return {
      color: isHot ? '#D85A30' : isWarm ? '#EF9F27' : '#1D9E75',
      bg:    isHot ? 'rgba(216,90,48,0.88)' : isWarm ? 'rgba(239,159,39,0.88)' : 'rgba(29,158,117,0.88)',
      Icon:  isHot ? Flame : isWarm ? Thermometer : Snowflake,
    }
  }

  const gasVal   = sensor.gas ?? 0
  const gasStyle = {
    color:   gasVal > 100 ? '#E24B4A' : gasVal > 40 ? '#EF9F27' : '#1D9E75',
    bg:      gasVal > 100 ? 'rgba(226,75,74,0.88)' : gasVal > 40 ? 'rgba(239,159,39,0.88)' : 'rgba(29,158,117,0.88)',
    GasIcon: gasVal > 100 ? Skull : gasVal > 40 ? AlertTriangle : Wind,
    label:   gasVal > 100 ? 'Bahaya!' : gasVal > 40 ? 'Waspada' : 'Aman',
  }

  return (
    <group>
      <primitive
        object={scene}
        onClick={handleMeshClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* ── Lampu point lights ── */}
      {ROOM_LIGHTS.map(({ key, pos, color, dist }) => (
        <RoomLight
          key={key}
          position={pos}
          isOn={devices[key] === 'ON'}
          color={color}
          distance={dist}
        />
      ))}

      {/* ── Indikator Lampu — posisi diambil dari mesh GLB ── */}
      {Object.entries(DEVICE_MESH_MAP)
        .filter(([, key]) => key.startsWith('lampu'))
        .map(([, deviceKey]) => {
          const pos   = meshPositions[deviceKey]
          const isOn  = devices[deviceKey] === 'ON'
          const label = DEVICE_LABELS[deviceKey]
          if (!pos) return null
          const lampColor = '#ffe8a0'
          const lampBg    = isOn ? 'rgba(180,140,40,0.92)' : 'rgba(60,60,80,0.85)'
          const lampBorder = isOn ? '#ffe8a0' : 'rgba(255,255,255,0.2)'
          return (
            <Html key={deviceKey} position={pos} center zIndexRange={[0, 100]} style={{ pointerEvents: 'none' }}>
              {hideNotif ? (
                <div
                  title={`${label}: ${isOn ? 'ON' : 'OFF'}`}
                  style={{
                    width: 12, height: 12,
                    borderRadius: '50%',
                    background: isOn ? lampBg : 'rgba(60,60,80,0.85)',
                    border: `2px solid ${isOn ? lampColor : 'rgba(255,255,255,0.2)'}`,
                    boxShadow: isOn ? `0 0 8px ${lampColor}cc` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Lightbulb size={6} strokeWidth={3} color={isOn ? '#fff' : 'rgba(255,255,255,0.3)'} />
                </div>
              ) : (
                <div style={{
                  background:   isOn ? lampBg : 'rgba(30,30,50,0.82)',
                  color:        isOn ? '#fff' : 'rgba(255,255,255,0.4)',
                  padding:      '3px 9px',
                  borderRadius: 8,
                  fontSize:     11,
                  fontFamily:   'sans-serif',
                  whiteSpace:   'nowrap',
                  border:       `1px solid ${lampBorder}`,
                  fontWeight:   600,
                  boxShadow:    isOn ? `0 0 8px ${lampColor}55` : 'none',
                  display:      'flex', alignItems: 'center', gap: 4,
                }}>
                  <Lightbulb size={11} strokeWidth={2} />
                  {isOn ? 'ON' : 'OFF'}
                </div>
              )}
            </Html>
          )
        })}

      {/* ── Indikator Kipas — posisi diambil dari mesh GLB ── */}
      {Object.entries(DEVICE_MESH_MAP)
        .filter(([, key]) => key.startsWith('fan'))
        .map(([, deviceKey]) => {
          const pos   = meshPositions[deviceKey]
          const isOn  = devices[deviceKey] === 'ON'
          const label = DEVICE_LABELS[deviceKey]
          if (!pos) return null
          const fanColor = '#88ddff'
          const fanBg    = isOn ? 'rgba(30,120,180,0.92)' : 'rgba(60,60,80,0.85)'
          const fanBorder = isOn ? fanColor : 'rgba(255,255,255,0.2)'
          return (
            <Html key={deviceKey} position={pos} center zIndexRange={[0, 100]} style={{ pointerEvents: 'none' }}>
              {hideNotif ? (
                <div
                  title={`${label}: ${isOn ? 'ON' : 'OFF'}`}
                  style={{
                    width: 12, height: 12,
                    borderRadius: '50%',
                    background: isOn ? fanBg : 'rgba(60,60,80,0.85)',
                    border: `2px solid ${isOn ? fanColor : 'rgba(255,255,255,0.2)'}`,
                    boxShadow: isOn ? `0 0 8px ${fanColor}cc` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Wind size={6} strokeWidth={3} color={isOn ? '#fff' : 'rgba(255,255,255,0.3)'} />
                </div>
              ) : (
                <div style={{
                  background:   isOn ? fanBg : 'rgba(30,30,50,0.82)',
                  color:        isOn ? '#fff' : 'rgba(255,255,255,0.4)',
                  padding:      '3px 9px',
                  borderRadius: 8,
                  fontSize:     11,
                  fontFamily:   'sans-serif',
                  whiteSpace:   'nowrap',
                  border:       `1px solid ${fanBorder}`,
                  fontWeight:   600,
                  boxShadow:    isOn ? `0 0 8px ${fanColor}55` : 'none',
                  display:      'flex', alignItems: 'center', gap: 4,
                }}>
                  <Wind size={11} strokeWidth={2} />
                  {isOn ? 'ON' : 'OFF'}
                </div>
              )}
            </Html>
          )
        })}

      {/* ── Label suhu per ruangan — posisi dari mesh DHT di Blender ── */}
      {ROOM_TEMP_LABELS.map(({ key, label, pos }) => {
        const suhu = sensorRuangan?.[key]?.suhu ?? sensor.suhu
        const { color, bg, Icon } = getTempStyle(suhu)
        return (
          <Html key={key} position={pos} center zIndexRange={[0, 100]} style={{ pointerEvents: 'none' }}>
            <DeviceIndicator
              label={label}
              isHidden={hideNotif}
              color={color}
              bg={bg}
              icon={Icon}
              text={`${suhu.toFixed(1)}°C`}
              tooltip={`${label}: ${suhu.toFixed(1)}°C`}
            />
          </Html>
        )
      })}

      {/* ── Label gas — posisi dari mesh Gas di Blender ── */}
      <Html position={GAS_POS} center zIndexRange={[0, 100]} style={{ pointerEvents: 'none' }}>
        <DeviceIndicator
          label="Gas"
          isHidden={hideNotif}
          color={gasStyle.color}
          bg={gasStyle.bg}
          icon={gasStyle.GasIcon}
          text={gasStyle.label}
          tooltip={`Gas: ${gasStyle.label} (${gasVal})`}
        />
      </Html>

      {/* ── Avatar user online ── */}
      {onlineUsers.map((user) => (
        <Html
          key={user.uid}
          position={user.pos ?? [0, 0.05, 2.0]}
          center
          zIndexRange={[0, 100]}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           3,
            animation:     'hao-float 2.5s ease-in-out infinite',
          }}>
            <div style={{
              width:          32, height: 32,
              borderRadius:   '50%',
              background:     user.role === 'admin'
                ? 'linear-gradient(135deg, #1D9E75, #185FA5)'
                : 'linear-gradient(135deg, #63b8ff, #9b59ff)',
              border:         `2px solid ${user.role === 'admin' ? '#1D9E75' : '#63b8ff'}`,
              boxShadow:      `0 0 10px ${user.role === 'admin' ? '#1D9E7588' : '#63b8ff88'}`,
              display:        'flex', alignItems: 'center', justifyContent: 'center',
              fontSize:       14,
            }}>
              {user.role === 'admin'
                ? <Crown size={14} color="white" strokeWidth={2} />
                : <User  size={14} color="white" strokeWidth={2} />}
            </div>
            <div style={{
              background:     'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)',
              color:          user.role === 'admin' ? '#1D9E75' : '#63b8ff',
              fontSize:       9, fontWeight: 700, fontFamily: 'sans-serif',
              padding:        '2px 7px', borderRadius: 10,
              border:         `1px solid ${user.role === 'admin' ? 'rgba(29,158,117,0.4)' : 'rgba(99,184,255,0.4)'}`,
              whiteSpace:     'nowrap',
            }}>
              {user.label}
            </div>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 5px #22c55e',
            }} />
          </div>
          <style>{`
            @keyframes hao-float {
              0%, 100% { transform: translateY(0px); }
              50%       { transform: translateY(-5px); }
            }
          `}</style>
        </Html>
      ))}

      {/* ── Notif Sims ── */}
      {notifs.map((notif) => (
        <SimsNotif key={notif.id} notif={notif} />
      ))}
    </group>
  )
}

useGLTF.preload('/untitled4444.glb')
