import { useHAOStore } from '../../store'

const ROLE_COLORS = {
  admin:  { color: '#1D9E75', bg: 'rgba(29,158,117,0.12)',  border: 'rgba(29,158,117,0.3)',  label: 'Admin' },
  guest:  { color: '#63b8ff', bg: 'rgba(99,184,255,0.12)',  border: 'rgba(99,184,255,0.3)',  label: 'Guest' },
  viewer: { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', label: 'Viewer' },
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now  = new Date()

  const sameDay = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  if (sameDay) return `Hari ini, ${time}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Kemarin, ${time}`

  const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  return `${dateStr}, ${time}`
}

export function ActivityLogModal({ onClose }) {
  const { activityLogs } = useHAOStore()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: '80vh',
          background: 'linear-gradient(160deg, rgba(10,14,26,0.98) 0%, rgba(14,20,40,0.96) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
              📜 Log Aktivitas
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Riwayat perubahan oleh admin & guest
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 12px 14px' }}>
          {activityLogs.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '32px 0',
              color: 'rgba(255,255,255,0.3)', fontSize: 12,
            }}>
              Belum ada aktivitas tercatat.
            </div>
          )}

          {activityLogs.map((log) => {
            const roleStyle = ROLE_COLORS[log.actorRole] ?? ROLE_COLORS.viewer
            return (
              <div
                key={log.id}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: roleStyle.bg,
                  border: `1px solid ${roleStyle.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {log.icon || '•'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                    <span style={{
                      fontWeight: 700,
                      color: roleStyle.color,
                    }}>
                      {log.actorName}
                    </span>
                    {' '}
                    {log.message}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginTop: 3,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: roleStyle.color,
                      background: roleStyle.bg,
                      border: `1px solid ${roleStyle.border}`,
                      borderRadius: 6, padding: '1px 6px',
                    }}>
                      {roleStyle.label}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
