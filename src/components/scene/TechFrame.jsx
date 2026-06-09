// src/components/scene/TechFrame.jsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const BOX_MIN = new THREE.Vector3(-1.790687, -0.003219, -0.827536)
const BOX_MAX = new THREE.Vector3( 1.978574,  0.553367,  2.008524)

const PADDING  = 0.12
const FLOOR_Y  = -0.02

const MIN = new THREE.Vector3(BOX_MIN.x - PADDING, FLOOR_Y, BOX_MIN.z - PADDING)
const MAX = new THREE.Vector3(BOX_MAX.x + PADDING, FLOOR_Y, BOX_MAX.z + PADDING)

const W = MAX.x - MIN.x
const D = MAX.z - MIN.z
const L = Math.min(W, D) * 0.18

// Real center dari console log
const CENTER_X = 0.09394323825836182
const CENTER_Z = 0.5904941111803055

const MAX_RADIUS = Math.max(W, D) * 5.5

const CORNERS = [
  new THREE.Vector3(MIN.x, FLOOR_Y, MIN.z),
  new THREE.Vector3(MAX.x, FLOOR_Y, MIN.z),
  new THREE.Vector3(MAX.x, FLOOR_Y, MAX.z),
  new THREE.Vector3(MIN.x, FLOOR_Y, MAX.z),
]

const MID_POINTS = [
  new THREE.Vector3(CENTER_X, FLOOR_Y, MIN.z),
  new THREE.Vector3(CENTER_X, FLOOR_Y, MAX.z),
  new THREE.Vector3(MIN.x,    FLOOR_Y, CENTER_Z),
  new THREE.Vector3(MAX.x,    FLOOR_Y, CENTER_Z),
]

// ── Corner L lines ─────────────────────────────────────────────────────────
function cornerLines(corner, dirX, dirZ) {
  return [
    corner.clone(),
    corner.clone().add(new THREE.Vector3(dirX * L, 0, 0)),
    corner.clone(),
    corner.clone().add(new THREE.Vector3(0, 0, dirZ * L)),
  ]
}

const CORNER_POINTS = [
  ...cornerLines(CORNERS[0],  1,  1),
  ...cornerLines(CORNERS[1], -1,  1),
  ...cornerLines(CORNERS[2], -1, -1),
  ...cornerLines(CORNERS[3],  1, -1),
]

function CornerLines() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = []
    CORNER_POINTS.forEach(p => positions.push(p.x, p.y, p.z))
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return g
  }, [])
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
    </lineSegments>
  )
}

function OutlineRect() {
  const geo = useMemo(() => {
    const pts = [...CORNERS, CORNERS[0]]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  return (
    <line geometry={geo}>
      <lineBasicMaterial color="#7dd3fc" transparent opacity={0.18} depthWrite={false} />
    </line>
  )
}

// ── Land grid circular seukuran denah ─────────────────────────────────────
function LandGrid() {
  const geo = useMemo(() => {
    const pts   = []
    const RINGS = 5

    for (let col = -RINGS; col <= RINGS; col++) {
      const x    = CENTER_X + col * W
      const dxSq = (x - CENTER_X) ** 2
      const zH   = Math.sqrt(Math.max(0, MAX_RADIUS ** 2 - dxSq))
      if (zH <= 0) continue
      pts.push(
        new THREE.Vector3(x, FLOOR_Y, CENTER_Z - zH),
        new THREE.Vector3(x, FLOOR_Y, CENTER_Z + zH),
      )
    }

    for (let row = -RINGS; row <= RINGS; row++) {
      const z    = CENTER_Z + row * D
      const dzSq = (z - CENTER_Z) ** 2
      const xH   = Math.sqrt(Math.max(0, MAX_RADIUS ** 2 - dzSq))
      if (xH <= 0) continue
      pts.push(
        new THREE.Vector3(CENTER_X - xH, FLOOR_Y, z),
        new THREE.Vector3(CENTER_X + xH, FLOOR_Y, z),
      )
    }

    const g = new THREE.BufferGeometry()
    const positions = []
    pts.forEach(p => positions.push(p.x, p.y, p.z))
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return g
  }, [])

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#3b82f6" transparent opacity={0.10} depthWrite={false} />
    </lineSegments>
  )
}

// ── Lingkaran tepi land ────────────────────────────────────────────────────
function LandCircle() {
  const geo = useMemo(() => {
    const SEG = 128
    const pts = Array.from({ length: SEG + 1 }, (_, i) => {
      const a = (i / SEG) * Math.PI * 2
      return new THREE.Vector3(
        CENTER_X + Math.cos(a) * MAX_RADIUS,
        FLOOR_Y,
        CENTER_Z + Math.sin(a) * MAX_RADIUS,
      )
    })
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  return (
    <line geometry={geo}>
      <lineBasicMaterial color="#60a5fa" transparent opacity={0.25} depthWrite={false} />
    </line>
  )
}

// ── Garis sumbu tengah ─────────────────────────────────────────────────────
function AxisLines() {
  const geo = useMemo(() => {
    const pts = [
      new THREE.Vector3(CENTER_X - MAX_RADIUS, FLOOR_Y, CENTER_Z),
      new THREE.Vector3(CENTER_X + MAX_RADIUS, FLOOR_Y, CENTER_Z),
      new THREE.Vector3(CENTER_X, FLOOR_Y, CENTER_Z - MAX_RADIUS),
      new THREE.Vector3(CENTER_X, FLOOR_Y, CENTER_Z + MAX_RADIUS),
    ]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#60a5fa" transparent opacity={0.15} depthWrite={false} />
    </lineSegments>
  )
}

// ── Wave ripple dari tengah ke tepi ───────────────────────────────────────
function LandWave() {
  const WAVE_COUNT = 4
  const SEG        = 96

  const waveRefs = useRef(
    Array.from({ length: WAVE_COUNT }, () => ({
      meshRef: { current: null },
      posAttr: null,
    }))
  )

  const geos = useMemo(() =>
    Array.from({ length: WAVE_COUNT }, (_, i) => {
      const positions = new Float32Array((SEG + 1) * 3)
      const geo  = new THREE.BufferGeometry()
      const attr = new THREE.BufferAttribute(positions, 3)
      geo.setAttribute('position', attr)
      waveRefs.current[i].posAttr = attr
      return { geo, phase: i / WAVE_COUNT }
    })
  , [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    geos.forEach((wave, i) => {
      const ref = waveRefs.current[i]
      if (!ref.posAttr) return

      const progress = ((t * 0.25 + wave.phase) % 1.0)
      const radius   = progress * MAX_RADIUS

      // Rebuild posisi dari CENTER_X, CENTER_Z setiap frame
      const arr = ref.posAttr.array
      for (let j = 0; j <= SEG; j++) {
        const a = (j / SEG) * Math.PI * 2
        arr[j * 3 + 0] = CENTER_X + Math.cos(a) * radius
        arr[j * 3 + 1] = FLOOR_Y + 0.001
        arr[j * 3 + 2] = CENTER_Z + Math.sin(a) * radius
      }
      ref.posAttr.needsUpdate = true

      // Opacity fade in lalu fade out
      const mesh = ref.meshRef.current
      if (mesh) {
        const opacity = progress < 0.08
          ? (progress / 0.08) * 0.5
          : (1 - progress) * 0.5
        mesh.material.opacity = Math.max(0, opacity)
      }
    })
  })

  return (
    <>
      {geos.map((wave, i) => (
        <line
          key={i}
          ref={el => (waveRefs.current[i].meshRef.current = el)}
          geometry={wave.geo}
        >
          <lineBasicMaterial
            color="#60a5fa"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </line>
      ))}
    </>
  )
}

// ── Dot sudut pulse ────────────────────────────────────────────────────────
function CornerDot({ position }) {
  const meshRef = useRef()
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    meshRef.current.material.opacity =
      0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 1.8)
  })
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
    </mesh>
  )
}

function MidDot({ position }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.014, 6, 6]} />
      <meshBasicMaterial color="#7dd3fc" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  )
}

// ── Komponen utama ─────────────────────────────────────────────────────────
export function TechFrame() {
  return (
    <group>
      {/* Wave ripple dari tengah */}
      <LandWave />

      {/* Grid land */}
      <LandGrid />

      {/* Lingkaran tepi */}
      <LandCircle />

      {/* Sumbu tengah */}
      <AxisLines />

      {/* Outline keliling rumah */}
      <OutlineRect />

      {/* Garis L sudut */}
      <CornerLines />

      {/* Dot sudut pulse */}
      {CORNERS.map((c, i) => (
        <CornerDot key={i} position={[c.x, c.y, c.z]} />
      ))}

      {/* Dot tengah sisi */}
      {MID_POINTS.map((p, i) => (
        <MidDot key={i} position={[p.x, p.y, p.z]} />
      ))}
    </group>
  )
}