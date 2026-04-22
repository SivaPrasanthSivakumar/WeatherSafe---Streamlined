const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "weathersafe_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const logPath = path.join(__dirname, "db_errors.log");

function sanitizeContext(context = {}) {
  const copy = { ...context };
  const redacted = "[REDACTED]";
  if (copy.ip) copy.ip = redacted;
  if (copy.lat) copy.lat = redacted;
  if (copy.lon) copy.lon = redacted;
  if (copy.city) copy.city = redacted;
  if (copy.state) copy.state = redacted;
  return copy;
}

async function logDbError(message, err, context = {}) {
  const sanitizedContext = sanitizeContext(context);
  const entry = {
    ts: new Date().toISOString(),
    message,
    error: err && (err.message || String(err)),
    context: sanitizedContext,
  };
  try {
    await fs.promises.appendFile(logPath, JSON.stringify(entry) + "\n");
  } catch (e) {
    console.error("Failed to write db error log:", e);
  }
}

async function ensureTable() {
  try {
    const createTableSQL = `CREATE TABLE IF NOT EXISTS usage_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip VARCHAR(50),
      city VARCHAR(255),
      state VARCHAR(255),
      lat DECIMAL(10,7),
      lon DECIMAL(10,7),
      alerts_count INT,
      forecast_count INT,
      raw JSON
    )`;
    await pool.query(createTableSQL);
  } catch (err) {
    await logDbError("Error ensuring usage_logs table", err);
    throw err;
  }
}
let tableEnsured = false;

(async () => {
  try {
    await ensureTable();
    tableEnsured = true;
  } catch (e) {
    console.error(
      "Failed to ensure usage_logs table at startup:",
      e && e.message,
    );
  }
})();

async function saveUsage({
  ip,
  city,
  state,
  lat,
  lon,
  alertsCount = 0,
  forecastCount = 0,
  raw = {},
} = {}) {
  try {
    if (!tableEnsured) {
      await ensureTable();
      tableEnsured = true;
    }
    const insertSQL =
      "INSERT INTO usage_logs (ip, city, state, lat, lon, alerts_count, forecast_count, raw) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const rawJson = JSON.stringify(raw || {});
    await pool.execute(insertSQL, [
      ip,
      city,
      state,
      lat,
      lon,
      alertsCount,
      forecastCount,
      rawJson,
    ]);
  } catch (err) {
    await logDbError("Error saving usage", err, { ip, city, state, lat, lon });
    throw err;
  }
}

module.exports = { pool, saveUsage, logDbError };
