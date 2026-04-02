const test = require('node:test');
const assert = require('node:assert');
const { app } = require('./server.js');
const request = require('supertest');

// Mock requireSession to bypass auth for testing
// In a real scenario we'd use a session, but for a quick check we can see if endpoints exist
// Actually, server.js uses requireSession which checks req.sessionUser.
// I'll just check if the routes are registered and return 401 (meaning they are protected)

test('Persona Endpoints', async (t) => {
  await t.test('GET /api/user/personas returns 401 without session', async () => {
    const res = await request(app).get('/api/user/personas');
    assert.strictEqual(res.status, 401);
  });

  await t.test('POST /api/user/personas returns 401 without session', async () => {
    const res = await request(app).post('/api/user/personas');
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/user/settings/default-persona returns 401 without session', async () => {
    const res = await request(app).get('/api/user/settings/default-persona');
    assert.strictEqual(res.status, 401);
  });
});
