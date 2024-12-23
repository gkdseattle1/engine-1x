const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { botDetectionMiddleware } = require('./middleware/botDetection');
const { redirectController, generateTokenController, generateToken } = require('./controllers/redirect');
const { isValidUrl } = require('./utils/urlUtils');

const app = express();

// Add this near the top with other constants
const DEFAULT_REDIRECT_URL = process.env.DEFAULT_REDIRECT_URL || 'https://example.com';
const DEFAULT_EXPIRE_TIME = 2000; // 2 seconds

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50 // limit each IP to 50 requests per window
});
app.use(limiter);

// Routes
app.post('/generate', limiter, generateTokenController);
app.get('/r/:token', botDetectionMiddleware, redirectController);
app.get('/', limiter, async (req, res) => {
  try {
    if (!isValidUrl(DEFAULT_REDIRECT_URL)) {
      throw new Error('Invalid default URL');
    }
    // Generate a token for the default URL
    const token = generateToken(DEFAULT_REDIRECT_URL, DEFAULT_EXPIRE_TIME);
    
    // Immediately redirect to the /r/:token route
    res.redirect(`/r/${token}`);
  } catch (error) {
    console.error('Default redirect error:', error);
    res.status(500).json({ error: 'Failed to generate default redirect' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
