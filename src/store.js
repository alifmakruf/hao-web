import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useHAOStore = create(
  persist(
    (set) => ({
      mode: 'manual',
      setMode: (mode) => set({ mode }),

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
      setDevices: (devicesOrUpdater) =>
        set((s) => ({
          devices: typeof devicesOrUpdater === 'function'
            ? devicesOrUpdater(s.devices)
            : devicesOrUpdater,
        })),
      toggleDeviceLocal: (key) =>
        set((s) => ({
          devices: { ...s.devices, [key]: s.devices[key] === 'ON' ? 'OFF' : 'ON' },
        })),

      sensor: { suhu: 27, ldr: 400, gas: 120 },
      setSensor: (sensor) => set({ sensor }),

      sensorRuangan: {
        kamar:     { suhu: 27 },
        ruangtamu: { suhu: 27 },
        dapur:     { suhu: 27 },
      },
      setSensorRuangan: (ruangan, data) =>
        set((s) => ({
          sensorRuangan: {
            ...s.sensorRuangan,
            [ruangan]: { ...s.sensorRuangan[ruangan], ...data },
          },
        })),

      notifs: [],
      addNotif: (notif) =>
        set((s) => ({ notifs: [...s.notifs.filter((n) => n.id !== notif.id), notif] })),
      removeNotif: (id) =>
        set((s) => ({ notifs: s.notifs.filter((n) => n.id !== id) })),

      alasan: '',
      setAlasan: (alasan) => set({ alasan }),

      firebaseConnected: false,
      setFirebaseConnected: (v) => set({ firebaseConnected: v }),

      mqttConnected: false,
      setMqttConnected: (v) => set({ mqttConnected: v }),

      mqttStatus: 'disconnected',
      setMqttStatus: (s) => set({ mqttStatus: s }),

      // ─── Timezone ─────────────────────────────────────────────
      // 'WIB' | 'WITA' | 'WIT'
      timezone: 'WIB',
      setTimezone: (tz) => set({ timezone: tz }),

      // ─── Automations ──────────────────────────────────────────
      // Disimpan juga di Firebase, ini hanya cache lokal
      automations: [],
      setAutomations: (automations) => set({ automations }),

      liteMode: false,
      setLiteMode: (v) => set({ liteMode: v }),
    }),
    {
      name: 'hao-storage',
      partialize: (state) => ({
        mode:     state.mode,
        liteMode: state.liteMode,
        timezone: state.timezone,
      }),
    }
  )
)