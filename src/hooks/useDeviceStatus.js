/**
 * useDeviceStatus.js
 */

import { useEffect } from 'react'
import { ref, onValue } from 'firebase/database'

import { db } from '../firebase'
import { useHAOStore } from '../store'

// IMPORT LANGSUNG
import {
  publishCommand,
  publishMode,
} from './useMQTT'

// DEVICE VALID
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

  // STORE
  const {
    setDevices,
    setSensor,
    setMode,
    setAlasan,
    setFirebaseConnected,
    toggleDeviceLocal,
  } = useHAOStore()

  // FIREBASE LISTENER
  useEffect(() => {

    if (!db) {
      console.warn('[Firebase] DB belum ada')
      return
    }

    let unsubStatus = () => {}
    let unsubSensor = () => {}

    try {

      // STATUS
      unsubStatus = onValue(
        ref(db, 'hao/status'),

        (snapshot) => {

          if (!snapshot.exists()) return

          const data = snapshot.val()

          const devices = {}

          DEVICE_KEYS.forEach((key) => {
            if (data[key] !== undefined) {
              devices[key] = data[key]
            }
          })

          // UPDATE DEVICE
          if (Object.keys(devices).length > 0) {

            setDevices((prev) => ({
              ...prev,
              ...devices,
            }))
          }

          // MODE
          if (data.mode) {
            setMode(data.mode)
          }

          // ALASAN
          if (data.alasan) {
            setAlasan(data.alasan)
          }

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
            ldr: Number(data.ldr ?? 0),
            gas: Number(data.gas ?? 0),
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

  // TOGGLE DEVICE
  const toggleDevice = (deviceKey) => {

    const state = useHAOStore.getState()

    // HANYA MANUAL
    if (state.mode !== 'manual') {

      console.warn('[HAO] Mode bukan manual')

      return
    }

    const currentState =
      state.devices?.[deviceKey]

    const newState =
      currentState === 'ON'
        ? 'OFF'
        : 'ON'

    // OPTIMISTIC UI
    toggleDeviceLocal(deviceKey)

    // MQTT
    publishCommand(deviceKey, newState)
  }

  // CHANGE MODE
  const changeMode = (newMode) => {

    // UPDATE UI DULU
    setMode(newMode)

    // MQTT
    publishMode(newMode)
  }

  return {
    toggleDevice,
    changeMode,
  }
}