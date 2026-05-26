import { useHAOStore } from '../store'
import { publishCommand, publishMode } from './useMQTT'

// Definisi tiap scene — device apa yang ON/OFF
const SCENE_CONFIGS = {
  morning: {
    label: 'Pagi',
    icon: '🌅',
    desc: 'Semua lampu nyala, kipas mati',
    mode: 'manual',
    devices: {
      lampu_ruangtamu:        'ON',
      lampu_dapurdankeluarga: 'ON',
      lampu_kamar1:           'ON',
      lampu_kamar2:           'ON',
      lampu_kamar3:           'ON',
      lampu_teras:            'ON',
      lampu_gerbang:          'ON',
      lampu_garasi:           'OFF',
      fan_ruangtamu:          'OFF',
      fan_kamar:              'OFF',
      fan_dapur:              'OFF',
    },
  },
  sleep: {
    label: 'Tidur',
    icon: '🌙',
    desc: 'Semua lampu mati, kipas kamar nyala',
    mode: 'manual',
    devices: {
      lampu_ruangtamu:        'OFF',
      lampu_dapurdankeluarga: 'OFF',
      lampu_kamar1:           'OFF',
      lampu_kamar2:           'OFF',
      lampu_kamar3:           'OFF',
      lampu_teras:            'OFF',
      lampu_gerbang:          'ON',
      lampu_garasi:           'OFF',
      fan_ruangtamu:          'OFF',
      fan_kamar:              'ON',
      fan_dapur:              'OFF',
    },
  },
  movie: {
    label: 'Nonton',
    icon: '🎬',
    desc: 'Lampu redup, kipas ruang tamu nyala',
    mode: 'manual',
    devices: {
      lampu_ruangtamu:        'OFF',
      lampu_dapurdankeluarga: 'OFF',
      lampu_kamar1:           'OFF',
      lampu_kamar2:           'OFF',
      lampu_kamar3:           'OFF',
      lampu_teras:            'OFF',
      lampu_gerbang:          'ON',
      lampu_garasi:           'OFF',
      fan_ruangtamu:          'ON',
      fan_kamar:              'OFF',
      fan_dapur:              'OFF',
    },
  },
  leaving: {
    label: 'Keluar Rumah',
    icon: '🚪',
    desc: 'Semua perangkat mati',
    mode: 'manual',
    devices: {
      lampu_ruangtamu:        'OFF',
      lampu_dapurdankeluarga: 'OFF',
      lampu_kamar1:           'OFF',
      lampu_kamar2:           'OFF',
      lampu_kamar3:           'OFF',
      lampu_teras:            'OFF',
      lampu_gerbang:          'OFF',
      lampu_garasi:           'OFF',
      fan_ruangtamu:          'OFF',
      fan_kamar:              'OFF',
      fan_dapur:              'OFF',
    },
  },
  panic: {
    label: 'Darurat',
    icon: '🚨',
    desc: 'Semua lampu nyala maksimal',
    mode: 'manual',
    devices: {
      lampu_ruangtamu:        'ON',
      lampu_dapurdankeluarga: 'ON',
      lampu_kamar1:           'ON',
      lampu_kamar2:           'ON',
      lampu_kamar3:           'ON',
      lampu_teras:            'ON',
      lampu_gerbang:          'ON',
      lampu_garasi:           'ON',
      fan_ruangtamu:          'ON',
      fan_kamar:              'ON',
      fan_dapur:              'ON',
    },
  },
  study: {
    label: 'Belajar',
    icon: '📚',
    desc: 'Lampu kamar nyala, kipas nyala',
    mode: 'manual',
    devices: {
      lampu_ruangtamu:        'OFF',
      lampu_dapurdankeluarga: 'OFF',
      lampu_kamar1:           'ON',
      lampu_kamar2:           'ON',
      lampu_kamar3:           'ON',
      lampu_teras:            'OFF',
      lampu_gerbang:          'OFF',
      lampu_garasi:           'OFF',
      fan_ruangtamu:          'OFF',
      fan_kamar:              'ON',
      fan_dapur:              'OFF',
    },
  },
}

export { SCENE_CONFIGS }

export function useSceneSystem() {
  const { setDevices, setMode, setActiveScene, activeScene } = useHAOStore()

  const applyScene = (sceneId) => {
    try {
      // Cek scene valid
      const config = SCENE_CONFIGS[sceneId]
      if (!config) {
        console.warn(`[Scene] Scene tidak dikenal: ${sceneId}`)
        return false
      }

      // Update store lokal dulu (optimistic)
      setDevices(config.devices)
      setMode(config.mode)
      setActiveScene(sceneId)

      // Kirim tiap device ke MQTT
      Object.entries(config.devices).forEach(([device, state]) => {
        try {
          publishCommand(device, state)
        } catch (err) {
          console.warn(`[Scene] Gagal publish ${device}:`, err.message)
        }
      })

      // Kirim mode ke MQTT
      try {
        publishMode(config.mode)
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

  const clearScene = () => {
    try {
      setActiveScene(null)
    } catch (err) {
      console.error('[Scene] Error saat clear scene:', err.message)
    }
  }

  return { applyScene, clearScene, activeScene, SCENE_CONFIGS }
}