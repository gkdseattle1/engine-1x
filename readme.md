
# Engine-X

A secure token-based redirection system with bot detection, CAPTCHA verification, and multi-step human interaction pages.

## Features

- Token-based URL redirection
- CAPTCHA verification (Google ReCAPTCHA and Cloudflare Turnstile)
- Randomized human interaction pages for bot mitigation
- Advanced bot detection
- Request rate limiting
- Suspicious activity monitoring
- Detailed request logging
- Browser detection
- IP tracking
- Configurable token expiration

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```plaintext
   PORT=3000
   DEFAULT_REDIRECT_URL=https://example.com
   DEFAULT_EXPIRE_TIME=2000
   ANTIBOT_API_KEY=antibot.pwapikeyhere
   GOOGLE_RECAPTCHA_SITE_KEY=your-google-site-key
   GOOGLE_RECAPTCHA_SECRET_KEY=your-google-secret-key
   CLOUDFLARE_TURNSTILE_SITE_KEY=your-cloudflare-site-key
   CLOUDFLARE_TURNSTILE_SECRET_KEY=your-cloudflare-secret-key
   ```

## Usage

### Starting the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### API Endpoints

#### 1. Generate Redirect Token
```http
POST /generate
Content-Type: application/json

{
  "url": "https://destination.com",
  "expiresIn": 3600000
}
```

#### 2. Use Redirect Token
```http
GET /r/:token/:base64Email?
```

#### 3. CAPTCHA Verification
The system enforces CAPTCHA verification using either Google ReCAPTCHA or Cloudflare Turnstile before granting access:
```http
GET /captcha
```

#### 4. Randomized Interaction Pages
After CAPTCHA, users must complete a randomly selected interaction page before redirection:
```http
GET /interaction
```

## CAPTCHA Integration

- **Google ReCAPTCHA** and **Cloudflare Turnstile** are supported.
- CAPTCHA type is selected randomly for each session.
- The server validates responses using their respective APIs.

## Interaction Pages

Randomized pages include:
- **Page 2a**: Simple confirmation with a button.
- **Page 2b**: Includes a countdown timer before enabling the button.
- **Page 2c**: Requires email confirmation.
- **Page 2d**: Requires clicking a confirmation button.
- **Page 2e**: Requires waiting before proceeding.

These pages prevent automated bots from bypassing the system.

## Security Features

### Bot Detection
The system uses multiple factors to detect bots:
- User agent analysis
- Required header verification
- Request rate monitoring
- IP tracking
- Browser fingerprinting

### Rate Limiting
- 50 requests per minute per IP.
- Configurable window and limit.

### CAPTCHA and Interaction
- Verifies human users via CAPTCHA.
- Ensures manual interaction with randomized pages.

### Token Security
- One-time use tokens.
- Maximum lifetime of 24 hours.
- IP tracking per token.
- Suspicious activity detection.

## Logging

All requests are logged to `logs/requests.json` with the following information:
- IP address
- User agent
- Browser type
- Trust score
- Bot detection status
- Request path and method
- Request timestamp
- Request status

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `DEFAULT_REDIRECT_URL`: Default redirect destination
- `DEFAULT_EXPIRE_TIME`: Default token expiration time (2 seconds)
- `GOOGLE_RECAPTCHA_SITE_KEY`: Site key for Google ReCAPTCHA
- `GOOGLE_RECAPTCHA_SECRET_KEY`: Secret key for Google ReCAPTCHA
- `CLOUDFLARE_TURNSTILE_SITE_KEY`: Site key for Cloudflare Turnstile
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`: Secret key for Cloudflare Turnstile

### Security Settings
- Token cleanup interval: 1 minute
- Maximum token lifetime: 24 hours
- Maximum token attempts: 3
- Maximum unique IPs per token: 2
- Minimum trust score: 70

## Directory Structure

```
├── src/
│   ├── app.js              # Main application file
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Custom middleware
│   ├── public/             # Static assets (styles, scripts)
│   ├── views/              # EJS templates
│   └── utils/              # Utility functions
├── logs/                   # Request logs
├── .env                    # Environment variables
├── .gitignore
└── package.json
```


## Security Considerations

- Tokens expire automatically.
- Rate limiting prevents abuse.
- CAPTCHA and interaction pages block bots.
- Request logging for audit trails.
- Suspicious activity monitoring.
- IP tracking prevents token sharing
