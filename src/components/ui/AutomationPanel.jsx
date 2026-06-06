import { useState } from 'react'
import { useHAOStore } from '../../store'
import { useAutomation } from '../../hooks/useAutomation'

const ALL_DEVICES = [
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

const DAYS = [
  { value: 1, label: 'Sen' },
  { value: 2, label: 'Sel' },
  { value: 3, label: 'Rab' },
  { value: 4, label: 'Kam' },
  { value: 5, label: 'Jum' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Min' },
]

const TIMEZONES = ['WIB', 'WITA', 'WIT']

function emptyTimeForm() {
  return {
    type: 'time',
    name: '',
    days: 'semua',
    selectedDays: [],
    startHour: 6, startMinute: 0,
    endHour: 18,  endMinute: 0,
    devices: [],
  }
}

function emptyLdrForm() {
  return {
    type: 'ldr',
    name: '',
    condition: 'mendung',
    devices: [],
  }
}

export function AutomationPanel() {
  const { automations, timezone, setTimezone, mode } = useHAOStore()
  const { addAutomation, deleteAutomation, toggleAutomation } = useAutomation()

  const [showForm, setShowForm]   = useState(false)
  const [formType, setFormType]   = useState('time') // 'time' | 'ldr'
  const [form, setForm]           = useState(emptyTimeForm())
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const switchFormType = (type) => {
    setFormType(type)
    setForm(type === 'time' ? emptyTimeForm() : emptyLdrForm())
    setError('')
  }

  const toggleDevice = (key) => {
    setForm(f => ({
      ...f,
      devices: f.devices.includes(key)
        ? f.devices.filter(d => d !== key)
        : [...f.devices, key],
    }))
  }

  const toggleDay = (val) => {
    setForm(f => {
      const days = f.selectedDays.includes(val)
        ? f.selectedDays.filter(d => d !== val)
        : [...f.selectedDays, val]
      return { ...f, selectedDays: days, days: days.length === 0 ? 'semua' : days }
    })
  }

  const validate = () => {
    if (!form.name.trim()) return 'Nama aturan wajib diisi'
    if (form.devices.length === 0) return 'Pilih minimal 1 perangkat'
    if (form.type === 'time') {
      const start = form.startHour * 60 + form.startMinute
      const end   = form.endHour   * 60 + form.endMinute
      if (start === end) return 'Waktu mulai dan selesai tidak boleh sama'
    }
    return ''
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)

    const rule = form.type === 'time'
      ? {
          type:        'time',
          name:        form.name.trim(),
          days:        form.selectedDays.length === 0 ? 'semua' : form.selectedDays,
          startHour:   form.startHour,
          startMinute: form.startMinute,
          endHour:     form.endHour,
          endMinute:   form.endMinute,
          devices:     form.devices,
        }
      : {
          type:      'ldr',
          name:      form.name.trim(),
          condition: form.condition,
          devices:   form.devices,
        }

    const ok = await addAutomation(rule)
    setLoading(false)
    if (ok) {
      setShowForm(false)
      setForm(emptyTimeForm())
    } else {
      setError('Gagal menyimpan aturan')
    }
  }

  const pad = (n) => String(n).padStart(2, '0')
  const fmtTime = (h, m) => `${pad(h)}:${pad(m)}`
  const fmtDays = (days) => {
    if (days === 'semua' || !Array.isArray(days)) return 'Setiap hari'
    const names = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
    return days.map(d => names[d]).join(', ')
  }

  const isAuto = mode === 'auto'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'sans-serif' }}>

      {/* Timezone selector */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Zona Waktu</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TIMEZONES.map(tz => (
            <button
              key={tz}
              onClick={() => setTimezone(tz)}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11,
                background: timezone === tz ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${timezone === tz ? '#1D9E75' : 'rgba(255,255,255,0.1)'}`,
                color: timezone === tz ? '#1D9E75' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
            >{tz}</button>
          ))}
        </div>
      </div>

      {/* Note prioritas */}
      <div style={{
        padding: '6px 10px', borderRadius: 8, fontSize: 11,
        background: 'rgba(99,184,255,0.08)',
        border: '1px solid rgba(99,184,255,0.2)',
        color: 'rgba(99,184,255,0.8)',
      }}>
        ⚡ Prioritas: Waktu &gt; Kondisi Cahaya. Di luar aturan → perangkat OFF.
      </div>

      {!isAuto && (
        <div style={{
          padding: '6px 10px', borderRadius: 8, fontSize: 11,
          background: 'rgba(255,200,80,0.08)',
          border: '1px solid rgba(255,200,80,0.2)',
          color: 'rgba(255,200,80,0.8)',
        }}>
          Switch ke mode Otomatis agar aturan dijalankan
        </div>
      )}

      {/* List aturan */}
      {automations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          Belum ada aturan. Tambahkan di bawah.
        </div>
      )}

      {automations.map((rule) => (
        <div key={rule.id} style={{
          padding: '8px 10px',
          background: rule.enabled !== false
            ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${rule.enabled !== false
            ? 'rgba(29,158,117,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'white', marginBottom: 2 }}>
                {rule.type === 'time' ? '⏰' : '☀'} {rule.name}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                {rule.type === 'time'
                  ? `${fmtTime(rule.startHour, rule.startMinute)} – ${fmtTime(rule.endHour, rule.endMinute)} · ${fmtDays(rule.days)}`
                  : `Cahaya ${rule.condition} · 08:00–17:00`
                }
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {(rule.devices || []).length} perangkat aktif
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
              {/* Toggle enable */}
              <button
                onClick={() => toggleAutomation(rule.id, rule.enabled !== false)}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: 'none',
                  background: rule.enabled !== false
                    ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.08)',
                  color: rule.enabled !== false ? '#1D9E75' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                {rule.enabled !== false ? '✓' : '○'}
              </button>
              {/* Hapus */}
              <button
                onClick={() => deleteAutomation(rule.id)}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: 'none',
                  background: 'rgba(226,75,74,0.15)',
                  color: '#E24B4A', cursor: 'pointer', fontSize: 13,
                }}
              >🗑</button>
            </div>
          </div>
        </div>
      ))}

      {/* Tombol tambah */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px', borderRadius: 10,
            background: 'rgba(29,158,117,0.15)',
            border: '1px dashed rgba(29,158,117,0.4)',
            color: '#1D9E75', cursor: 'pointer',
            fontSize: 12, fontFamily: 'sans-serif',
          }}
        >+ Tambah Aturan</button>
      )}

      {/* Form tambah */}
      {showForm && (
        <div style={{
          padding: '12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Pilih tipe */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['time','ldr'].map(t => (
              <button
                key={t}
                onClick={() => switchFormType(t)}
                style={{
                  flex: 1, padding: '6px',
                  borderRadius: 8, fontSize: 12,
                  background: formType === t ? 'rgba(99,184,255,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${formType === t ? 'rgba(99,184,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: 'white', cursor: 'pointer',
                }}
              >
                {t === 'time' ? '⏰ Waktu' : '☀ Kondisi Cahaya'}
              </button>
            ))}
          </div>

          {/* Nama */}
          <div>
            <div style={labelStyle}>Nama Aturan</div>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="cth: Lampu malam hari"
              style={inputStyle}
            />
          </div>

          {/* Form waktu */}
          {formType === 'time' && (
            <>
              {/* Hari */}
              <div>
                <div style={labelStyle}>Hari (kosong = setiap hari)</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {DAYS.map(({ value, label }) => {
                    const sel = form.selectedDays.includes(value)
                    return (
                      <button
                        key={value}
                        onClick={() => toggleDay(value)}
                        style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 11,
                          background: sel ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${sel ? '#1D9E75' : 'rgba(255,255,255,0.1)'}`,
                          color: sel ? '#1D9E75' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                        }}
                      >{label}</button>
                    )
                  })}
                </div>
              </div>

              {/* Jam mulai - selesai */}
                <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <div style={labelStyle}>Mulai</div>
                    <input
                    type="time"
                    value={`${String(form.startHour).padStart(2,'0')}:${String(form.startMinute).padStart(2,'0')}`}
                    onChange={e => {
                        const [h, m] = e.target.value.split(':').map(Number)
                        setForm(f => ({ ...f, startHour: h, startMinute: m }))
                    }}
                    style={{
                        ...inputStyle,
                        width: '100%',
                        colorScheme: 'dark',
                    }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={labelStyle}>Selesai</div>
                    <input
                    type="time"
                    value={`${String(form.endHour).padStart(2,'0')}:${String(form.endMinute).padStart(2,'0')}`}
                    onChange={e => {
                        const [h, m] = e.target.value.split(':').map(Number)
                        setForm(f => ({ ...f, endHour: h, endMinute: m }))
                    }}
                    style={{
                        ...inputStyle,
                        width: '100%',
                        colorScheme: 'dark',
                    }}
                    />
                </div>
                </div>
            </>
          )}

          {/* Form LDR */}
          {formType === 'ldr' && (
            <div>
              <div style={labelStyle}>Kondisi Cahaya</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['cerah','mendung'].map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, condition: c }))}
                    style={{
                      flex: 1, padding: '6px',
                      borderRadius: 8, fontSize: 12,
                      background: form.condition === c ? 'rgba(239,159,39,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${form.condition === c ? '#EF9F27' : 'rgba(255,255,255,0.1)'}`,
                      color: form.condition === c ? '#EF9F27' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                    }}
                  >
                    {c === 'cerah' ? '☀ Cerah' : '☁ Mendung'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                Hanya aktif pukul 08:00–17:00
              </div>
            </div>
          )}

          {/* Pilih perangkat */}
          <div>
            <div style={labelStyle}>Perangkat yang Nyala</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {ALL_DEVICES.map(({ key, label, icon }) => {
                const sel = form.devices.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleDevice(key)}
                    style={{
                      padding: '5px 6px',
                      borderRadius: 7, fontSize: 10,
                      background: sel ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${sel ? '#1D9E75' : 'rgba(255,255,255,0.08)'}`,
                      color: sel ? '#1D9E75' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span>{icon}</span>
                    <span style={{ fontSize: 9 }}>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: 11, color: '#E24B4A', padding: '4px 6px',
              background: 'rgba(226,75,74,0.1)', borderRadius: 6 }}>
              {error}
            </div>
          )}

          {/* Aksi form */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 1, padding: '8px',
                background: 'rgba(29,158,117,0.8)',
                border: 'none', borderRadius: 8,
                color: 'white', fontSize: 12,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: 'rgba(255,255,255,0.6)',
                fontSize: 12, cursor: 'pointer',
              }}
            >Batal</button>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  fontSize: 10, color: 'rgba(255,255,255,0.4)',
  marginBottom: 4, fontFamily: 'sans-serif',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}
const inputStyle = {
  width: '100%', padding: '6px 10px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 7, color: 'white', fontSize: 12,
  outline: 'none', fontFamily: 'sans-serif',
  boxSizing: 'border-box',
}