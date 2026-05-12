const API_KEY = "037b89179904ac7f6ddee19b1f92ff0b";

const cityInput = document.getElementById("cityInput");
const getWeatherBtn = document.getElementById("getWeatherBtn");
const geoBtn = document.getElementById("geoBtn");
const currentWeatherBlock = document.getElementById("currentWeatherBlock");
const forecastBlock = document.getElementById("forecastBlock");
const forecastGrid = document.getElementById("forecastGrid");

const countryCache = new Map();

async function fetchCountryInfo(countryCode) {
  if (!countryCode) return { name: countryCode, flag: "🏳️" };
  if (countryCache.has(countryCode)) return countryCache.get(countryCode);

  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/alpha/${countryCode}`,
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    const country = data[0];
    const fullName = country.name?.common || countryCode;
    const flag = country.flag || "🏳️";
    const result = { name: fullName, flag };
    countryCache.set(countryCode, result);
    return result;
  } catch (err) {
    console.warn("Не удалось загрузить страну:", err);
    return { name: countryCode, flag: "🏳️" };
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date
    .toLocaleDateString("ru-RU", { month: "short" })
    .replace(".", "");
  return `${day} ${month}`;
}

function getWeekday(dateStr) {
  const date = new Date(dateStr);
  return date
    .toLocaleDateString("ru-RU", { weekday: "short" })
    .replace(".", "");
}

function showLoading() {
  currentWeatherBlock.innerHTML = `
            <div style="padding: 32px; text-align: center;">
                <div class="loading-spinner">
                    <span style="left: 8px; animation-delay: -0.3s;"></span>
                    <span style="left: 32px; animation-delay: -0.15s;"></span>
                    <span style="left: 56px;"></span>
                </div>
                <div style="margin-top: 20px; opacity: 0.7;">загрузка погоды...</div>
            </div>
        `;
}

function renderCurrentWeather(data, countryInfo) {
  const temp = Math.round(data.main.temp);
  const feelsLike = Math.round(data.main.feels_like);
  const description = data.weather[0].description;
  const iconCode = data.weather[0].icon;
  const humidity = data.main.humidity;
  const windSpeed = Math.round(data.wind.speed * 3.6);
  const city = data.name;

  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  currentWeatherBlock.innerHTML = `
            <div class="city-country">
                <span class="city-name">${city}</span>
                <span class="country-flag">${countryInfo.flag}</span>
                <span class="country-full">${countryInfo.name}</span>
            </div>
            <img class="weather-icon" src="${iconUrl}" alt="${description}">
            <div class="temp-main">${temp}°</div>
            <div class="feels-like">Ощущается как ${feelsLike}°</div>
            <div class="weather-desc">${description}</div>
            <div class="wind-humidity">
                <span>Ветер: ${windSpeed} км/ч</span>
                <span>Влажность: ${humidity}%</span>
            </div>
        `;
}

function renderForecast(forecastData) {
  const dailyMap = new Map();

  forecastData.list.forEach((item) => {
    const date = item.dt_txt.split(" ")[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date).push(item);
  });

  const days = Array.from(dailyMap.entries()).slice(0, 5);

  if (days.length === 0) {
    forecastBlock.style.display = "none";
    return;
  }

  forecastBlock.style.display = "block";
  forecastGrid.innerHTML = "";

  for (const [date, items] of days) {
    const middayItem =
      items.find((i) => i.dt_txt.includes("12:00")) || items[0];
    const temp = Math.round(middayItem.main.temp);
    const iconCode = middayItem.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;
    const weekday = getWeekday(date);
    const dateFormatted = formatDate(date);

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
                <div class="forecast-day">${weekday}</div>
                <div class="forecast-date">${dateFormatted}</div>
                <img class="forecast-icon" src="${iconUrl}" alt="иконка">
                <div class="forecast-temp">${temp}°</div>
            `;
    forecastGrid.appendChild(card);
  }
}

async function fetchWeatherAndForecast(city) {
  if (!city.trim()) {
    showError("Пожалуйста, введите город");
    return;
  }

  showLoading();
  forecastBlock.style.display = "none";

  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=ru&appid=${API_KEY}`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) {
      if (weatherRes.status === 404) throw new Error("Город не найден");
      if (weatherRes.status === 401) throw new Error("Неверный API ключ");
      throw new Error(`Ошибка ${weatherRes.status}`);
    }
    const weatherData = await weatherRes.json();

    const countryCode = weatherData.sys.country;
    const countryInfo = await fetchCountryInfo(countryCode);

    renderCurrentWeather(weatherData, countryInfo);

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&lang=ru&appid=${API_KEY}`;
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) {
      forecastBlock.style.display = "none";
      return;
    }
    const forecastData = await forecastRes.json();
    renderForecast(forecastData);
  } catch (error) {
    console.error(error);
    showError(error.message);
    forecastBlock.style.display = "none";
  }
}

async function fetchWeatherByCoords(lat, lon) {
  showLoading();
  forecastBlock.style.display = "none";

  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error("Не удалось получить погоду");
    const weatherData = await weatherRes.json();

    const countryCode = weatherData.sys.country;
    const countryInfo = await fetchCountryInfo(countryCode);
    renderCurrentWeather(weatherData, countryInfo);

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
    const forecastRes = await fetch(forecastUrl);
    if (forecastRes.ok) {
      const forecastData = await forecastRes.json();
      renderForecast(forecastData);
    } else {
      forecastBlock.style.display = "none";
    }
  } catch (error) {
    showError("Ошибка геолокации: " + error.message);
  }
}

function handleGeo() {
  if (!navigator.geolocation) {
    showError("Геолокация не поддерживается вашим браузером");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
    },
    (error) => {
      let msg = "Не удалось определить местоположение";
      if (error.code === 1)
        msg = "Доступ к геолокации запрещён. Разрешите в браузере";
      showError(msg);
    },
  );
}

function showError(msg) {
  currentWeatherBlock.innerHTML = `
            <div class="error-msg">
                ${msg}<br>
                <span style="font-size:0.85rem;">попробуйте ввести город вручную</span>
            </div>
        `;
}

getWeatherBtn.addEventListener("click", () => {
  fetchWeatherAndForecast(cityInput.value);
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    fetchWeatherAndForecast(cityInput.value);
  }
});

geoBtn.addEventListener("click", handleGeo);
