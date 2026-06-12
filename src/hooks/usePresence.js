import { useEffect } from 'react'
import { ref, set, remove, onValue, onDisconnect, serverTimestamp } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'

// Posisi halaman depan rumah — area parkir/teras luar
// Setiap slot dipakai bergiliran supaya avatar tidak tumpuk
const PRESENCE_SLOTS = [
  [-1.05, 0.05,  1.95],
  [-0.55, 0.05,  2.05],
  [-0.05, 0.05,  2.00],
  [ 0.45, 0.05,  1.95],
  [ 0.95, 0.05,  2.05],
]

let presenceRef = null // ref aktif milik session ini

export function usePresence() {
  const { authRole, authUser, setOnlineUsers } = useHAOStore()

  // ── Subscribe semua online users ──────────────────────────
  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, 'hao/presence'), (snap) => {
      if (!snap.exists()) { setOnlineUsers([]); return }
      const users = Object.entries(snap.val()).map(([uid, data]) => ({ uid, ...data }))
      setOnlineUsers(users)
    })
    return () => unsub()
  }, [])

  // ── Tulis presence diri sendiri ───────────────────────────
  useEffect(() => {
    if (!db) return
    if (authRole === 'viewer') {
      // Viewer tidak tampil — hapus presence kalau ada
      if (presenceRef) {
        remove(presenceRef)
        presenceRef = null
      }
      return
    }

    // Buat UID unik per session (bukan Firebase Auth UID)
    const sessionId = sessionStorage.getItem('hao-session-id') || (() => {
      const id = Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem('hao-session-id', id)
      return id
    })()

    const label = authRole === 'admin'
      ? (authUser?.username ?? 'Admin')
      : 'Guest'

    // Tentukan slot posisi berdasarkan index session
    const slotIndex = parseInt(sessionId, 36) % PRESENCE_SLOTS.length
    const pos = PRESENCE_SLOTS[slotIndex]

    const data = {
      role:     authRole,
      label,
      pos,
      joinedAt: Date.now(),
    }

    presenceRef = ref(db, `hao/presence/${sessionId}`)

    // Auto-hapus saat disconnect (tab tutup / koneksi putus)
    onDisconnect(presenceRef).remove()

    set(presenceRef, data).catch(err =>
      console.warn('[Presence] Gagal set:', err.message)
    )

    return () => {
      if (presenceRef) {
        remove(presenceRef).catch(() => {})
        presenceRef = null
      }
    }
  }, [authRole, authUser])
}
