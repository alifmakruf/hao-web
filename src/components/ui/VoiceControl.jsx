/**
 * VoiceControl.jsx
 * FAB mic di tengah bawah.
 * Saat diklik → panel kecil horizontal muncul di samping kiri icon.
 * Panel setinggi icon (52px), memanjang ke kiri.
 * Membuka panel otomatis menutup sidebar kiri & kanan (via onOpenChange + onCloseSidebars).
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { publishCommand, publishMode } from '../../hooks/useMQTT'
import { useHAOStore } from '../../store'
import { ref, set } from 'firebase/database'
import { db } from '../../firebase'

// Tinggi FAB & panel (px)
const FAB_SIZE = 52
// Gap antara panel dan FAB
const PANEL_GAP = 10
// Jarak dari bawah layar
const BOTTOM_OFFSET = 24

// Lebar panel responsif: maks 420px, tapi sisakan margin + FAB + gap
function getPanelWidth() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 420
  return Math.min(420, vw - FAB_SIZE - PANEL_GAP - 32)
}

// ── Mapping nama alias ke device key di store ────────────────────────────────
const DEVICE_ALIASES = {
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

function parseVoiceCommand(text) {
  const t = text.toLowerCase().trim()
  const actions = []

  const isOn  = /\b(nyala(kan)?|hidupkan|aktif(kan)?|on)\b/.test(t)
  const isOff = /\b(mati(kan)?|padam(kan)?|matiin|off)\b/.test(t)

  const modeMatch = t.match(/\bmode\b.*(otomatis|auto|manual)/)
    || t.match(/(otomatis|auto|manual).*\bmode\b/)
    || t.match(/\bubah\b.*(otomatis|auto|manual)/)
    || t.match(/(otomatis|auto|manual)/)

  if (modeMatch) {
    const raw = modeMatch[1] || modeMatch[0]
    const mode = /otomatis|auto/.test(raw) ? 'auto' : 'manual'
    return [{ type: 'mode', mode }]
  }

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

  const state = isOff ? 'OFF' : 'ON'
  for (const [alias, key] of Object.entries(DEVICE_ALIASES)) {
    if (t.includes(alias)) {
      actions.push({ type: 'device', device: key, state })
    }
  }

  return actions.length > 0 ? actions : [{ type: 'unknown', text }]
}

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
export function VoiceControl({ onOpenChange, onCloseSidebars }) {
  const [isListening, setIsListening]   = useState(false)
  const [transcript,  setTranscript]    = useState('')
  const [response,    setResponse]      = useState(null)
  const [error,       setError]         = useState('')
  const [isOpen,      setIsOpen]        = useState(false)
  const [panelWidth,  setPanelWidth]    = useState(getPanelWidth)
  const recognitionRef                   = useRef(null)
  const { setMode, authRole } = useHAOStore()

  useEffect(() => {
    const onResize = () => setPanelWidth(getPanelWidth())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const canControl = authRole === 'admin' || authRole === 'guest'

  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  const handleOpen = () => {
    // Tutup sidebar kiri & kanan sebelum buka panel
    onCloseSidebars?.()
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    recognitionRef.current?.stop()
    setIsListening(false)
  }

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
      setTranscript(prev => {
        if (prev) processCommand(prev)
        return prev
      })
    }

    recognition.onerror = (ev) => {
      setIsListening(false)
      if (ev.error === 'no-speech')    setError('Tidak ada suara terdeteksi. Coba lagi.')
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

        useHAOStore.getState().setDevices((prev) => ({
          ...prev,
          [cmd.device]: newState,
        }))

        const ok = publishCommand(cmd.device, newState)

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

  // Total lebar gabungan panel + gap + FAB
  // Saat tertutup → hanya FAB (52px), centered
  // Saat terbuka  → panel + gap + FAB, semua group di-center
  const totalWidth = isOpen ? panelWidth + PANEL_GAP + FAB_SIZE : FAB_SIZE

  return (
    <div
      style={{
        position: 'fixed',
        bottom: BOTTOM_OFFSET,
        left: '50%',
        // Geser group agar selalu centered
        transform: `translateX(-${totalWidth / 2}px)`,
        transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        alignItems: 'center',
        gap: PANEL_GAP,
        zIndex: 99999,
        fontFamily: 'sans-serif',
      }}
    >
      {/* ── Panel horizontal (muncul di kiri FAB) ── */}
      <div
        style={{
          width: isOpen ? panelWidth : 0,
          height: FAB_SIZE,
          overflow: 'hidden',
          transition: 'width 0.32s cubic-bezier(0.4,0,0.2,1)',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(8,14,28,0.98) 0%, rgba(12,20,40,0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: isOpen ? '1px solid rgba(255,255,255,0.1)' : 'none',
          boxShadow: isOpen ? '0 4px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(29,158,117,0.15)' : 'none',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {/* Inner panel — lebar fixed agar konten tidak squish saat animasi */}
        <div style={{
          width: panelWidth,
          height: FAB_SIZE,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px 0 14px',
          gap: 8,
          flexShrink: 0,
        }}>

          {/* Tombol mic kecil (push-to-talk) */}
          <button
            onMouseDown={canControl ? startListening : undefined}
            onMouseUp={canControl && isListening ? stopListening : undefined}
            onMouseLeave={canControl && isListening ? stopListening : undefined}
            onTouchStart={canControl ? (e) => { e.preventDefault(); startListening() } : undefined}
            onTouchEnd={canControl && isListening ? (e) => { e.preventDefault(); stopListening() } : undefined}
            onTouchCancel={canControl && isListening ? stopListening : undefined}
            disabled={!canControl}
            title={isListening ? 'Lepas untuk kirim' : 'Tahan untuk bicara'}
            style={{
              flexShrink: 0,
              width: 34, height: 34,
              borderRadius: '50%',
              border: 'none',
              cursor: canControl ? 'pointer' : 'not-allowed',
              background: isListening
                ? 'linear-gradient(135deg, rgba(220,50,50,0.9), rgba(180,30,30,0.9))'
                : canControl
                  ? 'linear-gradient(135deg, rgba(29,158,117,0.9), rgba(20,120,90,0.9))'
                  : 'rgba(255,255,255,0.06)',
              boxShadow: isListening
                ? '0 0 0 3px rgba(220,50,50,0.3)'
                : canControl ? '0 2px 10px rgba(29,158,117,0.4)' : 'none',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {isListening ? <PulseRing /> : <MicIcon size={15} color={canControl ? 'white' : 'rgba(255,255,255,0.3)'} />}
          </button>

          {/* Area teks — transcript / response / hint */}
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            {/* Hint awal */}
            {!transcript && !response && !error && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {canControl ? 'Tahan mic untuk bicara…' : '🔒 Login untuk mengontrol perangkat'}
              </div>
            )}

            {/* Listening state */}
            {isListening && !transcript && (
              <div style={{ fontSize: 12, color: 'rgba(99,150,255,0.8)', whiteSpace: 'nowrap' }}>
                🎙️ Mendengarkan…
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ color: 'rgba(99,150,255,0.7)', fontSize: 10, marginRight: 4 }}>
                  {isListening ? '🎙️' : '📝'}
                </span>
                "{transcript}"
              </div>
            )}

            {/* Response lines */}
            {response && !transcript && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden' }}>
                {response.lines.slice(0, 2).map((line, i) => (
                  <div key={i} style={{
                    fontSize: 11,
                    color: response.success ? 'rgba(29,200,150,0.9)' : 'rgba(255,120,120,0.9)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {line}
                  </div>
                ))}
                {response.lines.length > 2 && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    +{response.lines.length - 2} lainnya
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ fontSize: 11, color: 'rgba(255,180,60,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Reset button — hanya tampil kalau ada transcript/response */}
          {(transcript || response) && (
            <button
              onClick={() => { setTranscript(''); setResponse(null); setError('') }}
              title="Reset"
              style={{
                flexShrink: 0,
                width: 26, height: 26,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ↺
            </button>
          )}

          {/* Tombol tutup panel */}
          <button
            onClick={handleClose}
            title="Tutup"
            style={{
              flexShrink: 0,
              width: 26, height: 26,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* ── FAB mic utama ── */}
      <button
        // Saat panel belum terbuka → klik buka panel
        onClick={!isOpen ? handleOpen : undefined}
        // Saat panel terbuka → push-to-talk
        onMouseDown={isOpen && canControl ? startListening : undefined}
        onMouseUp={isOpen && canControl && isListening ? stopListening : undefined}
        onMouseLeave={isOpen && canControl && isListening ? stopListening : undefined}
        onTouchStart={isOpen && canControl ? (e) => { e.preventDefault(); startListening() } : undefined}
        onTouchEnd={isOpen && canControl && isListening ? (e) => { e.preventDefault(); stopListening() } : undefined}
        onTouchCancel={isOpen && canControl && isListening ? stopListening : undefined}
        title={!isOpen ? 'Buka Voice Control' : isListening ? 'Lepas untuk kirim' : 'Tahan untuk bicara'}
        style={{
          flexShrink: 0,
          width: FAB_SIZE, height: FAB_SIZE,
          borderRadius: '50%',
          border: 'none',
          background: isListening
            ? 'linear-gradient(135deg, rgba(220,50,50,0.95), rgba(180,30,30,0.95))'
            : isOpen
              ? 'linear-gradient(135deg, rgba(20,100,75,0.95), rgba(15,80,60,0.95))'
              : 'linear-gradient(135deg, rgba(29,158,117,0.95), rgba(20,120,90,0.95))',
          boxShadow: isListening
            ? '0 0 0 4px rgba(220,50,50,0.35), 0 4px 20px rgba(220,50,50,0.4)'
            : isOpen
              ? '0 4px 20px rgba(29,158,117,0.3), 0 0 0 2px rgba(29,158,117,0.4)'
              : '0 4px 20px rgba(29,158,117,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onMouseEnter={e => { if (!isListening) e.currentTarget.style.transform = 'scale(1.1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {isListening ? <PulseRing size={18} /> : <MicIcon size={22} color="white" />}
      </button>
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