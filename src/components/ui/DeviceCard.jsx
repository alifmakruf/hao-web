import { useHAOStore } from '../../store'
import { useDeviceStatus } from '../../hooks/useDeviceStatus'
import { ref, set } from 'firebase/database'
import { db } from '../../firebase'
import { publishCommand } from '../../hooks/useMQTT'

const DEVICES = [
  { key: 'lampu_ruangtamu',        label: 'Lampu Ruang Tamu',  icon: '💡' },
  { key: 'lampu_dapurdankeluarga', label: 'Lampu Dapur',       icon: '💡' },
  { key: 'lampu_kamar1',           label: 'Lampu Kamar 1',     icon: '💡' },
  { key: 'lampu_kamar2',           label: 'Lampu Kamar 2',     icon: '💡' },
  { key: 'lampu_kamar3',           label: 'Lampu Kamar 3',     icon: '💡' },
  { key: 'lampu_teras',            label: 'Lampu Teras',       icon: '💡' },
  { key: 'lampu_gerbang',          label: 'Lampu Gerbang',     icon: '💡' },
  { key: 'lampu_garasi',           label: 'Lampu Garasi',      icon: '💡' },
  { key: 'fan_ruangtamu',          label: 'Kipas Ruang Tamu',  icon: '🌀' },
  { key: 'fan_kamar',              label: 'Kipas Kamar',       icon: '🌀' },
  { key: 'fan_dapur',              label: 'Kipas Dapur',       icon: '🌀' },
]

const LAMP_KEYS = DEVICES.filter(d => d.key.startsWith('lampu')).map(d => d.key)
const FAN_KEYS  = DEVICES.filter(d => d.key.startsWith('fan')).map(d => d.key)

export function DeviceCard() {
  const { devices, mode, setDevices, authRole } = useHAOStore()
  const { toggleDevice } = useDeviceStatus()
  const isManual = mode === 'manual'

  // BUG FIX 1: canControl harus dipakai di semua disabled/onClick
  // BUG FIX 2: viewer tidak boleh interaksi sama sekali (bukan hanya disabled visual)
  const canControl = authRole === 'admin' || authRole === 'guest'

  // Tombol bisa diklik hanya jika: bisa kontrol DAN mode manual
  const canClick = canControl && isManual

  const allLampsOn = LAMP_KEYS.every(k => devices[k] === 'ON')
  const allFansOn  = FAN_KEYS.every(k => devices[k] === 'ON')

  const toggleAllLamps = async () => {
    if (!canClick) return
    const newState = allLampsOn ? 'OFF' : 'ON'
    try {
      const updates = {}
      LAMP_KEYS.forEach(k => { updates[k] = newState })
      setDevices(prev => ({ ...prev, ...updates }))
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
      await Promise.all(FAN_KEYS.map(k => set(ref(db, `hao/status/${k}`), newState)))
      FAN_KEYS.forEach(k => { try { publishCommand(k, newState) } catch {} })
    } catch (err) {
      console.warn('[DeviceCard] Gagal toggle all fans:', err.message)
    }
  }

  // Banner info sesuai kondisi
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
          <span>💡</span>
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
          <span>🌀</span>
          <span>{allFansOn ? 'Matikan Semua' : 'Nyalakan Semua'}</span>
        </button>
      </div>

      {/* Grid device individual */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {DEVICES.map(({ key, label, icon }) => {
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
                background: isOn ? 'rgba(255,220,100,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isOn ? 'rgba(255,200,80,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10, color: 'white',
                cursor: canClick ? 'pointer' : 'not-allowed',
                opacity: canClick ? 1 : 0.5,
                transition: 'all 0.2s', fontFamily: 'sans-serif',
              }}
            >
              <span style={{
                fontSize: 20,
                filter: isOn ? 'none' : 'grayscale(1) opacity(0.4)',
                transition: 'filter 0.3s',
              }}>{icon}</span>
              <span style={{ fontSize: 10, opacity: 0.8, textAlign: 'center' }}>{label}</span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isOn ? '#fbbf24' : 'rgba(255,255,255,0.4)',
              }}>{isOn ? 'ON' : 'OFF'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
