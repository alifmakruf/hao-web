import { useEffect } from 'react'
import { useHAOStore } from '../store'

export function useSimsNotif() {
  const { sensor, addNotif, removeNotif } = useHAOStore()

  useEffect(() => {
    // ── Gas saja — kipas & suhu sudah punya indikator di denah ──
    if (sensor.gas > 800) {
      addNotif({
        id: 'gas_danger',
        type: 'danger',
        icon: '☠',
        message: 'Gas berbahaya!',
        position: [-0.24, 0.75, -0.47],
      })
      removeNotif('gas_warn')
      removeNotif('gas_aman')
    } else if (sensor.gas > 400) {
      addNotif({
        id: 'gas_warn',
        type: 'warning',
        icon: '⚠',
        message: 'Kadar gas meningkat',
        position: [-0.24, 0.75, -0.47],
      })
      removeNotif('gas_danger')
      removeNotif('gas_aman')
    } else {
      addNotif({
        id: 'gas_aman',
        type: 'info',
        icon: '#',
        message: `${sensor.gas}`,
        position: [-0.24, 0.75, -0.47],
      })
      removeNotif('gas_danger')
      removeNotif('gas_warn')
    }
  }, [sensor.gas, addNotif, removeNotif])
}
