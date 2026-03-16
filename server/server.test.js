const http = require('http');
const fs = require('fs');
const path = require('path');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, saveAllData, setupGracefulShutdown } = require('./server');

// Utility: send an HTTP request to the test server
function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const port = addr.port;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let server;

before((done) => {
  server = http.createServer(app).listen(0, '127.0.0.1', done);
});

after((done) => {
  server.close(done);
});

describe('Rate limiting', () => {
  it('general API limiter applies RateLimit headers to all /api responses', async () => {
    const res = await request(server, 'POST', '/api/auth/login', {
      username: 'nonexistent',
      password: 'test',
    });
    // The request reaches the route handler (401 = invalid credentials, not 429)
    assert.notEqual(res.status, 429);
    // RateLimit headers should be present (standardHeaders: true)
    const headerKeys = Object.keys(res.headers).map((k) => k.toLowerCase());
    const hasRateLimitHeader = headerKeys.some((k) => k.startsWith('ratelimit'));
    assert.ok(hasRateLimitHeader, 'Expected RateLimit headers to be present');
  });

  it('auth limiter sets correct limit value in headers', async () => {
    const res = await request(server, 'POST', '/api/auth/login', {
      username: 'testuser',
      password: 'testpass',
    });
    // RateLimit-Limit reflects the authLimiter max (10)
    const limit = res.headers['ratelimit-limit'];
    assert.equal(limit, '10', `Expected auth rate limit of 10, got ${limit}`);
  });

  it('auth limiter blocks requests after exceeding its configured limit', async () => {
    const { rateLimit } = require('express-rate-limit');
    const express = require('express');

    // Create a fresh limiter instance matching the production auth config
    const freshAuthLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many authentication attempts, please try again later.' },
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.post('/api/auth/login', freshAuthLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));

    try {
      // Exhaust the limit (10 requests)
      for (let i = 0; i < 10; i++) {
        const res = await request(testServer, 'POST', '/api/auth/login', {});
        assert.equal(res.status, 200);
      }

      // The 11th request should be blocked
      const blocked = await request(testServer, 'POST', '/api/auth/login', {});
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.error, 'Too many authentication attempts, please try again later.');
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  it('general API limiter blocks requests after exceeding its configured limit', async () => {
    const { rateLimit } = require('express-rate-limit');
    const express = require('express');

    // Create a fresh limiter instance matching the production general API config
    const freshApiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later.' },
    });

    const testApp = express();
    testApp.use('/api', freshApiLimiter);
    testApp.get('/api/health', (req, res) => res.json({ ok: true }));

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));

    try {
      // Exhaust the limit (100 requests)
      for (let i = 0; i < 100; i++) {
        const res = await request(testServer, 'GET', '/api/health', null);
        assert.equal(res.status, 200);
      }

      // The 101st request should be blocked
      const blocked = await request(testServer, 'GET', '/api/health', null);
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.error, 'Too many requests, please try again later.');
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });
});

describe('User language preference', () => {
  const testUsername = 'languser_' + Date.now();
  const testPassword = 'testpassword123';

  it('should create a test user for language tests', async () => {
    const res = await request(server, 'POST', '/api/auth/signup', {
      username: testUsername,
      password: testPassword,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  it('should default to English when no language is set', async () => {
    const res = await request(server, 'GET', `/api/user/language?username=${testUsername}`, null);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.language, 'en');
  });

  it('should update user language preference', async () => {
    const res = await request(server, 'PUT', '/api/user/language', {
      username: testUsername,
      language: 'ko',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.language, 'ko');
  });

  it('should return the updated language preference', async () => {
    const res = await request(server, 'GET', `/api/user/language?username=${testUsername}`, null);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.language, 'ko');
  });

  it('should reject unsupported language codes', async () => {
    const res = await request(server, 'PUT', '/api/user/language', {
      username: testUsername,
      language: 'fr',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Unsupported language');
  });

  it('should return 404 for non-existent user on GET', async () => {
    const res = await request(server, 'GET', '/api/user/language?username=nonexistent_user', null);
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('should return 404 for non-existent user on PUT', async () => {
    const res = await request(server, 'PUT', '/api/user/language', {
      username: 'nonexistent_user',
      language: 'ja',
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('should return 400 when username is missing on GET', async () => {
    const res = await request(server, 'GET', '/api/user/language', null);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('should return 400 when language is missing on PUT', async () => {
    const res = await request(server, 'PUT', '/api/user/language', {
      username: testUsername,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});

describe('Graceful shutdown', () => {
  const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

  it('saveAllData is exported as a function', () => {
    assert.equal(typeof saveAllData, 'function');
  });

  it('setupGracefulShutdown is exported as a function', () => {
    assert.equal(typeof setupGracefulShutdown, 'function');
  });

  it('saveAllData persists in-memory user data to disk', async () => {
    const uniqueName = 'shutdown_test_' + Date.now();

    // Create a user via the API (updates both cache and disk)
    const res = await request(server, 'POST', '/api/auth/signup', {
      username: uniqueName,
      password: 'TestPassword1!',
    });
    assert.equal(res.status, 201);

    // Call saveAllData to explicitly flush cache to disk
    saveAllData();

    // Verify the user exists in the file on disk
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const users = JSON.parse(raw);
    const found = users.find((u) => u.username === uniqueName);
    assert.ok(found, 'Expected the user created via API to be present on disk after saveAllData()');
  });

  it('saveAllData is safe to call multiple times', () => {
    assert.doesNotThrow(() => {
      saveAllData();
      saveAllData();
    });
  });

  it('setupGracefulShutdown registers signal listeners on the process', () => {
    const testServer = http.createServer(app);

    const sigtermBefore = process.listenerCount('SIGTERM');
    const sigintBefore = process.listenerCount('SIGINT');

    setupGracefulShutdown(testServer);

    assert.equal(process.listenerCount('SIGTERM'), sigtermBefore + 1);
    assert.equal(process.listenerCount('SIGINT'), sigintBefore + 1);
  });
});
