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

      // Sensor global — fallback ke semua ruangan
      unsubSensor = onValue(ref(db, 'hao/sensor'), (snap) => {
        if (!snap.exists()) return
        const data = snap.val()
        const suhu = Number(data.suhu ?? 0)
        const ldr  = Number(data.ldr  ?? 0)
        const gas  = Number(data.gas  ?? 0)

        setSensor({ suhu, ldr, gas })

        // Fallback semua ruangan pakai nilai global
        // (akan di-override oleh hao/sensor_ruangan kalau ada)
        setSensorRuangan('ruangtamu', { suhu })
        setSensorRuangan('kamar',     { suhu }) // ← fix: ini yang sebelumnya kurang
        setSensorRuangan('dapur',     { suhu })
      }, (err) => {
        console.warn('[Firebase] Sensor error:', err.message)
      })

      // Sensor per ruangan — override fallback di atas
      unsubSensorR = onValue(ref(db, 'hao/sensor_ruangan'), (snap) => {
        if (!snap.exists()) return
        const data = snap.val()
        if (data.ruangtamu) setSensorRuangan('ruangtamu', { suhu: Number(data.ruangtamu.suhu ?? 0) })
        if (data.kamar)     setSensorRuangan('kamar',     { suhu: Number(data.kamar.suhu     ?? 0) })
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

    // 1. Update UI langsung (optimistic) — tidak tunggu network
    toggleDeviceLocal(deviceKey)

    // 2. Publish MQTT langsung ke ESP — ini yang paling cepat
    //    Kalau MQTT sedang reconnect, command masuk antrian di useMQTT
    const mqttSent = publishCommand(deviceKey, newState)
    if (!mqttSent) {
      console.warn(`[HAO] MQTT tidak connect — ${deviceKey} masuk antrian, Firebase tetap diupdate`)
    }

    // 3. Update Firebase (untuk sync state & n8n) — async, tidak block UI
    try {
      await set(ref(db, `hao/status/${deviceKey}`), newState)
    } catch (err) {
      console.warn('[Firebase] Gagal update:', err.message)
      // Rollback UI kalau Firebase juga gagal dan MQTT juga gagal
      if (!mqttSent) toggleDeviceLocal(deviceKey)
    }
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