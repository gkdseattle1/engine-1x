const request = require('supertest');
const express = require('express');
const { generateTokenController, redirectController, tokenStore } = require('../src/controllers/redirect');
const { botDetectionMiddleware } = require('../src/middleware/botDetection');

const app = express();
app.use(express.json());

// Add routes for testing
app.post('/generate', generateTokenController);
app.get('/r/:token/:base64Email?', redirectController);
app.use(botDetectionMiddleware);

describe('API Tests', () => {
    beforeEach(() => {
        tokenStore.clear();
        tokenStore.set('validToken', {
            destination: 'https://example.com',
            expires: Date.now() + 60000, // Ensure valid expiration time
            used: false,
            attempts: 0,
            ips: new Set(),
        });
    });

    describe('Token Generation', () => {
        test('Should generate a valid token for a valid URL', async () => {
            const response = await request(app)
                .post('/generate')
                .send({ url: 'https://example.com', expiresIn: 60000 });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeDefined();
            expect(response.body.redirectUrl).toMatch(/\/r\/.+/);
        });

        test('Should return error for invalid URL', async () => {
            const response = await request(app)
                .post('/generate')
                .send({ url: 'invalid-url', expiresIn: 60000 });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid URL');
        });
    });

    describe('Redirection', () => {
        test('Should redirect to the correct URL for a valid token', async () => {
            const generateResponse = await request(app)
                .post('/generate')
                .send({ url: 'https://example.com', expiresIn: 60000 });

            const token = generateResponse.body.token;

            const redirectResponse = await request(app).get(`/r/${token}`);

            expect(redirectResponse.status).toBe(302);
            expect(redirectResponse.header.location).toBe('https://example.com');
        });

        test('Should return 404 for expired or invalid token', async () => {
            const response = await request(app).get('/r/invalidtoken');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Invalid or expired token');
        });

        test('Should block invalid Base64 email format during redirection', async () => {
            const generateResponse = await request(app)
                .post('/generate')
                .send({ url: 'https://example.com', expiresIn: 60000 });

            const token = generateResponse.body.token;

            const redirectResponse = await request(app).get(`/r/${token}/invalidbase64`);

            expect(redirectResponse.status).toBe(400);
            expect(redirectResponse.body.error).toBe('Invalid email format');
        });
    });

    describe('Bot Protection', () => {
        test('Should block access to favicon.ico', async () => {
            const response = await request(app).get('/favicon.ico');

            expect(response.status).toBe(403);
            expect(response.body.error || response.text).toBe('Forbidden');
        });

        test('Should block access to sensitive directories', async () => {
            const response = await request(app).get('/admin');

            expect(response.status).toBe(403);
            expect(response.body.error || response.text).toBe('Forbidden');
        });
    });
});