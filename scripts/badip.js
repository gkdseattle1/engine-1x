require('dotenv').config();

const axios = require('axios');

async function checkIpAddress(ipAddress) {
  try {
    const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
      params: {
        ipAddress: ipAddress,
        maxAgeInDays: 90,
        verbose: true
      },
      headers: {
        'Key': process.env.ABUSEIPDB_API_KEY,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error checking IP address:', error);
    return null;
  }
}

module.exports = { checkIpAddress };
