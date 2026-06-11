import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useHAOStore } from '../../store'

export function TokenPanel({ onClose }) {
  const { authRole, guestToken } = useHAOStore()
  const { createToken } = useAuth()
  const [loading, setLoad]   = useState(false)
  const [error, setError]    = useState('')
  const [newToken, setNew]   = useState(null)
  const [copied, setCopied]  = useState(false)

  if (authRole !== 'admin') return null

  const handleCreate = async () => {
    setError(''); setLoad(true); setNew(null); setCopied(false)
    const res = await createToken()
    setLoad(false)
    if (!res.ok) setError(res.error)
    else setNew(res.token)
  }

  const handleCopy = () => {
    const t = newToken || guestToken
    if (!t) return
    navigator.clipboard.writeText(t).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const displayToken = newToken || guestToken

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,200,80,0.8)', padding: '5px 8px', background: 'rgba(255,200,80,0.07)', borderRadius: 7, border: '1px solid rgba(255,200,80,0.2)' }}>
        ⚠ Generate token baru akan menghapus token lama. Guest yang sedang aktif akan di-kick otomatis.
      </div>

      {/* Token aktif */}
      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Token Aktif Saat Ini
        </div>
        {displayToken ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              flex: 1, fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
              color: newToken ? '#1D9E75' : '#63b8ff', letterSpacing: '0.12em',
            }}>
              {displayToken}
            </span>
            <button
              onClick={handleCopy}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11,
                background: copied ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${copied ? 'rgba(29,158,117,0.5)' : 'rgba(255,255,255,0.15)'}`,
                color: copied ? '#1D9E75' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Belum ada token aktif</div>
        )}
        {newToken && (
          <div style={{ fontSize: 10, color: '#1D9E75', marginTop: 4 }}>✓ Token baru berhasil dibuat</div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#E24B4A', padding: '4px 8px', background: 'rgba(226,75,74,0.1)', borderRadius: 6 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading}
        style={{
          width: '100%', padding: '8px',
          background: loading ? 'rgba(255,200,80,0.3)' : 'rgba(255,200,80,0.7)',
          border: 'none', borderRadius: 8, color: 'white',
          fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
          transition: 'all 0.2s',
        }}>
        {loading ? 'Membuat Token...' : '🔑 Generate Token Baru'}
      </button>
    </div>
  )
}
