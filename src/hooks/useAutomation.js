import { useEffect, useRef, useCallback } from 'react'
import { ref, onValue, set, push, remove, update } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'
import { publishCommand } from './useMQTT'

const TZ_OFFSET = { WIB: 7, WITA: 8, WIT: 9 }

function getNowInTZ(tz) {
  const offset = TZ_OFFSET[tz] ?? 7
  const utc    = new Date()
  const local  = new Date(utc.getTime() + offset * 3600 * 1000)
  return {
    hours:        local.getUTCHours(),
    minutes:      local.getUTCMinutes(),
    day:          local.getUTCDay(),
    totalMinutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  }
}

function evaluateRule(rule, now, ldr) {
  try {
    if (rule.type === 'time') {
      if (rule.days !== 'semua' && Array.isArray(rule.days)) {
        if (!rule.days.includes(now.day)) return false
      }
      const start = rule.startHour * 60 + rule.startMinute
      const end   = rule.endHour   * 60 + rule.endMinute
      if (start <= end) {
        if (now.totalMinutes < start || now.totalMinutes >= end) return false
      } else {
        if (now.totalMinutes < start && now.totalMinutes >= end) return false
      }
      return true
    }
    if (rule.type === 'ldr') {
      if (now.totalMinutes < 360 || now.totalMinutes >= 1110) return false
      if (rule.condition === 'cerah'   && ldr <  500) return false
      if (rule.condition === 'mendung' && ldr >= 500) return false
      return true
    }
    return false
  } catch { return false }
}

const FAN_TO_ROOM = {
  fan_ruangtamu: 'ruangtamu',
  fan_kamar:     'kamar',
  fan_dapur:     'dapur',
}

export function useAutomation() {
  const {
    automations, setAutomations,
    tempPresets, setTempPresets,
    mode, sensor, sensorRuangan,
    timezone, setDevices, devices,
  } = useHAOStore()

  // Set of devices currently managed by automation
  const managedDevicesRef = useRef(new Set())
  // Set of devices that were managed in the PREVIOUS evaluate cycle
  // Used to detect devices that left the "managed" set (rule ended / device removed from rule)
  const prevManagedRef = useRef(new Set())

  // Pakai ref untuk nilai terbaru agar evaluate() tidak stale
  const stateRef = useRef({})
  stateRef.current = { automations, tempPresets, mode, sensor, sensorRuangan, timezone, devices }

  // Subscribe automations dari Firebase
  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, 'hao/automations'), (snap) => {
      if (!snap.exists()) { setAutomations([]); return }
      const list = Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }))
      setAutomations(list)
    }, err => console.warn('[Automation] Load gagal:', err.message))
    return () => unsub()
  }, [])

  // Subscribe preset suhu dari Firebase
  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, 'hao/tempPresets'), (snap) => {
      if (!snap.exists()) { setTempPresets([]); return }
      const list = Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }))
      setTempPresets(list)
    }, err => console.warn('[TempPreset] Load gagal:', err.message))
    return () => unsub()
  }, [])

  // Fungsi evaluate — selalu baca nilai terbaru dari stateRef
  const evaluate = useCallback(() => {
    const { automations, tempPresets, mode, sensor, sensorRuangan, timezone, devices } = stateRef.current
    if (mode !== 'auto') return

    try {
      const now = getNowInTZ(timezone)
      const targetDevices = {}
      const managed = new Set()

      // 1. Aturan waktu
      automations
        .filter(r => r.type === 'time' && r.enabled !== false)
        .forEach(rule => {
          if (!evaluateRule(rule, now, sensor.ldr)) return
          ;(rule.devices || []).forEach(d => {
            targetDevices[d] = 'ON'
            managed.add(d)
          })
        })

      // 2. Aturan LDR
      automations
        .filter(r => r.type === 'ldr' && r.enabled !== false)
        .forEach(rule => {
          const active = evaluateRule(rule, now, sensor.ldr)
          ;(rule.devices || []).forEach(d => {
            managed.add(d)
            if (targetDevices[d] === undefined) {
              targetDevices[d] = active ? 'ON' : 'OFF'
            }
          })
        })

      // 3. Aturan kipas suhu
      automations
        .filter(r => r.type === 'temp' && r.enabled !== false)
        .forEach(rule => {
          if (!rule.fanKey || !rule.presetId) return
          managed.add(rule.fanKey)
          if (targetDevices[rule.fanKey] !== undefined) return

          const preset = tempPresets.find(p => p.id === rule.presetId)
          if (!preset) return

          const room    = FAN_TO_ROOM[rule.fanKey]
          const suhuNow = sensorRuangan?.[room]?.suhu ?? sensor.suhu
          const thresh  = preset.threshold?.[room] ?? 30

          targetDevices[rule.fanKey] = suhuNow >= thresh ? 'ON' : 'OFF'
        })

      // 4. Device dalam aturan aktif tapi tidak memenuhi kondisi → OFF
      managed.forEach(d => {
        if (targetDevices[d] === undefined) targetDevices[d] = 'OFF'
      })

      // 5. *** FIX UTAMA ***
      // Device yang SEBELUMNYA dikelola automation (prevManagedRef) tapi SEKARANG
      // tidak lagi masuk managed (misalnya: aturan waktu sudah selesai, atau device
      // dihapus dari aturan) → harus di-OFF-kan secara eksplisit
      const released = [...prevManagedRef.current].filter(d => !managed.has(d))
      released.forEach(d => {
        if (targetDevices[d] === undefined) {
          targetDevices[d] = 'OFF'
          // Masukkan ke managed sementara agar ikut diproses di bawah
          managed.add(d)
        }
      })

      // Update managedDevicesRef dan prevManagedRef untuk siklus berikutnya
      prevManagedRef.current = new Set(managedDevicesRef.current)
      managedDevicesRef.current = new Set(
        // Hanya simpan device yang benar-benar masuk aturan AKTIF (bukan released)
        [...managed].filter(d => {
          // device yang sedang dalam aturan aktif (bukan yang baru di-release)
          return automations
            .filter(r => r.enabled !== false)
            .some(r => (r.devices || []).includes(d) || r.fanKey === d)
        })
      )

      // Kumpulkan semua device yang perlu diproses (managed + released)
      const allTargetDevices = targetDevices

      // Bandingkan dengan state device AKTUAL di store
      const changed = Object.keys(allTargetDevices).filter(d => devices[d] !== allTargetDevices[d])
      if (changed.length === 0) return

      // Update store
      setDevices(prev => ({ ...prev, ...allTargetDevices }))

      // Update Firebase — hanya field yang berubah + timestamp
      const firebaseUpdate = { updatedAt: Date.now() }
      changed.forEach(d => { firebaseUpdate[d] = allTargetDevices[d] })
      set(ref(db, 'hao/status'), { ...devices, ...firebaseUpdate })
        .catch(err => console.warn('[Automation] Firebase:', err.message))

      // Publish MQTT hanya device yang berubah
      changed.forEach(d => {
        try { publishCommand(d, allTargetDevices[d]) } catch {}
      })

    } catch (err) {
      console.error('[Automation] Evaluasi error:', err.message)
    }
  }, []) // tidak ada dependency — selalu baca dari stateRef

  // Jalankan evaluate setiap kali dependency berubah
  useEffect(() => {
    if (mode !== 'auto') {
      // Saat switch ke manual: lepas semua managed, bersihkan tracking
      managedDevicesRef.current = new Set()
      prevManagedRef.current    = new Set()
      return
    }
    // Saat masuk mode auto atau dependency berubah: langsung evaluate
    evaluate()
    // Jalankan tiap 15 detik (lebih cepat dari 30s untuk presisi waktu)
    const interval = setInterval(evaluate, 15000)
    return () => clearInterval(interval)
  }, [mode, automations, tempPresets, sensor.ldr, sensorRuangan, timezone, evaluate])

  const getManagedDevices = () => managedDevicesRef.current

  // ── CRUD Automations ─────────────────────────────────────────
  const addAutomation = async (rule) => {
    try {
      await push(ref(db, 'hao/automations'), { ...rule, enabled: true, createdAt: Date.now() })
      return true
    } catch (err) { console.error('[Automation] Add:', err.message); return false }
  }

  const updateAutomation = async (id, updates) => {
    try {
      await update(ref(db, `hao/automations/${id}`), updates)
      return true
    } catch (err) { console.error('[Automation] Update:', err.message); return false }
  }

  const deleteAutomation = async (id) => {
    try {
      await remove(ref(db, `hao/automations/${id}`))
      return true
    } catch (err) { console.error('[Automation] Delete:', err.message); return false }
  }

  const toggleAutomation = (id, current) =>
    updateAutomation(id, { enabled: !current })

  // ── CRUD Preset Suhu ─────────────────────────────────────────
  const addTempPreset = async (preset) => {
    try {
      await push(ref(db, 'hao/tempPresets'), { ...preset, createdAt: Date.now() })
      return true
    } catch (err) { console.error('[TempPreset] Add:', err.message); return false }
  }

  const deleteTempPreset = async (id) => {
    try {
      await remove(ref(db, `hao/tempPresets/${id}`))
      return true
    } catch (err) { console.error('[TempPreset] Delete:', err.message); return false }
  }

  const updateTempPreset = async (id, updates) => {
    try {
      await update(ref(db, `hao/tempPresets/${id}`), updates)
      return true
    } catch (err) { console.error('[TempPreset] Update:', err.message); return false }
  }

  return {
    addAutomation, updateAutomation, deleteAutomation, toggleAutomation,
    addTempPreset, deleteTempPreset, updateTempPreset,
    getManagedDevices,
  }
}
