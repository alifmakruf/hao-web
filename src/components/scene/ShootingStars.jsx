// ShootingStars.jsx
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STAR_COUNT = 20

// Arah utama meteor shower — konsisten seperti di luar angkasa
const SHOWER_DIR = new THREE.Vector3(0.4, -1, 0.2).normalize()

function randomStar(fastSpawn = false) {
  // Spawn menyebar luas di langit — tidak terpusat
  const x = (Math.random() - 0.5) * 80
  const z = (Math.random() - 0.5) * 80
  const y = 20 + Math.random() * 15

  // Variasi kecil dari arah utama shower agar tidak seragam sempurna
  const spread = 0.08
  const vx = SHOWER_DIR.x + (Math.random() - 0.5) * spread
  const vy = SHOWER_DIR.y + (Math.random() - 0.5) * spread * 0.3
  const vz = SHOWER_DIR.z + (Math.random() - 0.5) * spread

  // Kecepatan bervariasi — ada yang cepat ada yang lambat
  const speed = 0.8 + Math.random() * 1.2

  return {
    x, y, z,
    vx: vx * speed,
    vy: vy * speed,
    vz: vz * speed,
    tailLength: 2.5 + Math.random() * 3.5,
    delay:   fastSpawn ? Math.random() * 1.2 : Math.random() * 6,
    timer:   0,
    opacity: 0,
    life:    0,
    maxLife: 1.2 + Math.random() * 1.0,
  }
}

export function ShootingStars({ active = false }) {
  const lineRef  = useRef()
  const starsRef = useRef(Array.from({ length: STAR_COUNT }, () => randomStar(false)))

  useEffect(() => {
    if (active) {
      starsRef.current = Array.from({ length: STAR_COUNT }, () => randomStar(true))
    }
  }, [active])

  const positions = useMemo(() => new Float32Array(STAR_COUNT * 2 * 3), [])
  const colors    = useMemo(() => new Float32Array(STAR_COUNT * 2 * 3), [])

  useFrame((_, delta) => {
    if (!lineRef.current) return

    const pos = lineRef.current.geometry.attributes.position.array
    const col = lineRef.current.geometry.attributes.color.array

    starsRef.current.forEach((star, si) => {
      const hi = si * 2
      const ti = si * 2 + 1

      if (!active) {
        for (const i of [hi, ti]) {
          pos[i*3]=0; pos[i*3+1]=-999; pos[i*3+2]=0
          col[i*3]=0; col[i*3+1]=0;    col[i*3+2]=0
        }
        return
      }

      star.timer += delta

      if (star.timer < star.delay) {
        for (const i of [hi, ti]) {
          pos[i*3]=0; pos[i*3+1]=-999; pos[i*3+2]=0
          col[i*3]=0; col[i*3+1]=0;    col[i*3+2]=0
        }
        return
      }

      star.x += star.vx * delta * 60
      star.y += star.vy * delta * 60
      star.z += star.vz * delta * 60
      star.life += delta

      // Fade in cepat, fade out halus di akhir
      const lifeRatio = star.life / star.maxLife
      if (lifeRatio < 0.1)      star.opacity = lifeRatio / 0.1
      else if (lifeRatio > 0.65) star.opacity = 1 - (lifeRatio - 0.65) / 0.35
      else                        star.opacity = 1.0
      star.opacity = Math.max(0, Math.min(1, star.opacity))

      // Head
      pos[hi*3]     = star.x
      pos[hi*3 + 1] = star.y
      pos[hi*3 + 2] = star.z

      // Tail
      const norm = Math.sqrt(star.vx**2 + star.vy**2 + star.vz**2) || 1
      pos[ti*3]     = star.x - (star.vx / norm) * star.tailLength
      pos[ti*3 + 1] = star.y - (star.vy / norm) * star.tailLength
      pos[ti*3 + 2] = star.z - (star.vz / norm) * star.tailLength

      // Head putih terang, tail gelap
      col[hi*3]     = 0.9  * star.opacity
      col[hi*3 + 1] = 0.95 * star.opacity
      col[hi*3 + 2] = 1.0  * star.opacity
      col[ti*3]     = 0
      col[ti*3 + 1] = 0
      col[ti*3 + 2] = 0

      // Reset — spawn ulang di posisi baru yang acak
      if (star.life >= star.maxLife || star.y < -10) {
        Object.assign(star, randomStar(false))
        star.delay   = Math.random() * 4
        star.timer   = 0
        star.opacity = 0
      }
    })

    lineRef.current.geometry.attributes.position.needsUpdate = true
    lineRef.current.geometry.attributes.color.needsUpdate    = true
  })

  return (
    <lineSegments ref={lineRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}