import { useEffect } from 'react'
import { useHAOStore } from '../store'

export function useSimsNotif() {
  const { sensor, devices, addNotif, removeNotif } = useHAOStore()

  useEffect(() => {
    const notifs = []

    // ── Gas ───────────────────────────────────────────────
    if (sensor.gas > 800) {
      notifs.push({
        id: 'gas_danger',
        type: 'danger',
        icon: '☠',
        message: 'Gas berbahaya!',
        position: [-0.24, 0.75, -0.47],
      })
    } else if (sensor.gas > 400) {
      notifs.push({
        id: 'gas_warn',
        type: 'warning',
        icon: '⚠',
        message: 'Kadar gas meningkat',
        position: [-0.24, 0.75, -0.47],
      })
    } else {
      removeNotif('gas_danger')
      removeNotif('gas_warn')
    }

    // ── Suhu ──────────────────────────────────────────────
    if (sensor.suhu > 32) {
      notifs.push({
        id: 'suhu_panas',
        type: 'hot',
        icon: '🔥',
        message: `Panas! ${sensor.suhu.toFixed(1)}°C`,
        position: [0.08, 0.75, 0.38],
      })
    } else if (sensor.suhu > 28) {
      notifs.push({
        id: 'suhu_hangat',
        type: 'warm',
        icon: '♨',
        message: `Hangat ${sensor.suhu.toFixed(1)}°C`,
        position: [0.08, 0.75, 0.38],
      })
    } else if (sensor.suhu < 20) {
      notifs.push({
        id: 'suhu_dingin',
        type: 'cold',
        icon: '❄',
        message: `Dingin! ${sensor.suhu.toFixed(1)}°C`,
        position: [0.08, 0.75, 0.38],
      })
    } else {
      removeNotif('suhu_panas')
      removeNotif('suhu_hangat')
      removeNotif('suhu_dingin')
    }

    // ── Fan ───────────────────────────────────────────────
    if (devices.fan_ruangtamu === 'ON') {
      notifs.push({
        id: 'fan_on',
        type: 'info',
        icon: '💨',
        message: 'Kipas menyala',
        position: [0.54, 0.75, 0.94],
      })
    } else {
      removeNotif('fan_on')
    }

    if (devices.fan_kamar === 'ON') {
      notifs.push({
        id: 'fan_kamar_on',
        type: 'info',
        icon: '💨',
        message: 'Kipas kamar menyala',
        position: [-0.78, 0.75, 0.44],
      })
    } else {
      removeNotif('fan_kamar_on')
    }

    if (devices.fan_dapur === 'ON') {
      notifs.push({
        id: 'fan_dapur_on',
        type: 'info',
        icon: '💨',
        message: 'Kipas dapur menyala',
        position: [0.66, 0.75, -0.46],
      })
    } else {
      removeNotif('fan_dapur_on')
    }

    notifs.forEach(addNotif)

  }, [
    sensor.suhu,
    sensor.gas,
    devices.fan_ruangtamu,
    devices.fan_kamar,
    devices.fan_dapur,
    addNotif,
    removeNotif,
  ])
}