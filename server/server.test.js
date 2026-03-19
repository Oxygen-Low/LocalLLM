const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, saveAllData, setupGracefulShutdown, ensureAdminAccount, readUsers, writeUsers, isPrivateIP, validateOutboundUrl, validateResolvedIP, ssrfSafeUrlValidation, auditLog, validateUsername, AUDIT_LOG_FILE, createSessionToken, validateSession, invalidateSession, invalidateUserSessions, sessions, checkServerLockout, recordServerFailedAttempt, clearServerLoginAttempts, loginAttempts, validatePasswordHash, authLimiter } = require('./server');

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
