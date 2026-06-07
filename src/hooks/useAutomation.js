import { useEffect, useRef } from 'react'
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
      if (now.totalMinutes < 480 || now.totalMinutes >= 1020) return false
      if (rule.condition === 'cerah'   && ldr <= 600) return false
      if (rule.condition === 'mendung' && ldr >  600) return false
      return true
    }
    return false
  } catch { return false }
}

// Map kipas ke ruangan DHT
const FAN_TO_ROOM = {
  fan_ruangtamu: 'ruangtamu',
  fan_kamar:     'kamar',
  fan_dapur:     'dapur',
}

const ALL_DEVICES = [
  'lampu_ruangtamu','lampu_dapurdankeluarga','lampu_kamar1',
  'lampu_kamar2','lampu_kamar3','lampu_teras','lampu_gerbang',
  'lampu_garasi','fan_ruangtamu','fan_kamar','fan_dapur',
]

export function useAutomation() {
  const {
    automations, setAutomations,
    tempPresets, setTempPresets,
    mode, sensor, sensorRuangan,
    timezone, setDevices,
  } = useHAOStore()

  const lastStateRef = useRef({})

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

  // Evaluasi aturan tiap 30 detik
  useEffect(() => {
    if (mode !== 'auto') return

    const evaluate = () => {
      try {
        const now = getNowInTZ(timezone)
        const targetDevices = {}

        // 1. Aturan waktu (prioritas tertinggi untuk lampu & kipas)
        automations
          .filter(r => r.type === 'time' && r.enabled !== false)
          .forEach(rule => {
            if (!evaluateRule(rule, now, sensor.ldr)) return
            ;(rule.devices || []).forEach(d => { targetDevices[d] = 'ON' })
          })

        // 2. Aturan LDR (hanya lampu, tidak override waktu)
        automations
          .filter(r => r.type === 'ldr' && r.enabled !== false)
          .forEach(rule => {
            if (!evaluateRule(rule, now, sensor.ldr)) return
            ;(rule.devices || []).forEach(d => {
              if (targetDevices[d] === undefined) targetDevices[d] = 'ON'
            })
          })

        // 3. Aturan kipas suhu (terus menerus, tidak override waktu)
        automations
          .filter(r => r.type === 'temp' && r.enabled !== false)
          .forEach(rule => {
            // rule.fanKey = 'fan_kamar' | 'fan_ruangtamu' | 'fan_dapur'
            // rule.presetId = id preset suhu
            if (!rule.fanKey || !rule.presetId) return
            if (targetDevices[rule.fanKey] !== undefined) return // sudah di-set aturan waktu

            const preset = tempPresets.find(p => p.id === rule.presetId)
            if (!preset) return

            const room    = FAN_TO_ROOM[rule.fanKey]
            const suhuNow = sensorRuangan?.[room]?.suhu ?? sensor.suhu
            const thresh  = preset.threshold?.[room] ?? 30

            targetDevices[rule.fanKey] = suhuNow >= thresh ? 'ON' : 'OFF'
          })

        // 4. Semua device yang tidak masuk aturan → OFF
        ALL_DEVICES.forEach(d => {
          if (targetDevices[d] === undefined) targetDevices[d] = 'OFF'
        })

        // Cek ada perubahan
        const hasChange = ALL_DEVICES.some(d => lastStateRef.current[d] !== targetDevices[d])
        if (!hasChange) return
        lastStateRef.current = { ...targetDevices }

        setDevices(targetDevices)

        set(ref(db, 'hao/status'), { ...targetDevices, updatedAt: Date.now() })
          .catch(err => console.warn('[Automation] Firebase:', err.message))

        ALL_DEVICES.forEach(d => {
          try { publishCommand(d, targetDevices[d]) } catch {}
        })

      } catch (err) {
        console.error('[Automation] Evaluasi error:', err.message)
      }
    }

    evaluate()
    const interval = setInterval(evaluate, 30000)
    return () => clearInterval(interval)
  }, [mode, automations, tempPresets, sensor.ldr, sensorRuangan, timezone])

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
  }
}