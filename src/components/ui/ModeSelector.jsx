import { useHAOStore } from '../../store'
import { useDeviceStatus } from '../../hooks/useDeviceStatus'

const MODES = [
  { id: 'manual', label: 'Manual',   desc: 'Kontrol langsung dari web', icon: '👆' },
  { id: 'auto',   label: 'Otomatis', desc: 'Berdasarkan aturan setting', icon: '⚡' },
]

export function ModeSelector() {
  const { mode, authRole } = useHAOStore()
  const { changeMode } = useDeviceStatus()
  const canControl = authRole === 'admin' || authRole === 'guest'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {MODES.map(({ id, label, desc, icon }) => {
        const isActive = mode === id
        return (
          <button
            key={id}
            onClick={() => canControl && changeMode(id)}
            disabled={!canControl}
            style={{ cursor: canControl ? 'pointer' : 'not-allowed', opacity: (!canControl && !isActive) ? 0.5 : 1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10, color: 'white',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s', fontFamily: 'sans-serif',
            }}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>{label}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{desc}</div>
            </div>
            {isActive && (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#4ade80', boxShadow: '0 0 6px #4ade80',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}