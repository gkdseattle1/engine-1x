const axios = require('axios');

const validateCaptcha = async (req, res, next) => {
    const { captchaResponse, provider } = req.body;

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

        const response = await axios.post(verificationUrl, null, {
            params: {
                secret: secretKey,
                response: captchaResponse,
            },
        });

        if (!response.data.success) {
            return res.status(403).json({ error: 'CAPTCHA validation failed' });
        }

        next();
    } catch (error) {
        console.error('CAPTCHA validation error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = validateCaptcha;
