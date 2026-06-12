import { useEffect, useState } from 'react'

// Mapping kode WMO Open-Meteo ke ikon dan label
const WEATHER_CODES = {
  0:  { icon: '☀️', label: 'Cerah' },
  1:  { icon: '🌤️', label: 'Cerah Berawan' },
  2:  { icon: '⛅', label: 'Berawan Sebagian' },
  3:  { icon: '☁️', label: 'Berawan' },
  45: { icon: '🌫️', label: 'Berkabut' },
  48: { icon: '🌫️', label: 'Kabut Es' },
  51: { icon: '🌦️', label: 'Gerimis Ringan' },
  53: { icon: '🌦️', label: 'Gerimis' },
  55: { icon: '🌧️', label: 'Gerimis Lebat' },
  61: { icon: '🌧️', label: 'Hujan Ringan' },
  63: { icon: '🌧️', label: 'Hujan' },
  65: { icon: '🌧️', label: 'Hujan Lebat' },
  71: { icon: '🌨️', label: 'Salju Ringan' },
  73: { icon: '🌨️', label: 'Salju' },
  75: { icon: '❄️', label: 'Salju Lebat' },
  80: { icon: '🌦️', label: 'Hujan Lokal' },
  81: { icon: '🌧️', label: 'Hujan Lokal Lebat' },
  82: { icon: '⛈️', label: 'Hujan Sangat Lebat' },
  95: { icon: '⛈️', label: 'Badai Petir' },
  96: { icon: '⛈️', label: 'Badai Petir + Hujan Es' },
  99: { icon: '⛈️', label: 'Badai Petir Hebat' },
}

function getWeatherInfo(code) {
  return WEATHER_CODES[code] ?? { icon: '🌡️', label: 'Tidak diketahui' }
}

export function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [error,   setError]   = useState(null)
  const [city,    setCity]    = useState('')

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`
          )
          const weatherData = await weatherRes.json()
          setWeather(weatherData.current)

          try {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=id`
            )
            const geoData = await geoRes.json()
            const place = geoData.results?.[0]
            if (place) {
              setCity(place.name || place.admin1 || '')
            }
          } catch {
            // Kalau gagal reverse geocode, biarkan kosong
          }
        } catch (err) {
          setError('Gagal memuat cuaca')
        }
      },
      () => {
        setError('Izin lokasi ditolak')
      },
      { timeout: 8000 }
    )
  }, [])

  if (error) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 11, color: 'rgba(255,255,255,0.4)',
        fontFamily: 'sans-serif', textAlign: 'center',
      }}>
        {error}
      </div>
    )
  }

  if (!weather) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 11, color: 'rgba(255,255,255,0.4)',
        fontFamily: 'sans-serif', textAlign: 'center',
      }}>
        Mendeteksi lokasi...
      </div>
    )
  }

  const { icon, label } = getWeatherInfo(weather.weather_code)

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      background: 'rgba(99,184,255,0.06)',
      border: '1px solid rgba(99,184,255,0.18)',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
          {city || 'Lokasi Anda'}
        </span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>

      <div style={{
        fontSize: 24, fontWeight: 800, color: 'white',
        marginTop: 4,
      }}>
        {Math.round(weather.temperature_2m)}°C
      </div>

      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
      }}>
        {label}
      </div>

      <div style={{
        display: 'flex', gap: 12, marginTop: 6,
        fontSize: 10, color: 'rgba(255,255,255,0.4)',
      }}>
        <span>💧 {weather.relative_humidity_2m}%</span>
        <span>💨 {Math.round(weather.wind_speed_10m)} km/j</span>
      </div>
    </div>
  )
}
