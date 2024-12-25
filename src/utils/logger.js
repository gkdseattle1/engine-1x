const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../../logs/requests.json');

// Ensure logs directory exists
if (!fs.existsSync(path.dirname(logFilePath))) {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
}

// Initialize log file if it doesn't exist
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, JSON.stringify([], null, 2));
}

function logRequest(requestData) {
  try {
    const logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
    logs.push({
      ...requestData,
      timestamp: new Date().toISOString(),
      abuseIpReport: requestData.abuseIpReport || null
    });
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error logging request:', error);
  }
}

module.exports = { logRequest }; 