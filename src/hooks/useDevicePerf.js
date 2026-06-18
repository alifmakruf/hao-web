/**
 * useDevicePerf.js
 * Deteksi kapabilitas device sekali saat mount — hasilnya stabil sepanjang sesi.
 *
 * Tiga tier:
 *  'high'   — desktop / tablet powerful  → semua efek penuh
 *  'medium' — HP mid-range / tablet tua  → efek dikurangi tapi masih ada
 *  'low'    — HP entry-level / WebView   → efek minimal, prioritas fps
 *
 * Cara kerja:
 *  1. Cek pointer: none / coarse = touchscreen (mobile)
 *  2. Cek logical CPU cores (navigator.hardwareConcurrency)
 *  3. Cek devicePixelRatio — HP flagship sering > 2.5
 *  4. Cek deviceMemory (Chrome only, tapi berguna)
 *  5. Cek User-Agent sebagai fallback
 */

import { useMemo } from 'react'

function detectTier() {
  const isTouchPrimary =
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches

  const cores  = navigator.hardwareConcurrency || 4
  const dpr    = window.devicePixelRatio        || 1
  // deviceMemory dalam GB, hanya ada di Chrome/Android
  const mem    = navigator.deviceMemory         || 8

  // Sinyal low-end yang kuat
  const isLowEnd =
    (isTouchPrimary && cores <= 4 && mem <= 2) ||
    (isTouchPrimary && cores <= 2)

  // Sinyal mid-range: touch + cores sedang, atau desktop lama
  const isMid =
    isTouchPrimary ||
    (cores <= 4 && mem <= 4)

  if (isLowEnd) return 'low'
  if (isMid)    return 'medium'
  return 'high'
}

// Singleton — hitung sekali, cache di module level
let _cachedTier = null
function getTier() {
  if (!_cachedTier) _cachedTier = detectTier()
  return _cachedTier
}

/**
 * @returns {{
 *   tier: 'high'|'medium'|'low',
 *   isMobile: boolean,
 *   dpr: number,          // recommended DPR cap untuk Canvas
 *   starCount: number,    // jumlah bintang yang aman
 *   rainCount: number,    // jumlah titik hujan
 *   particleCount: number,// jumlah partikel sidebar
 *   useBlur: boolean,     // boleh pakai backdropFilter blur?
 *   useOrbBlur: boolean,  // boleh pakai filter:blur pada orbs?
 *   useShadow: boolean,   // boleh pakai shadow 3D?
 * }}
 */
export function useDevicePerf() {
  return useMemo(() => {
    const tier     = getTier()
    const isMobile = window.matchMedia('(pointer: coarse)').matches

    // DPR cap — kunci utama FPS di HP Retina
    // high: max 2.0, medium: max 1.5, low: max 1.0
    const rawDpr = window.devicePixelRatio || 1
    const dpr =
      tier === 'high'   ? Math.min(rawDpr, 2.0) :
      tier === 'medium' ? Math.min(rawDpr, 1.5) :
                          Math.min(rawDpr, 1.0)

    return {
      tier,
      isMobile,
      dpr,
      // Bintang
      starCount:     tier === 'high' ? 3000 : tier === 'medium' ? 1500 : 800,
      // Hujan
      rainCount:     tier === 'high' ? 2500 : tier === 'medium' ? 1200 : 600,
      // Partikel sidebar (per sisi)
      particleCount: tier === 'high' ? 12   : tier === 'medium' ? 7    : 4,
      // backdropFilter blur — skip di low, kurangi di medium
      useBlur:       tier !== 'low',
      // filter: blur pada ambient orbs — hanya high
      useOrbBlur:    tier === 'high',
      // Shadow 3D
      useShadow:     tier !== 'low',
    }
  }, [])
}
