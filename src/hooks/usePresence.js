import { useEffect } from 'react'
import { ref, set, remove, onValue, onDisconnect, get } from 'firebase/database'
import { db } from '../firebase'
import { useHAOStore } from '../store'

// Slot di LUAR batas TechFrame (BOX dengan padding: x=-1.91..2.10, z=-0.95..2.13)
// Tersebar melingkar di 4 sisi supaya tidak numpuk
const PRESENCE_SLOTS = [
  // Sisi depan (Z besar / atas layar) — 3 slot
  [ -0.80, 0.05,  2.50 ],
  [  0.09, 0.05,  2.55 ],
  [  0.98, 0.05,  2.50 ],

  // Sisi kanan (X besar)
  [  2.45, 0.05,  0.20 ],
  [  2.45, 0.05,  1.10 ],

  // Sisi kiri (X kecil)
  [ -2.26, 0.05,  0.20 ],
  [ -2.26, 0.05,  1.10 ],

  // Sisi belakang (Z kecil)
  [ -0.50, 0.05, -1.32 ],
  [  0.70, 0.05, -1.32 ],
]

let presenceRef = null

export function usePresence() {
  const { authRole, authUser, setOnlineUsers } = useHAOStore()

  // Subscribe semua online users
  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, 'hao/presence'), (snap) => {
      if (!snap.exists()) { setOnlineUsers([]); return }
      const users = Object.entries(snap.val()).map(([uid, data]) => ({ uid, ...data }))
      setOnlineUsers(users)
    })
    return () => unsub()
  }, [])

  // Tulis presence diri sendiri
  useEffect(() => {
    if (!db) return

    if (authRole === 'viewer') {
      if (presenceRef) { remove(presenceRef); presenceRef = null }
      return
    }

    const sessionId = sessionStorage.getItem('hao-session-id') || (() => {
      const id = Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem('hao-session-id', id)
      return id
    })()

    const label = authRole === 'admin'
      ? (authUser?.username ?? 'Admin')
      : 'Guest'

    const doRegister = async () => {
      // Cari slot kosong — slot pertama yang belum dipakai user lain
      let slotIndex = 0
      try {
        const snap = await get(ref(db, 'hao/presence'))
        if (snap.exists()) {
          const data = snap.val()
          // Jangan hitung slot milik diri sendiri (re-register)
          const taken = Object.entries(data)
            .filter(([uid]) => uid !== sessionId)
            .map(([, u]) => u.slotIndex)
          const free = PRESENCE_SLOTS.findIndex((_, i) => !taken.includes(i))
          slotIndex = free !== -1 ? free : 0
        }
      } catch { /* pakai slot 0 */ }

      const userData = {
        role:      authRole,
        label,
        slotIndex,
        pos:       PRESENCE_SLOTS[slotIndex],
        joinedAt:  Date.now(),
      }

      presenceRef = ref(db, `hao/presence/${sessionId}`)
      onDisconnect(presenceRef).remove()
      set(presenceRef, userData).catch(err =>
        console.warn('[Presence] Gagal set:', err.message)
      )
    }

    doRegister()

    return () => {
      if (presenceRef) { remove(presenceRef).catch(() => {}); presenceRef = null }
    }
  }, [authRole, authUser])
}
