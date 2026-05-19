import { useEffect } from 'react'
import mqtt from 'mqtt'
import { useHAOStore } from '../store'

// ─────────────────────────────────────────────
// MQTT CONFIG
// ─────────────────────────────────────────────
const MQTT_CONFIG = {
  host: '1423768fda3f4597a767e176fa658b90.s1.eu.hivemq.cloud',
  port: 8884,
  protocol: 'wss',

  username: 'Admin',
  password: 'Admin123',

  clientId: `hao-web-${Math.random().toString(16).slice(2, 8)}`,

  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
}

const TOPICS = [
  'hao/sensor',
  'hao/status',
]

// ─────────────────────────────────────────────
// SINGLETON CLIENT
// ─────────────────────────────────────────────
let mqttClient = null
let initialized = false

// ─────────────────────────────────────────────
// INIT MQTT
// ─────────────────────────────────────────────
function initMQTT() {
  if (initialized && mqttClient) {
    return mqttClient
  }

  const {
    setSensor,
    setDevices,
    setMode,
    setAlasan,
    setMqttConnected,
    setMqttStatus,
  } = useHAOStore.getState()

  const url =
    `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}/mqtt`

  const client = mqtt.connect(url, {
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,

    clientId: MQTT_CONFIG.clientId,

    clean: MQTT_CONFIG.clean,
    reconnectPeriod: MQTT_CONFIG.reconnectPeriod,
    connectTimeout: MQTT_CONFIG.connectTimeout,
  })

  mqttClient = client
  initialized = true

  setMqttStatus('connecting')

  // CONNECT
  client.on('connect', () => {
    console.log('[MQTT] Connected')

    setMqttConnected(true)
    setMqttStatus('connected')

    client.subscribe(TOPICS, { qos: 1 }, (err) => {
      if (err) {
        console.warn('[MQTT] subscribe error:', err.message)
      } else {
        console.log('[MQTT] subscribed:', TOPICS)
      }
    })
  })

  // MESSAGE
  client.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString())

      // SENSOR
      if (topic === 'hao/sensor') {
        setSensor({
          suhu: Number(data.suhu ?? 0),
          ldr: Number(data.ldr ?? 0),
          gas: Number(data.gas ?? 0),
        })
      }

      // STATUS
      if (topic === 'hao/status') {
        const { mode, alasan, ...deviceData } = data

        setDevices((prev) => ({
          ...prev,
          ...deviceData,
        }))

        if (mode) setMode(mode)
        if (alasan) setAlasan(alasan)
      }
    } catch (err) {
      console.warn('[MQTT] parse error:', err.message)
    }
  })

  // ERROR
  client.on('error', (err) => {
    console.warn('[MQTT] error:', err.message)

    setMqttConnected(false)
    setMqttStatus('error')
  })

  // RECONNECT
  client.on('reconnect', () => {
    console.log('[MQTT] reconnecting...')

    setMqttConnected(false)
    setMqttStatus('connecting')
  })

  // CLOSE
  client.on('close', () => {
    console.log('[MQTT] disconnected')

    setMqttConnected(false)
    setMqttStatus('disconnected')
  })

  return client
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export function useMQTT() {
  useEffect(() => {
    initMQTT()
  }, [])

  return {
    publishCommand,
    publishMode,
    client: mqttClient,
  }
}

// ─────────────────────────────────────────────
// PUBLISH DEVICE
// ─────────────────────────────────────────────
export function publishCommand(device, state) {
  if (!mqttClient?.connected) {
    console.warn('[MQTT] not connected')
    return false
  }

  mqttClient.publish(
    'hao/command',
    JSON.stringify({ device, state }),
    { qos: 1 }
  )

  return true
}

// ─────────────────────────────────────────────
// PUBLISH MODE
// ─────────────────────────────────────────────
export function publishMode(mode) {
  if (!mqttClient?.connected) {
    console.warn('[MQTT] not connected')
    return false
  }

  mqttClient.publish(
    'hao/mode',
    JSON.stringify({ mode }),
    { qos: 1 }
  )

  return true
}