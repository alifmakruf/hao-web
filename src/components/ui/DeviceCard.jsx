import { Lightbulb, Wind } from 'lucide-react'
import { useHAOStore } from '../../store'
import { useDeviceStatus } from '../../hooks/useDeviceStatus'
import { ref, set } from 'firebase/database'
import { db } from '../../firebase'
import { publishCommand } from '../../hooks/useMQTT'
import { logBulkToggle } from '../../hooks/useActivityLog'

const DEVICES = [
  { key: 'lampu_ruangtamu',        label: 'Lampu Ruang Tamu',  type: 'lampu' },
  { key: 'lampu_dapurdankeluarga', label: 'Lampu Dapur',       type: 'lampu' },
  { key: 'lampu_kamar1',           label: 'Lampu Kamar 1',     type: 'lampu' },
  { key: 'lampu_kamar2',           label: 'Lampu Kamar 2',     type: 'lampu' },
  { key: 'lampu_kamar3',           label: 'Lampu Kamar 3',     type: 'lampu' },
  { key: 'lampu_teras',            label: 'Lampu Teras',       type: 'lampu' },
  { key: 'lampu_gerbang',          label: 'Lampu Gerbang',     type: 'lampu' },
  { key: 'lampu_garasi',           label: 'Lampu Garasi',      type: 'lampu' },
  { key: 'fan_ruangtamu',          label: 'Kipas Ruang Tamu',  type: 'fan'   },
  { key: 'fan_kamar',              label: 'Kipas Kamar',       type: 'fan'   },
  { key: 'fan_dapur',              label: 'Kipas Dapur',       type: 'fan'   },
]

const LAMP_KEYS = DEVICES.filter(d => d.type === 'lampu').map(d => d.key)
const FAN_KEYS  = DEVICES.filter(d => d.type === 'fan').map(d => d.key)

function DeviceIcon({ type, isOn, size = 20 }) {
  if (type === 'lampu') {
    return (
      <Lightbulb
        size={size}
        color={isOn ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
        fill={isOn ? '#fbbf2440' : 'none'}
        strokeWidth={1.8}
        style={{ transition: 'color 0.3s, fill 0.3s' }}
      />
    )
  }
  return (
    <Wind
      size={size}
      color={isOn ? '#60cfff' : 'rgba(255,255,255,0.25)'}
      strokeWidth={1.8}
      style={{ transition: 'color 0.3s' }}
    />
  )
}

export function DeviceCard() {
  const { devices, mode, setDevices, authRole } = useHAOStore()
  const { toggleDevice } = useDeviceStatus()
  const isManual = mode === 'manual'

  const canControl = authRole === 'admin' || authRole === 'guest'
  const canClick   = canControl && isManual

  const allLampsOn = LAMP_KEYS.every(k => devices[k] === 'ON')
  const allFansOn  = FAN_KEYS.every(k => devices[k] === 'ON')

  const toggleAllLamps = async () => {
    if (!canClick) return
    const newState = allLampsOn ? 'OFF' : 'ON'
    try {
      const updates = {}
      LAMP_KEYS.forEach(k => { updates[k] = newState })
      setDevices(prev => ({ ...prev, ...updates }))
      logBulkToggle('lampu', newState)
      await Promise.all(LAMP_KEYS.map(k => set(ref(db, `hao/status/${k}`), newState)))
      LAMP_KEYS.forEach(k => { try { publishCommand(k, newState) } catch {} })
    } catch (err) {
      console.warn('[DeviceCard] Gagal toggle all lamps:', err.message)
    }
  }

  const toggleAllFans = async () => {
    if (!canClick) return
    const newState = allFansOn ? 'OFF' : 'ON'
    try {
      const updates = {}
      FAN_KEYS.forEach(k => { updates[k] = newState })
      setDevices(prev => ({ ...prev, ...updates }))
      logBulkToggle('fan', newState)
      await Promise.all(FAN_KEYS.map(k => set(ref(db, `hao/status/${k}`), newState)))
      FAN_KEYS.forEach(k => { try { publishCommand(k, newState) } catch {} })
    } catch (err) {
      console.warn('[DeviceCard] Gagal toggle all fans:', err.message)
    }
  }

  const getBanner = () => {
    if (!canControl) return {
      text: 'Login untuk mengontrol perangkat',
      color: 'rgba(255,200,80,0.8)',
      bg: 'rgba(255,200,80,0.08)',
      border: 'rgba(255,200,80,0.2)',
    }
    if (!isManual) return {
      text: 'Switch ke mode Manual untuk kontrol manual',
      color: 'rgba(255,200,80,0.8)',
      bg: 'rgba(255,200,80,0.1)',
      border: 'rgba(255,200,80,0.2)',
    }
    return null
  }

  const banner = getBanner()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {banner && (
        <div style={{
          fontSize: 11, color: banner.color,
          fontFamily: 'sans-serif', padding: '6px 8px',
          background: banner.bg, borderRadius: 8,
          border: `1px solid ${banner.border}`,
        }}>
          {banner.text}
        </div>
      )}

      {/* Tombol select all */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={toggleAllLamps}
          disabled={!canClick}
          style={{
            flex: 1, padding: '7px 6px',
            background: allLampsOn ? 'rgba(255,220,100,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${allLampsOn ? 'rgba(255,200,80,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8, color: 'white',
            fontSize: 11, fontFamily: 'sans-serif',
            cursor: canClick ? 'pointer' : 'not-allowed',
            opacity: canClick ? 1 : 0.4,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <Lightbulb size={13} color={allLampsOn ? '#fbbf24' : 'currentColor'} strokeWidth={2} />
          <span>{allLampsOn ? 'Matikan Semua' : 'Nyalakan Semua'}</span>
        </button>

        <button
          onClick={toggleAllFans}
          disabled={!canClick}
          style={{
            flex: 1, padding: '7px 6px',
            background: allFansOn ? 'rgba(100,200,255,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${allFansOn ? 'rgba(100,200,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8, color: 'white',
            fontSize: 11, fontFamily: 'sans-serif',
            cursor: canClick ? 'pointer' : 'not-allowed',
            opacity: canClick ? 1 : 0.4,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <Wind size={13} color={allFansOn ? '#60cfff' : 'currentColor'} strokeWidth={2} />
          <span>{allFansOn ? 'Matikan Semua' : 'Nyalakan Semua'}</span>
        </button>
      </div>

      {/* Grid device individual */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {DEVICES.map(({ key, label, type }) => {
          const isOn = devices[key] === 'ON'
          return (
            <button
              key={key}
              onClick={() => canClick && toggleDevice(key)}
              disabled={!canClick}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                padding: '10px 8px',
                background: isOn
                  ? type === 'lampu' ? 'rgba(255,220,100,0.2)' : 'rgba(100,200,255,0.2)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isOn
                  ? type === 'lampu' ? 'rgba(255,200,80,0.5)' : 'rgba(100,200,255,0.5)'
                  : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10, color: 'white',
                cursor: canClick ? 'pointer' : 'not-allowed',
                opacity: canClick ? 1 : 0.5,
                transition: 'all 0.2s', fontFamily: 'sans-serif',
              }}
            >
              <DeviceIcon type={type} isOn={isOn} size={20} />
              <span style={{ fontSize: 10, opacity: 0.8, textAlign: 'center' }}>{label}</span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isOn
                  ? type === 'lampu' ? '#fbbf24' : '#60cfff'
                  : 'rgba(255,255,255,0.4)',
              }}>{isOn ? 'ON' : 'OFF'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
