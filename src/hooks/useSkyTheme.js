import { useMemo } from 'react'
import { useHAOStore } from '../store'

// Menentukan warna background Canvas dan intensitas cahaya matahari
// berdasarkan jam real + nilai LDR dari sensor
const SKY_PHASES = [
  // [jamMulai, jamAkhir, bgColor, ambientIntensity, sunColor]
  { from:  0, to:  5, bg: '#0a0e1a', ambient: 0.05, sun: '#1a2040' }, // tengah malam
  { from:  5, to:  7, bg: '#1e3a5f', ambient: 0.2,  sun: '#4a7fa8' }, // subuh
  { from:  7, to: 10, bg: '#87ceeb', ambient: 0.7,  sun: '#fff5d6' }, // pagi
  { from: 10, to: 15, bg: '#6db3e8', ambient: 1.0,  sun: '#ffffff' }, // siang
  { from: 15, to: 18, bg: '#f4a460', ambient: 0.8,  sun: '#ffcc66' }, // sore
  { from: 18, to: 19, bg: '#ff7043', ambient: 0.4,  sun: '#ff8c42' }, // maghrib
  { from: 19, to: 21, bg: '#2c3e6e', ambient: 0.15, sun: '#3d5a8a' }, // senja
  { from: 21, to: 24, bg: '#0a0e1a', ambient: 0.05, sun: '#1a2040' }, // malam
]

export function useSkyTheme() {
  const { sensor } = useHAOStore()
  const jam = new Date().getHours()

  return useMemo(() => {
    const phase = SKY_PHASES.find(p => jam >= p.from && jam < p.to)
      || SKY_PHASES[0]

    // Koreksi LDR: jika sensor bilang gelap padahal harusnya siang
    // → kemungkinan mendung, turunkan ambient sedikit
    let ambientFinal = phase.ambient
    if (phase.ambient > 0.5 && sensor.ldr < 200) {
      ambientFinal = phase.ambient * 0.6 // mendung
    }

    return {
      bgColor:   phase.bg,
      ambient:   ambientFinal,
      sunColor:  phase.sun,
      isMalam:   phase.ambient < 0.2,
      isSiang:   phase.ambient >= 0.8,
    }
  }, [jam, sensor.ldr])
}