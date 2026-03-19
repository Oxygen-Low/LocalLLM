const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, saveAllData, setupGracefulShutdown, ensureAdminAccount, readUsers, writeUsers, isPrivateIP, validateOutboundUrl, validateResolvedIP, ssrfSafeUrlValidation } = require('./server');

// Utility: compute SHA-256 hex digest of a string (mirrors client-side password hashing)
function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

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
let adminPassword = null;

before(async () => {
  // Remove any pre-existing admin so the test suite always starts with a fresh
  // admin account whose password is known (returned by ensureAdminAccount).
  writeUsers(readUsers().filter((u) => u.username !== 'admin'));
  adminPassword = await ensureAdminAccount();
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, '127.0.0.1', resolve);
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('Security headers (Helmet)', () => {
  let helmetRes;
  before(async () => {
    helmetRes = await request(server, 'GET', '/api/auth/password-reset-status?username=nonexistent', null);
  });

  it('sets X-Content-Type-Options: nosniff', () => {
    assert.equal(helmetRes.headers['x-content-type-options'], 'nosniff');
  });

  it('sets X-Frame-Options: SAMEORIGIN', () => {
    assert.equal(helmetRes.headers['x-frame-options'], 'SAMEORIGIN');
  });

  it('sets Content-Security-Policy header with expected directives', () => {
    const csp = helmetRes.headers['content-security-policy'];
    assert.ok(csp, 'Expected Content-Security-Policy header to be present');
    assert.ok(csp.includes("default-src 'self'"), 'Expected default-src directive');
    assert.ok(csp.includes("object-src 'none'"), 'Expected object-src directive');
  });

  it('sets Strict-Transport-Security with max-age and includeSubDomains', () => {
    const sts = helmetRes.headers['strict-transport-security'];
    assert.ok(sts, 'Expected Strict-Transport-Security header to be present');
    assert.ok(sts.includes('max-age='), 'Expected max-age in STS header');
    assert.ok(sts.includes('includeSubDomains'), 'Expected includeSubDomains in STS header');
  });
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

    // Clean up: remove the listeners added by this test
    const sigtermListeners = process.listeners('SIGTERM');
    const sigintListeners = process.listeners('SIGINT');
    process.removeListener('SIGTERM', sigtermListeners[sigtermListeners.length - 1]);
    process.removeListener('SIGINT', sigintListeners[sigintListeners.length - 1]);
  });
});

describe('Admin account auto-creation', () => {
  it('admin account exists after server starts', async () => {
    const res = await request(server, 'POST', '/api/auth/login', {
      username: 'admin',
      password: sha256Hex(adminPassword),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.username, 'admin');
  });

  it('ensureAdminAccount is idempotent when admin already exists', async () => {
    const result = await ensureAdminAccount();
    assert.equal(result, null, 'Expected null when admin already exists');
    const adminCount = readUsers().filter((u) => u.username === 'admin').length;
    assert.equal(adminCount, 1, 'Expected exactly one admin account');
  });

  it('admin account is recreated after deletion via API', async () => {
    // Delete admin via the API using the current generated password
    const deleteRes = await request(server, 'DELETE', '/api/auth/account', {
      username: 'admin',
      password: sha256Hex(adminPassword),
    });
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);

    // Admin is auto-recreated by the delete handler with a NEW random password.
    // The old password must no longer work.
    const loginOld = await request(server, 'POST', '/api/auth/login', {
      username: 'admin',
      password: sha256Hex(adminPassword),
    });
    assert.equal(loginOld.status, 401, 'Old password should be invalid after recreation');

    // But the admin user should still exist in the store.
    const admin = readUsers().find((u) => u.username === 'admin');
    assert.ok(admin, 'Admin should be present in the store after auto-recreation');
  });
});

describe('Admin management endpoints', () => {
  before(async () => {
    // Regenerate admin credentials after previous tests may have rotated the password
    writeUsers(readUsers().filter((u) => u.username !== 'admin'));
    adminPassword = await ensureAdminAccount();
  });

  const adminHash = () => sha256Hex(adminPassword);
  const managedUser = 'managed_user_' + Date.now();
  const managedPassword = 'ManagedPass1!';

  it('rejects admin list without valid credentials', async () => {
    const res = await request(server, 'POST', '/api/admin/users/list', {});
    assert.equal(res.status, 403);
  });

  it('returns users when admin credentials are valid', async () => {
    const res = await request(server, 'POST', '/api/admin/users/list', {
      adminUsername: 'admin',
      adminPassword: adminHash(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const usernames = res.body.users.map((u) => u.username);
    assert.ok(usernames.includes('admin'), 'Expected admin to be present in admin list');
  });

  it('can flag a user for password reset', async () => {
    // create user
    const signup = await request(server, 'POST', '/api/auth/signup', {
      username: managedUser,
      password: sha256Hex(managedPassword),
    });
    assert.equal(signup.status, 201);

    const resetRes = await request(server, 'POST', '/api/admin/users/reset-password', {
      adminUsername: 'admin',
      adminPassword: adminHash(),
      username: managedUser,
    });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    const loginRes = await request(server, 'POST', '/api/auth/login', {
      username: managedUser,
      password: sha256Hex(managedPassword),
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.passwordResetRequired, true);
  });

  it('prevents deleting the admin account', async () => {
    const res = await request(server, 'POST', '/api/admin/users/delete', {
      adminUsername: 'admin',
      adminPassword: adminHash(),
      username: 'admin',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('allows deleting a non-admin account', async () => {
    const res = await request(server, 'POST', '/api/admin/users/delete', {
      adminUsername: 'admin',
      adminPassword: adminHash(),
      username: managedUser,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const list = await request(server, 'POST', '/api/admin/users/list', {
      adminUsername: 'admin',
      adminPassword: adminHash(),
    });
    const usernames = list.body.users.map((u) => u.username);
    assert.ok(!usernames.includes(managedUser));
  });
});

describe('SSRF protection (A10)', () => {
  describe('isPrivateIP', () => {
    it('blocks IPv4 loopback addresses', () => {
      assert.equal(isPrivateIP('127.0.0.1'), true);
      assert.equal(isPrivateIP('127.255.255.255'), true);
    });

    it('blocks 10.x.x.x private range', () => {
      assert.equal(isPrivateIP('10.0.0.1'), true);
      assert.equal(isPrivateIP('10.255.255.255'), true);
    });

    it('blocks 172.16-31.x.x private range', () => {
      assert.equal(isPrivateIP('172.16.0.1'), true);
      assert.equal(isPrivateIP('172.31.255.255'), true);
    });

    it('does not block 172.32.x.x (outside private range)', () => {
      assert.equal(isPrivateIP('172.32.0.1'), false);
    });

    it('blocks 192.168.x.x private range', () => {
      assert.equal(isPrivateIP('192.168.0.1'), true);
      assert.equal(isPrivateIP('192.168.255.255'), true);
    });

    it('blocks link-local 169.254.x.x (cloud metadata)', () => {
      assert.equal(isPrivateIP('169.254.169.254'), true);
    });

    it('blocks 0.0.0.0', () => {
      assert.equal(isPrivateIP('0.0.0.0'), true);
    });

    it('blocks CGN range 100.64.0.0/10', () => {
      assert.equal(isPrivateIP('100.64.0.1'), true);
      assert.equal(isPrivateIP('100.127.255.255'), true);
    });

    it('blocks IPv6 loopback ::1', () => {
      assert.equal(isPrivateIP('::1'), true);
    });

    it('blocks IPv6 unspecified ::', () => {
      assert.equal(isPrivateIP('::'), true);
    });

    it('blocks IPv6 link-local fe80::', () => {
      assert.equal(isPrivateIP('fe80::1'), true);
    });

    it('blocks IPv6 unique-local fc00::/7', () => {
      assert.equal(isPrivateIP('fc00::1'), true);
      assert.equal(isPrivateIP('fd12::1'), true);
    });

    it('blocks IPv4-mapped IPv6 addresses to private ranges', () => {
      assert.equal(isPrivateIP('::ffff:127.0.0.1'), true);
      assert.equal(isPrivateIP('::ffff:10.0.0.1'), true);
    });

    it('allows public IP addresses', () => {
      assert.equal(isPrivateIP('8.8.8.8'), false);
      assert.equal(isPrivateIP('1.1.1.1'), false);
      assert.equal(isPrivateIP('203.0.113.1'), false);
    });
  });

  describe('validateOutboundUrl', () => {
    it('accepts valid HTTPS URLs', () => {
      const result = validateOutboundUrl('https://api.example.com/v1/chat');
      assert.equal(result.valid, true);
      assert.ok(result.parsed instanceof URL);
    });

    it('accepts valid HTTP URLs', () => {
      const result = validateOutboundUrl('http://api.example.com/v1/chat');
      assert.equal(result.valid, true);
    });

    it('rejects invalid URL format', () => {
      const result = validateOutboundUrl('not-a-url');
      assert.equal(result.valid, false);
      assert.ok(result.reason.includes('Invalid URL'));
    });

    it('rejects non-HTTP schemes (ftp)', () => {
      const result = validateOutboundUrl('ftp://files.example.com/data');
      assert.equal(result.valid, false);
      assert.ok(result.reason.includes('not allowed'));
    });

    it('rejects file:// scheme', () => {
      const result = validateOutboundUrl('file:///etc/passwd');
      assert.equal(result.valid, false);
      assert.ok(result.reason.includes('not allowed'));
    });

    it('rejects URLs with embedded credentials', () => {
      const result = validateOutboundUrl('https://user:pass@example.com');
      assert.equal(result.valid, false);
      assert.ok(result.reason.includes('credentials'));
    });

    it('rejects URLs targeting private IP addresses', () => {
      assert.equal(validateOutboundUrl('http://127.0.0.1:8080/api').valid, false);
      assert.equal(validateOutboundUrl('http://10.0.0.1/api').valid, false);
      assert.equal(validateOutboundUrl('http://192.168.1.1/api').valid, false);
      assert.equal(validateOutboundUrl('http://169.254.169.254/latest/meta-data').valid, false);
    });

    it('rejects URLs targeting IPv6 loopback', () => {
      const result = validateOutboundUrl('http://[::1]:8080/api');
      assert.equal(result.valid, false);
    });
  });

  describe('validateResolvedIP', () => {
    it('rejects direct private IP hostnames', async () => {
      const result = await validateResolvedIP('127.0.0.1');
      assert.equal(result.safe, false);
    });

    it('rejects link-local / cloud metadata IP', async () => {
      const result = await validateResolvedIP('169.254.169.254');
      assert.equal(result.safe, false);
    });
  });

  describe('ssrfSafeUrlValidation', () => {
    it('rejects invalid URLs', async () => {
      const result = await ssrfSafeUrlValidation('not-a-url');
      assert.equal(result.valid, false);
    });

    it('rejects private IPs', async () => {
      const result = await ssrfSafeUrlValidation('http://127.0.0.1:11434/api/chat');
      assert.equal(result.valid, false);
    });

    it('rejects cloud metadata endpoint', async () => {
      const result = await ssrfSafeUrlValidation('http://169.254.169.254/latest/meta-data');
      assert.equal(result.valid, false);
    });

    it('rejects file:// scheme', async () => {
      const result = await ssrfSafeUrlValidation('file:///etc/passwd');
      assert.equal(result.valid, false);
    });
  });
});
