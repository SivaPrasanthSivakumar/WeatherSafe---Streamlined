const express = require("express");
const axios = require("axios");
const path = require("path");
const cors = require("cors");
const NodeCache = require("node-cache");

const app = express();
const port = 3000;
const cache = new NodeCache({ stdTTL: 3600 });

app.use(cors());
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1d" }));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLocationFromIP(ipAddress) {
  try {
    const { data: locationData } = await axios.get(
      `http://ip-api.com/json/${ipAddress}`,
      {
        headers: {
          "User-Agent": "WeatherSafeApp/1.0",
        },
      },
    );
    if (locationData.status === "success") {
      return {
        city: locationData.city,
        state: locationData.regionName,
        lat: locationData.lat,
        lon: locationData.lon,
      };
    } else {
      console.error("IP location service returned an error:", locationData);
    }
  } catch (error) {
    console.error("Error fetching user location from ip-api:", error.message);
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
    const apiUrl = `https://nominatim.openstreetmap.org/search?city=${city}&state=${state}&format=json`;
    const { data } = await axios.get(apiUrl, {
      headers: {
        "User-Agent": "WeatherSafeApp/1.0 (https://example.com/contact)",
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
    await sleep(1000);
    const { data } = await axios.get(
      `https://api.weather.gov/points/${latitude},${longitude}`,
    );
    const forecastUrl = data.properties.forecast;
    const { data: forecastData } = await axios.get(forecastUrl);
    const forecast = forecastData.properties.periods.map((period) => ({
      time: period.name,
      temp: period.temperature,
      tempUnit: period.temperatureUnit,
      windSpeed: parseFloat(period.windSpeed.split(" ")[0]),
      windDir: period.windDirection,
      detailedForecast: period.detailedForecast || "No forecast available",
    }));

    cache.set(cacheKey, forecast);
    return forecast;
  } catch (error) {
    console.error(
      `Error fetching weather forecast for ${latitude}, ${longitude}:`,
      error.message,
    );
    return [];
  }
}

app.get("/api/user-weather", async (req, res) => {
  try {
    const location = await getLocationFromIP(req.query.ip);
    if (location) {
      const { city, state, lat, lon } = location;
      const alerts = await getWeatherAlerts(lat, lon);
      const forecast = await getWeatherForecast(lat, lon);

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
