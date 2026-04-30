import { useEffect } from 'react'
import { useHAOStore } from '../store'

// Menghasilkan notifikasi floating ala The Sims berdasarkan kondisi sensor
// Notif muncul di atas ruangan dalam scene 3D via <SimsNotif />
export function useSimsNotif() {
  const { sensor, devices, addNotif, removeNotif } = useHAOStore()

  useEffect(() => {
    const notifs = []

    // ── Gas berbahaya ─────────────────────────────────────
    if (sensor.gas > 800) {
      notifs.push({
        id: 'gas_danger',
        type: 'danger',
        icon: '☠',
        message: 'Gas berbahaya terdeteksi!',
        room: 'ruangtamu',
        position: [0, 3.5, 0],
      })
    } else if (sensor.gas > 400) {
      notifs.push({
        id: 'gas_warn',
        type: 'warning',
        icon: '⚠',
        message: 'Kadar gas meningkat',
        room: 'ruangtamu',
        position: [0, 3.5, 0],
      })
    } else {
      removeNotif('gas_danger')
      removeNotif('gas_warn')
    }

    // ── Suhu panas ────────────────────────────────────────
    if (sensor.suhu > 32) {
      notifs.push({
        id: 'suhu_panas',
        type: 'hot',
        icon: '🔥',
        message: `Panas! ${sensor.suhu.toFixed(1)}°C`,
        room: 'ruangtamu',
        position: [0, 3.2, 0],
      })
    } else if (sensor.suhu > 28) {
      notifs.push({
        id: 'suhu_hangat',
        type: 'warm',
        icon: '♨',
        message: `Hangat ${sensor.suhu.toFixed(1)}°C`,
        room: 'ruangtamu',
        position: [0, 3.2, 0],
      })
    } else if (sensor.suhu < 20) {
      notifs.push({
        id: 'suhu_dingin',
        type: 'cold',
        icon: '❄',
        message: `Dingin! ${sensor.suhu.toFixed(1)}°C`,
        room: 'ruangtamu',
        position: [0, 3.2, 0],
      })
    } else {
      removeNotif('suhu_panas')
      removeNotif('suhu_hangat')
      removeNotif('suhu_dingin')
    }

    // ── Fan nyala ─────────────────────────────────────────
    if (devices.fan_ruangtamu === 'ON') {
      notifs.push({
        id: 'fan_on',
        type: 'info',
        icon: '💨',
        message: 'Kipas menyala',
        room: 'ruangtamu',
        position: [1.5, 3, 0],
      })
    } else {
      removeNotif('fan_on')
    }

    // Tambahkan semua notif baru ke store
    notifs.forEach(addNotif)

  }, [sensor.suhu, sensor.gas, devices.fan_ruangtamu, addNotif, removeNotif])
}