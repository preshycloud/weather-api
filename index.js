const express = require('express');
const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env file
const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());

// Function to check if the IP is in a reserved range
const isReservedIp = (ip) => {
    const reservedRanges = [
        /^127\./, // Loopback
        /^10\./, // Private
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private
        /^192\.168\./, // Private
        /^::1$/, // IPv6 Loopback
        /^fc00:/, // IPv6 Private
        /^fe80:/, // IPv6 Link-Local
    ];
    return reservedRanges.some((range) => range.test(ip));
};

app.get('/api/hello', async (req, res) => {
    const visitorName = req.query.visitor_name;
    let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Use a public IP if the client IP is in a reserved range
    if (isReservedIp(clientIp)) {
        console.log(`Using fallback IP for reserved range: ${clientIp}`);
        clientIp = '8.8.8.8'; // Google's public DNS server IP
    }

    try {
        // Get location based on IP
        console.log(`Fetching location data for IP: ${clientIp}`);
        const locationResponse = await axios.get(`http://ip-api.com/json/${clientIp}`);
        console.log('Location response data:', locationResponse.data);

        if (locationResponse.data.status !== 'success') {
            throw new Error(`Failed to fetch location data: ${locationResponse.data.message}`);
        }

        const location = locationResponse.data.city;

        // Get weather data using environment variable
        console.log(`Fetching weather data for location: ${location}`);
        const weatherApiKey = process.env.WEATHER_API_KEY;
        const weatherResponse = await axios.get(`http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${location}`);
        console.log('Weather response data:', weatherResponse.data);

        if (!weatherResponse.data || !weatherResponse.data.current) {
            throw new Error('Failed to fetch weather data');
        }

        const temperature = weatherResponse.data.current.temp_c;

        res.json({
            client_ip: clientIp,
            location: location,
            greeting: `Hello, ${visitorName}! The temperature is ${temperature} degrees Celsius in ${location}`
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: error.message || 'Error fetching data' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
