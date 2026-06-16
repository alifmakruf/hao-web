import { useEffect, useState } from 'react'
import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Thermometer, CloudDrizzle, CloudFog } from 'lucide-react'

// Mapping kode WMO Open-Meteo ke ikon Lucide dan label
function getWeatherInfo(code) {
  if (code === 0)              return { Icon: Sun,            color: '#FFD43B', label: 'Cerah' }
  if (code === 1)              return { Icon: CloudSun,       color: '#FFD43B', label: 'Cerah Berawan' }
  if (code === 2)              return { Icon: CloudSun,       color: '#ADB5BD', label: 'Berawan Sebagian' }
  if (code === 3)              return { Icon: Cloud,          color: '#868E96', label: 'Berawan' }
  if (code === 45 || code === 48) return { Icon: CloudFog,   color: '#ADB5BD', label: code === 48 ? 'Kabut Es' : 'Berkabut' }
  if (code >= 51 && code <= 55)   return { Icon: CloudDrizzle, color: '#74C0FC', label: code === 51 ? 'Gerimis Ringan' : code === 53 ? 'Gerimis' : 'Gerimis Lebat' }
  if (code >= 61 && code <= 65)   return { Icon: CloudRain,  color: '#4DABF7', label: code === 61 ? 'Hujan Ringan' : code === 63 ? 'Hujan' : 'Hujan Lebat' }
  if (code >= 71 && code <= 75)   return { Icon: CloudSnow,  color: '#A5D8FF', label: code === 71 ? 'Salju Ringan' : code === 73 ? 'Salju' : 'Salju Lebat' }
  if (code === 80 || code === 81) return { Icon: CloudRain,  color: '#4DABF7', label: code === 80 ? 'Hujan Lokal' : 'Hujan Lokal Lebat' }
  if (code === 82)             return { Icon: CloudLightning, color: '#E03131', label: 'Hujan Sangat Lebat' }
  if (code >= 95)              return { Icon: CloudLightning, color: '#F03E3E', label: code === 95 ? 'Badai Petir' : code === 96 ? 'Badai + Hujan Es' : 'Badai Petir Hebat' }
  return { Icon: Thermometer, color: '#868E96', label: 'Tidak diketahui' }
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
            if (place) setCity(place.name || place.admin1 || '')
          } catch {
            // Kalau gagal reverse geocode, biarkan kosong
          }
        } catch {
          setError('Gagal memuat cuaca')
        }
      },
      () => setError('Izin lokasi ditolak'),
      { timeout: 8000 }
    )
  }, [])

  const loadingStyle = {
    padding: '10px 12px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    fontFamily: 'sans-serif', textAlign: 'center',
  }

  if (error)   return <div style={loadingStyle}>{error}</div>
  if (!weather) return <div style={loadingStyle}>Mendeteksi lokasi...</div>

  const { Icon, color, label } = getWeatherInfo(weather.weather_code)

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
        <Icon size={22} color={color} strokeWidth={1.8} />
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
        alignItems: 'center',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Droplets size={11} strokeWidth={2} />
          {weather.relative_humidity_2m}%
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Wind size={11} strokeWidth={2} />
          {Math.round(weather.wind_speed_10m)} km/j
        </span>
      </div>
    </div>
  )
}
