import { create } from 'zustand'

export const useHAOStore = create((set) => ({

  // ── Mode sistem ──────────────────────────────────────────
  mode: 'manual',   // default manual agar langsung bisa klik device
  setMode: (mode) => set({ mode }),

  // ── Status device ─────────────────────────────────────────
  devices: {
  lampu_ruangtamu:        'OFF',
  lampu_dapurdankeluarga: 'OFF',
  lampu_kamar1:           'OFF',
  lampu_kamar2:           'OFF',
  lampu_kamar3:           'OFF',
  lampu_teras:            'OFF',
  lampu_gerbang:          'OFF',
  lampu_garasi:           'OFF',
  fan_ruangtamu:          'OFF',
  fan_kamar:              'OFF',
  fan_dapur:              'OFF',
  },
  setDevices: (devices) => set({ devices }),

  // Toggle lokal tanpa Firebase (untuk demo & testing UI)
  toggleDeviceLocal: (key) => set((s) => ({
    devices: {
      ...s.devices,
      [key]: s.devices[key] === 'ON' ? 'OFF' : 'ON',
    }
  })),

  // ── Data sensor — nilai default realistis untuk demo ──────
  sensor: { suhu: 27, ldr: 400, gas: 120 },
  setSensor: (sensor) => set({ sensor }),

  // ── Notifikasi ala The Sims ────────────────────────────────
  notifs: [],
  addNotif: (notif) =>
    set((s) => ({
      notifs: [...s.notifs.filter(n => n.id !== notif.id), notif]
    })),
  removeNotif: (id) =>
    set((s) => ({ notifs: s.notifs.filter(n => n.id !== id) })),

  // ── Info dari n8n ─────────────────────────────────────────
  alasan: 'DEMO_MODE',
  setAlasan: (alasan) => set({ alasan }),

  // ── Flag Firebase ─────────────────────────────────────────
  firebaseConnected: false,
  setFirebaseConnected: (v) => set({ firebaseConnected: v }),
}))