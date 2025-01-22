// middleware/botDetection.js
const { getClientIp } = require('../utils/ipUtils');
const { logRequest } = require('../utils/logger');
const { getBrowserInfo } = require('../utils/browserUtils');
const { checkIpAddress: checkIpWithAntiBot } = require('../../scripts/antibot');

const SUSPICIOUS_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /lighthouse/i,
  /headless/i, /preview/i, /postman/i, /http/i,
  /python/i, /curl/i, /wget/i, /node/i, /axios/i,
  /puppeteer/i, /playwright/i, /selenium/i
];

const REQUIRED_HEADERS = [
  'user-agent',
  'accept',
  'accept-language',
  'accept-encoding',
  'connection'
];

const BLOCKED_DIRECTORIES = [
  '/admin', '/config', '/.git', '/.env', '/logs', '/backup'
]; // Add directories or files to protect

// Store request logs with automatic cleanup
const requestLogs = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

setInterval(() => {
  const cutoff = Date.now() - CLEANUP_INTERVAL;
  for (const [key, data] of requestLogs.entries()) {
    if (data.lastRequest < cutoff) {
      requestLogs.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

async function botDetectionMiddleware(req, res, next) {
  const clientIp = getClientIp(req);
  const antiBotReport = await checkIpWithAntiBot(clientIp, req.headers['user-agent']);

  // Block requests to specific paths like /favico.ico and sensitive directories
  const blockedPaths = ['/favico.ico', ...BLOCKED_DIRECTORIES];
  if (blockedPaths.includes(req.path)) {
    logRequest({
      ip: clientIp,
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'blocked',
      reason: 'Access to restricted path',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });

    return res.status(403).send('Forbidden');
  }

  // Immediately block request if AntiBot API identifies it as a bot
  if (antiBotReport && antiBotReport.is_bot) {
    logRequest({
      ip: clientIp,
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'blocked',
      reason: 'Identified as bot by AntiBot API',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });

    return res.status(403).json({
      error: 'Access denied',
      message: 'Request identified as bot'
    });
  }

  const score = await calculateTrustScore(req, clientIp);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const requestLog = {
    ip: clientIp,
    userAgent,
    browser: getBrowserInfo(userAgent),
    trustScore: score,
    isBot: score < 70,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    status: score < 70 ? 'blocked' : 'passed'
  };

  logRequest(requestLog);


  if (score < 70) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Request appears to be automated'
    });
  }

  req.trustScore = score;
  next();
}

async function calculateTrustScore(req, clientIp) {
  let score = 100;
  const ua = req.headers['user-agent'] || '';

  // Check user agent
  if (!ua || SUSPICIOUS_PATTERNS.some(pattern => pattern.test(ua))) {
    score -= 40;
  }

  // Check required headers
  const missingHeaders = REQUIRED_HEADERS.filter(h => !req.headers[h]);
  score -= (missingHeaders.length * 10);

  // Check request rate
  const requestData = getRequestData(clientIp);
  if (requestData.count > 10) {
    score -= 30;
  }

  score = 100
  return Math.max(0, score);
}

function getRequestData(clientIp) {
  const now = Date.now();
  const data = requestLogs.get(clientIp) || { count: 0, lastRequest: 0 };

  if (now - data.lastRequest > 60000) {
    data.count = 1;
  } else {
    data.count++;
  }

  data.lastRequest = now;
  requestLogs.set(clientIp, data);

  return data;
}

module.exports = { botDetectionMiddleware };
