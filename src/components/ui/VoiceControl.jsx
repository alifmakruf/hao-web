/**
 * VoiceControl.jsx
 * Kontrol suara untuk mengelola perangkat rumah.
 * Gunakan tombol mikrofon → bicara → AI parse → publish ke MQTT.
 *
 * Contoh perintah:
 *  "nyalakan lampu kamar 1"
 *  "matikan kipas ruang tamu"
 *  "nyalakan semua lampu"
 *  "ubah mode menjadi otomatis"
 *  "matikan semua"
 */

import { useState, useRef, useCallback } from 'react'
import { publishCommand, publishMode } from '../../hooks/useMQTT'
import { useHAOStore } from '../../store'
import { ref, set } from 'firebase/database'
import { db } from '../../firebase'

// ── Mapping nama alias ke device key di store ────────────────────────────────
const DEVICE_ALIASES = {
  // Lampu
  'lampu ruang tamu':         'lampu_ruangtamu',
  'lampu ruang keluarga':     'lampu_dapurdankeluarga',
  'lampu dapur':              'lampu_dapurdankeluarga',
  'lampu dapur dan keluarga': 'lampu_dapurdankeluarga',
  'lampu kamar 1':            'lampu_kamar1',
  'lampu kamar satu':         'lampu_kamar1',
  'lampu kamar 2':            'lampu_kamar2',
  'lampu kamar dua':          'lampu_kamar2',
  'lampu kamar 3':            'lampu_kamar3',
  'lampu kamar tiga':         'lampu_kamar3',
  'lampu teras':              'lampu_teras',
  'lampu gerbang':            'lampu_gerbang',
  'lampu garasi':             'lampu_garasi',
  // Kipas
  'kipas ruang tamu':         'fan_ruangtamu',
  'kipas kamar':              'fan_kamar',
  'kipas dapur':              'fan_dapur',
  'fan ruang tamu':           'fan_ruangtamu',
  'fan kamar':                'fan_kamar',
  'fan dapur':                'fan_dapur',
}

const ALL_LAMP_KEYS = [
  'lampu_ruangtamu','lampu_dapurdankeluarga',
  'lampu_kamar1','lampu_kamar2','lampu_kamar3',
  'lampu_teras','lampu_gerbang','lampu_garasi',
]
const ALL_FAN_KEYS  = ['fan_ruangtamu','fan_kamar','fan_dapur']
const ALL_KEYS      = [...ALL_LAMP_KEYS, ...ALL_FAN_KEYS]

// ── Parser sederhana (tanpa AI) ──────────────────────────────────────────────
function parseVoiceCommand(text) {
  const t = text.toLowerCase().trim()
  const actions = []

  // Deteksi intent ON / OFF
  const isOn  = /\b(nyala(kan)?|hidupkan|aktif(kan)?|on)\b/.test(t)
  const isOff = /\b(mati(kan)?|padam(kan)?|matiin|off)\b/.test(t)

  // Mode change
  const modeMatch = t.match(/\bmode\b.*(otomatis|auto|manual)/)
    || t.match(/(otomatis|auto|manual).*\bmode\b/)
    || t.match(/\bubah\b.*(otomatis|auto|manual)/)
    || t.match(/(otomatis|auto|manual)/)

  if (modeMatch) {
    const raw = modeMatch[1] || modeMatch[0]
    const mode = /otomatis|auto/.test(raw) ? 'auto' : 'manual'
    return [{ type: 'mode', mode }]
  }

  // "matikan semua" / "nyalakan semua"
  if (/\bsemua\b/.test(t)) {
    const state = isOff ? 'OFF' : 'ON'
    if (/\blampu\b/.test(t) && !/\bkipas\b/.test(t)) {
      ALL_LAMP_KEYS.forEach(k => actions.push({ type: 'device', device: k, state }))
    } else if (/\bkipas\b/.test(t) && !/\blampu\b/.test(t)) {
      ALL_FAN_KEYS.forEach(k => actions.push({ type: 'device', device: k, state }))
    } else {
      ALL_KEYS.forEach(k => actions.push({ type: 'device', device: k, state }))
    }
    return actions
  }

  // Cari alias perangkat spesifik
  const state = isOff ? 'OFF' : 'ON'
  for (const [alias, key] of Object.entries(DEVICE_ALIASES)) {
    if (t.includes(alias)) {
      actions.push({ type: 'device', device: key, state })
    }
  }

  return actions.length > 0 ? actions : [{ type: 'unknown', text }]
}

// ── Nama display untuk device key ───────────────────────────────────────────
const DEVICE_LABELS = {
  lampu_ruangtamu:        'Lampu Ruang Tamu',
  lampu_dapurdankeluarga: 'Lampu Dapur & Keluarga',
  lampu_kamar1:           'Lampu Kamar 1',
  lampu_kamar2:           'Lampu Kamar 2',
  lampu_kamar3:           'Lampu Kamar 3',
  lampu_teras:            'Lampu Teras',
  lampu_gerbang:          'Lampu Gerbang',
  lampu_garasi:           'Lampu Garasi',
  fan_ruangtamu:          'Kipas Ruang Tamu',
  fan_kamar:              'Kipas Kamar',
  fan_dapur:              'Kipas Dapur',
}

// ── Komponen ─────────────────────────────────────────────────────────────────
export function VoiceControl() {
  const [isListening, setIsListening]   = useState(false)
  const [transcript,  setTranscript]    = useState('')
  const [response,    setResponse]      = useState(null)   // { success, lines: [] }
  const [error,       setError]         = useState('')
  const [isOpen,      setIsOpen]        = useState(false)
  const recognitionRef                   = useRef(null)
  const { setMode, authRole } = useHAOStore()

  const canControl = authRole === 'admin' || authRole === 'guest'

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Browser tidak mendukung Web Speech API. Coba Chrome.')
      return
    }

    setError('')
    setResponse(null)
    setTranscript('')

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang           = 'id-ID'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.continuous     = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      let interim = ''
      let final   = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      setTranscript(final || interim)
    }

    recognition.onend = () => {
      setIsListening(false)
      // Ambil transcript terakhir dan proses
      setTranscript(prev => {
        if (prev) processCommand(prev)
        return prev
      })
    }

    recognition.onerror = (ev) => {
      setIsListening(false)
      if (ev.error === 'no-speech')     setError('Tidak ada suara terdeteksi. Coba lagi.')
      else if (ev.error === 'aborted') setError('Dibatalkan.')
      else setError(`Error: ${ev.error}`)
    }

    recognition.start()
  }, [canControl])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const processCommand = useCallback(async (text) => {
    if (!canControl) {
      setResponse({ success: false, lines: ['⚠️ Anda tidak punya izin kontrol.'] })
      return
    }

    const commands = parseVoiceCommand(text)
    const lines = []
    let hasSuccess = false

    for (const cmd of commands) {
      if (cmd.type === 'mode') {
        const ok = publishMode(cmd.mode)
        setMode(cmd.mode)
        const label = cmd.mode === 'auto' ? 'Otomatis' : 'Manual'
        try {
          await set(ref(db, 'hao/status/mode'), cmd.mode)
        } catch (err) {
          console.warn('[Voice] Gagal update mode ke Firebase:', err.message)
        }
        if (ok !== false) {
          lines.push(`✅ Mode diubah → ${label}`)
          hasSuccess = true
        } else {
          lines.push(`⚠️ Mode ${label} (MQTT offline, tetap disimpan)`)
          hasSuccess = true
        }
      } else if (cmd.type === 'device') {
        const label = DEVICE_LABELS[cmd.device] || cmd.device
        const newState = cmd.state

        // Update store lokal langsung dengan state yang benar (bukan toggle)
        useHAOStore.getState().setDevices((prev) => ({
          ...prev,
          [cmd.device]: newState,
        }))

        // Kirim MQTT ke ESP
        const ok = publishCommand(cmd.device, newState)

        // Update Firebase → supaya denah & sidebar ikut update via onValue listener
        try {
          await set(ref(db, `hao/status/${cmd.device}`), newState)
        } catch (err) {
          console.warn(`[Voice] Gagal update Firebase untuk ${cmd.device}:`, err.message)
        }

        if (ok !== false) {
          const icon = newState === 'ON' ? '💡' : '🔴'
          lines.push(`${icon} ${label} → ${newState}`)
          hasSuccess = true
        } else {
          lines.push(`⚠️ ${label} → ${newState} (antri, MQTT offline)`)
          hasSuccess = true
        }
      } else {
        lines.push(`❓ Perintah tidak dikenali: "${cmd.text}"`)
        lines.push('💬 Coba: "nyalakan lampu kamar 1" atau "ubah mode otomatis"')
      }
    }

    setResponse({ success: hasSuccess, lines })
  }, [canControl, setMode])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Kontrol Suara"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          width: 52, height: 52,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, rgba(29,158,117,0.95), rgba(20,120,90,0.95))',
          boxShadow: '0 4px 20px rgba(29,158,117,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(29,158,117,0.7), 0 0 0 1px rgba(255,255,255,0.15)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(29,158,117,0.5), 0 0 0 1px rgba(255,255,255,0.1)'
        }}
      >
        <MicIcon size={22} color="white" />
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      width: 340,
      borderRadius: 18,
      background: 'linear-gradient(160deg, rgba(8,14,28,0.97) 0%, rgba(12,20,40,0.97) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(29,158,117,0.15)',
      overflow: 'hidden',
      fontFamily: 'sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(29,158,117,0.2)',
            border: '1px solid rgba(29,158,117,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MicIcon size={14} color="rgba(29,158,117,1)" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Kontrol Suara</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Bahasa Indonesia</div>
          </div>
        </div>
        <button
          onClick={() => { setIsOpen(false); stopListening() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1,
            padding: 4, borderRadius: 6,
          }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 16px 0' }}>

        {/* Hint */}
        {!transcript && !response && !error && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Contoh Perintah
            </div>
            {[
              '"Nyalakan lampu kamar 1"',
              '"Matikan kipas ruang tamu"',
              '"Nyalakan semua lampu"',
              '"Ubah mode otomatis"',
              '"Matikan semua"',
            ].map((ex, i) => (
              <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
                {ex}
              </div>
            ))}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div style={{
            background: 'rgba(99,150,255,0.07)',
            border: '1px solid rgba(99,150,255,0.2)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(99,150,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isListening ? '🎙️ Mendengarkan...' : '📝 Transcript'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
              "{transcript}"
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div style={{
            background: response.success
              ? 'rgba(29,158,117,0.07)'
              : 'rgba(255,80,80,0.07)',
            border: `1px solid ${response.success ? 'rgba(29,158,117,0.25)' : 'rgba(255,80,80,0.25)'}`,
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: response.success ? 'rgba(29,158,117,0.9)' : 'rgba(255,100,100,0.9)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {response.success ? '✓ Perintah dijalankan' : '✗ Gagal'}
            </div>
            {response.lines.map((line, i) => (
              <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8 }}>
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,160,50,0.07)',
            border: '1px solid rgba(255,160,50,0.2)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,180,60,0.9)' }}>⚠️ {error}</div>
          </div>
        )}

        {!canControl && (
          <div style={{
            background: 'rgba(255,200,80,0.07)',
            border: '1px solid rgba(255,200,80,0.2)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: 'rgba(255,210,80,0.9)' }}>
              🔒 Login atau gunakan token untuk mengontrol perangkat.
            </div>
          </div>
        )}
      </div>

      {/* Footer — Tombol Talk */}
      <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 8 }}>
        <button
          onMouseDown={startListening}
          onMouseUp={isListening ? stopListening : undefined}
          onTouchStart={startListening}
          onTouchEnd={isListening ? stopListening : undefined}
          onClick={isListening ? stopListening : startListening}
          disabled={!canControl}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 12,
            border: 'none',
            cursor: canControl ? 'pointer' : 'not-allowed',
            background: isListening
              ? 'linear-gradient(135deg, rgba(220,50,50,0.9), rgba(180,30,30,0.9))'
              : canControl
                ? 'linear-gradient(135deg, rgba(29,158,117,0.9), rgba(20,120,90,0.9))'
                : 'rgba(255,255,255,0.06)',
            boxShadow: isListening
              ? '0 0 0 3px rgba(220,50,50,0.3), 0 4px 16px rgba(220,50,50,0.4)'
              : canControl
                ? '0 4px 16px rgba(29,158,117,0.35)'
                : 'none',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: canControl ? 'white' : 'rgba(255,255,255,0.3)',
            fontSize: 13, fontWeight: 600,
          }}
        >
          {isListening ? (
            <>
              <PulseRing />
              <MicIcon size={16} color="white" />
              Dengarkan... (lepas untuk stop)
            </>
          ) : (
            <>
              <MicIcon size={16} color={canControl ? 'white' : 'rgba(255,255,255,0.3)'} />
              Tekan &amp; Bicara
            </>
          )}
        </button>

        {(transcript || response) && (
          <button
            onClick={() => { setTranscript(''); setResponse(null); setError('') }}
            style={{
              width: 48, height: 48, borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Reset"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  )
}

// ── Ikon mic SVG ─────────────────────────────────────────────────────────────
function MicIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" fill={color} />
      <path d="M5 10a7 7 0 0014 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Animasi pulse saat listening ─────────────────────────────────────────────
function PulseRing() {
  return (
    <span style={{
      display: 'inline-block',
      width: 10, height: 10,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.9)',
      animation: 'voicePulse 1s ease-in-out infinite',
    }}>
      <style>{`
        @keyframes voicePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </span>
  )
}