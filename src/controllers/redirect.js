// Simple in-memory token storage
const tokenStore = new Map();

function generateToken(destination, expiresIn = 3600000) {
  const token = Buffer.from(Math.random().toString()).toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 12);

  tokenStore.set(token, {
    destination,
    expires: Date.now() + expiresIn,
    used: false,
    created: Date.now()
  });

  return token;
}

function redirectController(req, res) {
  try {
    const { token } = req.params;
    const tokenData = tokenStore.get(token);
    
    cleanupExpiredTokens();
    
    if (!tokenData) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }
    
    if (tokenData.expires < Date.now()) {
      tokenStore.delete(token);
      return res.status(404).json({ error: 'Token expired' });
    }
    
    if (tokenData.used) {
      return res.status(400).json({ error: 'Token already used' });
    }
    
    // Mark token as used
    tokenData.used = true;
    tokenStore.set(token, tokenData);
    
    // Add random delay to confuse bots
    const delay = Math.floor(Math.random() * 500) + 100;
    setTimeout(() => {
      res.redirect(tokenData.destination);
    }, delay);
    
  } catch (error) {
    res.status(500).json({ error: 'Redirect failed' });
  }
}

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expires < now) {
      tokenStore.delete(token);
    }
  }
}

module.exports = { 
  redirectController,
  generateToken
};
