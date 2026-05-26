import { useState, useEffect } from 'react'

const STORAGE_KEY = 'hao-tasks'
const RESET_KEY   = 'hao-tasks-date'

function loadTasks() {
  try {
    const today    = new Date().toDateString()
    const lastDate = localStorage.getItem(RESET_KEY)

    // Auto reset kalau hari berbeda
    if (lastDate !== today) {
      localStorage.setItem(RESET_KEY, today)
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const tasks = JSON.parse(raw)
        // Reset semua centang tapi task-nya tetap ada
        const reset = tasks.map(t => ({ ...t, done: false }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reset))
        return reset
      }
      return []
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch (err) {
    console.warn('[Task] Gagal simpan:', err.message)
  }
}

export function TaskPanel({ onClose }) {
  const [tasks,   setTasksState] = useState(loadTasks)
  const [input,   setInput]      = useState('')
  const [editId,  setEditId]     = useState(null)
  const [editVal, setEditVal]    = useState('')
  const [error,   setError]      = useState('')

  const setTasks = (updater) => {
    setTasksState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveTasks(next)
      return next
    })
  }

  // Tambah task
  const addTask = () => {
    const text = input.trim()
    if (!text) { setError('Task tidak boleh kosong'); return }
    if (text.length > 100) { setError('Maksimal 100 karakter'); return }
    if (tasks.length >= 20) { setError('Maksimal 20 task'); return }
    setError('')
    setTasks(prev => [...prev, {
      id:   Date.now(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
    }])
    setInput('')
  }

  // Toggle centang
  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  // Hapus task
  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // Edit task
  const startEdit = (task) => {
    setEditId(task.id)
    setEditVal(task.text)
    setError('')
  }

  const saveEdit = () => {
    const text = editVal.trim()
    if (!text) { setError('Task tidak boleh kosong'); return }
    if (text.length > 100) { setError('Maksimal 100 karakter'); return }
    setError('')
    setTasks(prev => prev.map(t => t.id === editId ? { ...t, text } : t))
    setEditId(null)
    setEditVal('')
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditVal('')
    setError('')
  }

  // Reset manual
  const resetAll = () => {
    setTasks(prev => prev.map(t => ({ ...t, done: false })))
  }

  // Hapus semua yang sudah done
  const clearDone = () => {
    setTasks(prev => prev.filter(t => !t.done))
  }

  const doneCount  = tasks.filter(t => t.done).length
  const totalCount = tasks.length

  return (
    <div style={{
      position: 'fixed', bottom: 72, right: 16,
      width: 320, maxHeight: '70vh',
      background: 'rgba(8,12,24,0.96)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      display: 'flex', flexDirection: 'column',
      zIndex: 99998,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: 'sans-serif',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
            📋 Task Harian
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {doneCount}/{totalCount} selesai
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {doneCount > 0 && (
            <button onClick={clearDone} style={btnStyle('#E24B4A', 10)}>
              Hapus selesai
            </button>
          )}
          <button onClick={resetAll} style={btnStyle('#EF9F27', 10)}>
            Reset
          </button>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            fontSize: 18, lineHeight: 1, padding: '0 2px',
          }}>×</button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.06)', flexShrink: 0,
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: '#1D9E75',
            width: `${(doneCount / totalCount) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {/* List task */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 12px' }}>
        {tasks.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            color: 'rgba(255,255,255,0.3)', fontSize: 12,
          }}>
            Belum ada task. Tambahkan di bawah!
          </div>
        )}

        {tasks.map((task) => (
          <div key={task.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            {/* Checkbox */}
            <button
              onClick={() => toggleTask(task.id)}
              style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                border: `1.5px solid ${task.done ? '#1D9E75' : 'rgba(255,255,255,0.2)'}`,
                background: task.done ? '#1D9E75' : 'transparent',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {task.done && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
            </button>

            {/* Text / Edit */}
            {editId === task.id ? (
              <input
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') cancelEdit()
                }}
                autoFocus
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6, padding: '3px 8px',
                  color: 'white', fontSize: 12,
                  outline: 'none',
                }}
              />
            ) : (
              <span style={{
                flex: 1, fontSize: 12, color: task.done
                  ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
                textDecoration: task.done ? 'line-through' : 'none',
                transition: 'all 0.2s', wordBreak: 'break-word',
              }}>
                {task.text}
              </span>
            )}

            {/* Aksi */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {editId === task.id ? (
                <>
                  <button onClick={saveEdit}   style={iconBtn('#1D9E75')}>✓</button>
                  <button onClick={cancelEdit} style={iconBtn('#E24B4A')}>✕</button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(task)}  style={iconBtn('rgba(255,255,255,0.3)')}>✏</button>
                  <button onClick={() => deleteTask(task.id)} style={iconBtn('#E24B4A')}>🗑</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '6px 16px', fontSize: 11,
          color: '#E24B4A', background: 'rgba(226,75,74,0.1)',
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Input tambah task */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 6, flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Tambah task baru..."
          maxLength={100}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '7px 10px',
            color: 'white', fontSize: 12,
            outline: 'none', fontFamily: 'sans-serif',
          }}
        />
        <button
          onClick={addTask}
          style={{
            padding: '7px 12px',
            background: 'rgba(29,158,117,0.8)',
            border: 'none', borderRadius: 8,
            color: 'white', fontSize: 13,
            cursor: 'pointer', fontWeight: 600,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1D9E75'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(29,158,117,0.8)'}
        >+</button>
      </div>
    </div>
  )
}

// Helper styles
function btnStyle(color, fontSize = 11) {
  return {
    padding: '3px 8px', borderRadius: 6,
    background: `${color}22`,
    border: `1px solid ${color}55`,
    color, cursor: 'pointer', fontSize,
    fontFamily: 'sans-serif',
  }
}

function iconBtn(color) {
  return {
    width: 22, height: 22, borderRadius: 5,
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${color}44`,
    color, cursor: 'pointer', fontSize: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  }
}