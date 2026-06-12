import { useEffect } from 'react'
import { ref, onValue, set } from 'firebase/database'
import { signInAnonymously } from 'firebase/auth'
import { db, auth } from '../firebase'
import { useHAOStore } from '../store'
import { publishCommand, publishMode } from './useMQTT'

async function ensureAuth() {
  if (auth.currentUser) return true
  try {
    await signInAnonymously(auth)
    return true
  } catch (err) {
    console.warn('[Auth] ensureAuth gagal:', err.message)
    return false
  }
}

const DEVICE_KEYS = [
  'lampu_ruangtamu', 'lampu_dapurdankeluarga',
  'lampu_kamar1', 'lampu_kamar2', 'lampu_kamar3',
  'lampu_teras', 'lampu_gerbang', 'lampu_garasi',
  'fan_ruangtamu', 'fan_kamar', 'fan_dapur',
]

// Pelacak key yang sedang "in-flight" (optimistic update belum confirmed Firebase)
const pendingKeys = new Set()

// Pelacak apakah mode sedang pending write — cegah Firebase listener override balik
let pendingMode = false

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
          // Skip key yang masih pending optimistic update — hindari flicker
          if (pendingKeys.has(key)) return
          if (data[key] !== undefined) devices[key] = data[key]
        })
        if (Object.keys(devices).length > 0)
          setDevices((prev) => ({ ...prev, ...devices }))

        // Jangan override mode kalau sedang pending write dari user
        if (data.mode && !pendingMode) setMode(data.mode)
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

        setSensorRuangan('ruangtamu', { suhu })
        setSensorRuangan('kamar',     { suhu })
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
    const canWrite = state.authRole === 'admin' || state.authRole === 'guest'

    // 1. Tandai key sebagai pending — Firebase onValue tidak akan override state ini
    pendingKeys.add(deviceKey)

    // 2. Update UI langsung (optimistic)
    toggleDeviceLocal(deviceKey)

    // 3. Publish MQTT langsung ke ESP
    const mqttSent = publishCommand(deviceKey, newState)
    if (!mqttSent) {
      console.warn(`[HAO] MQTT tidak connect — ${deviceKey} masuk antrian`)
    }

    // 4. Update Firebase — admin dan guest (guest sudah anonymous auth)
    if (canWrite) {
      try {
        await ensureAuth()
        await set(ref(db, `hao/status/${deviceKey}`), newState)
      } catch (err) {
        console.warn('[Firebase] Gagal update:', err.message)
        // Rollback kalau Firebase gagal dan MQTT juga gagal
        if (!mqttSent) toggleDeviceLocal(deviceKey)
      }
    }

    // 5. Hapus dari pending setelah delay singkat
    setTimeout(() => {
      pendingKeys.delete(deviceKey)
    }, 1500)
  }

  const changeMode = async (newMode) => {
    // Set pending flag — cegah Firebase listener override mode sebelum write selesai
    pendingMode = true
    setMode(newMode)
    publishMode(newMode)

    try {
      await ensureAuth()
      await set(ref(db, 'hao/status/mode'), newMode)
    } catch (err) {
      console.warn('[Firebase] Gagal simpan mode:', err.message)
    } finally {
      // Lepas pending setelah write selesai (atau gagal)
      setTimeout(() => { pendingMode = false }, 2000)
    }
  }

  return { toggleDevice, changeMode }
}
