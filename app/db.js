const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || null;
const DB_PASSWORD = process.env.DB_PASSWORD || null;
const DB_NAME = process.env.DB_NAME || null;
const DB_SSL = (process.env.DB_SSL || "false").toLowerCase() === "true";
const DB_SSL_CA = process.env.DB_SSL_CA || null; // path to CA file (optional)
const DB_SSL_REJECT_UNAUTHORIZED =
  process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";
const DB_CONNECTION_LIMIT = process.env.DB_CONNECTION_LIMIT
  ? parseInt(process.env.DB_CONNECTION_LIMIT, 10)
  : 10;
const DB_QUEUE_LIMIT = process.env.DB_QUEUE_LIMIT
  ? parseInt(process.env.DB_QUEUE_LIMIT, 10)
  : 100;

if (!DB_PASSWORD) {
  console.error(
    "Environment variable DB_PASSWORD is required but not set. Aborting startup.",
  );
  process.exit(1);
}
if (!DB_USER) {
  console.error(
    "Environment variable DB_USER is required but not set. Aborting startup.",
  );
  process.exit(1);
}
if (!DB_NAME) {
  console.error(
    "Environment variable DB_NAME is required but not set. Aborting startup.",
  );
  process.exit(1);
}

const poolConfig = {
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: isNaN(DB_CONNECTION_LIMIT) ? 10 : DB_CONNECTION_LIMIT,
  queueLimit: isNaN(DB_QUEUE_LIMIT) ? 100 : DB_QUEUE_LIMIT,
};

if (DB_SSL) {
  poolConfig.ssl = {};
  if (DB_SSL_CA) {
    try {
      poolConfig.ssl.ca = fs.readFileSync(DB_SSL_CA, "utf8");
    } catch (err) {
      console.error("Failed to read DB_SSL_CA file:", err && err.message);
      process.exit(1);
    }
  }
  poolConfig.ssl.rejectUnauthorized = !!DB_SSL_REJECT_UNAUTHORIZED;
}

const pool = mysql.createPool(poolConfig);

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

let _poolClosed = false;

async function closePool() {
  if (_poolClosed) return;
  _poolClosed = true;
  try {
    await pool.end();
    console.log("Database pool closed gracefully.");
  } catch (err) {
    try {
      await logDbError("Error closing database pool", err);
    } catch (e) {
      console.error("Failed to log DB pool close error:", e);
    }
  }
}

// Wire graceful shutdown handlers. Idempotent via _poolClosed guard.
process.on("SIGINT", async () => {
  try {
    await closePool();
  } finally {
    process.exit(0);
  }
});

process.on("SIGTERM", async () => {
  try {
    await closePool();
  } finally {
    process.exit(0);
  }
});

process.on("beforeExit", async () => {
  await closePool();
});

// 'exit' cannot be async/await; attempt to close but don't block exit.
process.on("exit", () => {
  if (!_poolClosed) {
    pool.end().catch((err) => {
      // best-effort logging — cannot await here
      console.error(
        "Error closing pool during exit:",
        err && (err.message || err),
      );
    });
    _poolClosed = true;
  }
});

module.exports = { pool, saveUsage, logDbError, closePool };
