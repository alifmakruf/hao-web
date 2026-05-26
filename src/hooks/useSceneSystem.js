import { ref, set } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'
import { publishCommand, publishMode } from './useMQTT'

const SCENE_CONFIGS = {
  morning: {
    label: 'Pagi', icon: '🌅', desc: 'Semua lampu nyala, kipas mati',
    mode: 'manual',
    devices: {
      lampu_ruangtamu: 'ON', lampu_dapurdankeluarga: 'ON',
      lampu_kamar1: 'ON', lampu_kamar2: 'ON', lampu_kamar3: 'ON',
      lampu_teras: 'ON', lampu_gerbang: 'ON', lampu_garasi: 'OFF',
      fan_ruangtamu: 'OFF', fan_kamar: 'OFF', fan_dapur: 'OFF',
    },
  },
  sleep: {
    label: 'Tidur', icon: '🌙', desc: 'Semua lampu mati, kipas kamar nyala',
    mode: 'manual',
    devices: {
      lampu_ruangtamu: 'OFF', lampu_dapurdankeluarga: 'OFF',
      lampu_kamar1: 'OFF', lampu_kamar2: 'OFF', lampu_kamar3: 'OFF',
      lampu_teras: 'OFF', lampu_gerbang: 'ON', lampu_garasi: 'OFF',
      fan_ruangtamu: 'OFF', fan_kamar: 'ON', fan_dapur: 'OFF',
    },
  },
  movie: {
    label: 'Nonton', icon: '🎬', desc: 'Lampu redup, kipas ruang tamu nyala',
    mode: 'manual',
    devices: {
      lampu_ruangtamu: 'OFF', lampu_dapurdankeluarga: 'OFF',
      lampu_kamar1: 'OFF', lampu_kamar2: 'OFF', lampu_kamar3: 'OFF',
      lampu_teras: 'OFF', lampu_gerbang: 'ON', lampu_garasi: 'OFF',
      fan_ruangtamu: 'ON', fan_kamar: 'OFF', fan_dapur: 'OFF',
    },
  },
  leaving: {
    label: 'Keluar Rumah', icon: '🚪', desc: 'Semua perangkat mati',
    mode: 'manual',
    devices: {
      lampu_ruangtamu: 'OFF', lampu_dapurdankeluarga: 'OFF',
      lampu_kamar1: 'OFF', lampu_kamar2: 'OFF', lampu_kamar3: 'OFF',
      lampu_teras: 'OFF', lampu_gerbang: 'OFF', lampu_garasi: 'OFF',
      fan_ruangtamu: 'OFF', fan_kamar: 'OFF', fan_dapur: 'OFF',
    },
  },
  panic: {
    label: 'Darurat', icon: '🚨', desc: 'Semua lampu nyala maksimal',
    mode: 'manual',
    devices: {
      lampu_ruangtamu: 'ON', lampu_dapurdankeluarga: 'ON',
      lampu_kamar1: 'ON', lampu_kamar2: 'ON', lampu_kamar3: 'ON',
      lampu_teras: 'ON', lampu_gerbang: 'ON', lampu_garasi: 'ON',
      fan_ruangtamu: 'ON', fan_kamar: 'ON', fan_dapur: 'ON',
    },
  },
  study: {
    label: 'Belajar', icon: '📚', desc: 'Lampu kamar nyala, kipas nyala',
    mode: 'manual',
    devices: {
      lampu_ruangtamu: 'OFF', lampu_dapurdankeluarga: 'OFF',
      lampu_kamar1: 'ON', lampu_kamar2: 'ON', lampu_kamar3: 'ON',
      lampu_teras: 'OFF', lampu_gerbang: 'OFF', lampu_garasi: 'OFF',
      fan_ruangtamu: 'OFF', fan_kamar: 'ON', fan_dapur: 'OFF',
    },
  },
}

export { SCENE_CONFIGS }

export function useSceneSystem() {
  const { setDevices, setMode, setActiveScene, activeScene } = useHAOStore()

  const applyScene = async (sceneId) => {
    try {
      const config = SCENE_CONFIGS[sceneId]
      if (!config) {
        console.warn(`[Scene] Scene tidak dikenal: ${sceneId}`)
        return false
      }

      // 1. Update store lokal dulu (optimistic)
      setDevices(config.devices)
      setMode('manual')
      setActiveScene(sceneId)

      // 2. Tulis semua device + scene ke Firebase sekaligus
      // Ini yang mencegah n8n override — n8n baca mode='manual' → skip
      try {
        const updates = {
          ...config.devices,
          mode:        'manual',
          activeScene: sceneId,
          updatedAt:   Date.now(),
        }
        await set(ref(db, 'hao/status'), updates)
      } catch (err) {
        console.warn('[Scene] Gagal tulis Firebase:', err.message)
        // Tetap lanjut — MQTT masih bisa jalan
      }

      // 3. Kirim tiap device ke MQTT (untuk ESP32)
      Object.entries(config.devices).forEach(([device, state]) => {
        try {
          publishCommand(device, state)
        } catch (err) {
          console.warn(`[Scene] Gagal publish ${device}:`, err.message)
        }
      })

      // 4. Kirim mode manual ke MQTT → n8n baca → skip logic
      try {
        publishMode('manual')
      } catch (err) {
        console.warn('[Scene] Gagal publish mode:', err.message)
      }

      console.log(`[Scene] Aktif: ${sceneId}`)
      return true

    } catch (err) {
      console.error('[Scene] Error saat apply scene:', err.message)
      return false
    }
  }

  const clearScene = async () => {
    try {
      setActiveScene(null)
      // Hapus activeScene di Firebase juga
      await set(ref(db, 'hao/status/activeScene'), null)
    } catch (err) {
      console.warn('[Scene] Gagal clear scene:', err.message)
    }
  }

  return { applyScene, clearScene, activeScene, SCENE_CONFIGS }
}