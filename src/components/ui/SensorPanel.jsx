import { useHAOStore } from '../../store'

const SENSOR_CONFIG = [
  {
    key:   'suhu',
    label: 'Suhu',
    unit:  '°C',
    icon:  '🌡',
    getColor: (v) => v > 32 ? '#D85A30' : v > 28 ? '#EF9F27' : v < 20 ? '#378ADD' : '#1D9E75',
    getBg:    (v) => v > 32 ? '#FAECE7' : v > 28 ? '#FAEEDA' : v < 20 ? '#E6F1FB' : '#E1F5EE',
  },
  {
    key:   'ldr',
    label: 'Cahaya',
    unit:  '',
    icon:  '☀',
    getColor: (v) => v > 700 ? '#EF9F27' : v < 200 ? '#534AB7' : '#1D9E75',
    getBg:    (v) => v > 700 ? '#FAEEDA' : v < 200 ? '#EEEDFE' : '#E1F5EE',
    format:   (v) => v > 700 ? 'Terang' : v < 200 ? 'Gelap' : 'Normal',
  },
  {
    key:   'gas',
    label: 'Gas',
    unit:  '',
    icon:  '💨',
    getColor: (v) => v > 800 ? '#E24B4A' : v > 400 ? '#EF9F27' : '#1D9E75',
    getBg:    (v) => v > 800 ? '#FCEBEB' : v > 400 ? '#FAEEDA' : '#E1F5EE',
    format:   (v) => v > 800 ? 'Bahaya!' : v > 400 ? 'Waspada' : 'Aman',
  },
]

export function SensorPanel() {
  const { sensor, alasan } = useHAOStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {SENSOR_CONFIG.map(({ key, label, unit, icon, getColor, getBg, format }) => {
        const value = sensor[key] ?? 0
        const color = getColor(value)
        const bg    = getBg(value)
        const display = format ? format(value) : `${value.toFixed(1)}${unit}`

        return (
          <div key={key} style={{
            background: bg,
            border: `1px solid ${color}`,
            borderRadius: 10,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color, fontFamily: 'sans-serif' }}>
                {label}
              </span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'sans-serif' }}>
              {display}
            </span>
          </div>
        )
      })}

      {/* Alasan dari decision engine */}
      {alasan && (
        <div style={{
          marginTop: 4,
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.06)',
          borderRadius: 8,
          fontSize: 11,
          color: 'rgba(255,255,255,0.7)',
          fontFamily: 'sans-serif',
          fontStyle: 'italic',
        }}>
          n8n: {alasan.replace(/_/g, ' ').toLowerCase()}
        </div>
      )}
    </div>
  )
}