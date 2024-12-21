USE weather_safe;
CREATE TABLE IF NOT EXISTS Clothing (
    Clothing_ID INT AUTO_INCREMENT PRIMARY KEY,
    Temp_Min FLOAT, 
    Temp_Max FLOAT, 
    Weather_Condition VARCHAR(50), 
    Clothing_Recommendation TEXT, 
    Gender ENUM('Men', 'Women'),   
    Age_Group VARCHAR(10)
);

INSERT INTO Clothing (Temp_Min, Temp_Max, Weather_Condition, Clothing_Recommendation, Gender, Age_Group)
VALUES 
(30, 40, 'sunny', 'Sweater and jeans', 'Men', '13-17'),
(30, 40, 'sunny', 'Sweater and jeans', 'Women', '13-17'),
(40, 50, 'sunny', 'Light jacket and jeans', 'Men', '18-24'),
(40, 50, 'sunny', 'Light jacket and jeans', 'Women', '18-24'),
(50, 60, 'sunny', 'Light sweater and skirt', 'Men', '25-34'),
(50, 60, 'sunny', 'Light sweater and skirt', 'Women', '25-34'),
(60, 70, 'sunny', 'T-shirt and jeans', 'Men', '35-44'),
(60, 70, 'sunny', 'T-shirt and jeans', 'Women', '35-44'),
(70, 80, 'sunny', 'Shorts and T-shirt', 'Men', '45-54'),
(70, 80, 'sunny', 'Dress or shorts and tank top', 'Women', '45-54'),
(80, 90, 'sunny', 'Shorts and tank top', 'Men', '55-64'),
(80, 90, 'sunny', 'Shorts and tank top', 'Women', '55-64'),
(90, 100, 'sunny', 'Lightweight and breathable clothing', 'Men', '65-74'),
(90, 100, 'sunny', 'Sunhat and light dress', 'Women', '65-74'),
(100, 110, 'sunny', 'Very lightweight and breathable clothing', 'Men', '75-84'),
(100, 110, 'sunny', 'Very lightweight and breathable clothing', 'Women', '75-84'),
(30, 40, 'rain', 'Raincoat and waterproof boots', 'Men', '13-17'),
(30, 40, 'rain', 'Raincoat and waterproof boots', 'Women', '13-17'),
(40, 50, 'rain', 'Light raincoat and jeans', 'Men', '18-24'),
(40, 50, 'rain', 'Light raincoat and jeans', 'Women', '18-24'),
(50, 60, 'rain', 'Raincoat and waterproof boots', 'Men', '25-34'),
(50, 60, 'rain', 'Raincoat and waterproof boots', 'Women', '25-34'),
(60, 70, 'rain', 'Raincoat and waterproof boots', 'Men', '35-44'),
(60, 70, 'rain', 'Raincoat and waterproof boots', 'Women', '35-44'),
(70, 80, 'rain', 'Light raincoat and jeans', 'Men', '45-54'),
(70, 80, 'rain', 'Light raincoat and jeans', 'Women', '45-54');