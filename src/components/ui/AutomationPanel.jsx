import { useState } from 'react'
import { useHAOStore } from '../../store'
import { useAutomation } from '../../hooks/useAutomation'

const LAMP_DEVICES = [
  { key: 'lampu_ruangtamu',        label: 'Lampu Ruang Tamu', icon: '💡' },
  { key: 'lampu_dapurdankeluarga', label: 'Lampu Dapur',      icon: '💡' },
  { key: 'lampu_kamar1',           label: 'Lampu Kamar 1',    icon: '💡' },
  { key: 'lampu_kamar2',           label: 'Lampu Kamar 2',    icon: '💡' },
  { key: 'lampu_kamar3',           label: 'Lampu Kamar 3',    icon: '💡' },
  { key: 'lampu_teras',            label: 'Lampu Teras',      icon: '💡' },
  { key: 'lampu_gerbang',          label: 'Lampu Gerbang',    icon: '💡' },
  { key: 'lampu_garasi',           label: 'Lampu Garasi',     icon: '💡' },
]

const FAN_DEVICES = [
  { key: 'fan_ruangtamu', label: 'Kipas Ruang Tamu', room: 'ruangtamu' },
  { key: 'fan_kamar',     label: 'Kipas Kamar',      room: 'kamar'     },
  { key: 'fan_dapur',     label: 'Kipas Dapur',      room: 'dapur'     },
]

const ROOM_LABELS = { ruangtamu: 'Ruang Tamu', kamar: 'Kamar', dapur: 'Dapur' }

const DAYS = [
  { value: 1, label: 'Sen' }, { value: 2, label: 'Sel' },
  { value: 3, label: 'Rab' }, { value: 4, label: 'Kam' },
  { value: 5, label: 'Jum' }, { value: 6, label: 'Sab' },
  { value: 0, label: 'Min' },
]

const TIMEZONES = ['WIB', 'WITA', 'WIT']

function emptyTimeForm() {
  return { type: 'time', name: '', selectedDays: [], startHour: 6, startMinute: 0, endHour: 18, endMinute: 0, devices: [] }
}
function emptyLdrForm() {
  return { type: 'ldr', name: '', condition: 'mendung', devices: [] }
}
function emptyTempForm() {
  return { type: 'temp', name: '', fanKey: 'fan_kamar', presetId: '' }
}
function emptyPresetForm() {
  return { name: '', threshold: { ruangtamu: 30, kamar: 30, dapur: 30 } }
}

// ── Tab: Aturan Otomasi ───────────────────────────────────────
function AutomationTab() {
  const { automations, tempPresets, timezone, setTimezone, mode } = useHAOStore()
  const { addAutomation, deleteAutomation, toggleAutomation } = useAutomation()

  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('time')
  const [form, setForm]         = useState(emptyTimeForm())
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const switchType = (t) => {
    setFormType(t)
    setForm(t === 'time' ? emptyTimeForm() : t === 'ldr' ? emptyLdrForm() : emptyTempForm())
    setError('')
  }

  const toggleDevice = (key) =>
    setForm(f => ({
      ...f,
      devices: f.devices?.includes(key)
        ? f.devices.filter(d => d !== key)
        : [...(f.devices || []), key],
    }))

  const toggleDay = (val) =>
    setForm(f => {
      const days = f.selectedDays.includes(val)
        ? f.selectedDays.filter(d => d !== val)
        : [...f.selectedDays, val]
      return { ...f, selectedDays: days }
    })

  const validate = () => {
    if (!form.name.trim()) return 'Nama aturan wajib diisi'
    if (form.type === 'time' || form.type === 'ldr') {
      if (!form.devices?.length) return 'Pilih minimal 1 perangkat'
    }
    if (form.type === 'time') {
      const s = form.startHour * 60 + form.startMinute
      const e = form.endHour   * 60 + form.endMinute
      if (s === e) return 'Waktu mulai dan selesai tidak boleh sama'
    }
    if (form.type === 'temp') {
      if (!form.presetId) return 'Pilih preset suhu'
    }
    return ''
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError(''); setLoading(true)

    let rule
    if (form.type === 'time') {
      rule = {
        type: 'time', name: form.name.trim(),
        days: form.selectedDays.length === 0 ? 'semua' : form.selectedDays,
        startHour: form.startHour, startMinute: form.startMinute,
        endHour: form.endHour, endMinute: form.endMinute,
        devices: form.devices,
      }
    } else if (form.type === 'ldr') {
      rule = { type: 'ldr', name: form.name.trim(), condition: form.condition, devices: form.devices }
    } else {
      rule = { type: 'temp', name: form.name.trim(), fanKey: form.fanKey, presetId: form.presetId }
    }

    const ok = await addAutomation(rule)
    setLoading(false)
    if (ok) { setShowForm(false); setForm(emptyTimeForm()) }
    else setError('Gagal menyimpan')
  }

  const pad = (n) => String(n).padStart(2, '0')
  const fmtTime = (h, m) => `${pad(h)}:${pad(m)}`
  const fmtDays = (days) => {
    if (days === 'semua' || !Array.isArray(days)) return 'Setiap hari'
    return days.map(d => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d]).join(', ')
  }
  const getPresetName = (id) => tempPresets.find(p => p.id === id)?.name ?? '?'
  const getFanLabel   = (key) => FAN_DEVICES.find(f => f.key === key)?.label ?? key

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Timezone */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Zona Waktu</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TIMEZONES.map(tz => (
            <button key={tz} onClick={() => setTimezone(tz)} style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 11,
              background: timezone === tz ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${timezone === tz ? '#1D9E75' : 'rgba(255,255,255,0.1)'}`,
              color: timezone === tz ? '#1D9E75' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}>{tz}</button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, background: 'rgba(99,184,255,0.08)', border: '1px solid rgba(99,184,255,0.2)', color: 'rgba(99,184,255,0.8)' }}>
        ⚡ Prioritas: Waktu &gt; Cahaya &gt; Suhu. Di luar aturan → perangkat OFF.
      </div>

      {mode !== 'auto' && (
        <div style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.2)', color: 'rgba(255,200,80,0.8)' }}>
          Switch ke mode Otomatis agar aturan dijalankan
        </div>
      )}

      {/* List aturan */}
      {automations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          Belum ada aturan.
        </div>
      )}

      {automations.map(rule => (
        <div key={rule.id} style={{
          padding: '8px 10px',
          background: rule.enabled !== false ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${rule.enabled !== false ? 'rgba(29,158,117,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'white', marginBottom: 2 }}>
                {rule.type === 'time' ? '⏰' : rule.type === 'ldr' ? '☀' : '🌡'} {rule.name}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                {rule.type === 'time' && `${fmtTime(rule.startHour, rule.startMinute)} – ${fmtTime(rule.endHour, rule.endMinute)} · ${fmtDays(rule.days)}`}
                {rule.type === 'ldr'  && `Cahaya ${rule.condition} · 08:00–17:00`}
                {rule.type === 'temp' && `${getFanLabel(rule.fanKey)} · Preset: ${getPresetName(rule.presetId)}`}
              </div>
              {rule.type !== 'temp' && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {(rule.devices || []).length} perangkat
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
              <button onClick={() => toggleAutomation(rule.id, rule.enabled !== false)} style={{
                width: 28, height: 28, borderRadius: 7, border: 'none',
                background: rule.enabled !== false ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.08)',
                color: rule.enabled !== false ? '#1D9E75' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 13,
              }}>{rule.enabled !== false ? '✓' : '○'}</button>
              <button onClick={() => deleteAutomation(rule.id)} style={{
                width: 28, height: 28, borderRadius: 7, border: 'none',
                background: 'rgba(226,75,74,0.15)', color: '#E24B4A', cursor: 'pointer', fontSize: 13,
              }}>🗑</button>
            </div>
          </div>
        </div>
      ))}

      {/* Tombol tambah */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{
          padding: '8px', borderRadius: 10,
          background: 'rgba(29,158,117,0.15)', border: '1px dashed rgba(29,158,117,0.4)',
          color: '#1D9E75', cursor: 'pointer', fontSize: 12,
        }}>+ Tambah Aturan</button>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Tipe */}
          <div style={{ display: 'flex', gap: 5 }}>
            {[
              { t: 'time', label: '⏰ Waktu' },
              { t: 'ldr',  label: '☀ Cahaya' },
              { t: 'temp', label: '🌡 Suhu' },
            ].map(({ t, label }) => (
              <button key={t} onClick={() => switchType(t)} style={{
                flex: 1, padding: '6px', borderRadius: 8, fontSize: 11,
                background: formType === t ? 'rgba(99,184,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${formType === t ? 'rgba(99,184,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: 'white', cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>

          {/* Nama */}
          <div>
            <div style={labelStyle}>Nama Aturan</div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="cth: Lampu malam hari" style={inputStyle} />
          </div>

          {/* Form Waktu */}
          {formType === 'time' && (
            <>
              <div>
                <div style={labelStyle}>Hari (kosong = setiap hari)</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {DAYS.map(({ value, label }) => {
                    const sel = form.selectedDays.includes(value)
                    return (
                      <button key={value} onClick={() => toggleDay(value)} style={{
                        padding: '4px 8px', borderRadius: 6, fontSize: 11,
                        background: sel ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${sel ? '#1D9E75' : 'rgba(255,255,255,0.1)'}`,
                        color: sel ? '#1D9E75' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
                      }}>{label}</button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Mulai</div>
                  <input type="time"
                    value={`${pad(form.startHour)}:${pad(form.startMinute)}`}
                    onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setForm(f => ({ ...f, startHour: h, startMinute: m })) }}
                    style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Selesai</div>
                  <input type="time"
                    value={`${pad(form.endHour)}:${pad(form.endMinute)}`}
                    onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setForm(f => ({ ...f, endHour: h, endMinute: m })) }}
                    style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
              </div>
              <div>
                <div style={labelStyle}>Perangkat yang Nyala</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[...LAMP_DEVICES, ...FAN_DEVICES.map(f => ({ key: f.key, label: f.label, icon: '🌀' }))].map(({ key, label, icon }) => {
                    const sel = form.devices?.includes(key)
                    return (
                      <button key={key} onClick={() => toggleDevice(key)} style={{
                        padding: '5px 6px', borderRadius: 7, fontSize: 10,
                        background: sel ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${sel ? '#1D9E75' : 'rgba(255,255,255,0.08)'}`,
                        color: sel ? '#1D9E75' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <span>{icon}</span><span style={{ fontSize: 9 }}>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Form LDR */}
          {formType === 'ldr' && (
            <>
              <div>
                <div style={labelStyle}>Kondisi Cahaya</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['cerah','mendung'].map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, condition: c }))} style={{
                      flex: 1, padding: '6px', borderRadius: 8, fontSize: 12,
                      background: form.condition === c ? 'rgba(239,159,39,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${form.condition === c ? '#EF9F27' : 'rgba(255,255,255,0.1)'}`,
                      color: form.condition === c ? '#EF9F27' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
                    }}>{c === 'cerah' ? '☀ Cerah' : '☁ Mendung'}</button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Aktif pukul 08:00–17:00</div>
              </div>
              <div>
                <div style={labelStyle}>Lampu yang Nyala</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {LAMP_DEVICES.map(({ key, label }) => {
                    const sel = form.devices?.includes(key)
                    return (
                      <button key={key} onClick={() => toggleDevice(key)} style={{
                        padding: '5px 6px', borderRadius: 7, fontSize: 10,
                        background: sel ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${sel ? '#1D9E75' : 'rgba(255,255,255,0.08)'}`,
                        color: sel ? '#1D9E75' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <span>💡</span><span style={{ fontSize: 9 }}>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Form Suhu */}
          {formType === 'temp' && (
            <>
              <div>
                <div style={labelStyle}>Kipas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {FAN_DEVICES.map(({ key, label, room }) => (
                    <button key={key} onClick={() => setForm(f => ({ ...f, fanKey: key }))} style={{
                      padding: '7px 10px', borderRadius: 8, fontSize: 12, textAlign: 'left',
                      background: form.fanKey === key ? 'rgba(99,184,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${form.fanKey === key ? 'rgba(99,184,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: form.fanKey === key ? '#63b8ff' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      <span>🌀 {label}</span>
                      <span style={{ fontSize: 10, opacity: 0.6 }}>DHT: {ROOM_LABELS[room]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Preset Suhu</div>
                {tempPresets.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    Belum ada preset. Buat di tab Preset Suhu dulu.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {tempPresets.map(p => {
                      const room   = FAN_DEVICES.find(f => f.key === form.fanKey)?.room ?? 'kamar'
                      const thresh = p.threshold?.[room] ?? 30
                      return (
                        <button key={p.id} onClick={() => setForm(f => ({ ...f, presetId: p.id }))} style={{
                          padding: '7px 10px', borderRadius: 8, fontSize: 12, textAlign: 'left',
                          background: form.presetId === p.id ? 'rgba(239,159,39,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${form.presetId === p.id ? 'rgba(239,159,39,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          color: form.presetId === p.id ? '#EF9F27' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between',
                        }}>
                          <span>🌡 {p.name}</span>
                          <span style={{ fontSize: 10, opacity: 0.7 }}>&gt;{thresh}°C</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: 11, color: '#E24B4A', padding: '4px 6px', background: 'rgba(226,75,74,0.1)', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 1, padding: '8px', background: 'rgba(29,158,117,0.8)',
              border: 'none', borderRadius: 8, color: 'white', fontSize: 12, cursor: 'pointer',
            }}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
            <button onClick={() => { setShowForm(false); setError('') }} style={{
              padding: '8px 14px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer',
            }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Preset Suhu ─────────────────────────────────────────
function PresetTab() {
  const { tempPresets } = useHAOStore()
  const { addTempPreset, deleteTempPreset } = useAutomation()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyPresetForm())
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nama preset wajib diisi'); return }
    const thresh = form.threshold
    if (Object.values(thresh).some(v => v < 10 || v > 50)) {
      setError('Threshold harus antara 10–50°C'); return
    }
    setError(''); setLoading(true)
    const ok = await addTempPreset({ name: form.name.trim(), threshold: thresh })
    setLoading(false)
    if (ok) { setShowForm(false); setForm(emptyPresetForm()) }
    else setError('Gagal menyimpan preset')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {tempPresets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          Belum ada preset suhu.
        </div>
      )}

      {tempPresets.map(p => (
        <div key={p.id} style={{
          padding: '8px 10px',
          background: 'rgba(239,159,39,0.08)',
          border: '1px solid rgba(239,159,39,0.2)',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'white', marginBottom: 4 }}>
                🌡 {p.name}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(p.threshold || {}).map(([room, val]) => (
                  <span key={room} style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 12,
                    background: 'rgba(239,159,39,0.15)',
                    border: '1px solid rgba(239,159,39,0.25)',
                    color: '#EF9F27',
                  }}>
                    {ROOM_LABELS[room] ?? room}: &gt;{val}°C
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => deleteTempPreset(p.id)} style={{
              width: 28, height: 28, borderRadius: 7, border: 'none',
              background: 'rgba(226,75,74,0.15)', color: '#E24B4A',
              cursor: 'pointer', fontSize: 13, flexShrink: 0,
            }}>🗑</button>
          </div>
        </div>
      ))}

      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{
          padding: '8px', borderRadius: 10,
          background: 'rgba(239,159,39,0.12)', border: '1px dashed rgba(239,159,39,0.4)',
          color: '#EF9F27', cursor: 'pointer', fontSize: 12,
        }}>+ Tambah Preset Suhu</button>
      )}

      {showForm && (
        <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={labelStyle}>Nama Preset</div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="cth: Panas Kamar" style={inputStyle} />
          </div>

          {/* Threshold per ruangan */}
          {['ruangtamu','kamar','dapur'].map(room => (
            <div key={room}>
              <div style={labelStyle}>Threshold {ROOM_LABELS[room]} (°C)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range" min="10" max="50"
                  value={form.threshold[room]}
                  onChange={e => setForm(f => ({
                    ...f,
                    threshold: { ...f.threshold, [room]: Number(e.target.value) }
                  }))}
                  style={{ flex: 1, accentColor: '#EF9F27' }}
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#EF9F27', minWidth: 42, fontFamily: 'sans-serif' }}>
                  &gt;{form.threshold[room]}°C
                </span>
              </div>
            </div>
          ))}

          {error && (
            <div style={{ fontSize: 11, color: '#E24B4A', padding: '4px 6px', background: 'rgba(226,75,74,0.1)', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 1, padding: '8px', background: 'rgba(239,159,39,0.7)',
              border: 'none', borderRadius: 8, color: 'white', fontSize: 12, cursor: 'pointer',
            }}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
            <button onClick={() => { setShowForm(false); setError('') }} style={{
              padding: '8px 14px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer',
            }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export function AutomationPanel() {
  const [tab, setTab] = useState('rules') // 'rules' | 'presets'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'sans-serif' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3 }}>
        {[
          { id: 'rules',   label: '⚡ Aturan' },
          { id: 'presets', label: '🌡 Preset Suhu' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '6px', borderRadius: 7, fontSize: 11,
            background: tab === id ? 'rgba(255,255,255,0.12)' : 'transparent',
            border: 'none', color: tab === id ? 'white' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontWeight: tab === id ? 600 : 400,
            transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'rules'   && <AutomationTab />}
      {tab === 'presets' && <PresetTab />}
    </div>
  )
}

const pad = (n) => String(n).padStart(2, '0')
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