const SUSPICIOUS_UA_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /microsoft/i,
  /outlook/i,
  /slurp/i,
  /google/i,
  /headless/i,
  /selenium/i,
  /chrome-lighthouse/i
];

const REQUIRED_HEADERS = [
  'accept',
  'accept-language',
  'user-agent',
  'accept-encoding'
];

// Store IP request counts with timestamps
const ipRequestLog = new Map();

function botDetectionMiddleware(req, res, next) {
  try {
    const score = calculateTrustScore(req);
    
    if (score < 70) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Request appears to be automated'
      });
    }

    req.trustScore = score;
    next();
  } catch (error) {
    next(error);
  }
}

function calculateTrustScore(req) {
  let score = 100;
  
  // 1. Check User Agent
  const ua = req.headers['user-agent'] || '';
  if (!ua) {
    score -= 50;
  } else if (SUSPICIOUS_UA_PATTERNS.some(pattern => pattern.test(ua))) {
    score -= 30;
  }
  
  // 2. Check Required Headers
  const missingHeaders = REQUIRED_HEADERS.filter(header => !req.headers[header]);
  score -= (missingHeaders.length * 10);
  
  // 3. Check Request Rate
  const ip = req.ip;
  const now = Date.now();
  const recentRequests = getRecentRequests(ip, now);
  if (recentRequests > 10) {
    score -= 20;
  }
  
  // 4. Check Headers Consistency
  if (!checkHeadersConsistency(req.headers)) {
    score -= 20;
  }

  return Math.max(0, score);
}

function getRecentRequests(ip, now) {
  cleanupOldEntries();
  
  if (!ipRequestLog.has(ip)) {
    ipRequestLog.set(ip, []);
  }
  
  const requests = ipRequestLog.get(ip);
  requests.push(now);
  ipRequestLog.set(ip, requests);
  
  return requests.length;
}

function cleanupOldEntries() {
  const oneMinuteAgo = Date.now() - 60000;
  
  for (const [ip, timestamps] of ipRequestLog.entries()) {
    const recentTimestamps = timestamps.filter(time => time > oneMinuteAgo);
    if (recentTimestamps.length === 0) {
      ipRequestLog.delete(ip);
    } else {
      ipRequestLog.set(ip, recentTimestamps);
    }
  }
}

function checkHeadersConsistency(headers) {
  const ua = headers['user-agent'] || '';
  const acceptHeader = headers['accept'] || '';
  
  // Check if mobile UA matches mobile headers
  const isMobileUA = /mobile/i.test(ua);
  const isMobileAccept = /mobile/i.test(acceptHeader);
  
  return isMobileUA === isMobileAccept;
}

module.exports = { botDetectionMiddleware };
