const express = require("express");
const axios = require("axios");
const path = require("path");
const mysql = require("mysql2");
const https = require("https");
const app = express();
const fs = require("fs");
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "MQLaccrol2345@",
  database: "weather_safe",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL database");
});

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
    //console.log("Alerts: ", data);
    const alerts = data.features.map((alert) => ({
      area: alert.properties.areaDesc || "Unknown Area",
      headline: alert.properties.headline || "No headline available",
      description: alert.properties.description || "No description available",
      sent: alert.properties.sent || "Unknown Time",
      severity: alert.properties.severity || "Unknown Severity",
    }));

    for (const alert of alerts) {
      await insertWeatherAlert(alert);
    }

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
    //console.log("Forecast: ", data);
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

async function insertUserLocation(city, state) {
  const query = `INSERT INTO Demo_Graphic (Demo_Name, City, State) VALUES (?, ?, ?)`;
  connection.query(query, ["User", city, state], (err) => {
    if (err) {
      console.error("Error inserting location into Demo_Graphic:", err);
    } else {
      console.log("User location inserted into Demo_Graphic");
    }
  });
}

async function insertWeatherAlert(alert) {
  console.log(alert);
  const query = `
        INSERT INTO Weather_Alerts (Area,Headline,Description,Alert_Time,Severity)
        VALUES (?, ?, ?, ?,?)
        ON DUPLICATE KEY UPDATE 
        Area = VALUES(Area),
        Headline = VALUES(Headline),
        Description = VALUES(Description),
        Alert_Time = VALUES(Alert_Time),
        Severity = VALUES(Severity)`;

  connection.query(
    query,
    [alert.area, alert.headline, alert.description, alert.sent, alert.severity],
    (err) => {
      if (err) {
        console.error("Error inserting weather alert:", err);
      } else {
        console.log("Weather alert inserted or updated in Alerts");
      }
    }
  );
}

async function insertWeatherForecast(forecast) {
  console.log("Inserting weather: ", forecast.city, forecast.state);
  const query = `
        INSERT INTO Weather (City, State, Time, Temperature, Wind_Speed, Wind_Direction, Forecast) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            Temperature = VALUES(Temperature), 
            Wind_Speed = VALUES(Wind_Speed), 
            Wind_Direction = VALUES(Wind_Direction), 
            Forecast = VALUES(Forecast)`;

  connection.query(
    query,
    [
      forecast.city,
      forecast.state,
      forecast.time,
      forecast.temp,
      forecast.windSpeed,
      forecast.windDir,
      forecast.detailedForecast,
    ],
    (err) => {
      if (err) {
        console.error("Error inserting weather forecast:", err);
      } else {
        console.log("Weather forecast inserted or updated in Weather");
      }
    }
  );
}

async function addWeatherRecommendation(forecast) {
  const updatedForecast = [];
  for (const period of forecast) {
    const recommendations = await getClothingRecommendation(
      period.temp,
      period.detailedForecast
    );
    period.clothingRecommendation = recommendations;
    updatedForecast.push(recommendations);
  }

  return forecast;
}

async function getClothingRecommendation(temp, description) {
  const query = `
    SELECT Clothing_Recommendation, Gender, Age_Group FROM clothing
    where ? between temp_min and temp_max
    and LOWER(?) like CONCAT('%', weather_condition, '%');`;
  try {
    const [recommendations] = await connection
      .promise()
      .query(query, [temp, description]);
    return recommendations;
  } catch (error) {
    console.error("Error fetching clothing recommendations:", error.message);
    return [];
  }
}

app.get("/user-weather", async (req, res) => {
  try {
    const location = await getLocationFromIP(req.query.ip);
    if (location) {
      const { city, state, lat, lon } = location;
      await insertUserLocation(city, state);
      const alerts = await getWeatherAlerts(lat, lon);
      let forecast = await getWeatherForecast(lat, lon);
      for (const period of forecast) {
        await insertWeatherForecast({ ...period, city, state });
      }
      console.log("Forecast: ", forecast);
      forecast = await addWeatherRecommendation(forecast);
      console.log("after: ", forecast);

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
      let forecast = await getWeatherForecast(location.lat, location.lon);
      for (const period of forecast) {
        await insertWeatherForecast({ ...period, city, state });
      }
      forecast = await addWeatherRecommendation(forecast);

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
  res.sendFile(path.join(__dirname, "index.html"));
});
const options = {
  key: fs.readFileSync(path.join(__dirname, "localhost-key.pem")),

  cert: fs.readFileSync(path.join(__dirname, "localhost.pem")),
};
const server = https.createServer(options, app);

server.listen(port, () => {
  console.log(`WeatherSafe app listening at https://localhost:${port}`);
});
