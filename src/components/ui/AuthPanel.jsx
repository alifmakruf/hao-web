import { UserCircle, Lock, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useHAOStore } from '../../store'

const inputStyle = {
  width: '100%', padding: '7px 10px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, color: 'white', fontSize: 12,
  outline: 'none', fontFamily: 'sans-serif',
  boxSizing: 'border-box',
}
const btnStyle = (color = '#1D9E75') => ({
  width: '100%', padding: '8px',
  background: `${color}cc`,
  border: 'none', borderRadius: 8,
  color: 'white', fontSize: 12,
  cursor: 'pointer', fontWeight: 600,
  transition: 'opacity 0.2s',
})
const labelStyle = {
  fontSize: 10, color: 'rgba(255,255,255,0.4)',
  marginBottom: 4, textTransform: 'uppercase',
  letterSpacing: '0.06em',
}
const sectionStyle = (active) => ({
  flex: 1, padding: '6px', borderRadius: 7, fontSize: 11,
  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
  border: 'none', color: active ? 'white' : 'rgba(255,255,255,0.4)',
  cursor: 'pointer', fontWeight: active ? 600 : 400,
  transition: 'all 0.2s',
})

export function AuthPanel({ onClose }) {
  const { authRole, authUser } = useHAOStore()
  const { login, logout, register } = useAuth()
  const [tab, setTab] = useState('login')

  // Login state
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginErr,  setLoginErr]  = useState('')
  const [loginLoad, setLoginLoad] = useState(false)

  // Regis state
  const [regUser, setRegUser]   = useState('')
  const [regPass, setRegPass]   = useState('')
  const [regCode, setRegCode]   = useState('')
  const [regErr,  setRegErr]    = useState('')
  const [regLoad, setRegLoad]   = useState(false)
  const [regOk,   setRegOk]     = useState(false)

  const handleLogin = async () => {
    setLoginErr(''); setLoginLoad(true)
    const res = await login(loginUser, loginPass)
    setLoginLoad(false)
    if (!res.ok) setLoginErr(res.error)
    else onClose?.()
  }

  const handleRegis = async () => {
    setRegErr(''); setRegLoad(true)
    const res = await register(regUser, regPass, regCode)
    setRegLoad(false)
    if (!res.ok) setRegErr(res.error)
    else { setRegOk(true); setTimeout(() => { setTab('login'); setRegOk(false) }, 1500) }
  }

  // Kalau sudah login sebagai admin
  if (authRole === 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'sans-serif' }}>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Login sebagai</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>
            <UserCircle size={14} strokeWidth={2} style={{display:"inline",verticalAlign:"middle",marginRight:5}} />{authUser?.username ?? 'Admin'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Role: Administrator</div>
        </div>
        <button onClick={logout} style={{ ...btnStyle('#E24B4A'), marginTop: 2 }}>
          Logout
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'sans-serif' }}>
      {/* Tab header */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3 }}>
        <button style={sectionStyle(tab === 'login')} onClick={() => { setTab('login'); setLoginErr('') }}>
          <Lock size={11} strokeWidth={2} style={{display:"inline",verticalAlign:"middle",marginRight:4}} />Login
        </button>
        <button style={sectionStyle(tab === 'regis')} onClick={() => { setTab('regis'); setRegErr('') }}>
          <UserPlus size={11} strokeWidth={2} style={{display:"inline",verticalAlign:"middle",marginRight:4}} />Registrasi
        </button>
      </div>

      {tab === 'login' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, color: 'rgba(99,184,255,0.7)', padding: '5px 8px', background: 'rgba(99,184,255,0.07)', borderRadius: 7, border: '1px solid rgba(99,184,255,0.15)' }}>
            Login khusus Administrator
          </div>
          <div>
            <div style={labelStyle}>Username</div>
            <input style={inputStyle} value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              placeholder="username"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div>
            <div style={labelStyle}>Password</div>
            <input style={inputStyle} type="password" value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              placeholder="••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {loginErr && (
            <div style={{ fontSize: 11, color: '#E24B4A', padding: '4px 8px', background: 'rgba(226,75,74,0.1)', borderRadius: 6 }}>
              {loginErr}
            </div>
          )}
          <button style={btnStyle()} onClick={handleLogin} disabled={loginLoad}>
            {loginLoad ? 'Memproses...' : 'Login'}
          </button>
        </div>
      )}

      {tab === 'regis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,200,80,0.7)', padding: '5px 8px', background: 'rgba(255,200,80,0.07)', borderRadius: 7, border: '1px solid rgba(255,200,80,0.15)' }}>
            Butuh kode verifikasi untuk daftar
          </div>
          <div>
            <div style={labelStyle}>Username</div>
            <input style={inputStyle} value={regUser}
              onChange={e => setRegUser(e.target.value)} placeholder="username" />
          </div>
          <div>
            <div style={labelStyle}>Password</div>
            <input style={inputStyle} type="password" value={regPass}
              onChange={e => setRegPass(e.target.value)} placeholder="min. 6 karakter" />
          </div>
          <div>
            <div style={labelStyle}>Kode Verifikasi</div>
            <input style={inputStyle} value={regCode}
              onChange={e => setRegCode(e.target.value)} placeholder="kode verifikasi" />
          </div>
          {regErr && (
            <div style={{ fontSize: 11, color: '#E24B4A', padding: '4px 8px', background: 'rgba(226,75,74,0.1)', borderRadius: 6 }}>
              {regErr}
            </div>
          )}
          {regOk && (
            <div style={{ fontSize: 11, color: '#1D9E75', padding: '4px 8px', background: 'rgba(29,158,117,0.1)', borderRadius: 6 }}>
              ✓ Registrasi berhasil! Redirect ke login...
            </div>
          )}
          <button style={btnStyle('#63b8ff')} onClick={handleRegis} disabled={regLoad || regOk}>
            {regLoad ? 'Memproses...' : 'Daftar'}
          </button>
        </div>
      )}
    </div>
  )
}
