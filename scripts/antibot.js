require('dotenv').config();

const axios = require('axios');

async function checkIpAddress(ipAddress, userAgent) {
  try {
    const apiKey = process.env.ANTIBOT_API_KEY;
    const url = `https://antibot.pw/api/v2-blockers?ip=${encodeURIComponent(ipAddress)}&apikey=${encodeURIComponent(apiKey)}&ua=${encodeURIComponent(userAgent)}`;

    const response = await axios.get(url);

    return response.data;
  } catch (error) {
    console.error('Error checking IP address with AntiBot API:', error);
    return null;
  }
}

module.exports = { checkIpAddress };
