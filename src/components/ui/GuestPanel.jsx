import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useHAOStore } from '../../store'

export function GuestPanel({ onClose }) {
  const { authRole } = useHAOStore()
  const { loginGuest, logoutGuest } = useAuth()
  const [token, setToken]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoad]  = useState(false)

  const handleSubmit = async () => {
    setError(''); setLoad(true)
    const res = await loginGuest(token)
    setLoad(false)
    if (!res.ok) setError(res.error)
    else onClose?.()
  }

  if (authRole === 'guest') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'sans-serif' }}>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(99,184,255,0.1)', border: '1px solid rgba(99,184,255,0.25)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Login sebagai</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#63b8ff' }}>👥 Guest</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Akses: semua fitur kecuali Create Token</div>
        </div>
        <button
          onClick={logoutGuest}
          style={{
            width: '100%', padding: '8px', background: 'rgba(226,75,74,0.7)',
            border: 'none', borderRadius: 8, color: 'white', fontSize: 12,
            cursor: 'pointer', fontWeight: 600,
          }}>
          Logout Guest
        </button>
      </div>
    )
  }

  if (authRole === 'admin') {
    return (
      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Kamu sudah login sebagai Admin — tidak perlu token Guest.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 10, color: 'rgba(99,184,255,0.7)', padding: '5px 8px', background: 'rgba(99,184,255,0.07)', borderRadius: 7, border: '1px solid rgba(99,184,255,0.15)' }}>
        Masukkan token dari admin untuk akses kontrol
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Token Akses
        </div>
        <input
          style={{
            width: '100%', padding: '7px 10px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, color: 'white', fontSize: 12,
            outline: 'none', fontFamily: 'monospace',
            boxSizing: 'border-box', letterSpacing: '0.1em',
          }}
          value={token}
          onChange={e => setToken(e.target.value.toUpperCase())}
          placeholder="HAO-XXXXXX"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      {error && (
        <div style={{ fontSize: 11, color: '#E24B4A', padding: '4px 8px', background: 'rgba(226,75,74,0.1)', borderRadius: 6 }}>
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%', padding: '8px',
          background: 'rgba(99,184,255,0.7)',
          border: 'none', borderRadius: 8, color: 'white',
          fontSize: 12, cursor: 'pointer', fontWeight: 600,
        }}>
        {loading ? 'Memverifikasi...' : 'Submit Token'}
      </button>
    </div>
  )
}
