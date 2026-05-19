import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Rain({ count = 2000, active = false }) {
  const meshRef = useRef()

  // Buat posisi titik hujan secara random sekali saja
  const { positions, velocities } = useMemo(() => {
    const positions  = new Float32Array(count * 3)
    const velocities = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 20   // x: spread lebar
      positions[i * 3 + 1] = Math.random() * 10             // y: mulai dari ketinggian random
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20   // z: spread lebar
      velocities[i]         = 0.04 + Math.random() * 0.04  // kecepatan jatuh tiap tetes
    }
    return { positions, velocities }
  }, [count])

  // Ref untuk geometry agar bisa update posisi tiap frame
  const geoRef = useRef()

  useFrame(() => {
    if (!active || !geoRef.current) return
    const pos = geoRef.current.attributes.position.array

    for (let i = 0; i < count; i++) {
      // Turunkan posisi Y
      pos[i * 3 + 1] -= velocities[i]

      // Kalau sudah di bawah lantai, reset ke atas dengan posisi X/Z baru
      if (pos[i * 3 + 1] < -1) {
        pos[i * 3 + 0] = (Math.random() - 0.5) * 20
        pos[i * 3 + 1] = 8 + Math.random() * 4
        pos[i * 3 + 2] = (Math.random() - 0.5) * 20
      }
    }
    geoRef.current.attributes.position.needsUpdate = true
  })

  if (!active) return null

  return (
    <points ref={meshRef}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#aaccff"
        size={0.035}
        transparent
        opacity={0.6}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  )
}