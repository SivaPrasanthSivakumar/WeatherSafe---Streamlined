CREATE DATABASE IF NOT EXISTS weather_safe;
USE weather_safe;

CREATE TABLE IF NOT EXISTS Demo_Graphic (
        Demo_Id INT AUTO_INCREMENT PRIMARY KEY,
        Demo_Name VARCHAR(100),
        City VARCHAR(100),
        State VARCHAR(100)
    );

CREATE TABLE IF NOT EXISTS Weather (
        Weather_ID INT AUTO_INCREMENT PRIMARY KEY,
        City VARCHAR(100),
        State VARCHAR(100),
        Time VARCHAR(100),
        Temperature DECIMAL(5,2),
        Wind_Speed DECIMAL(5,2),
        Wind_Direction VARCHAR(50),
        Forecast TEXT,
        UNIQUE(City, State, Time)
    );

CREATE TABLE IF NOT EXISTS Weather_Alerts (
        Alert_ID INT AUTO_INCREMENT PRIMARY KEY,
        Area TEXT,
        Headline VARCHAR(255),
        Description TEXT,
        Alert_Time DATETIME,
        UNIQUE(Area(255), Headline, Alert_Time),
        Severity ENUM('Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown') DEFAULT 'Unknown'
    );

CREATE TABLE IF NOT EXISTS Clothing (
        Clothing_ID INT AUTO_INCREMENT PRIMARY KEY,
        Temperature_Range VARCHAR(50),  
        Weather_Condition VARCHAR(50), 
        Clothing_Recommendation TEXT, 
        Gender ENUM('Men', 'Women'),   
        Age_Group VARCHAR(10)         
    );