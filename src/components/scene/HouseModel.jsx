import { useGLTF, Html } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { RoomLight } from './RoomLight'
import { SimsNotif } from './SimsNotif'
import { useHAOStore } from '../../store'
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

const ROOM_LIGHTS = [
  { key: 'lampu_ruangtamu',        pos: [0.33,  0.38,  0.71],  color: '#ffe8a0', dist: 3.5 },
  { key: 'lampu_dapurdankeluarga', pos: [0.66,  0.38, -0.03],  color: '#fff0c0', dist: 3.5 },
  { key: 'lampu_kamar1',           pos: [-0.57, 0.38,  0.85],  color: '#ffd080', dist: 2.5 },
  { key: 'lampu_kamar2',           pos: [1.00,  0.38,  0.88],  color: '#ffd080', dist: 2.5 },
  { key: 'lampu_kamar3',           pos: [1.69,  0.38,  0.71],  color: '#ffd080', dist: 2.5 },
  { key: 'lampu_teras',            pos: [0.35,  0.38,  1.65],  color: '#ffe8a0', dist: 2.0 },
  { key: 'lampu_gerbang',          pos: [-1.30, 0.38,  1.65],  color: '#ffcc66', dist: 2.0 },
  { key: 'lampu_garasi',           pos: [-1.33, 0.38,  0.42],  color: '#fff0c0', dist: 3.0 },
]

export function HouseModel() {
  const { scene } = useGLTF('/untitled4444.glb')
  const { devices, mode, notifs } = useHAOStore()
  const { toggleDevice } = useDeviceStatus()
  const originalMaterials = useRef({})

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        originalMaterials.current[obj.uuid] = obj.material.clone()
      }
    })
  }, [scene])

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

  const handleMeshClick = (e) => {
    e.stopPropagation()
    const deviceKey = DEVICE_MESH_MAP[e.object.name]
    if (!deviceKey || mode !== 'manual') return
    toggleDevice(deviceKey)
  }

  const handlePointerOver = (e) => {
    if (DEVICE_MESH_MAP[e.object.name] && mode === 'manual')
      document.body.style.cursor = 'pointer'
  }
  const handlePointerOut = () => {
    document.body.style.cursor = 'default'
  }

  return (
    <group>
      <primitive
        object={scene}
        onClick={handleMeshClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {ROOM_LIGHTS.map(({ key, pos, color, dist }) => (
        <RoomLight
          key={key}
          position={pos}
          isOn={devices[key] === 'ON'}
          color={color}
          distance={dist}
        />
      ))}

      {/* Label lampu & fan — tampil di mode manual */}
      {mode === 'manual' && Object.entries(DEVICE_MESH_MAP).map(([meshName, deviceKey]) => {
        const light = ROOM_LIGHTS.find(l => l.key === deviceKey)
        if (!light) return null
        const isOn = devices[deviceKey] === 'ON'
        return (
          <Html
            key={deviceKey}
            position={[light.pos[0], light.pos[1] + 0.4, light.pos[2]]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: isOn ? 'rgba(255,220,100,0.9)' : 'rgba(0,0,0,0.7)',
              color: isOn ? '#412402' : '#ffffff',
              padding: '3px 8px', borderRadius: 8,
              fontSize: 11, fontFamily: 'sans-serif',
              whiteSpace: 'nowrap',
              border: `1px solid ${isOn ? '#EF9F27' : '#555'}`,
            }}>
              {deviceKey.startsWith('lampu') ? '💡' : '🌀'} {isOn ? 'ON' : 'OFF'}
            </div>
          </Html>
        )
      })}

      {/* Notifikasi ala The Sims */}
      {notifs.map((notif) => (
        <SimsNotif key={notif.id} notif={notif} />
      ))}
    </group>
  )
}

useGLTF.preload('/untitled4444.glb')