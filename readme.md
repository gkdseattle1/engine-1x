# Bot Blocker

A secure token-based redirection system with bot detection and request logging capabilities.

## Features

- Token-based URL redirection
- Advanced bot detection
- Request rate limiting
- Suspicious activity monitoring
- Detailed request logging
- Browser detection
- IP tracking
- Configurable token expiration

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory (optional):
   ```plaintext
   PORT=3000
   DEFAULT_REDIRECT_URL=https://example.com
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
GET /r/:token
```

#### 3. Default Redirect
```http
GET /
```

## Security Features

### Bot Detection
The system uses multiple factors to detect bots:
- User agent analysis
- Required header verification
- Request rate monitoring
- IP tracking
- Browser fingerprinting

Reference: 
```javascript:src/middleware/botDetection.js
startLine: 5
endLine: 18
```

### Rate Limiting
- 50 requests per minute per IP
- Configurable window and limit

### Token Security
- One-time use tokens
- Maximum lifetime of 24 hours
- IP tracking per token
- Suspicious activity detection

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

Reference:
```javascript:src/utils/logger.js
startLine: 16
endLine: 27
```

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `DEFAULT_REDIRECT_URL`: Default redirect destination
- `DEFAULT_EXPIRE_TIME`: Default token expiration time (2 seconds)

### Security Settings
- Token cleanup interval: 1 minute
- Maximum token lifetime: 24 hours
- Maximum token attempts: 3
- Maximum unique IPs per token: 2
- Minimum trust score: 70

## Dependencies

Reference:
```json:package.json
startLine: 9
endLine: 15
```

## Directory Structure

```
├── src/
│   ├── app.js              # Main application file
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Custom middleware
│   └── utils/              # Utility functions
├── logs/                   # Request logs
├── .env                    # Environment variables
├── .gitignore
└── package.json
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT License

## Security Considerations

- Tokens expire automatically
- Rate limiting prevents abuse
- Bot detection blocks automated access
- Request logging for audit trails
- Suspicious activity monitoring
- IP tracking prevents token sharing
