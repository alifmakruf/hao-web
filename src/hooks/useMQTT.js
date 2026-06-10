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
  reconnectPeriod: 3000,
  connectTimeout:  10000,
}

const TOPICS = [
  'hao/sensor',
  'hao/status',
  'hao/sensor_ruangan',
]

let mqttClient  = null
let initialized = false

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
  })

  client.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString())

      // ── Sensor global ─────────────────────────────────────
      if (topic === 'hao/sensor') {
        setSensor({
          suhu: Number(data.suhu ?? 0),
          ldr:  Number(data.ldr  ?? 0),
          gas:  Number(data.gas  ?? 0),
        })
      }

      // ── Sensor per ruangan ────────────────────────────────
      if (topic === 'hao/sensor_ruangan') {
        const rooms = ['ruangtamu', 'kamar', 'dapur']
        rooms.forEach((room) => {
          if (data[room]?.suhu !== undefined) {
            setSensorRuangan(room, { suhu: Number(data[room].suhu) })
          }
        })
      }

      // ── Status device ─────────────────────────────────────
      if (topic === 'hao/status') {
        const { mode, alasan, sensor, sensor_ruangan, ...deviceData } = data

        // Update devices
        if (Object.keys(deviceData).length > 0) {
          setDevices((prev) => ({ ...prev, ...deviceData }))
        }

        // Update sensor dari status kalau ada
        if (sensor) {
          setSensor({
            suhu: Number(sensor.suhu ?? 0),
            ldr:  Number(sensor.ldr  ?? 0),
            gas:  Number(sensor.gas  ?? 0),
          })
        }

        // Update sensor ruangan dari status kalau ada
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
  if (!mqttClient?.connected) {
    console.warn('[MQTT] not connected')
    return false
  }
  mqttClient.publish('hao/command', JSON.stringify({ device, state }), { qos: 1 })
  return true
}

export function publishMode(mode) {
  if (!mqttClient?.connected) {
    console.warn('[MQTT] not connected')
    return false
  }
  mqttClient.publish('hao/mode', JSON.stringify({ mode }), { qos: 1 })
  return true
}