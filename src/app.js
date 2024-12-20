const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { botDetectionMiddleware } = require('./middleware/botDetection');
const { redirectController } = require('./controllers/redirect');

const app = express();

// Basic security
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Bot detection
app.use(botDetectionMiddleware);

// Redirect route
app.get('/r/:token', redirectController);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
