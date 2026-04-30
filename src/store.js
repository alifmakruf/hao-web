import { create } from 'zustand'

// Global state pakai Zustand — lebih simpel dari Redux
// Semua komponen bisa akses tanpa prop drilling
export const useHAOStore = create((set) => ({

  // ── Mode sistem ──────────────────────────────────────────
  // 'manual' | 'auto' | 'adaptive'
  mode: 'adaptive',
  setMode: (mode) => set({ mode }),

  // ── Status device (dari Firebase realtime) ───────────────
  devices: {
    lampu_ruangtamu:  'OFF',
    lampu_kamar1:     'OFF',
    lampu_kamar2:     'OFF',
    lampu_dapur:      'OFF',
    fan_ruangtamu:    'OFF',
    fan_kamar1:       'OFF',
  },
  setDevices: (devices) => set({ devices }),

  // ── Data sensor (dari Firebase realtime) ─────────────────
  sensor: {
    suhu:  0,
    ldr:   0,
    gas:   0,
  },
  setSensor: (sensor) => set({ sensor }),

  // ── Notifikasi aktif (ala The Sims) ──────────────────────
  // Array of { id, type, room, message }
  notifs: [],
  addNotif: (notif) =>
    set((s) => ({
      notifs: [...s.notifs.filter(n => n.id !== notif.id), notif]
    })),
  removeNotif: (id) =>
    set((s) => ({ notifs: s.notifs.filter(n => n.id !== id) })),

  // ── Alasan terakhir dari decision engine n8n ─────────────
  alasan: '',
  setAlasan: (alasan) => set({ alasan }),
}))