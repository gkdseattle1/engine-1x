const crypto = require('crypto');
const { getClientIp } = require('../utils/ipUtils');
const { isValidUrl } = require('../utils/urlUtils');

const tokenStore = new Map();
const TOKEN_CLEANUP_INTERVAL = 1 * 60 * 1000; // Run every 1 minute instead of 15

// Cleanup expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expires < now) {
      tokenStore.delete(token);
    }
  }
}, TOKEN_CLEANUP_INTERVAL);

function generateTokenController(req, res) {
  const { url, expiresIn } = req.body;
  
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const token = generateToken(url, expiresIn);
  res.json({ token, redirectUrl: `/r/${token}` });
}

function generateToken(destination, expiresIn = 3600000) {
  // Add maximum expiration time of 24 hours
  const maxExpiresIn = 24 * 60 * 60 * 1000;
  const actualExpiresIn = Math.min(expiresIn, maxExpiresIn);
  
  const token = crypto.randomBytes(16).toString('hex');
  
  tokenStore.set(token, {
    destination,
    expires: Date.now() + actualExpiresIn,
    used: false,
    created: Date.now(),
    attempts: 0,
    ips: new Set()
  });

  return token;
}

function redirectController(req, res) {
  const { token } = req.params;
  const clientIp = getClientIp(req);
  const tokenData = tokenStore.get(token);

  if (!tokenData || tokenData.expires < Date.now()) {
    tokenStore.delete(token);
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  // Track attempts and IPs
  tokenData.attempts++;
  tokenData.ips.add(clientIp);

  // Security checks
  if (tokenData.attempts > 3 || tokenData.ips.size > 2) {
    tokenStore.delete(token);
    return res.status(403).json({ error: 'Suspicious activity detected' });
  }

  if (tokenData.used) {
    tokenStore.delete(token);
    return res.status(400).json({ error: 'Token already used' });
  }

  // Mark as used and redirect
  tokenData.used = true;
  const delay = calculateDelay(req.trustScore);
  
  setTimeout(() => {
    tokenStore.delete(token);
    res.redirect(tokenData.destination);
  }, delay);
}

function calculateDelay(trustScore) {
  const baseDelay = 100;
  const variableDelay = Math.floor((100 - (trustScore || 70)) * 5);
  return baseDelay + variableDelay;
}

module.exports = {
  generateTokenController,
  redirectController,
  generateToken
};
