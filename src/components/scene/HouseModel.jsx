import { useGLTF, Html } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { RoomLight } from './RoomLight'
import { SimsNotif } from './SimsNotif'
import { useHAOStore } from '../../store'
import { useDeviceStatus } from '../../hooks/useDeviceStatus'

// Peta nama mesh Blender → device key di Firebase
// Setelah kamu rename mesh di Blender, sesuaikan di sini
const DEVICE_MESH_MAP = {
  'Lampu_RuangTamu': 'lampu_ruangtamu',
  'Lampu_Kamar1':    'lampu_kamar1',
  'Lampu_Kamar2':    'lampu_kamar2',
  'Lampu_Dapur':     'lampu_dapur',
  'Fan_RuangTamu':   'fan_ruangtamu',
  'Fan_Kamar1':      'fan_kamar1',
}

// Posisi PointLight per ruangan [x, y, z]
// Sesuaikan dengan koordinat ruangan di GLB kamu
const ROOM_LIGHTS = [
  { key: 'lampu_ruangtamu', pos: [0,   2.5, 0],    color: '#ffe8a0', dist: 8  },
  { key: 'lampu_kamar1',    pos: [4,   2.5, -2],   color: '#ffd080', dist: 6  },
  { key: 'lampu_kamar2',    pos: [-3,  2.5, -2],   color: '#ffd080', dist: 6  },
  { key: 'lampu_dapur',     pos: [-1,  2.5, 3],    color: '#fff0c0', dist: 5  },
]

export function HouseModel() {
  const { scene } = useGLTF('/untitled4444.glb')
  const { devices, mode, notifs } = useHAOStore()
  const { toggleDevice } = useDeviceStatus()
  const originalMaterials = useRef({})

  // Simpan material asli sekali saat load
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        originalMaterials.current[obj.uuid] = obj.material.clone()
      }
    })
  }, [scene])

  // Update emissive tiap kali status device berubah
  useEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return
      const deviceKey = DEVICE_MESH_MAP[obj.name]
      if (!deviceKey) return

      const isOn  = devices[deviceKey] === 'ON'
      const orig  = originalMaterials.current[obj.uuid]
      if (!orig) return

      // Clone material agar tidak mutate yang asli
      const mat = orig.clone()
      if (deviceKey.startsWith('lampu')) {
        mat.emissive         = isOn ? new THREE.Color('#ffe8a0') : new THREE.Color('#000000')
        mat.emissiveIntensity = isOn ? 1.5 : 0
      }
      if (deviceKey.startsWith('fan')) {
        mat.emissive         = isOn ? new THREE.Color('#88ddff') : new THREE.Color('#000000')
        mat.emissiveIntensity = isOn ? 0.8 : 0
      }
      obj.material = mat
    })
  }, [devices, scene])

  // Handle klik mesh — hanya aktif di mode manual
  const handleMeshClick = (e) => {
    e.stopPropagation()
    const deviceKey = DEVICE_MESH_MAP[e.object.name]
    if (!deviceKey) return
    if (mode !== 'manual') {
      // Tampilkan hint bahwa mode bukan manual
      console.log('Switch ke mode manual dulu untuk kontrol manual')
      return
    }
    toggleDevice(deviceKey)
  }

  // Ubah cursor saat hover mesh yang bisa diklik
  const handlePointerOver = (e) => {
    const deviceKey = DEVICE_MESH_MAP[e.object.name]
    if (deviceKey && mode === 'manual') {
      document.body.style.cursor = 'pointer'
    }
  }
  const handlePointerOut = () => {
    document.body.style.cursor = 'default'
  }

  return (
    <group>
      {/* Model 3D utama */}
      <primitive
        object={scene}
        onClick={handleMeshClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* PointLight per ruangan */}
      {ROOM_LIGHTS.map(({ key, pos, color, dist }) => (
        <RoomLight
          key={key}
          position={pos}
          isOn={devices[key] === 'ON'}
          color={color}
          distance={dist}
        />
      ))}

      {/* Label HTML floating — tampil di mode manual */}
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
              padding: '3px 8px',
              borderRadius: 8,
              fontSize: 11,
              fontFamily: 'sans-serif',
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

// Pre-load GLB saat module pertama kali diimport
useGLTF.preload('/untitled4444.glb')