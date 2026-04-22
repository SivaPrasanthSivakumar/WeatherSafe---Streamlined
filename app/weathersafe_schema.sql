-- Sanitized SQL script for WeatherSafe (password placeholders)

CREATE DATABASE IF NOT EXISTS weathersafe_db;
USE weathersafe_db;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weather_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    alert_message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Drop existing users if they exist
DROP USER IF EXISTS 'weather_user'@'localhost';
DROP USER IF EXISTS 'weather_admin'@'localhost';

-- Create users (replace placeholders with secure passwords before running)
-- Note: do NOT commit real passwords to source control.
CREATE OR REPLACE USER 'weather_user'@'localhost' IDENTIFIED BY '<WEATHER_USER_PASSWORD>';
GRANT SELECT, INSERT, UPDATE ON weathersafe_db.* TO 'weather_user'@'localhost';

CREATE OR REPLACE USER 'weather_admin'@'localhost' IDENTIFIED BY '<WEATHER_ADMIN_PASSWORD>';
GRANT ALL PRIVILEGES ON weathersafe_db.* TO 'weather_admin'@'localhost';

FLUSH PRIVILEGES;
