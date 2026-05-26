import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useHAOStore = create(
  persist(
    (set) => ({
      // ─── Mode ────────────────────────────────────────────────
      mode: 'manual',
      setMode: (mode) => set({ mode }),

      // ─── Devices ─────────────────────────────────────────────
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

      // FIX — support updater function (prev) => ({...prev, ...newData})
      setDevices: (devicesOrUpdater) =>
        set((s) => ({
          devices:
            typeof devicesOrUpdater === 'function'
              ? devicesOrUpdater(s.devices)
              : devicesOrUpdater,
        })),

      toggleDeviceLocal: (key) =>
        set((s) => ({
          devices: {
            ...s.devices,
            [key]: s.devices[key] === 'ON' ? 'OFF' : 'ON',
          },
        })),

      // ─── Sensor ───────────────────────────────────────────────
      sensor: { suhu: 27, ldr: 400, gas: 120 },
      setSensor: (sensor) => set({ sensor }),

      // ─── Notifikasi ───────────────────────────────────────────
      notifs: [],
      addNotif: (notif) =>
        set((s) => ({
          notifs: [...s.notifs.filter((n) => n.id !== notif.id), notif],
        })),
      removeNotif: (id) =>
        set((s) => ({ notifs: s.notifs.filter((n) => n.id !== id) })),

      // ─── Alasan dari n8n ──────────────────────────────────────
      alasan: '',
      setAlasan: (alasan) => set({ alasan }),

      // ─── Koneksi Firebase ─────────────────────────────────────
      firebaseConnected: false,
      setFirebaseConnected: (v) => set({ firebaseConnected: v }),

      // ─── Koneksi MQTT / HiveMQ ───────────────────────────────
      mqttConnected: false,
      setMqttConnected: (v) => set({ mqttConnected: v }),

      mqttStatus: 'disconnected',
      setMqttStatus: (s) => set({ mqttStatus: s }),

      // ─── Scene System ─────────────────────────────────────────
      activeScene: null,
      setActiveScene: (scene) => set({ activeScene: scene }),
    }),
    {
      name: 'hao-storage',
      // FIX — hapus 'devices' dari persist
      // Devices selalu fresh dari Firebase, tidak perlu disimpan lokal
      partialize: (state) => ({
        mode:        state.mode,
        activeScene: state.activeScene,
      }),
    }
  )
)