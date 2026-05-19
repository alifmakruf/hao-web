import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useSkyTheme } from '../../hooks/useSkyTheme'

const WEATHER_BG = {
  sunny:  '#6db3e8',
  cloudy: '#8899aa',
  rainy:  '#4a5a6a',
  night:  '#0a0e1a',
}

export function SkyBackground({ weatherOverride = 'auto' }) {
  const { gl, scene } = useThree()
  const { bgColor } = useSkyTheme()

  useEffect(() => {
    const finalColor = weatherOverride !== 'auto'
      ? WEATHER_BG[weatherOverride]
      : bgColor
    scene.background = new THREE.Color(finalColor)
    scene.fog = new THREE.FogExp2(finalColor, 0.04)
  }, [bgColor, weatherOverride, scene])

  return null
}