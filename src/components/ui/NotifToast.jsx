import { useEffect, useState } from 'react'
import { useHAOStore } from '../../store'

// Toast notification yang muncul di pojok kanan atas
// Khusus untuk kondisi darurat (gas tinggi, suhu ekstrem)
export function NotifToast() {
  const { sensor } = useHAOStore()
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const newToasts = []

    if (sensor.gas > 800) {
      newToasts.push({
        id: 'gas_emergency',
        type: 'danger',
        title: 'Bahaya Gas!',
        body: `Kadar gas sangat tinggi: ${sensor.gas}. Ventilasi ruangan segera!`,
        icon: '☠',
      })
    }
    if (sensor.suhu > 35) {
      newToasts.push({
        id: 'suhu_extreme',
        type: 'warning',
        title: 'Suhu Ekstrem',
        body: `Suhu mencapai ${sensor.suhu.toFixed(1)}°C. Kipas dinyalakan otomatis.`,
        icon: '🔥',
      })
    }

    setToasts(newToasts)
  }, [sensor.gas, sensor.suhu])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 280,
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            display: 'flex',
            gap: 10,
            padding: '10px 14px',
            background: toast.type === 'danger'
              ? 'rgba(226,75,74,0.95)'
              : 'rgba(186,117,23,0.95)',
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            animation: 'slideIn 0.3s ease',
            fontFamily: 'sans-serif',
          }}
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>{toast.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{toast.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{toast.body}</div>
          </div>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </div>
  )
}