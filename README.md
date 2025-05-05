# WeatherSafe

## Description

WeatherSafe is an extreme weather warning system that alerts users about mild or dangerous weather conditions. It also provides weather forecasts, including day, forecast description, temperature, and wind speed.

## Features

- Real-time weather alerts and forecasts.
- Fun weather facts to keep users engaged.
- Interactive UI elements with animations.
- Weather-themed background music.

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
npm start
```

Access the app at [https://localhost:3000](https://localhost:3000).

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
