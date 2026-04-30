import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useSkyTheme } from '../../hooks/useSkyTheme'

// Mengubah background Canvas + ambient light berdasarkan jam + LDR
// Dipanggil sekali di dalam Canvas, bukan di luar
export function SkyBackground() {
  const { gl, scene } = useThree()
  const { bgColor, ambient, sunColor } = useSkyTheme()

  useEffect(() => {
    // Set background warna langit
    scene.background = new THREE.Color(bgColor)

    // Ambient light global sudah diatur lewat props di App.jsx
    // Di sini kita hanya update fog agar jauh terlihat kabur
    scene.fog = new THREE.FogExp2(bgColor, 0.04)
  }, [bgColor, scene])

  return null // komponen ini hanya side-effect, tidak render mesh
}