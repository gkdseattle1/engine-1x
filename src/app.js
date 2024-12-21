const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { botDetectionMiddleware } = require('./middleware/botDetection');
const { redirectController, generateTokenController } = require('./controllers/redirect');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50 // limit each IP to 50 requests per window
});
app.use(limiter);

// Routes
app.post('/generate', limiter, generateTokenController);
app.get('/r/:token', botDetectionMiddleware, redirectController);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
