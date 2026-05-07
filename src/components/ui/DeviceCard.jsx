import { useHAOStore } from '../../store'
import { useDeviceStatus } from '../../hooks/useDeviceStatus'

const DEVICES = [
  { key: 'lampu_ruangtamu',        label: 'Lampu Ruang Tamu',    icon: '💡' },
  { key: 'lampu_dapurdankeluarga', label: 'Lampu Dapur',         icon: '💡' },
  { key: 'lampu_kamar1',           label: 'Lampu Kamar 1',       icon: '💡' },
  { key: 'lampu_kamar2',           label: 'Lampu Kamar 2',       icon: '💡' },
  { key: 'lampu_kamar3',           label: 'Lampu Kamar 3',       icon: '💡' },
  { key: 'lampu_teras',            label: 'Lampu Teras',         icon: '💡' },
  { key: 'lampu_gerbang',          label: 'Lampu Gerbang',       icon: '💡' },
  { key: 'lampu_garasi',           label: 'Lampu Garasi',        icon: '💡' },
  { key: 'fan_ruangtamu',          label: 'Kipas Ruang Tamu',    icon: '🌀' },
  { key: 'fan_kamar',              label: 'Kipas Kamar',         icon: '🌀' },
  { key: 'fan_dapur',              label: 'Kipas Dapur',         icon: '🌀' },
]

export function DeviceCard() {
  const { devices, mode } = useHAOStore()
  const { toggleDevice } = useDeviceStatus()
  const isManual = mode === 'manual'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{
        margin: '0 0 4px',
        fontSize: 11,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>Perangkat</p>

      {!isManual && (
        <p style={{
          fontSize: 11,
          color: 'rgba(255,200,80,0.8)',
          fontFamily: 'sans-serif',
          margin: '0 0 4px',
          padding: '6px 8px',
          background: 'rgba(255,200,80,0.1)',
          borderRadius: 8,
          border: '1px solid rgba(255,200,80,0.2)',
        }}>
          Switch ke mode Manual untuk kontrol manual
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {DEVICES.map(({ key, label, icon }) => {
          const isOn = devices[key] === 'ON'
          return (
            <button
              key={key}
              onClick={() => toggleDevice(key)}
              disabled={!isManual}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 8px',
                background: isOn
                  ? 'rgba(255,220,100,0.2)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isOn
                  ? 'rgba(255,200,80,0.5)'
                  : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10,
                color: 'white',
                cursor: isManual ? 'pointer' : 'not-allowed',
                opacity: isManual ? 1 : 0.6,
                transition: 'all 0.2s',
                fontFamily: 'sans-serif',
              }}
            >
              <span style={{
                fontSize: 20,
                filter: isOn ? 'none' : 'grayscale(1) opacity(0.4)',
                transition: 'filter 0.3s',
              }}>{icon}</span>
              <span style={{ fontSize: 10, opacity: 0.8, textAlign: 'center' }}>{label}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: isOn ? '#fbbf24' : 'rgba(255,255,255,0.4)',
              }}>
                {isOn ? 'ON' : 'OFF'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}