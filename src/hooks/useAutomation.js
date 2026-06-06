import { useEffect, useRef } from 'react'
import { ref, onValue, set, push, remove, update } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'
import { publishCommand } from './useMQTT'

// Offset timezone dalam jam
const TZ_OFFSET = { WIB: 7, WITA: 8, WIT: 9 }

// Ambil jam dan menit sesuai timezone
function getNowInTZ(tz) {
  const offset = TZ_OFFSET[tz] ?? 7
  const utc    = new Date()
  const local  = new Date(utc.getTime() + offset * 3600 * 1000)
  return {
    hours:   local.getUTCHours(),
    minutes: local.getUTCMinutes(),
    day:     local.getUTCDay(), // 0=Minggu, 1=Senin, ..., 6=Sabtu
    totalMinutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  }
}

// Nama hari untuk validasi
const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

// Evaluasi apakah aturan aktif sekarang
function evaluateRule(rule, now, ldr) {
  try {
    if (rule.type === 'time') {
      // Cek hari
      if (rule.days !== 'semua') {
        const activeDays = rule.days // array of 0-6
        if (!activeDays.includes(now.day)) return false
      }

      // Cek rentang waktu
      const start = rule.startHour * 60 + rule.startMinute
      const end   = rule.endHour   * 60 + rule.endMinute

      // Handle midnight crossing (misal 22:00-02:00)
      if (start <= end) {
        if (now.totalMinutes < start || now.totalMinutes >= end) return false
      } else {
        if (now.totalMinutes < start && now.totalMinutes >= end) return false
      }

      return true
    }

    if (rule.type === 'ldr') {
      // LDR hanya berlaku pukul 08:00-17:00
      if (now.totalMinutes < 480 || now.totalMinutes >= 1020) return false

      if (rule.condition === 'cerah'  && ldr <= 600) return false
      if (rule.condition === 'mendung' && ldr > 600)  return false

      return true
    }

    return false
  } catch {
    return false
  }
}

export function useAutomation() {
  const { automations, setAutomations, mode, sensor, timezone, setDevices } = useHAOStore()
  const lastStateRef = useRef({})

  // Subscribe automations dari Firebase
  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, 'hao/automations'), (snap) => {
      if (!snap.exists()) { setAutomations([]); return }
      const data = snap.val()
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }))
      setAutomations(list)
    }, (err) => {
      console.warn('[Automation] Gagal load:', err.message)
    })
    return () => unsub()
  }, [])

  // Evaluasi aturan tiap 30 detik
  useEffect(() => {
    if (mode !== 'auto') return

    const evaluate = () => {
      try {
        const now = getNowInTZ(timezone)

        // Kumpulkan semua device yang aktif dari aturan
        const targetDevices = {}

        // Pisahkan aturan waktu dan LDR
        const timeRules = automations.filter(r => r.type === 'time' && r.enabled !== false)
        const ldrRules  = automations.filter(r => r.type === 'ldr'  && r.enabled !== false)

        // Evaluasi aturan waktu dulu (prioritas utama)
        timeRules.forEach(rule => {
          if (!evaluateRule(rule, now, sensor.ldr)) return
          ;(rule.devices || []).forEach(d => { targetDevices[d] = 'ON' })
        })

        // Evaluasi aturan LDR (hanya kalau device belum di-set oleh aturan waktu)
        ldrRules.forEach(rule => {
          if (!evaluateRule(rule, now, sensor.ldr)) return
          ;(rule.devices || []).forEach(d => {
            // Jangan override kalau aturan waktu sudah set
            if (targetDevices[d] === undefined) {
              targetDevices[d] = 'ON'
            }
          })
        })

        // Device yang tidak ada di aturan manapun → OFF
        const ALL_DEVICES = [
          'lampu_ruangtamu','lampu_dapurdankeluarga','lampu_kamar1',
          'lampu_kamar2','lampu_kamar3','lampu_teras','lampu_gerbang',
          'lampu_garasi','fan_ruangtamu','fan_kamar','fan_dapur',
        ]
        ALL_DEVICES.forEach(d => {
          if (targetDevices[d] === undefined) targetDevices[d] = 'OFF'
        })

        // Cek apakah ada perubahan dari state terakhir
        const hasChange = ALL_DEVICES.some(d => lastStateRef.current[d] !== targetDevices[d])
        if (!hasChange) return

        lastStateRef.current = { ...targetDevices }

        // Update store
        setDevices(targetDevices)

        // Tulis ke Firebase
        const fbUpdates = { ...targetDevices, updatedAt: Date.now() }
        set(ref(db, 'hao/status'), fbUpdates).catch(err =>
          console.warn('[Automation] Gagal tulis Firebase:', err.message)
        )

        // Kirim ke MQTT → ESP32
        ALL_DEVICES.forEach(d => {
          try { publishCommand(d, targetDevices[d]) } catch {}
        })

        console.log('[Automation] Eksekusi aturan:', targetDevices)
      } catch (err) {
        console.error('[Automation] Error evaluasi:', err.message)
      }
    }

    evaluate() // jalankan langsung
    const interval = setInterval(evaluate, 30000) // tiap 30 detik
    return () => clearInterval(interval)
  }, [mode, automations, sensor.ldr, timezone])

  // CRUD functions
  const addAutomation = async (rule) => {
    try {
      const newRule = { ...rule, enabled: true, createdAt: Date.now() }
      await push(ref(db, 'hao/automations'), newRule)
      return true
    } catch (err) {
      console.error('[Automation] Gagal tambah:', err.message)
      return false
    }
  }

  const updateAutomation = async (id, updates) => {
    try {
      await update(ref(db, `hao/automations/${id}`), updates)
      return true
    } catch (err) {
      console.error('[Automation] Gagal update:', err.message)
      return false
    }
  }

  const deleteAutomation = async (id) => {
    try {
      await remove(ref(db, `hao/automations/${id}`))
      return true
    } catch (err) {
      console.error('[Automation] Gagal hapus:', err.message)
      return false
    }
  }

  const toggleAutomation = (id, current) => {
    return updateAutomation(id, { enabled: !current })
  }

  return { addAutomation, updateAutomation, deleteAutomation, toggleAutomation }
}