import { useEffect, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { ref, set, get, onValue } from 'firebase/database'
import { auth, db } from '../firebase'
import { useHAOStore } from '../store'

const VERIFY_CODE  = 'diegoganteng'
const FAKE_DOMAIN  = '@hao.local'
const TOKEN_PATH   = 'hao/auth/guestToken'

function toEmail(username) {
  return username.trim().toLowerCase() + FAKE_DOMAIN
}

function genToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let token = 'HAO-'
  for (let i = 0; i < 6; i++) token += chars[Math.floor(Math.random() * chars.length)]
  return token
}

export function useAuth() {
  const {
    setAuthRole, setAuthUser, setGuestToken,
    authRole, guestToken,
  } = useHAOStore()

  // Listen Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        setAuthUser({ uid: user.uid, email: user.email, username: user.email.replace(FAKE_DOMAIN, '') })
        setAuthRole('admin')
      } else {
        const savedToken = localStorage.getItem('hao-guest-token')
        if (savedToken) {
          try {
            const snap = await get(ref(db, TOKEN_PATH))
            if (snap.exists() && snap.val() === savedToken) {
              setAuthRole('guest')
              setAuthUser(null)
            } else {
              localStorage.removeItem('hao-guest-token')
              setAuthRole('viewer')
              setAuthUser(null)
            }
          } catch {
            setAuthRole('viewer')
            setAuthUser(null)
          }
        } else {
          setAuthRole('viewer')
          setAuthUser(null)
        }
      }
    })
    return () => unsub()
  }, [])

  // Subscribe guest token dari Firebase — kalau token berubah, kick guest
  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, TOKEN_PATH), (snap) => {
      const firebaseToken = snap.exists() ? snap.val() : null
      setGuestToken(firebaseToken)

      const savedToken = localStorage.getItem('hao-guest-token')
      if (savedToken && firebaseToken !== savedToken) {
        localStorage.removeItem('hao-guest-token')
        setAuthRole('viewer')
        setAuthUser(null)
      }
    })
    return () => unsub()
  }, [])

  const register = useCallback(async (username, password, verifyCode) => {
    if (!username.trim())       return { ok: false, error: 'Username tidak boleh kosong' }
    if (username.includes('@')) return { ok: false, error: 'Username tidak boleh mengandung @' }
    if (password.length < 6)    return { ok: false, error: 'Password minimal 6 karakter' }
    if (verifyCode !== VERIFY_CODE) return { ok: false, error: 'Kode verifikasi salah' }
    try {
      await setPersistence(auth, browserLocalPersistence)
      await createUserWithEmailAndPassword(auth, toEmail(username), password)
      return { ok: true }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') return { ok: false, error: 'Username sudah dipakai' }
      return { ok: false, error: 'Registrasi gagal: ' + err.message }
    }
  }, [])

  const login = useCallback(async (username, password) => {
    if (!username.trim()) return { ok: false, error: 'Username tidak boleh kosong' }
    if (!password)        return { ok: false, error: 'Password tidak boleh kosong' }
    try {
      await setPersistence(auth, browserLocalPersistence)
      await signInWithEmailAndPassword(auth, toEmail(username), password)
      return { ok: true }
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
        return { ok: false, error: 'Username atau password salah' }
      return { ok: false, error: 'Login gagal: ' + err.message }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      setAuthRole('viewer')
      setAuthUser(null)
    } catch (err) {
      console.error('[Auth] Logout gagal:', err.message)
    }
  }, [])

  const loginGuest = useCallback(async (token) => {
    if (!token.trim()) return { ok: false, error: 'Token tidak boleh kosong' }
    try {
      const snap = await get(ref(db, TOKEN_PATH))
      if (!snap.exists()) return { ok: false, error: 'Belum ada token aktif' }
      if (snap.val() !== token.trim()) return { ok: false, error: 'Token tidak valid' }

      localStorage.setItem('hao-guest-token', token.trim())
      setAuthRole('guest')
      setAuthUser(null)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Gagal verifikasi token' }
    }
  }, [])

  const logoutGuest = useCallback(() => {
    localStorage.removeItem('hao-guest-token')
    setAuthRole('viewer')
    setAuthUser(null)
  }, [])

  const createToken = useCallback(async () => {
    if (authRole !== 'admin') return { ok: false, error: 'Hanya admin yang bisa buat token' }
    try {
      const token = genToken()
      await set(ref(db, TOKEN_PATH), token)
      return { ok: true, token }
    } catch (err) {
      return { ok: false, error: 'Gagal buat token: ' + err.message }
    }
  }, [authRole])

  return { register, login, logout, loginGuest, logoutGuest, createToken }
}
