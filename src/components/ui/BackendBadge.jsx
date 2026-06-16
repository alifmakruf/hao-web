/**
 * components/ui/BackendBadge.jsx
 * ─────────────────────────────────────────────────────────────
 * Badge kecil yang tampil di connection status bar,
 * menunjukkan backend aktif: Firebase/HiveMQ atau VM/Mosquitto.
 *
 * Klik untuk switch backend (akan reload halaman supaya semua
 * service — MQTT, DB, Auth — re-init dengan backend baru).
 */

import { useState } from 'react'
import { ACTIVE_BACKEND, switchBackend } from '../../config/backend'

export function BackendBadge() {
  const isVM = ACTIVE_BACKEND === 'vm'
  const [confirming, setConfirming] = useState(false)

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    switchBackend(isVM ? 'firebase' : 'vm')
  }

  return (
    <button
      onClick={handleClick}
      title={
        confirming
          ? `Klik lagi untuk pindah ke ${isVM ? 'Cloud (Firebase)' : 'VM'} — halaman akan reload`
          : `Backend aktif: ${isVM ? 'VM' : 'Cloud (Firebase)'}. Klik untuk ganti.`
      }
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          4,
        padding:      '2px 8px',
        borderRadius: 99,
        fontSize:     11,
        fontWeight:   600,
        background:   confirming
          ? 'rgba(255,255,255,0.18)'
          : isVM ? 'rgba(59,130,246,0.18)' : 'rgba(251,146,60,0.18)',
        color:        confirming
          ? '#ffffff'
          : isVM ? '#93c5fd' : '#fdba74',
        border:       `1px solid ${confirming ? 'rgba(255,255,255,0.4)' : (isVM ? 'rgba(59,130,246,0.35)' : 'rgba(251,146,60,0.35)')}`,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'sans-serif',
        outline: 'none',
      }}
    >
      {confirming ? `↔️ Pindah ke ${isVM ? 'Cloud' : 'VM'}?` : (isVM ? '🖥️ VM' : '☁️ Cloud')}
    </button>
  )
}
