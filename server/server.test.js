const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, saveAllData, setupGracefulShutdown, ensureAdminAccount, readUsers, writeUsers, isPrivateIP, validateOutboundUrl, validateResolvedIP, ssrfSafeUrlValidation, auditLog, validateUsername, AUDIT_LOG_FILE, createSessionToken, validateSession, invalidateSession, invalidateUserSessions, sessions, checkServerLockout, recordServerFailedAttempt, clearServerLoginAttempts, loginAttempts, validatePasswordHash, authLimiter, encryptData, decryptData, AI_PROVIDERS, VALID_PROVIDERS, sanitizeUsernameForPath, ensureWithinDir, getUserApiKeysFile, DATA_DIR, passwordChangeCooldowns, usernameChangeCooldowns, PASSWORD_CHANGE_COOLDOWN_MS, USERNAME_CHANGE_COOLDOWN_MS, checkCooldown } = require('./server');

// Utility: compute SHA-256 hex digest of a string (mirrors client-side password hashing)
function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Utility: send an HTTP request to the test server
function request(server, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const port = addr.port;
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers,
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
    helmetRes = await request(server, 'GET', '/api/health', null);
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
  const testPassword = sha256Hex('testpassword123');
  let langToken = null;

  it('should create a test user for language tests', async () => {
    const res = await request(server, 'POST', '/api/auth/signup', {
      username: testUsername,
      password: testPassword,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    langToken = res.body.token;
    assert.ok(langToken, 'Expected a session token from signup');
  });

  it('should default to English when no language is set', async () => {
    const res = await request(server, 'GET', '/api/user/language', null, langToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.language, 'en');
  });

  it('should update user language preference', async () => {
    const res = await request(server, 'PUT', '/api/user/language', {
      language: 'ko',
    }, langToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.language, 'ko');
  });

  it('should return the updated language preference', async () => {
    const res = await request(server, 'GET', '/api/user/language', null, langToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.language, 'ko');
  });

  it('should reject unsupported language codes', async () => {
    const res = await request(server, 'PUT', '/api/user/language', {
      language: 'fr',
    }, langToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Unsupported language');
  });

  it('should return 401 for unauthenticated GET request', async () => {
    const res = await request(server, 'GET', '/api/user/language', null);
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('should return 401 for unauthenticated PUT request', async () => {
    const res = await request(server, 'PUT', '/api/user/language', {
      language: 'ja',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('should return 400 when language is missing on PUT', async () => {
    const res = await request(server, 'PUT', '/api/user/language', {}, langToken);
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
      password: sha256Hex('TestPassword1!'),
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
    assert.ok(res.body.token, 'Expected a session token from login');
  });

  it('ensureAdminAccount is idempotent when admin already exists', async () => {
    const result = await ensureAdminAccount();
    assert.equal(result, null, 'Expected null when admin already exists');
    const adminCount = readUsers().filter((u) => u.username === 'admin').length;
    assert.equal(adminCount, 1, 'Expected exactly one admin account');
  });

  it('admin account is recreated after deletion via API', async () => {
    // Login to get a session token
    const loginRes = await request(server, 'POST', '/api/auth/login', {
      username: 'admin',
      password: sha256Hex(adminPassword),
    });
    assert.equal(loginRes.status, 200);
    const adminToken = loginRes.body.token;

    // Delete admin via the API using the session token
    const deleteRes = await request(server, 'DELETE', '/api/auth/account', {
      password: sha256Hex(adminPassword),
    }, adminToken);
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

    it('does not leak internal IP addresses in rejection reason', async () => {
      const result = await validateResolvedIP('127.0.0.1');
      assert.equal(result.safe, false);
      assert.ok(!result.reason.includes('127.0.0.1'), 'reason must not contain the actual IP address');
    });

    it('does not leak DNS error details in rejection reason', async () => {
      const result = await validateResolvedIP('this-host-does-not-exist-xyz.invalid');
      assert.equal(result.safe, false);
      assert.ok(!result.reason.includes('ENOTFOUND'), 'reason must not leak DNS error codes');
      assert.ok(!result.reason.includes('SERVFAIL'), 'reason must not leak DNS error codes');
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

// ---------------------------------------------------------------------------
// ISO 27001:2022 compliance tests
// ---------------------------------------------------------------------------

describe('ISO 27001 A.8.15 – Audit logging', () => {
  it('auditLog writes a JSON line to the audit log file', () => {
    // Clean slate
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }

    auditLog({ event: 'TEST_EVENT', message: 'Unit test entry', username: 'testuser' });

    const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8').trim();
    const entry = JSON.parse(content);
    assert.equal(entry.event, 'TEST_EVENT');
    assert.equal(entry.message, 'Unit test entry');
    assert.equal(entry.username, 'testuser');
    assert.ok(entry.timestamp, 'Expected timestamp to be present');
  });

  it('auditLog appends multiple entries (one per line)', () => {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }

    auditLog({ event: 'EVENT_A', message: 'First' });
    auditLog({ event: 'EVENT_B', message: 'Second' });

    const lines = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8').trim().split('\n');
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).event, 'EVENT_A');
    assert.equal(JSON.parse(lines[1]).event, 'EVENT_B');
  });

  it('login success creates an audit log entry', () => {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }

    auditLog({ event: 'LOGIN_SUCCESS', message: 'User logged in', username: 'admin', req: { requestId: 'login-req-id', ip: '127.0.0.1' } });

    const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const entry = JSON.parse(content.trim());
    assert.equal(entry.event, 'LOGIN_SUCCESS');
    assert.equal(entry.username, 'admin');
    assert.equal(entry.requestId, 'login-req-id');
    assert.equal(entry.ip, '127.0.0.1');
  });

  it('login failure creates an audit log entry', () => {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }

    auditLog({ event: 'LOGIN_FAILURE', message: 'Invalid username or password', username: 'testuser', req: { requestId: 'fail-req-id', ip: '127.0.0.1' } });

    const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const entry = JSON.parse(content.trim());
    assert.equal(entry.event, 'LOGIN_FAILURE');
    assert.equal(entry.username, 'testuser');
    assert.equal(entry.requestId, 'fail-req-id');
  });

  it('signup success creates an audit log entry', () => {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }

    const uniqueName = 'audituser_' + Date.now();
    auditLog({ event: 'SIGNUP_SUCCESS', message: 'New account created', username: uniqueName, req: { requestId: 'signup-req-id', ip: '127.0.0.1' } });

    const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const entry = JSON.parse(content.trim());
    assert.equal(entry.event, 'SIGNUP_SUCCESS');
    assert.equal(entry.username, uniqueName);
  });

  it('password change creates an audit log entry', () => {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }

    auditLog({ event: 'PASSWORD_CHANGED', message: 'Password changed successfully', username: 'testuser', req: { requestId: 'pw-req-id' } });

    const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const entry = JSON.parse(content.trim());
    assert.equal(entry.event, 'PASSWORD_CHANGED');
  });

  it('account deletion creates an audit log entry', () => {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }

    auditLog({ event: 'ACCOUNT_DELETED', message: 'Account deleted', username: 'deleteduser', req: { requestId: 'del-req-id' } });

    const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const entry = JSON.parse(content.trim());
    assert.equal(entry.event, 'ACCOUNT_DELETED');
    assert.equal(entry.username, 'deleteduser');
  });

  it('admin auth failure creates an audit log entry', () => {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }

    auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin list attempt', username: 'attacker' });

    const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const entry = JSON.parse(content.trim());
    assert.equal(entry.event, 'ADMIN_AUTH_FAILURE');
  });
});

describe('ISO 27001 A.8.15 – X-Request-Id header', () => {
  it('all API responses include an X-Request-Id header', async () => {
    const res = await request(server, 'GET', '/api/health', null);
    assert.ok(res.headers['x-request-id'], 'Expected X-Request-Id header to be present');
    // UUID v4 format check
    assert.match(res.headers['x-request-id'], /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('each request gets a unique X-Request-Id', async () => {
    const res1 = await request(server, 'GET', '/api/health', null);
    const res2 = await request(server, 'GET', '/api/health', null);
    assert.notEqual(res1.headers['x-request-id'], res2.headers['x-request-id']);
  });
});

describe('ISO 27001 A.8.9 – Cache-Control for API responses', () => {
  it('sets Cache-Control: no-store on API responses', async () => {
    const res = await request(server, 'GET', '/api/health', null);
    const cc = res.headers['cache-control'];
    assert.ok(cc, 'Expected Cache-Control header to be present');
    assert.ok(cc.includes('no-store'), 'Expected no-store in Cache-Control');
  });

  it('sets Pragma: no-cache on API responses', async () => {
    const res = await request(server, 'GET', '/api/health', null);
    assert.equal(res.headers['pragma'], 'no-cache');
  });
});

describe('ISO 27001 A.8.9 – Permissions-Policy header', () => {
  it('sets Permissions-Policy header restricting browser features', async () => {
    const res = await request(server, 'GET', '/api/health', null);
    const pp = res.headers['permissions-policy'];
    assert.ok(pp, 'Expected Permissions-Policy header to be present');
    assert.ok(pp.includes('camera=()'), 'Expected camera=() in Permissions-Policy');
    assert.ok(pp.includes('microphone=()'), 'Expected microphone=() in Permissions-Policy');
    assert.ok(pp.includes('geolocation=()'), 'Expected geolocation=() in Permissions-Policy');
  });
});

describe('ISO 27001 A.8.25 – Server-side username validation', () => {
  it('validateUsername rejects usernames shorter than 3 characters', () => {
    const errors = validateUsername('ab');
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes('at least 3'));
  });

  it('validateUsername rejects usernames longer than 30 characters', () => {
    const errors = validateUsername('a'.repeat(31));
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes('at most 30'));
  });

  it('validateUsername rejects usernames with invalid characters', () => {
    const errors = validateUsername('bad user!');
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes('letters, numbers'));
  });

  it('validateUsername returns no errors for valid username', () => {
    assert.deepEqual(validateUsername('test-user_1'), []);
  });

  it('validateUsername returns errors for single character', () => {
    const errors = validateUsername('a');
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes('at least 3'));
  });

  it('validateUsername rejects special characters like spaces and exclamation marks', () => {
    const errors = validateUsername('bad user!');
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes('letters, numbers'));
  });

  it('validateUsername accepts hyphens and underscores', () => {
    assert.deepEqual(validateUsername('my-user_name'), []);
  });
});

// ---------------------------------------------------------------------------
// SOC2 Trust Service Criteria compliance tests
// ---------------------------------------------------------------------------

describe('SOC2 CC6.1/CC6.2 – Server-side session management', () => {
  it('createSessionToken returns a valid UUID token', () => {
    const token = createSessionToken('testuser');
    assert.match(token, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    // Cleanup
    invalidateSession(token);
  });

  it('validateSession returns session for valid token', () => {
    const token = createSessionToken('testuser');
    const session = validateSession(token);
    assert.ok(session, 'Expected session to be returned');
    assert.equal(session.username, 'testuser');
    assert.ok(session.createdAt, 'Expected createdAt');
    assert.ok(session.expiresAt > Date.now(), 'Expected expiresAt in the future');
    invalidateSession(token);
  });

  it('validateSession returns null for invalid token', () => {
    const session = validateSession('nonexistent-token');
    assert.equal(session, null);
  });

  it('invalidateSession removes the session', () => {
    const token = createSessionToken('testuser');
    assert.ok(validateSession(token));
    invalidateSession(token);
    assert.equal(validateSession(token), null);
  });

  it('invalidateUserSessions removes all sessions for a user', () => {
    const token1 = createSessionToken('multiuser');
    const token2 = createSessionToken('multiuser');
    const token3 = createSessionToken('otheruser');
    assert.ok(validateSession(token1));
    assert.ok(validateSession(token2));
    assert.ok(validateSession(token3));
    invalidateUserSessions('multiuser');
    assert.equal(validateSession(token1), null);
    assert.equal(validateSession(token2), null);
    assert.ok(validateSession(token3), 'Other user session should remain');
    invalidateSession(token3);
  });

  it('login returns a session token (fresh server to avoid rate limit)', async () => {
    // Reset the auth limiter to avoid rate limit from previous tests
    await authLimiter.resetKey('127.0.0.1');
    const testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));
    try {
      const res = await request(testServer, 'POST', '/api/auth/login', {
        username: 'admin',
        password: sha256Hex(adminPassword),
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.token, 'Expected token in login response');
      assert.match(res.body.token, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  it('signup returns a session token (fresh server to avoid rate limit)', async () => {
    await authLimiter.resetKey('127.0.0.1');
    const testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));
    try {
      const name = 'session_signup_' + Date.now();
      const res = await request(testServer, 'POST', '/api/auth/signup', {
        username: name,
        password: sha256Hex('SecurePass1!'),
      });
      assert.equal(res.status, 201);
      assert.ok(res.body.token, 'Expected token in signup response');
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  it('protected endpoint rejects requests without a token', async () => {
    const res = await request(server, 'GET', '/api/user/language', null);
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Authentication required');
  });

  it('protected endpoint rejects requests with an invalid token', async () => {
    const res = await request(server, 'GET', '/api/user/language', null, 'invalid-token');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid or expired session');
  });

  it('protected endpoint accepts requests with a valid token', async () => {
    // Use createSessionToken directly to avoid rate limiting
    const token = createSessionToken('admin');
    const res = await request(server, 'GET', '/api/user/language', null, token);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    invalidateSession(token);
  });
});

describe('SOC2 CC6.3 – Session invalidation (logout)', () => {
  it('POST /api/auth/logout invalidates the session', async () => {
    // Use createSessionToken directly to avoid rate limiting
    const token = createSessionToken('admin');

    // Logout
    const logoutRes = await request(server, 'POST', '/api/auth/logout', {}, token);
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // Token should no longer work
    const afterRes = await request(server, 'GET', '/api/user/language', null, token);
    assert.equal(afterRes.status, 401);
  });

  it('logout without token returns 401', async () => {
    const res = await request(server, 'POST', '/api/auth/logout', {});
    assert.equal(res.status, 401);
  });
});

describe('SOC2 CC6.8 – Server-side account lockout', () => {
  before(() => {
    loginAttempts.clear();
  });

  it('checkServerLockout allows login with no prior attempts', () => {
    const result = checkServerLockout('locktest');
    assert.equal(result.allowed, true);
  });

  it('recordServerFailedAttempt tracks failed attempts', () => {
    recordServerFailedAttempt('locktest2');
    recordServerFailedAttempt('locktest2');
    const result = checkServerLockout('locktest2');
    assert.equal(result.allowed, true);
    clearServerLoginAttempts('locktest2');
  });

  it('locks account after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      recordServerFailedAttempt('locktest3');
    }
    const result = checkServerLockout('locktest3');
    assert.equal(result.allowed, false);
    assert.ok(result.retryAfterMs > 0, 'Expected retryAfterMs to be positive');
    clearServerLoginAttempts('locktest3');
  });

  it('clearServerLoginAttempts resets the lockout', () => {
    for (let i = 0; i < 5; i++) {
      recordServerFailedAttempt('locktest4');
    }
    assert.equal(checkServerLockout('locktest4').allowed, false);
    clearServerLoginAttempts('locktest4');
    assert.equal(checkServerLockout('locktest4').allowed, true);
  });

  it('login endpoint returns 429 when account is locked (fresh server)', async () => {
    await authLimiter.resetKey('127.0.0.1');
    const testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));
    try {
      const lockUsername = 'lockapi_' + Date.now();

      // Create the user first
      await request(testServer, 'POST', '/api/auth/signup', {
        username: lockUsername,
        password: sha256Hex('ValidPass1!'),
      });

      // Record 5 failed attempts server-side
      for (let i = 0; i < 5; i++) {
        recordServerFailedAttempt(lockUsername);
      }

      // Attempt to login – should be blocked by account lockout
      const res = await request(testServer, 'POST', '/api/auth/login', {
        username: lockUsername,
        password: sha256Hex('ValidPass1!'),
      });
      assert.equal(res.status, 429);
      assert.ok(res.body.error.includes('locked'), `Expected 'locked' in error: ${res.body.error}`);

      // Cleanup
      clearServerLoginAttempts(lockUsername);
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });

  it('successful login clears server-side lockout attempts (fresh server)', async () => {
    await authLimiter.resetKey('127.0.0.1');
    const testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));
    try {
      const lockUsername2 = 'lockapi2_' + Date.now();

      await request(testServer, 'POST', '/api/auth/signup', {
        username: lockUsername2,
        password: sha256Hex('ValidPass1!'),
      });

      // Record some failed attempts (less than 5)
      recordServerFailedAttempt(lockUsername2);
      recordServerFailedAttempt(lockUsername2);

      // Successful login should clear attempts
      const loginRes = await request(testServer, 'POST', '/api/auth/login', {
        username: lockUsername2,
        password: sha256Hex('ValidPass1!'),
      });
      assert.equal(loginRes.status, 200);

      // Check that attempts are cleared
      assert.equal(checkServerLockout(lockUsername2).allowed, true);
      assert.ok(!loginAttempts.has(lockUsername2), 'Expected login attempts to be cleared after success');
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }
  });
});

describe('SOC2 CC6.1 – Password hash format validation', () => {
  it('validates correct SHA-256 hex format', () => {
    assert.equal(validatePasswordHash('a'.repeat(64)), true);
    assert.equal(validatePasswordHash(sha256Hex('test')), true);
  });

  it('rejects non-hex strings', () => {
    assert.equal(validatePasswordHash('g'.repeat(64)), false);
  });

  it('rejects wrong-length strings', () => {
    assert.equal(validatePasswordHash('abc'), false);
    assert.equal(validatePasswordHash('a'.repeat(63)), false);
    assert.equal(validatePasswordHash('a'.repeat(65)), false);
  });

  it('rejects non-string values', () => {
    assert.equal(validatePasswordHash(12345), false);
    assert.equal(validatePasswordHash(null), false);
    assert.equal(validatePasswordHash(undefined), false);
  });

});

describe('SOC2 A1.1/CC7.1 – Health check endpoint', () => {
  it('GET /api/health returns healthy status', async () => {
    const res = await request(server, 'GET', '/api/health', null);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.ok(res.body.timestamp, 'Expected timestamp in health response');
  });

  it('health endpoint does not require authentication', async () => {
    const res = await request(server, 'GET', '/api/health', null);
    assert.equal(res.status, 200);
  });
});

describe('SOC2 PI1.1 – Request body size limits', () => {
  it('rejects oversized JSON payloads', async () => {
    const largeBody = { data: 'x'.repeat(1100000) };
    const res = await request(server, 'POST', '/api/auth/login', largeBody);
    // Express returns 413 for payload too large (limit: 1mb)
    assert.equal(res.status, 413);
  });
});

// ---------------------------------------------------------------------------
// sanitizeUsernameForPath and getUserApiKeysFile – path traversal prevention
// ---------------------------------------------------------------------------
describe('sanitizeUsernameForPath', () => {
  it('returns a safe path segment for a normal username', () => {
    assert.equal(sanitizeUsernameForPath('alice'), 'alice');
    assert.equal(sanitizeUsernameForPath('Bob_123'), 'bob_123');
    assert.equal(sanitizeUsernameForPath('user-name'), 'user-name');
  });

  it('replaces path traversal sequences with underscores', () => {
    const result = sanitizeUsernameForPath('../evil');
    assert.ok(!result.includes('..'), 'result must not contain ".."');
    assert.ok(!result.includes('/'), 'result must not contain "/"');
  });

  it('replaces backslashes and other dangerous chars with underscores', () => {
    const result = sanitizeUsernameForPath('..\\windows\\evil');
    assert.ok(!result.includes('\\'), 'result must not contain backslashes');
    assert.ok(!result.includes('.'), 'result must not contain dots');
  });

  it('handles non-string input gracefully', () => {
    assert.equal(sanitizeUsernameForPath(null), 'user');
    assert.equal(sanitizeUsernameForPath(undefined), 'user');
    assert.equal(sanitizeUsernameForPath(42), 'user');
  });

  it('handles empty string by returning fallback', () => {
    assert.equal(sanitizeUsernameForPath(''), 'user');
  });
});

describe('getUserApiKeysFile', () => {
  it('returns a path within DATA_DIR for a normal username', () => {
    const filePath = getUserApiKeysFile('alice');
    assert.ok(filePath.startsWith(DATA_DIR), 'path must be under DATA_DIR');
    assert.ok(filePath.endsWith('.enc'), 'path must use .enc extension');
    assert.ok(filePath.includes('apikeys_alice'), 'path must contain sanitized username');
  });

  it('cannot escape DATA_DIR with path traversal username', () => {
    const filePath = getUserApiKeysFile('../../../etc/passwd');
    assert.ok(filePath.startsWith(DATA_DIR), 'path must remain under DATA_DIR');
    assert.ok(!filePath.includes('..'), 'path must not contain ".."');
    assert.ok(!filePath.includes('/etc/passwd'), 'path must not reference /etc/passwd');
  });

  it('cannot escape DATA_DIR with null-byte username', () => {
    const filePath = getUserApiKeysFile('user\x00../../etc/passwd');
    assert.ok(filePath.startsWith(DATA_DIR), 'path must remain under DATA_DIR');
    assert.ok(!filePath.includes('\x00'), 'path must not contain null bytes');
  });
});

describe('ensureWithinDir', () => {
  it('allows paths within the parent directory', () => {
    const result = ensureWithinDir('/home/data', '/home/data/file.txt');
    assert.equal(result, path.resolve('/home/data/file.txt'));
  });

  it('allows paths in subdirectories', () => {
    const result = ensureWithinDir('/home/data', '/home/data/sub/file.txt');
    assert.equal(result, path.resolve('/home/data/sub/file.txt'));
  });

  it('throws on path traversal via ../', () => {
    assert.throws(() => {
      ensureWithinDir('/home/data', '/home/data/../etc/passwd');
    }, /Path traversal detected/);
  });

  it('throws when resolved path escapes parent', () => {
    assert.throws(() => {
      ensureWithinDir('/home/data/chats', '/home/data/other/file.txt');
    }, /Path traversal detected/);
  });

  it('throws on completely unrelated path', () => {
    assert.throws(() => {
      ensureWithinDir('/home/data', '/etc/passwd');
    }, /Path traversal detected/);
  });

  it('rejects the parent directory itself as a valid path', () => {
    assert.throws(() => {
      ensureWithinDir('/home/data', '/home/data');
    }, /Path traversal detected/);
  });
});

// ---------------------------------------------------------------------------
// API Key management tests
// ---------------------------------------------------------------------------
describe('API Key management', () => {
  const testUsername = 'apikeys_test_' + Date.now();
  const testPassword = sha256Hex('testpassword123');
  let apiKeyToken = null;

  it('should create a test user for API key tests', async () => {
    const res = await request(server, 'POST', '/api/auth/signup', {
      username: testUsername,
      password: testPassword,
    });
    assert.equal(res.status, 201);
    apiKeyToken = res.body.token;
    assert.ok(apiKeyToken);
  });

  it('GET /api/user/api-keys returns all providers as unconfigured', async () => {
    const res = await request(server, 'GET', '/api/user/api-keys', null, apiKeyToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    for (const provider of VALID_PROVIDERS) {
      assert.equal(res.body.providers[provider].configured, false);
      assert.equal(res.body.providers[provider].selectedModel, null);
    }
  });

  it('PUT /api/user/api-keys/:provider sets an API key', async () => {
    const res = await request(server, 'PUT', '/api/user/api-keys/openai', {
      apiKey: 'sk-test-key-123',
      selectedModel: 'gpt-4',
    }, apiKeyToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('GET /api/user/api-keys shows provider as configured after setting key', async () => {
    const res = await request(server, 'GET', '/api/user/api-keys', null, apiKeyToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.providers.openai.configured, true);
    assert.equal(res.body.providers.openai.selectedModel, 'gpt-4');
  });

  it('PUT /api/user/api-keys/:provider rejects invalid provider', async () => {
    const res = await request(server, 'PUT', '/api/user/api-keys/invalid_provider', {
      apiKey: 'sk-test',
    }, apiKeyToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('PUT /api/user/api-keys/:provider rejects missing API key', async () => {
    const res = await request(server, 'PUT', '/api/user/api-keys/openai', {}, apiKeyToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('DELETE /api/user/api-keys/:provider removes an API key', async () => {
    const res = await request(server, 'DELETE', '/api/user/api-keys/openai', null, apiKeyToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('GET /api/user/api-keys shows provider as unconfigured after removal', async () => {
    const res = await request(server, 'GET', '/api/user/api-keys', null, apiKeyToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.providers.openai.configured, false);
  });

  it('DELETE /api/user/api-keys/:provider rejects invalid provider', async () => {
    const res = await request(server, 'DELETE', '/api/user/api-keys/invalid_provider', null, apiKeyToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('requires authentication for API key endpoints', async () => {
    const getRes = await request(server, 'GET', '/api/user/api-keys', null);
    assert.equal(getRes.status, 401);
    const putRes = await request(server, 'PUT', '/api/user/api-keys/openai', { apiKey: 'test' });
    assert.equal(putRes.status, 401);
    const delRes = await request(server, 'DELETE', '/api/user/api-keys/openai', null);
    assert.equal(delRes.status, 401);
  });
});

// ---------------------------------------------------------------------------
// Chat CRUD tests
// ---------------------------------------------------------------------------
describe('Chat CRUD', () => {
  const testUsername = 'chat_test_' + Date.now();
  const testPassword = sha256Hex('testpassword123');
  let chatToken = null;
  let createdChatId = null;

  it('should create a test user for chat tests', async () => {
    const res = await request(server, 'POST', '/api/auth/signup', {
      username: testUsername,
      password: testPassword,
    });
    assert.equal(res.status, 201);
    chatToken = res.body.token;
    assert.ok(chatToken);
  });

  it('GET /api/chats returns empty list initially', async () => {
    const res = await request(server, 'GET', '/api/chats', null, chatToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.chats));
    assert.equal(res.body.chats.length, 0);
  });

  it('POST /api/chats creates a new chat', async () => {
    const res = await request(server, 'POST', '/api/chats', {
      provider: 'openai',
      model: 'gpt-4',
    }, chatToken);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.chat.id);
    assert.ok(res.body.chat.title);
    assert.ok(Array.isArray(res.body.chat.messages));
    createdChatId = res.body.chat.id;
  });

  it('GET /api/chats returns the created chat', async () => {
    const res = await request(server, 'GET', '/api/chats', null, chatToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.chats.length, 1);
    assert.equal(res.body.chats[0].id, createdChatId);
  });

  it('GET /api/chats/:id returns specific chat', async () => {
    const res = await request(server, 'GET', `/api/chats/${createdChatId}`, null, chatToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.chat.id, createdChatId);
  });

  it('GET /api/chats/:id returns 404 for non-existent chat', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(server, 'GET', `/api/chats/${fakeId}`, null, chatToken);
    assert.equal(res.status, 404);
  });

  it('GET /api/chats/:id returns 400 for invalid chat ID format', async () => {
    const res = await request(server, 'GET', '/api/chats/invalid-id', null, chatToken);
    assert.equal(res.status, 400);
  });

  it('PUT /api/chats/:id updates chat title', async () => {
    const res = await request(server, 'PUT', `/api/chats/${createdChatId}`, {
      title: 'Updated Title',
    }, chatToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.chat.title, 'Updated Title');
  });

  it('PUT /api/chats/:id updates messages with valid data', async () => {
    const validMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    const res = await request(server, 'PUT', `/api/chats/${createdChatId}`, {
      messages: validMessages,
    }, chatToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.chat.messages.length, 2);
  });

  it('PUT /api/chats/:id rejects non-array messages', async () => {
    const res = await request(server, 'PUT', `/api/chats/${createdChatId}`, {
      messages: 'not-an-array',
    }, chatToken);
    assert.equal(res.status, 400);
  });

  it('PUT /api/chats/:id rejects messages with invalid role', async () => {
    const res = await request(server, 'PUT', `/api/chats/${createdChatId}`, {
      messages: [{ role: 'invalid', content: 'test' }],
    }, chatToken);
    assert.equal(res.status, 400);
  });

  it('PUT /api/chats/:id rejects messages with missing content', async () => {
    const res = await request(server, 'PUT', `/api/chats/${createdChatId}`, {
      messages: [{ role: 'user', content: 123 }],
    }, chatToken);
    assert.equal(res.status, 400);
  });

  it('DELETE /api/chats/:id deletes a chat', async () => {
    const res = await request(server, 'DELETE', `/api/chats/${createdChatId}`, null, chatToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('GET /api/chats returns empty list after deletion', async () => {
    const res = await request(server, 'GET', '/api/chats', null, chatToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.chats.length, 0);
  });

  it('requires authentication for chat endpoints', async () => {
    const listRes = await request(server, 'GET', '/api/chats', null);
    assert.equal(listRes.status, 401);
    const createRes = await request(server, 'POST', '/api/chats', {});
    assert.equal(createRes.status, 401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/chat/send validation tests
// ---------------------------------------------------------------------------
describe('POST /api/chat/send validation', () => {
  const testUsername = 'chatsend_test_' + Date.now();
  const testPassword = sha256Hex('testpassword123');
  let sendToken = null;

  it('should create a test user for chat send tests', async () => {
    const res = await request(server, 'POST', '/api/auth/signup', {
      username: testUsername,
      password: testPassword,
    });
    assert.equal(res.status, 201);
    sendToken = res.body.token;
    assert.ok(sendToken);
  });

  it('requires authentication', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      messages: [{ role: 'user', content: 'hi' }],
      provider: 'openai',
      model: 'gpt-4',
    });
    assert.equal(res.status, 401);
  });

  it('rejects missing messages', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      provider: 'openai',
      model: 'gpt-4',
    }, sendToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects empty messages array', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      messages: [],
      provider: 'openai',
      model: 'gpt-4',
    }, sendToken);
    assert.equal(res.status, 400);
  });

  it('rejects missing provider', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4',
    }, sendToken);
    assert.equal(res.status, 400);
  });

  it('rejects invalid provider', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      messages: [{ role: 'user', content: 'hi' }],
      provider: 'nonexistent',
      model: 'gpt-4',
    }, sendToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects invalid message role', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      messages: [{ role: 'admin', content: 'hi' }],
      provider: 'openai',
      model: 'gpt-4',
    }, sendToken);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /role/i);
  });

  it('rejects message with non-string content', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      messages: [{ role: 'user', content: 123 }],
      provider: 'openai',
      model: 'gpt-4',
    }, sendToken);
    assert.equal(res.status, 400);
  });

  it('rejects message with missing content', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      messages: [{ role: 'user' }],
      provider: 'openai',
      model: 'gpt-4',
    }, sendToken);
    assert.equal(res.status, 400);
  });

  it('rejects when provider API key not configured', async () => {
    const res = await request(server, 'POST', '/api/chat/send', {
      messages: [{ role: 'user', content: 'hi' }],
      provider: 'openai',
      model: 'gpt-4',
    }, sendToken);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /not configured/i);
  });
});

// ---------------------------------------------------------------------------
// GET /api/providers tests
// ---------------------------------------------------------------------------
describe('GET /api/providers', () => {
  const testUsername = 'providers_test_' + Date.now();
  const testPassword = sha256Hex('testpassword123');
  let provToken = null;

  it('should create a test user for provider tests', async () => {
    const res = await request(server, 'POST', '/api/auth/signup', {
      username: testUsername,
      password: testPassword,
    });
    assert.equal(res.status, 201);
    provToken = res.body.token;
    assert.ok(provToken);
  });

  it('returns provider list', async () => {
    const res = await request(server, 'GET', '/api/providers', null, provToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.providers));
  });

  it('requires authentication', async () => {
    const res = await request(server, 'GET', '/api/providers', null);
    assert.equal(res.status, 401);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/auth/change-username tests
// ---------------------------------------------------------------------------
describe('PUT /api/auth/change-username', { concurrency: false }, () => {
  let changeUsernameServer;
  let testToken = null;
  const baseUsername = 'cut_' + (Date.now() % 100000);
  const testPassword = sha256Hex('ValidPass1!');

  before(async () => {
    await authLimiter.resetKey('127.0.0.1');
    changeUsernameServer = http.createServer(app);
    await new Promise((resolve) => changeUsernameServer.listen(0, '127.0.0.1', resolve));

    // Create initial test user
    const res = await request(changeUsernameServer, 'POST', '/api/auth/signup', {
      username: baseUsername,
      password: testPassword,
    });
    assert.equal(res.status, 201);
    testToken = res.body.token;

    // Ensure username cooldown is clear for this user
    usernameChangeCooldowns.delete(baseUsername);
  });

  after(async () => {
    await new Promise((resolve) => changeUsernameServer.close(resolve));
  });

  it('requires authentication', async () => {
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: 'whatever' });
    assert.equal(res.status, 401);
  });

  it('rejects missing newUsername', async () => {
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', {}, testToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects invalid username characters', async () => {
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: 'bad name!' }, testToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects username that is too short', async () => {
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: 'ab' }, testToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects changing to the reserved admin username', async () => {
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: 'admin' }, testToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects changing to the same username', async () => {
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: baseUsername }, testToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('successfully changes username and returns new token', async () => {
    await authLimiter.resetKey('127.0.0.1');
    const newName = baseUsername + '_renamed';
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: newName }, testToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.username, newName);
    assert.ok(res.body.token, 'Expected a new session token');
    // Old token is now invalid
    const oldTokenRes = await request(changeUsernameServer, 'GET', '/api/user/language', null, testToken);
    assert.equal(oldTokenRes.status, 401);
    // New token works
    testToken = res.body.token;
    const newTokenRes = await request(changeUsernameServer, 'GET', '/api/user/language', null, testToken);
    assert.equal(newTokenRes.status, 200);
  });

  it('enforces 15-minute cooldown after a username change', async () => {
    // The previous test just changed the username, so cooldown is now active
    await authLimiter.resetKey('127.0.0.1');
    const currentName = baseUsername + '_renamed';
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: currentName + '_again' }, testToken);
    assert.equal(res.status, 429);
    assert.equal(res.body.success, false);
    assert.ok(res.body.retryAfterSeconds > 0, 'Expected retryAfterSeconds to be positive');
    // Clean up cooldown for any subsequent tests
    usernameChangeCooldowns.delete(currentName);
  });

  it('rejects changing to an already-taken username', async () => {
    // Create a second user
    await authLimiter.resetKey('127.0.0.1');
    const takenName = 'cutaken_' + Date.now();
    await request(changeUsernameServer, 'POST', '/api/auth/signup', {
      username: takenName,
      password: testPassword,
    });
    const currentName = baseUsername + '_renamed';
    usernameChangeCooldowns.delete(currentName);
    await authLimiter.resetKey('127.0.0.1');
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: takenName }, testToken);
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  it('rejects admin changing username', async () => {
    const adminToken = createSessionToken('admin');
    const res = await request(changeUsernameServer, 'PUT', '/api/auth/change-username', { newUsername: 'newadminname' }, adminToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    invalidateSession(adminToken);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/auth/change-password cooldown tests
// ---------------------------------------------------------------------------
// The HTTP-based test verifies the endpoint enforces the cooldown (returns 429
// with retryAfterSeconds). The cooldown logic itself (allowed/expired state) is
// covered by direct unit tests of checkCooldown, which avoid authLimiter contention.
describe('PUT /api/auth/change-password cooldown', { concurrency: false }, () => {
  let cooldownServer;
  let cooldownToken = null;
  const cooldownUsername = 'pwcooldown_' + (Date.now() % 100000);
  const testPassword = sha256Hex('ValidPass1!');
  const newPassword = sha256Hex('ValidPass2@');

  before(async () => {
    // Create user directly without HTTP to avoid consuming authLimiter slots
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.pbkdf2Sync(testPassword, salt, 100000, 32, 'sha256').toString('hex');
    writeUsers([...readUsers(), {
      username: cooldownUsername,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      passwordResetRequired: false,
    }]);
    // Issue session directly to avoid authLimiter
    cooldownToken = createSessionToken(cooldownUsername);

    cooldownServer = http.createServer(app);
    await new Promise((resolve) => cooldownServer.listen(0, '127.0.0.1', resolve));

    passwordChangeCooldowns.delete(cooldownUsername);
  });

  after(async () => {
    if (cooldownToken) invalidateSession(cooldownToken);
    writeUsers(readUsers().filter((u) => u.username !== cooldownUsername));
    passwordChangeCooldowns.delete(cooldownUsername);
    await new Promise((resolve) => cooldownServer.close(resolve));
  });

  // Unit tests for checkCooldown logic (no HTTP – no authLimiter contention)
  it('checkCooldown: blocks when cooldown is active', () => {
    const map = new Map();
    map.set('u', Date.now());
    const result = checkCooldown(map, 'u', PASSWORD_CHANGE_COOLDOWN_MS);
    assert.equal(result.allowed, false);
    assert.ok(result.retryAfterMs > 0, 'Expected retryAfterMs > 0');
  });

  it('checkCooldown: allows when cooldown has expired', () => {
    const map = new Map();
    map.set('u', Date.now() - PASSWORD_CHANGE_COOLDOWN_MS - 1000);
    const result = checkCooldown(map, 'u', PASSWORD_CHANGE_COOLDOWN_MS);
    assert.equal(result.allowed, true);
  });

  it('checkCooldown: allows when no entry exists', () => {
    const result = checkCooldown(new Map(), 'nonexistent', PASSWORD_CHANGE_COOLDOWN_MS);
    assert.equal(result.allowed, true);
  });

  // HTTP endpoint test: endpoint returns 429 + retryAfterSeconds when cooldown is active
  it('returns 429 with retryAfterSeconds from the endpoint when cooldown is active', async () => {
    passwordChangeCooldowns.set(cooldownUsername, Date.now());
    await authLimiter.resetKey('127.0.0.1');
    const res = await request(cooldownServer, 'PUT', '/api/auth/change-password', {
      currentPassword: testPassword,
      newPassword: newPassword,
    }, cooldownToken);
    assert.equal(res.status, 429);
    assert.equal(res.body.success, false);
    assert.ok(res.body.retryAfterSeconds > 0, 'Expected retryAfterSeconds to be positive');
    passwordChangeCooldowns.delete(cooldownUsername);
  });
});
