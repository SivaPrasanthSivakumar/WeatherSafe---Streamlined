const express = require("express");
const axios = require("axios");
const path = require("path");
const https = require("https");
const app = express();
const fs = require("fs");
const port = 3000;

app.use(express.static(path.join(__dirname, "../public")));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLocationFromIP(ipAddress) {
  try {
    const { data: locationData } = await axios.get(
      `http://ip-api.com/json/${ipAddress}`
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
    console.error("Error fetching user location:", error.message);
  }
  return null;
}

async function getLatLonFromCityState(city, state) {
  try {
    const apiUrl = `https://nominatim.openstreetmap.org/search?city=${city}&state=${state}&format=json`;
    const { data } = await axios.get(apiUrl);
    if (data.length > 0) {
      console.log(`Geocoding data for ${city}, ${state}:`, data[0]);
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    } else {
      console.error("No geocoding data found for the given city and state");
    }
  } catch (error) {
    console.error("Error fetching geolocation data:", error.message);
  }
  return null;
}

async function getWeatherAlerts(latitude, longitude) {
  try {
    await sleep(1000);
    const { data } = await axios.get(
      `https://api.weather.gov/alerts?point=${latitude},${longitude}`
    );
    const alerts = data.features.map((alert) => ({
      area: alert.properties.areaDesc || "Unknown Area",
      headline: alert.properties.headline || "No headline available",
      description: alert.properties.description || "No description available",
      sent: alert.properties.sent || "Unknown Time",
      severity: alert.properties.severity || "Unknown Severity",
    }));

    return alerts;
  } catch (error) {
    console.error("Error fetching weather alerts:", error.message);
    return [];
  }
}

async function getWeatherForecast(latitude, longitude) {
  try {
    await sleep(1000);
    const { data } = await axios.get(
      `https://api.weather.gov/points/${latitude},${longitude}`
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

    return forecast;
  } catch (error) {
    console.error("Error fetching weather forecast:", error.message);
    return [];
  }
}

app.get("/user-weather", async (req, res) => {
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
      res
        .status(500)
        .json({ error: "Unable to fetch weather data for your location" });
    }
  } catch (error) {
    console.error("Error in /user-weather route:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/alerts", async (req, res) => {
  try {
    const { city, state } = req.query;
    const location = await getLatLonFromCityState(city, state);
    if (location) {
      const alerts = await getWeatherAlerts(location.lat, location.lon);
      res.json({ alerts, message: "Keep an eye on the sky!" });
    } else {
      res.status(500).json({ error: "Unable to fetch weather alerts" });
    }
  } catch (error) {
    console.error("Error in /alerts route:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/weather", async (req, res) => {
  try {
    const { city, state } = req.query;
    const location = await getLatLonFromCityState(city, state);
    if (location) {
      const forecast = await getWeatherForecast(location.lat, location.lon);
      res.json({ forecast, message: "Enjoy your day, rain or shine!" });
    } else {
      res.status(500).json({ error: "Unable to fetch weather forecast" });
    }
  } catch (error) {
    console.error("Error in /weather route:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/random-fact", (req, res) => {
  const facts = [
    "The highest temperature ever recorded on Earth was 134°F (56.7°C) in Death Valley, California.",
    "The coldest temperature ever recorded on Earth was -128.6°F (-89.2°C) at Vostok Station in Antarctica.",
    "Lightning strikes the Earth about 100 times every second.",
    "A cubic mile of ordinary fog contains less than a gallon of water.",
    "The fastest wind speed ever recorded was 253 mph (407 km/h) during a tornado in Oklahoma.",
  ];
  const randomFact = facts[Math.floor(Math.random() * facts.length)];
  res.json({ fact: randomFact });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const options = {};
try {
  options.key = fs.readFileSync(
    path.join(__dirname, "../../localhost-key.pem")
  );
  options.cert = fs.readFileSync(path.join(__dirname, "../../localhost.pem"));
} catch (error) {
  console.warn("SSL certificates not found, falling back to HTTP");
}

const server =
  options.key && options.cert ? https.createServer(options, app) : app;

server.listen(port, () => {
  console.log(
    `WeatherSafe app listening at ${
      options.key && options.cert ? "https" : "http"
    }://localhost:${port}`
  );
});
