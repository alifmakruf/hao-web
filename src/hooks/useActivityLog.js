import { useEffect } from 'react'
import { ref, onValue, push, query, limitToLast } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'

const LOG_PATH  = 'hao/logs'
const MAX_LOGS  = 100 // jumlah log terbaru yang disubscribe

// Label device yang enak dibaca
const DEVICE_LABELS = {
  lampu_ruangtamu:        'Lampu Ruang Tamu',
  lampu_dapurdankeluarga: 'Lampu Dapur & Keluarga',
  lampu_kamar1:           'Lampu Kamar 1',
  lampu_kamar2:           'Lampu Kamar 2',
  lampu_kamar3:           'Lampu Kamar 3',
  lampu_teras:            'Lampu Teras',
  lampu_gerbang:          'Lampu Gerbang',
  lampu_garasi:           'Lampu Garasi',
  fan_ruangtamu:          'Kipas Ruang Tamu',
  fan_kamar:              'Kipas Kamar',
  fan_dapur:              'Kipas Dapur',
}

const MODE_LABELS = {
  manual: 'Manual',
  auto:   'Otomatis',
}

// Identitas user untuk log — dipanggil di tempat aksi terjadi
export function getLogActor() {
  const { authRole, authUser } = useHAOStore.getState()
  if (authRole === 'admin') {
    return { role: 'admin', name: authUser?.username || 'Admin' }
  }
  if (authRole === 'guest') {
    return { role: 'guest', name: 'Guest' }
  }
  return { role: 'viewer', name: 'Viewer' }
}

// Push satu entri log ke Firebase
export async function pushActivityLog(entry) {
  try {
    const actor = getLogActor()
    await push(ref(db, LOG_PATH), {
      ...entry,
      actorRole: actor.role,
      actorName: actor.name,
      timestamp: Date.now(),
    })
  } catch (err) {
    console.warn('[ActivityLog] Gagal push:', err.message)
  }
}

// ── Helper untuk membuat entri log spesifik ────────────────────────────────

export function logDeviceToggle(deviceKey, newState) {
  const label = DEVICE_LABELS[deviceKey] || deviceKey
  pushActivityLog({
    type:    'device_toggle',
    message: `menyalakan/mematikan ${label} → ${newState}`,
    device:  deviceKey,
    state:   newState,
    icon:    deviceKey.startsWith('lampu') ? '💡' : '🌀',
  })
}

export function logModeChange(newMode) {
  const label = MODE_LABELS[newMode] || newMode
  pushActivityLog({
    type:    'mode_change',
    message: `mengubah mode sistem ke ${label}`,
    mode:    newMode,
    icon:    '⚙️',
  })
}

export function logAutomationAdd(rule) {
  pushActivityLog({
    type:    'automation_add',
    message: `menambah aturan otomasi "${rule.name || rule.type}"`,
    ruleName: rule.name || rule.type,
    icon:    '➕',
  })
}

export function logAutomationUpdate(ruleName, updates) {
  let detail = 'memperbarui aturan'
  if (updates && Object.prototype.hasOwnProperty.call(updates, 'enabled')) {
    detail = updates.enabled ? 'mengaktifkan aturan' : 'menonaktifkan aturan'
  }
  pushActivityLog({
    type:    'automation_update',
    message: `${detail} "${ruleName}"`,
    ruleName,
    icon:    '✏️',
  })
}

export function logAutomationDelete(ruleName) {
  pushActivityLog({
    type:    'automation_delete',
    message: `menghapus aturan otomasi "${ruleName}"`,
    ruleName,
    icon:    '🗑️',
  })
}

export function logTempPresetAdd(presetName) {
  pushActivityLog({
    type:    'temp_preset_add',
    message: `menambah preset suhu "${presetName}"`,
    presetName,
    icon:    '🌡️',
  })
}

export function logTempPresetUpdate(presetName) {
  pushActivityLog({
    type:    'temp_preset_update',
    message: `memperbarui preset suhu "${presetName}"`,
    presetName,
    icon:    '🌡️',
  })
}

export function logTempPresetDelete(presetName) {
  pushActivityLog({
    type:    'temp_preset_delete',
    message: `menghapus preset suhu "${presetName}"`,
    presetName,
    icon:    '🗑️',
  })
}

// ── Hook untuk subscribe log terbaru ────────────────────────────────────────
export function useActivityLog() {
  const { setActivityLogs } = useHAOStore()

  useEffect(() => {
    if (!db) return
    const q = query(ref(db, LOG_PATH), limitToLast(MAX_LOGS))
    const unsub = onValue(q, (snap) => {
      if (!snap.exists()) { setActivityLogs([]); return }
      const list = Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }))
      // Urutkan terbaru di atas
      list.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      setActivityLogs(list)
    }, (err) => {
      console.warn('[ActivityLog] Subscribe gagal:', err.message)
    })
    return () => unsub()
  }, [setActivityLogs])
}
