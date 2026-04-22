# WeatherSafe

## Description

WeatherSafe is an extreme weather warning system that alerts users about mild or dangerous weather conditions. It also provides weather forecasts, including day, forecast description, temperature, and wind speed.

## Features

- Real-time weather alerts and forecasts.
- Fun weather facts to keep users engaged.
- Interactive UI elements with animations.
- Weather-themed background music.
- Weather-themed background music (open-source): "White Petals by Keys of Moon" included with attribution.
- **Optimized for responsiveness and faster loading with caching.**

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/weathersafe.git
   cd weathersafe
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Generate SSL certificates and place them in the `Programs/WeatherSafeApp` directory:
   ```sh
   openssl req -nodes -new -x509 -keyout localhost-key.pem -out localhost.pem -days 365
   ```

## Usage

Start the application:

```sh
 cd WeatherSafe---Streamlined
npm start
```

Access the app at [https://localhost:3000](https://localhost:3000).

## Configuration (.env)

Copy `.env.example` to `.env` and fill in your database credentials. Do NOT commit `.env` to source control.

Example (PowerShell):

```powershell
Copy-Item .env.example .env
notepad .env
npm start
```

You can also set environment variables directly before running `npm start`:

```powershell
$env:DB_HOST='localhost'
$env:DB_USER='weather_user'
$env:DB_PASSWORD='your_password_here'
$env:DB_NAME='weathersafe_db'
npm start
```

Notes:

- A sanitized schema file without plaintext passwords is available at [app/weathersafe_schema.sanitized.sql](app/weathersafe_schema.sanitized.sql). The original file containing plaintext passwords has been removed from the repository for security.
- DB error logs created at runtime are ignored via `.gitignore` (`app/db_errors.log`).

## Contributing

1. Fork the repository.
2. Create a new branch:
   ```sh
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```sh
   git commit -m "Add feature-name"
   ```
4. Push to your branch:
   ```sh
   git push origin feature-name
   ```
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
