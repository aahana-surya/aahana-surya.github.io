'use strict';

const WMO = {
  0:  { label: 'Clear sky',           icon: '☀️' },
  1:  { label: 'Mainly clear',        icon: '🌤️' },
  2:  { label: 'Partly cloudy',       icon: '⛅' },
  3:  { label: 'Overcast',            icon: '☁️' },
  45: { label: 'Fog',                 icon: '🌫️' },
  48: { label: 'Icy fog',             icon: '🌫️' },
  51: { label: 'Light drizzle',       icon: '🌦️' },
  53: { label: 'Drizzle',             icon: '🌦️' },
  55: { label: 'Heavy drizzle',       icon: '🌧️' },
  61: { label: 'Light rain',          icon: '🌧️' },
  63: { label: 'Rain',                icon: '🌧️' },
  65: { label: 'Heavy rain',          icon: '🌧️' },
  71: { label: 'Light snow',          icon: '🌨️' },
  73: { label: 'Snow',                icon: '❄️' },
  75: { label: 'Heavy snow',          icon: '❄️' },
  77: { label: 'Snow grains',         icon: '🌨️' },
  80: { label: 'Light showers',       icon: '🌦️' },
  81: { label: 'Showers',             icon: '🌧️' },
  82: { label: 'Heavy showers',       icon: '⛈️' },
  85: { label: 'Snow showers',        icon: '🌨️' },
  86: { label: 'Heavy snow showers',  icon: '❄️' },
  95: { label: 'Thunderstorm',        icon: '⛈️' },
  96: { label: 'Thunderstorm + hail', icon: '⛈️' },
  99: { label: 'Thunderstorm + hail', icon: '⛈️' },
};
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function wmo(code) {
  return WMO[code] || { label: 'Unknown', icon: '🌡️' };
}

function windDir(deg) {
  return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg / 45) % 8];
}

function uvLabel(uv) {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function geocode(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding service unavailable');
  const data = await res.json();
  if (!data.results || !data.results.length) throw new Error(`No location found for "${query}"`);
  return data.results;
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m','relative_humidity_2m','apparent_temperature',
      'weather_code','wind_speed_10m','wind_direction_10m',
      'surface_pressure','visibility','uv_index','is_day',
      'precipitation','cloud_cover'
    ].join(','),
    daily: [
      'weather_code','temperature_2m_max','temperature_2m_min',
      'precipitation_probability_max','uv_index_max','sunrise','sunset'
    ].join(','),
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
    forecast_days: 6,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error('Weather service unavailable');
  return res.json();
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const data = await res.json();
    const a = data.address || {};
    return a.city || a.town || a.village || a.county || data.display_name.split(',')[0];
  } catch {
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

Vue.createApp({
  data() {
    return {
      query: '',
      loading: false,
      error: '',
      weather: null,
      locationName: '',
      heroClass: '',
      heroMeta: '',
      heroCondition: '',
      heroFeels: '',
      heroTemp: '',
      heroHilo: '',
      sparklinePoints: '',
      stats: [],
      forecast: [],
      travelNote: '',
      currentSuggestions: [],
      suggestionsOpen: false,
      suggTimer: null,
    };
  },
  computed: {
    showEmpty() {
      return !this.weather && !this.loading && !this.error;
    },
  },
  methods: {
    clearSuggestions() {
      this.currentSuggestions = [];
      this.suggestionsOpen = false;
      clearTimeout(this.suggTimer);
      this.suggTimer = null;
    },
    showError(message) {
      this.error = message;
    },
    hideError() {
      this.error = '';
    },
    setLoading(value) {
      this.loading = value;
      if (value) this.clearSuggestions();
    },
    async handleSearch() {
      const query = this.query.trim();
      if (!query) return;
      this.hideError();
      this.clearSuggestions();
      this.setLoading(true);

      try {
        const results = await geocode(query);
        this.setLoading(false);
        if (results.length === 1) {
          await this.selectResult(results[0]);
        } else {
          this.currentSuggestions = results;
          this.suggestionsOpen = true;
        }
      } catch (err) {
        this.setLoading(false);
        this.showError(err.message || 'Location search failed.');
      }
    },
    async onInput() {
      const query = this.query.trim();
      if (query.length < 2) {
        this.clearSuggestions();
        return;
      }

      clearTimeout(this.suggTimer);
      this.suggTimer = window.setTimeout(async () => {
        try {
          const results = await geocode(query);
          this.currentSuggestions = results;
          this.suggestionsOpen = true;
        } catch {
          this.clearSuggestions();
        }
      }, 350);
    },
    handleFocus() {
      if (this.currentSuggestions.length) {
        this.suggestionsOpen = true;
      }
    },
    async selectResult(item) {
      const name = [item.name, item.admin1, item.country].filter(Boolean).join(', ');
      this.query = item.name;
      this.clearSuggestions();
      await this.loadWeather(item.latitude, item.longitude, name);
    },
    async handleGeolocate() {
      if (!navigator.geolocation) {
        this.showError("Your browser doesn't support geolocation.");
        return;
      }

      this.hideError();
      this.setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async ({ coords: { latitude, longitude } }) => {
          let name;
          try {
            name = await reverseGeocode(latitude, longitude);
          } catch {
            name = 'Current location';
          }
          this.query = name;
          await this.loadWeather(latitude, longitude, name);
        },
        (err) => {
          this.setLoading(false);
          const msgs = {
            1: 'Location access denied. Please enable it in your browser settings.',
            2: 'Location unavailable. Try searching manually.',
            3: 'Location request timed out. Try searching manually.',
          };
          this.showError(msgs[err.code] || 'Geolocation failed.');
        },
        { timeout: 10000 }
      );
    },
    async loadWeather(lat, lon, name) {
      this.hideError();
      this.setLoading(true);
      try {
        const data = await fetchWeather(lat, lon);
        this.setLoading(false);
        this.applyWeatherData(data, name);
      } catch (err) {
        this.setLoading(false);
        this.weather = null;
        this.showError(err.message || 'Failed to load weather. Please try again.');
      }
    },
    applyWeatherData(data, name) {
      const c = data.current;
      const d = data.daily;
      const h = data.hourly;
      const isDay = c.is_day === 1;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayIdx = d.time.findIndex(t => t === todayStr);
      const index = todayIdx !== -1 ? todayIdx : 0;

      this.weather = data;
      this.locationName = name;
      this.heroClass = isDay ? 'show day' : 'show night';
      this.heroMeta = (isDay ? '🌅 Daytime' : '🌙 Nighttime') +
        '  ·  Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.heroCondition = `${wmo(c.weather_code).icon}  ${wmo(c.weather_code).label}`;
      this.heroFeels = `Feels like ${Math.round(c.apparent_temperature)}°F`;
      this.heroTemp = `${Math.round(c.temperature_2m)}°<sup>F</sup>`;

      let hilo = `↑ ${Math.round(d.temperature_2m_max[index])}° · ↓ ${Math.round(d.temperature_2m_min[index])}° today`;
      if (d.precipitation_probability_max[index] > 0) {
        hilo += `  ·  💧 ${d.precipitation_probability_max[index]}% precip`;
      }
      this.heroHilo = hilo;
      this.sparklinePoints = h && h.temperature_2m ? this.buildSparklinePoints(h.temperature_2m) : '';

      this.stats = [
        { icon: '💨', label: 'Wind',       value: `${Math.round(c.wind_speed_10m)} mph ${windDir(c.wind_direction_10m)}` },
        { icon: '💧', label: 'Humidity',   value: `${c.relative_humidity_2m}%` },
        { icon: '🔭', label: 'Visibility', value: `${Math.round((c.visibility || 0) / 1609)} mi` },
        { icon: '☁️', label: 'Cloud cover',value: `${c.cloud_cover}%` },
        { icon: '🌡', label: 'Pressure',   value: `${Math.round(c.surface_pressure)} hPa` },
        { icon: '🔆', label: 'UV index',   value: `${c.uv_index} · ${uvLabel(c.uv_index)}` },
        { icon: '🌅', label: 'Sunrise',    value: fmtTime(d.sunrise[index]) },
        { icon: '🌇', label: 'Sunset',     value: fmtTime(d.sunset[index]) },
      ];

      this.forecast = d.time.slice(0, 6).map((date, i) => {
        const day = new Date(date + 'T12:00:00');
        const cw = wmo(d.weather_code[i]);
        const rain = d.precipitation_probability_max[i];
        return {
          name: i === 0 ? 'Today' : DAYS[day.getDay()],
          icon: cw.icon,
          cond: cw.label,
          high: Math.round(d.temperature_2m_max[i]),
          low: Math.round(d.temperature_2m_min[i]),
          rain: rain > 0 ? rain : null,
          today: i === 0,
        };
      });

      const tips = [];
      if (c.uv_index >= 6)                         tips.push('UV is high: pack sunscreen.');
      if (c.wind_speed_10m > 25)                    tips.push('Winds are strong: secure loose items.');
      if (d.precipitation_probability_max[0] >= 50) tips.push('Rain likely today: bring an umbrella.');
      if (c.relative_humidity_2m > 80)              tips.push('High humidity: stay hydrated.');
      if (c.apparent_temperature < 35)              tips.push('Feels very cold: dress in layers.');
      if (c.apparent_temperature > 95)              tips.push('Feels very hot: limit outdoor exposure during peak hours.');
      if ((c.visibility || 10000) < 3000)           tips.push('Low visibility: drive cautiously.');

      this.travelNote = tips.length
        ? tips.join(' ')
        : "Today's a great day for outdoor activities!";
    },
    buildSparklinePoints(temps) {
      const slice = temps.slice(0, 24);
      const min = Math.min(...slice);
      const max = Math.max(...slice);
      const range = max - min || 1;
      const W = 280;
      const H = 56;
      return slice.map((t, i) => {
        const x = (i / (slice.length - 1)) * W;
        const y = H - ((t - min) / range) * (H - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    },
    handleDocumentClick(event) {
      if (!event.target.closest('.search-wrap')) {
        this.clearSuggestions();
      }
    },
  },
  mounted() {
    document.addEventListener('click', this.handleDocumentClick);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleDocumentClick);
  },
}).mount('#app');
