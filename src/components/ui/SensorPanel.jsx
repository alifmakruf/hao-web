import { useHAOStore } from '../../store'

function getTempColor(v) {
  return v > 32 ? '#D85A30' : v > 28 ? '#EF9F27' : v < 20 ? '#378ADD' : '#1D9E75'
}
function getTempBg(v) {
  return v > 32 ? '#FAECE7' : v > 28 ? '#FAEEDA' : v < 20 ? '#E6F1FB' : '#E1F5EE'
}

const SENSOR_CONFIG = [
  {
    key: 'ldr', label: 'Cahaya', icon: '☀',
    getColor: (v) => v > 700 ? '#EF9F27' : v < 200 ? '#534AB7' : '#1D9E75',
    getBg:    (v) => v > 700 ? '#FAEEDA' : v < 200 ? '#EEEDFE' : '#E1F5EE',
    format:   (v) => v > 700 ? 'Terang' : v < 200 ? 'Gelap' : 'Normal',
  },
  {
    key: 'gas', label: 'Gas', icon: '💨',
    getColor: (v) => v > 800 ? '#E24B4A' : v > 400 ? '#EF9F27' : '#1D9E75',
    getBg:    (v) => v > 800 ? '#FCEBEB' : v > 400 ? '#FAEEDA' : '#E1F5EE',
    format:   (v) => v > 800 ? 'Bahaya!' : v > 400 ? 'Waspada' : 'Aman',
  },
]

const TEMP_ROOMS = [
  { key: 'ruangtamu', label: 'Ruang Tamu' },
  { key: 'kamar',     label: 'Kamar'      },
  { key: 'dapur',     label: 'Dapur'      },
]

export function SensorPanel() {
  const { sensor, sensorRuangan } = useHAOStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Suhu per ruangan */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '8px 12px',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
          fontFamily: 'sans-serif', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          🌡 Suhu Ruangan
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {TEMP_ROOMS.map(({ key, label }) => {
            const suhu  = sensorRuangan?.[key]?.suhu ?? sensor.suhu
            const color = getTempColor(suhu)
            const bg    = getTempBg(suhu)
            return (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
                background: bg, borderRadius: 7,
                padding: '5px 10px',
                border: `1px solid ${color}44`,
              }}>
                <span style={{ fontSize: 11, color, fontFamily: 'sans-serif', fontWeight: 500 }}>
                  {label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'sans-serif' }}>
                  {suhu.toFixed(1)}°C
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* LDR dan Gas */}
      {SENSOR_CONFIG.map(({ key, label, icon, getColor, getBg, format }) => {
        const value = sensor[key] ?? 0
        const color = getColor(value)
        const bg    = getBg(value)
        return (
          <div key={key} style={{
            background: bg, border: `1px solid ${color}`,
            borderRadius: 10, padding: '8px 12px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color, fontFamily: 'sans-serif' }}>
                {label}
              </span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'sans-serif' }}>
              {format(value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}