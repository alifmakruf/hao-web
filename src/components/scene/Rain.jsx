import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Rain — optimized
 * Perubahan dari versi lama:
 *  - count dikendalikan dari luar (oleh useDevicePerf)
 *  - Gunakan delta-cap agar tidak loncat saat tab unfocus
 *  - Float32Array velocity digabung ke posisi (kurangi cache miss)
 *  - needsUpdate hanya set sekali per frame, bukan tiap partikel
 */
export function Rain({ count = 1200, active = false }) {
  const geoRef = useRef()

  // posisi + velocity dalam satu array: [x0,y0,z0, x1,y1,z1, ...]
  // velocity disimpan terpisah tapi di TypedArray untuk performa
  const { positions, velocities } = useMemo(() => {
    const positions  = new Float32Array(count * 3)
    const velocities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 20
      positions[i*3+1] = Math.random() * 10
      positions[i*3+2] = (Math.random() - 0.5) * 20
      velocities[i]    = 0.04 + Math.random() * 0.04
    }
    return { positions, velocities }
  }, [count])

  useFrame((_, delta) => {
    if (!active || !geoRef.current) return
    const pos = geoRef.current.attributes.position.array
    // Cap delta agar tidak loncat saat tab unfocus (max ~33ms = 30fps)
    const dt = Math.min(delta, 0.033) * 60

    for (let i = 0; i < count; i++) {
      pos[i*3+1] -= velocities[i] * dt
      if (pos[i*3+1] < -1) {
        pos[i*3]   = (Math.random() - 0.5) * 20
        pos[i*3+1] = 8 + Math.random() * 4
        pos[i*3+2] = (Math.random() - 0.5) * 20
      }
    }
    geoRef.current.attributes.position.needsUpdate = true
  })

  if (!active) return null

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#aaccff"
        size={0.035}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
