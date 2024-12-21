# WeatherSafe

Description:  
 WeatherSafe system acts as an extreme weather warning system to warn the user of mild or dangerous weather conditions, along with a weather forecast functionality that displays the day, forecast description, temperature, and wind speed.

New Features:

- Fun weather facts to keep users engaged.
- Interactive UI elements with animations.
- Weather-themed background music.

Directions to run the system:

1. In terminal: type in `npm install` to install dependencies.
2. Generate SSL certificates and place them in the `Programs/WeatherSafeApp` directory:
   ```sh
   openssl req -nodes -new -x509 -keyout localhost-key.pem -out localhost.pem -days 365
   ```
3. Type in `npm start` to start the system.
