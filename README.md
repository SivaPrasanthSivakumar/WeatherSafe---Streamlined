# WeatherSafe

WeatherSafe is a lightweight Node.js + Express application that fetches live weather forecasts and official weather alerts for a user's location and provides a simple UI and REST endpoints for accessing that data.

**Key features**

- Real-time weather alerts (from government APIs where available)
- Hourly and 7-day forecasts (via Open-Meteo)
- Simple usage logging to a MySQL database
- Caching for improved response times

## Prerequisites

- Node.js 16+ and npm
- A running MySQL server (optional but recommended for usage logging)

## Quickstart

1. Clone the repository:

```sh
git clone https://github.com/SivaPrasanthSivakumar/WeatherSafe---Streamlined.git
cd WeatherSafe---Streamlined
```

2. Install dependencies:

```sh
npm install
```

3. Configure the database (optional):

- Create a database (example name: `weathersafe_db`).
- Import the sanitized schema if you want the usage table:

```sh
mysql -u your_user -p weathersafe_db < app/weathersafe_schema.sql
```

4. Set environment variables (example):

```powershell
$env:DB_HOST='localhost'
$env:DB_USER='weather_user'
$env:DB_PASSWORD='your_password_here'
$env:DB_NAME='weathersafe_db'
```

You can also create a `.env` file and load these variables using your preferred method.

5. Run the app:

```sh
npm start
```

By default the server listens on port `3000` and serves the frontend from `app/public`.

Open: http://localhost:3000

## API endpoints

- `GET /api/user-weather` — returns alerts and forecast inferred from the request IP (or `?ip=`).
- `GET /api/alerts?city=City&state=State` — returns active alerts for the specified city/state.
- `GET /api/weather?city=City&state=State` — returns forecast data for the specified city/state.
- `GET /api/random-fact` — returns a fun weather fact.

## Files of interest

- `app/server.js` — main Express server (start script points here).
- `app/db.js` — MySQL integration and usage logging (creates `usage_logs` table automatically).
- `app/public/` — static frontend (HTML/CSS/JS).
- `app/weathersafe_schema.sql` — sanitized DB schema for import.

## Notes

- DB error logs are written to `app/db_errors.log` at runtime (this file is ignored in source control).
- The project includes a small open-source background track used in the demo UI with attribution.

## Contributing

1. Fork the repo and create a feature branch.
2. Open a pull request describing your changes.

## License

This project is licensed under MIT. See the [LICENSE](LICENSE) file for details.
