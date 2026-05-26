import { useEffect } from 'react'
import { ref, onValue, set } from 'firebase/database'

import { db } from '../firebase'
import { useHAOStore } from '../store'

import {
  publishCommand,
  publishMode,
} from './useMQTT'

const DEVICE_KEYS = [
  'lampu_ruangtamu',
  'lampu_dapurdankeluarga',
  'lampu_kamar1',
  'lampu_kamar2',
  'lampu_kamar3',
  'lampu_teras',
  'lampu_gerbang',
  'lampu_garasi',
  'fan_ruangtamu',
  'fan_kamar',
  'fan_dapur',
]

export function useDeviceStatus() {

  const {
    setDevices,
    setSensor,
    setMode,
    setAlasan,
    setFirebaseConnected,
    toggleDeviceLocal,
  } = useHAOStore()

  useEffect(() => {
    if (!db) {
      console.warn('[Firebase] DB belum ada')
      return
    }

    let unsubStatus = () => {}
    let unsubSensor = () => {}

    try {

      // STATUS — baca semua termasuk mode dari Firebase
      unsubStatus = onValue(
        ref(db, 'hao/status'),
        (snapshot) => {
          if (!snapshot.exists()) return

          const data = snapshot.val()

          // Update devices
          const devices = {}
          DEVICE_KEYS.forEach((key) => {
            if (data[key] !== undefined) {
              devices[key] = data[key]
            }
          })

          if (Object.keys(devices).length > 0) {
            setDevices((prev) => ({ ...prev, ...devices }))
          }

          // Mode dari Firebase — ini single source of truth
          if (data.mode) setMode(data.mode)

          if (data.alasan) setAlasan(data.alasan)

          setFirebaseConnected(true)
        },
        (err) => {
          console.warn('[Firebase] Status error:', err.message)
          setFirebaseConnected(false)
        }
      )

      // SENSOR
      unsubSensor = onValue(
        ref(db, 'hao/sensor'),
        (snapshot) => {
          if (!snapshot.exists()) return
          const data = snapshot.val()
          setSensor({
            suhu: Number(data.suhu ?? 0),
            ldr:  Number(data.ldr  ?? 0),
            gas:  Number(data.gas  ?? 0),
          })
        },
        (err) => {
          console.warn('[Firebase] Sensor error:', err.message)
        }
      )

    } catch (err) {
      console.warn('[Firebase] Listener gagal:', err.message)
      setFirebaseConnected(false)
    }

    return () => {
      unsubStatus()
      unsubSensor()
    }

  }, [])

  // TOGGLE DEVICE — hanya di mode manual, langsung tulis Firebase
  const toggleDevice = async (deviceKey) => {
    const state = useHAOStore.getState()

    if (state.mode !== 'manual') {
      console.warn('[HAO] Mode bukan manual, toggle diabaikan')
      return
    }

    const currentState = state.devices?.[deviceKey]
    const newState     = currentState === 'ON' ? 'OFF' : 'ON'

    // Optimistic UI
    toggleDeviceLocal(deviceKey)

    // Tulis langsung ke Firebase
    try {
      await set(ref(db, `hao/status/${deviceKey}`), newState)
    } catch (err) {
      console.warn('[Firebase] Gagal toggle device:', err.message)
      // Rollback optimistic UI
      toggleDeviceLocal(deviceKey)
    }

    // MQTT juga
    publishCommand(deviceKey, newState)
  }

  // CHANGE MODE — tulis ke Firebase + MQTT
  const changeMode = async (newMode) => {
    // Optimistic UI
    setMode(newMode)

    // Tulis ke Firebase — n8n akan baca ini
    try {
      await set(ref(db, 'hao/status/mode'), newMode)
    } catch (err) {
      console.warn('[Firebase] Gagal simpan mode:', err.message)
    }

    // MQTT
    publishMode(newMode)
  }

  return {
    toggleDevice,
    changeMode,
  }
}