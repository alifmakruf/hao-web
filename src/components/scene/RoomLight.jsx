import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Satu komponen ini = satu bohlam di satu ruangan
// isOn berubah dari Firebase → intensity lerp halus seperti nyala lampu asli
export function RoomLight({
  position = [0, 2.5, 0],
  isOn      = false,
  color     = '#ffe8a0',   // warm white default
  distance  = 8,           // jangkauan cahaya (meter scene)
  intensity = 3.5,         // intensitas saat ON
}) {
  const lightRef  = useRef()
  const meshRef   = useRef()
  const targetRef = useRef(0)

  // Update target setiap kali isOn berubah
  targetRef.current = isOn ? intensity : 0

  // useFrame = dipanggil tiap frame (60fps)
  // Lerp membuat transisi ON/OFF terasa halus, bukan langsung snap
  useFrame(() => {
    if (!lightRef.current || !meshRef.current) return

    const current  = lightRef.current.intensity
    const target   = targetRef.current
    const lerped   = current + (target - current) * 0.08

    lightRef.current.intensity                = lerped
    meshRef.current.material.emissiveIntensity = lerped / intensity * 2
  })

  return (
    <group position={position}>
      {/* Cahaya utama — menerangi lantai, dinding, furniture */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={0}       // mulai dari 0, lerp ke target
        distance={distance}
        decay={2}           // physically based decay
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />

      {/* Mesh kecil bohlam — bersinar saat ON */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={color}
          emissiveIntensity={0}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}