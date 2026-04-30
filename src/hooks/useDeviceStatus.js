import { useEffect } from 'react'
import { ref, onValue, set } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'

export function useDeviceStatus() {
  const { setDevices, setSensor, setMode, setAlasan, setFirebaseConnected } = useHAOStore()

  useEffect(() => {
    const isConfigured = !db.app.options.apiKey?.includes('YOUR_')
    if (!isConfigured) {
      console.info('[HAO] Firebase belum dikonfigurasi → mode lokal aktif')
      return
    }
    try {
      const unsubDev = onValue(ref(db, 'hao/status'), (snap) => {
        if (!snap.exists()) return
        const d = snap.val()
        setDevices({
          lampu_ruangtamu: d.lampu_ruangtamu ?? 'OFF',
          lampu_kamar1:    d.lampu_kamar1    ?? 'OFF',
          lampu_kamar2:    d.lampu_kamar2    ?? 'OFF',
          lampu_dapur:     d.lampu_dapur     ?? 'OFF',
          fan_ruangtamu:   d.fan_ruangtamu   ?? 'OFF',
          fan_kamar1:      d.fan_kamar1      ?? 'OFF',
        })
        if (d.mode)   setMode(d.mode)
        if (d.alasan) setAlasan(d.alasan)
        setFirebaseConnected(true)
      }, (err) => {
        console.warn('[HAO] Firebase error:', err.message)
        setFirebaseConnected(false)
      })
      const unsubSen = onValue(ref(db, 'hao/sensor'), (snap) => {
        if (snap.exists()) setSensor(snap.val())
      })
      return () => { unsubDev(); unsubSen() }
    } catch (err) {
      console.warn('[HAO] Firebase tidak tersedia:', err.message)
    }
  }, [setDevices, setSensor, setMode, setAlasan, setFirebaseConnected])

  const toggleDevice = async (deviceKey) => {
    const { mode, firebaseConnected, toggleDeviceLocal } = useHAOStore.getState()
    if (mode !== 'manual') return
    if (firebaseConnected) {
      const current = useHAOStore.getState().devices[deviceKey]
      try {
        await set(ref(db, `hao/status/${deviceKey}`), current === 'ON' ? 'OFF' : 'ON')
      } catch {
        toggleDeviceLocal(deviceKey)
      }
    } else {
      toggleDeviceLocal(deviceKey)
    }
  }

  const changeMode = async (newMode) => {
    const { firebaseConnected } = useHAOStore.getState()
    useHAOStore.getState().setMode(newMode)
    if (firebaseConnected) {
      try { await set(ref(db, 'hao/status/mode'), newMode) } catch {}
    }
  }

  return { toggleDevice, changeMode }
}