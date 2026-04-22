const express = require("express");
const axios = require("axios");
const path = require("path");
const cors = require("cors");
const NodeCache = require("node-cache");
const fs = require("fs");
const db = require("./db");

const app = express();
const port = 3000;
const cache = new NodeCache({ stdTTL: 3600 });

app.use(cors());
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1d" }));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLocationFromIP(ipAddress) {
  try {
    const target = ipAddress
      ? `https://ipapi.co/${ipAddress}/json/`
      : `https://ipapi.co/json/`;
    const { data: locationData } = await axios.get(target, {
      headers: {
        "User-Agent":
          "WeatherSafeApp/1.0 (https://github.com/SivaPrasanthSivakumar/WeatherSafe---Streamlined)",
      },
    });
    // ipapi.co returns latitude/longitude fields
    if (locationData) {
      return {
        city: locationData.city || null,
        state: locationData.region || locationData.region_code || null,
        lat: locationData.latitude || locationData.lat || null,
        lon: locationData.longitude || locationData.lon || null,
      };
    }
  } catch (error) {
    console.error("Error fetching user location from ipapi.co:", error.message);
  }
  return null;
}

async function getLatLonFromCityState(city, state) {
  const cacheKey = `geocode:${city},${state}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for geocoding ${city}, ${state}`);
    return cachedData;
  }

  try {
    const params = new URLSearchParams({ city, state, format: "json" });
    const apiUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const { data } = await axios.get(apiUrl, {
      headers: {
        "User-Agent":
          "WeatherSafeApp/1.0 (https://github.com/SivaPrasanthSivakumar/WeatherSafe---Streamlined)",
      },
    });
    if (data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
      cache.set(cacheKey, result);
      return result;
    } else {
      console.error(`No geocoding data found for ${city}, ${state}`);
    }
  } catch (error) {
    console.error(
      `Error fetching geolocation data for ${city}, ${state}:`,
      error.message,
    );
  }
  return null;
}

async function getWeatherAlerts(latitude, longitude) {
  const cacheKey = `alerts:${latitude},${longitude}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for weather alerts at ${latitude}, ${longitude}`);
    return cachedData;
  }

  try {
    await sleep(1000);
    const { data } = await axios.get(
      `https://api.weather.gov/alerts?point=${latitude},${longitude}`,
    );
    const alerts = data.features.map((alert) => ({
      area: alert.properties.areaDesc || "Unknown Area",
      headline: alert.properties.headline || "No headline available",
      description: alert.properties.description || "No description available",
      sent: alert.properties.sent || "Unknown Time",
      severity: alert.properties.severity || "Unknown Severity",
    }));

    cache.set(cacheKey, alerts);
    return alerts;
  } catch (error) {
    console.error(
      `Error fetching weather alerts for ${latitude}, ${longitude}:`,
      error.message,
    );
    return [];
  }
}

async function getWeatherForecast(latitude, longitude) {
  const cacheKey = `forecast:${latitude},${longitude}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for weather forecast at ${latitude}, ${longitude}`);
    return cachedData;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,windspeed_10m,winddirection_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=7`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "WeatherSafeApp/1.0" },
    });
    const hours = data.hourly || {};
    const times = hours.time || [];
    const temps = hours.temperature_2m || [];
    const winds = hours.windspeed_10m || [];
    const winddirs = hours.winddirection_10m || [];

    // Convert Celsius to Fahrenheit helper
    const cToF = (c) => (c == null ? null : Math.round((c * 9) / 5 + 32));

    const forecastHourly = [];
    // Build simple hourly periods (limit to first 24 entries) and convert temps to F
    // convert wind speeds from km/h to mph for readability
    const kmhToMph = (k) => (k == null ? null : Math.round(k * 0.621371));

    for (let i = 0; i < Math.min(24, times.length); i++) {
      forecastHourly.push({
        time: times[i],
        temp: temps[i] != null ? cToF(temps[i]) : null,
        tempUnit: "F",
        windSpeed: kmhToMph(winds[i]),
        windDir: winddirs[i] != null ? winddirs[i] : null,
        detailedForecast: "",
      });
    }

    // Daily summaries
    const daily = [];
    if (data.daily) {
      const d = data.daily;
      const days = d.time || [];
      const tmax = d.temperature_2m_max || [];
      const tmin = d.temperature_2m_min || [];
      const precip = d.precipitation_sum || [];
      const windmax = d.windspeed_10m_max || [];

      for (let i = 0; i < days.length; i++) {
        daily.push({
          date: days[i],
          maxTemp: tmax[i] != null ? cToF(tmax[i]) : null,
          minTemp: tmin[i] != null ? cToF(tmin[i]) : null,
          precipitation: precip[i] != null ? precip[i] : 0,
          maxWindSpeed: kmhToMph(windmax[i]),
          tempUnit: "F",
        });
      }
    }

    const result = { hourly: forecastHourly, daily };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(
      `Error fetching weather forecast for ${latitude}, ${longitude}:`,
      error.message,
    );
    return { hourly: [], daily: [] };
  }
}

app.get("/api/user-weather", async (req, res) => {
  try {
    const location = await getLocationFromIP(req.query.ip);
    if (location) {
      const { city, state, lat, lon } = location;
      const alerts = await getWeatherAlerts(lat, lon);
      const forecast = await getWeatherForecast(lat, lon);

      const ipAddr =
        req.query.ip || req.ip || req.headers["x-forwarded-for"] || null;
      const fcHourly =
        forecast && forecast.hourly && Array.isArray(forecast.hourly)
          ? forecast.hourly.length
          : 0;
      const fcDaily =
        forecast && forecast.daily && Array.isArray(forecast.daily)
          ? forecast.daily.length
          : 0;
      db.saveUsage({
        ip: ipAddr,
        city,
        state,
        lat,
        lon,
        alertsCount: Array.isArray(alerts) ? alerts.length : 0,
        forecastCount: fcHourly + fcDaily,
        raw: { query: req.query },
      }).catch((err) => {
        console.error("DB save failed (logged):", err && (err.message || err));
      });

      res.json({
        location: { city, state },
        alerts,
        forecast,
        message: "Stay safe and have a great day!",
      });
    } else {
      res.status(500).json({
        error: "We couldn't determine your location. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Error in /user-weather route:", error.message);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const { city, state } = req.query;
    if (!city || !state) {
      return res.status(400).json({ error: "City and state are required." });
    }

    const latLon = await getLatLonFromCityState(city, state);
    if (!latLon) {
      return res
        .status(500)
        .json({ error: "Failed to fetch latitude and longitude." });
    }

    const alerts = await getWeatherAlerts(latLon.lat, latLon.lon);
    res.json({ alerts });
  } catch (error) {
    console.error("Error in /api/alerts route:", error.message);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

app.get("/api/weather", async (req, res) => {
  try {
    const { city, state } = req.query;
    if (!city || !state) {
      return res.status(400).json({ error: "City and state are required." });
    }

    const latLon = await getLatLonFromCityState(city, state);
    if (!latLon) {
      return res.status(500).json({ error: "Location not found." });
    }

    const forecast = await getWeatherForecast(latLon.lat, latLon.lon);
    res.json({ forecast });
  } catch (error) {
    console.error("Error in /api/weather route:", error.message);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

app.get("/api/random-fact", (req, res) => {
  const facts = [
    "The hottest temperature ever recorded on Earth was 134°F (56.7°C) in Furnace Creek Ranch, California, in 1913.",
    "A tornado can have winds of up to 300 mph (480 km/h).",
    "Lightning strikes the Earth about 8 million times a day.",
    "The deadliest tornado in recorded history hit Daulatpur, Bangladesh, in 1989 and killed over 1,300 people.",
    "Mount Everest's height is still increasing by about 4 millimeters per year due to plate tectonics.",
  ];

  const randomFact = facts[Math.floor(Math.random() * facts.length)];
  res.json({ fact: randomFact });
});

app.listen(port, () => {
  console.log(`WeatherSafe app is listening at http://localhost:${port}`);
});
