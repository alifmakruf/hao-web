import { useEffect } from 'react'
import mqtt from 'mqtt'
import { useHAOStore } from '../store'

const MQTT_CONFIG = {
  host:            '1423768fda3f4597a767e176fa658b90.s1.eu.hivemq.cloud',
  port:            8884,
  protocol:        'wss',
  username:        'Admin',
  password:        'Admin123',
  clientId:        `hao-web-${Math.random().toString(16).slice(2, 8)}`,
  clean:           true,
  reconnectPeriod: 2000,   // retry lebih cepat (dari 3000 → 2000ms)
  connectTimeout:  10000,
  keepalive:       30,     // ← FIX 1: kirim ping setiap 30 detik agar koneksi tidak idle-drop
}

const TOPICS = [
  'hao/sensor',
  'hao/status',
  'hao/sensor_ruangan',
]

let mqttClient  = null
let initialized = false

// ── FIX 2: antrian command saat MQTT sedang reconnect ────────
// Kalau MQTT putus saat user klik, command disimpan di sini
// dan langsung dikirim begitu reconnect
const pendingQueue = []

function flushQueue() {
  while (pendingQueue.length > 0) {
    const { device, state } = pendingQueue.shift()
    console.log(`[MQTT] Flush antrian: ${device} → ${state}`)
    mqttClient.publish('hao/command', JSON.stringify({ device, state }), { qos: 1 })
  }
}

function initMQTT() {
  if (initialized && mqttClient) return mqttClient

  const {
    setSensor,
    setSensorRuangan,
    setDevices,
    setMode,
    setAlasan,
    setMqttConnected,
    setMqttStatus,
  } = useHAOStore.getState()

  const url = `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}/mqtt`

  const client = mqtt.connect(url, {
    username:        MQTT_CONFIG.username,
    password:        MQTT_CONFIG.password,
    clientId:        MQTT_CONFIG.clientId,
    clean:           MQTT_CONFIG.clean,
    reconnectPeriod: MQTT_CONFIG.reconnectPeriod,
    connectTimeout:  MQTT_CONFIG.connectTimeout,
    keepalive:       MQTT_CONFIG.keepalive,
  })

  mqttClient  = client
  initialized = true

  setMqttStatus('connecting')

  client.on('connect', () => {
    console.log('[MQTT] Connected')
    setMqttConnected(true)
    setMqttStatus('connected')
    client.subscribe(TOPICS, { qos: 1 }, (err) => {
      if (err) console.warn('[MQTT] subscribe error:', err.message)
      else     console.log('[MQTT] subscribed:', TOPICS)
    })
    // FIX 2: kirim antrian yang tertunda saat reconnect
    if (pendingQueue.length > 0) {
      console.log(`[MQTT] Flush ${pendingQueue.length} command tertunda`)
      flushQueue()
    }
  })

  client.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString())

      if (topic === 'hao/sensor') {
        setSensor({
          suhu: Number(data.suhu ?? 0),
          ldr:  Number(data.ldr  ?? 0),
          gas:  Number(data.gas  ?? 0),
        })
      }

      if (topic === 'hao/sensor_ruangan') {
        const rooms = ['ruangtamu', 'kamar', 'dapur']
        rooms.forEach((room) => {
          if (data[room]?.suhu !== undefined) {
            setSensorRuangan(room, { suhu: Number(data[room].suhu) })
          }
        })
      }

      // ── FIX 3: hao/status dari MQTT tidak overwrite device state ──
      // n8n publish ke hao/status setelah proses sensor.
      // Kalau kita apply semua field-nya ke React state, maka state
      // hasil klik tombol bisa ke-overwrite oleh data lama dari n8n.
      // Solusi: hanya apply sensor & mode dari hao/status,
      // JANGAN apply device state dari sini (sudah ditangani Firebase onValue
      // + publishCommand langsung ke ESP).
      if (topic === 'hao/status') {
        const { mode, alasan, sensor, sensor_ruangan } = data

        // Hanya update sensor & mode — bukan device ON/OFF
        if (sensor) {
          setSensor({
            suhu: Number(sensor.suhu ?? 0),
            ldr:  Number(sensor.ldr  ?? 0),
            gas:  Number(sensor.gas  ?? 0),
          })
        }
        if (sensor_ruangan) {
          const rooms = ['ruangtamu', 'kamar', 'dapur']
          rooms.forEach((room) => {
            if (sensor_ruangan[room]?.suhu !== undefined) {
              setSensorRuangan(room, { suhu: Number(sensor_ruangan[room].suhu) })
            }
          })
        }
        if (mode)   setMode(mode)
        if (alasan) setAlasan(alasan)
        // Device state (lampu/fan ON-OFF) tidak di-apply dari sini
        // agar tidak konflik dengan klik user
      }
    } catch (err) {
      console.warn('[MQTT] parse error:', err.message)
    }
  })

  client.on('error', (err) => {
    console.warn('[MQTT] error:', err.message)
    setMqttConnected(false)
    setMqttStatus('error')
  })

  client.on('reconnect', () => {
    console.log('[MQTT] reconnecting...')
    setMqttConnected(false)
    setMqttStatus('connecting')
  })

  client.on('close', () => {
    console.log('[MQTT] disconnected')
    setMqttConnected(false)
    setMqttStatus('disconnected')
  })

  return client
}

export function useMQTT() {
  useEffect(() => {
    initMQTT()
  }, [])

  return { publishCommand, publishMode, client: mqttClient }
}

export function publishCommand(device, state) {
  // FIX 2: kalau belum connect, masukkan ke antrian — jangan buang command
  if (!mqttClient?.connected) {
    console.warn(`[MQTT] not connected — queued: ${device} → ${state}`)
    // Cegah duplikasi di antrian untuk device yang sama
    const idx = pendingQueue.findIndex(q => q.device === device)
    if (idx >= 0) pendingQueue[idx] = { device, state }
    else          pendingQueue.push({ device, state })
    return false
  }
  mqttClient.publish('hao/command', JSON.stringify({ device, state }), { qos: 1 })
  return true
}

export function publishMode(mode) {
  if (!mqttClient?.connected) {
    console.warn('[MQTT] not connected, mode tidak terkirim')
    return false
  }
  mqttClient.publish('hao/mode', mode, { qos: 1 })
  return true
}
