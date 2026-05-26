import { useEffect } from 'react'
import { ref, onValue, set } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'
import { publishCommand, publishMode } from './useMQTT'

const DEVICE_KEYS = [
  'lampu_ruangtamu', 'lampu_dapurdankeluarga',
  'lampu_kamar1', 'lampu_kamar2', 'lampu_kamar3',
  'lampu_teras', 'lampu_gerbang', 'lampu_garasi',
  'fan_ruangtamu', 'fan_kamar', 'fan_dapur',
]

export function useDeviceStatus() {
  const {
    setDevices, setSensor, setSensorRuangan,
    setMode, setAlasan, setFirebaseConnected, toggleDeviceLocal,
  } = useHAOStore()

  useEffect(() => {
    if (!db) { console.warn('[Firebase] DB belum ada'); return }

    let unsubStatus  = () => {}
    let unsubSensor  = () => {}
    let unsubSensorR = () => {}

    try {
      unsubStatus = onValue(ref(db, 'hao/status'), (snap) => {
        if (!snap.exists()) return
        const data = snap.val()
        const devices = {}
        DEVICE_KEYS.forEach((key) => {
          if (data[key] !== undefined) devices[key] = data[key]
        })
        if (Object.keys(devices).length > 0)
          setDevices((prev) => ({ ...prev, ...devices }))
        if (data.mode)   setMode(data.mode)
        if (data.alasan) setAlasan(data.alasan)
        setFirebaseConnected(true)
      }, (err) => {
        console.warn('[Firebase] Status error:', err.message)
        setFirebaseConnected(false)
      })

      // Sensor global (suhu, ldr, gas)
      unsubSensor = onValue(ref(db, 'hao/sensor'), (snap) => {
        if (!snap.exists()) return
        const data = snap.val()
        setSensor({
          suhu: Number(data.suhu ?? 0),
          ldr:  Number(data.ldr  ?? 0),
          gas:  Number(data.gas  ?? 0),
        })
        // Fallback: kalau tidak ada sensor per ruangan,
        // pakai sensor global untuk semua ruangan
        setSensorRuangan('ruangtamu', { suhu: Number(data.suhu ?? 0) })
        setSensorRuangan('dapur',     { suhu: Number(data.suhu ?? 0) })
      }, (err) => {
        console.warn('[Firebase] Sensor error:', err.message)
      })

      // Sensor per ruangan — kalau ESP32 kamu kirim ke path ini
      // hao/sensor/kamar, hao/sensor/ruangtamu, hao/sensor/dapur
      unsubSensorR = onValue(ref(db, 'hao/sensor_ruangan'), (snap) => {
        if (!snap.exists()) return
        const data = snap.val()
        if (data.kamar)     setSensorRuangan('kamar',     { suhu: Number(data.kamar.suhu     ?? 0) })
        if (data.ruangtamu) setSensorRuangan('ruangtamu', { suhu: Number(data.ruangtamu.suhu ?? 0) })
        if (data.dapur)     setSensorRuangan('dapur',     { suhu: Number(data.dapur.suhu     ?? 0) })
      }, (err) => {
        console.warn('[Firebase] Sensor ruangan error:', err.message)
      })

    } catch (err) {
      console.warn('[Firebase] Listener gagal:', err.message)
      setFirebaseConnected(false)
    }

    return () => { unsubStatus(); unsubSensor(); unsubSensorR() }
  }, [])

  const toggleDevice = async (deviceKey) => {
    const state = useHAOStore.getState()
    if (state.mode !== 'manual') {
      console.warn('[HAO] Mode bukan manual')
      return
    }
    const newState = state.devices?.[deviceKey] === 'ON' ? 'OFF' : 'ON'
    toggleDeviceLocal(deviceKey)
    try {
      await set(ref(db, `hao/status/${deviceKey}`), newState)
    } catch (err) {
      console.warn('[Firebase] Gagal toggle:', err.message)
      toggleDeviceLocal(deviceKey) // rollback
    }
    publishCommand(deviceKey, newState)
  }

  const changeMode = async (newMode) => {
    setMode(newMode)
    try {
      await set(ref(db, 'hao/status/mode'), newMode)
    } catch (err) {
      console.warn('[Firebase] Gagal simpan mode:', err.message)
    }
    publishMode(newMode)
  }

  return { toggleDevice, changeMode }
}