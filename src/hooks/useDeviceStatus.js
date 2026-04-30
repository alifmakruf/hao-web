import { useEffect } from 'react'
import { ref, onValue, set } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'

// Hook ini melakukan dua hal:
// 1. Subscribe perubahan Firebase → update Zustand store
// 2. Expose fungsi untuk write ke Firebase (manual control)
export function useDeviceStatus() {
  const { setDevices, setSensor, setMode, setAlasan } = useHAOStore()

  useEffect(() => {
    // Subscribe status device (lampu, fan)
    const devicesRef = ref(db, 'hao/status')
    const unsubDevices = onValue(devicesRef, (snap) => {
      if (!snap.exists()) return
      const data = snap.val()
      setDevices({
        lampu_ruangtamu: data.lampu_ruangtamu ?? 'OFF',
        lampu_kamar1:    data.lampu_kamar1    ?? 'OFF',
        lampu_kamar2:    data.lampu_kamar2    ?? 'OFF',
        lampu_dapur:     data.lampu_dapur     ?? 'OFF',
        fan_ruangtamu:   data.fan_ruangtamu   ?? 'OFF',
        fan_kamar1:      data.fan_kamar1      ?? 'OFF',
      })
      if (data.mode)   setMode(data.mode)
      if (data.alasan) setAlasan(data.alasan)
    })

    // Subscribe data sensor
    const sensorRef = ref(db, 'hao/sensor')
    const unsubSensor = onValue(sensorRef, (snap) => {
      if (!snap.exists()) return
      setSensor(snap.val())
    })

    // Cleanup saat komponen unmount
    return () => {
      unsubDevices()
      unsubSensor()
    }
  }, [setDevices, setSensor, setMode, setAlasan])

  // Fungsi untuk control manual dari UI
  const toggleDevice = async (deviceKey) => {
    const { devices, mode } = useHAOStore.getState()
    if (mode !== 'manual') return // hanya bisa di mode manual

    const current = devices[deviceKey]
    const next    = current === 'ON' ? 'OFF' : 'ON'
    try {
      await set(ref(db, `hao/status/${deviceKey}`), next)
    } catch (err) {
      console.error('Gagal update Firebase:', err)
    }
  }

  const changeMode = async (newMode) => {
    try {
      await set(ref(db, 'hao/status/mode'), newMode)
    } catch (err) {
      console.error('Gagal ganti mode:', err)
    }
  }

  return { toggleDevice, changeMode }
}