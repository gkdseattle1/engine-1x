// controllers/redirect.js

const crypto = require('crypto');
const { getClientIp } = require('../utils/ipUtils');
const { isValidUrl, isValidEmail } = require('../utils/urlUtils');
const { logRequest } = require('../utils/logger');
const { getBrowserInfo } = require('../utils/browserUtils');

const tokenStore = new Map();
const TOKEN_CLEANUP_INTERVAL = 1 * 60 * 1000; // Run every 1 minute

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

async function redirectController(req, res) {
  const { token, base64Email } = req.params;

  const tokenData = tokenStore.get(token);

  if (!tokenData || tokenData.expires < Date.now()) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  let email = '';
  if (base64Email) {
    try {
      email = Buffer.from(base64Email, 'base64').toString('utf8');
      if (!isValidEmail(email)) {
        throw new Error('Invalid email format');
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }

  const encodedEmail = email ? Buffer.from(email).toString('base64') : '';
  req.session.finalDestination = encodedEmail
      ? `${tokenData.destination}/${encodedEmail}`
      : tokenData.destination;

  // Step 1: CAPTCHA
  if (!req.session?.captchaPassed) {
    req.session.nextStep = `/r/${token}/${base64Email || ''}`;
    return res.redirect('/captcha');
  }

  // Step 2: Randomized Interaction Pages
  if (!req.session?.page2Completed) {
    req.session.nextStep = `/r/${token}/${base64Email || ''}`;
    return res.redirect('/interaction');
  }

  // Step 3: Final Redirection
  tokenData.used = true;

  res.redirect(finalDestination);
}


function calculateDelay(trustScore) {
  const baseDelay = 100;
  const variableDelay = Math.floor((100 - (trustScore || 70)) * 5);
  return baseDelay + variableDelay;
}

module.exports = {
  generateTokenController,
  redirectController,
  generateToken,
  tokenStore
};
