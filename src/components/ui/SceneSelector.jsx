import { useState } from 'react'
import { useSceneSystem, SCENE_CONFIGS } from '../../hooks/useSceneSystem'

export function SceneSelector() {
  const { applyScene, clearScene, activeScene } = useSceneSystem()
  const [loading, setLoading] = useState(null)
  const [error, setError]     = useState(null)

  const handleScene = async (sceneId) => {
    try {
      setError(null)
      setLoading(sceneId)

      // Kalau klik scene yang sudah aktif → clear
      if (activeScene === sceneId) {
        clearScene()
        setLoading(null)
        return
      }

      const ok = applyScene(sceneId)
      if (!ok) {
        setError('Gagal menerapkan scene')
      }
    } catch (err) {
      setError('Terjadi kesalahan: ' + err.message)
      console.error('[SceneSelector]', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '6px 10px', borderRadius: 8,
          background: 'rgba(226,75,74,0.15)',
          border: '1px solid rgba(226,75,74,0.3)',
          fontSize: 11, color: '#E24B4A', fontFamily: 'sans-serif',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: 14 }}
          >×</button>
        </div>
      )}

      {/* Grid scene */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {Object.entries(SCENE_CONFIGS).map(([id, cfg]) => {
          const isActive  = activeScene === id
          const isLoading = loading === id
          const isPanic   = id === 'panic'

          return (
            <button
              key={id}
              onClick={() => handleScene(id)}
              disabled={isLoading}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                padding: '10px 6px',
                background: isActive
                  ? isPanic ? 'rgba(226,75,74,0.25)' : 'rgba(99,184,255,0.2)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${
                  isActive
                    ? isPanic ? 'rgba(226,75,74,0.6)' : 'rgba(99,184,255,0.5)'
                    : 'rgba(255,255,255,0.1)'
                }`,
                borderRadius: 10,
                color: 'white',
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s',
                fontFamily: 'sans-serif',
                // Panic mode: animasi border merah
                animation: isActive && isPanic ? 'panicPulse 1s infinite' : 'none',
              }}
            >
              <span style={{ fontSize: 20 }}>
                {isLoading ? '⏳' : cfg.icon}
              </span>
              <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 400 }}>
                {cfg.label}
              </span>
              <span style={{ fontSize: 9, opacity: 0.6, textAlign: 'center', lineHeight: 1.3 }}>
                {cfg.desc}
              </span>
              {isActive && (
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isPanic ? '#E24B4A' : '#4ade80',
                  boxShadow: isPanic ? '0 0 6px #E24B4A' : '0 0 6px #4ade80',
                  marginTop: 2,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Tombol clear scene */}
      {activeScene && (
        <button
          onClick={clearScene}
          style={{
            marginTop: 2, padding: '6px 10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: 'rgba(255,255,255,0.5)',
            fontSize: 11, fontFamily: 'sans-serif',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          Hapus Scene Aktif
        </button>
      )}

      <style>{`
        @keyframes panicPulse {
          0%, 100% { border-color: rgba(226,75,74,0.6); box-shadow: none; }
          50%       { border-color: rgba(226,75,74,1);   box-shadow: 0 0 12px rgba(226,75,74,0.4); }
        }
      `}</style>
    </div>
  )
}