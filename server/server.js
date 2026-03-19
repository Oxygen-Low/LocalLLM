const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const dns = require('dns');
const { rateLimit } = require('express-rate-limit');
const selfsigned = require('selfsigned');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit.log');
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const MAX_AUDIT_LOG_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// ISO 27001:2022 A.8.15 – Audit logging
// ---------------------------------------------------------------------------

/**
 * Append a structured JSON audit log entry to the persistent audit log file.
 * Each entry is a single JSON line with timestamp, requestId, event type,
 * optional username, source IP, and a human-readable message.
 */
function auditLog({ event, message, username, req }) {
  const entry = {
    timestamp: new Date().toISOString(),
    requestId: req?.requestId ?? undefined,
    event,
    username: username ?? undefined,
    ip: req ? (req.ip || req.socket?.remoteAddress) : undefined,
    message,
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    // Simple size-based rotation: if the log exceeds MAX_AUDIT_LOG_BYTES,
    // truncate it to the most recent half before appending.
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      const stat = fs.statSync(AUDIT_LOG_FILE);
      if (stat.size > MAX_AUDIT_LOG_BYTES) {
        const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        const keep = lines.slice(Math.floor(lines.length / 2));
        fs.writeFileSync(AUDIT_LOG_FILE, keep.join('\n') + '\n', 'utf-8');
      }
    }

    fs.appendFileSync(AUDIT_LOG_FILE, line, 'utf-8');
  } catch {
    // Audit log write failure must not crash the server.
    // eslint-disable-next-line no-console
    console.error('Audit log write failed:', entry);
  }
}

// ---------------------------------------------------------------------------
// ISO 27001:2022 A.8.15 – Request ID middleware for log correlation
// ---------------------------------------------------------------------------

function requestIdMiddleware(req, _res, next) {
  req.requestId = crypto.randomUUID();
  _res.setHeader('X-Request-Id', req.requestId);
  next();
}

// ---------------------------------------------------------------------------
// ISO 27001:2022 A.8.9 – Cache-Control for sensitive API responses
// ---------------------------------------------------------------------------

function noCacheMiddleware(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
}

// ---------------------------------------------------------------------------
// A10: Server-Side Request Forgery (SSRF) – URL validation & IP-range blocking
// ---------------------------------------------------------------------------

// Allowed URL schemes for outbound requests
const ALLOWED_SCHEMES = ['http:', 'https:'];

// Configurable allowlist of permitted outbound hostnames.
// When set (non-empty), only these hosts are reachable from the server.
const SSRF_ALLOWED_HOSTS = (process.env.SSRF_ALLOWED_HOSTS || '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/**
 * Return true when the given IPv4 or IPv6 address belongs to a private,
 * loopback, link-local, or otherwise non-routable range.
 */
function isPrivateIP(ip) {
  // Strip surrounding brackets (present in URL-parsed IPv6 hostnames)
  const addr = ip.replace(/^\[|\]$/g, '');

  // IPv4 ranges
  if (/^127\./.test(addr)) return true;                         // 127.0.0.0/8   loopback
  if (/^10\./.test(addr)) return true;                          // 10.0.0.0/8    private
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return true;    // 172.16.0.0/12 private
  if (/^192\.168\./.test(addr)) return true;                    // 192.168.0.0/16 private
  if (/^169\.254\./.test(addr)) return true;                    // 169.254.0.0/16 link-local / cloud metadata
  if (addr === '0.0.0.0') return true;                          // unspecified
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(addr)) return true; // 100.64.0.0/10 CGN

  // IPv6 ranges
  if (addr === '::1') return true;                              // loopback
  if (addr === '::') return true;                               // unspecified
  if (/^fe80:/i.test(addr)) return true;                        // link-local
  if (/^f[cd]/i.test(addr)) return true;                      // unique-local (fc00::/7)
  if (/^::ffff:/i.test(addr)) {                                 // IPv4-mapped IPv6
    const v4 = addr.replace(/^::ffff:/i, '');
    return isPrivateIP(v4);
  }

  return false;
}

/**
 * Validate a user-supplied URL for safe outbound use.
 * Returns { valid: true, parsed: URL } on success, or { valid: false, reason: string }.
 */
function validateOutboundUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Scheme check
  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    return { valid: false, reason: `Scheme "${parsed.protocol}" is not allowed` };
  }

  // Block credentials in URLs
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'URLs must not contain embedded credentials' };
  }

  // Hostname allowlist (when configured)
  if (SSRF_ALLOWED_HOSTS.length > 0) {
    if (!SSRF_ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())) {
      return { valid: false, reason: 'Hostname is not in the allowed list' };
    }
  }

  // Block hostnames that are bare IP addresses in private ranges
  if (isPrivateIP(parsed.hostname)) {
    return { valid: false, reason: 'Requests to private/internal IP addresses are blocked' };
  }

  return { valid: true, parsed };
}

/**
 * Resolve a hostname to IP addresses and verify none fall in private ranges.
 * Returns { safe: true } or { safe: false, reason: string }.
 */
function validateResolvedIP(hostname) {
  return new Promise((resolve) => {
    // If the hostname is already a literal IP, check directly
    if (isPrivateIP(hostname)) {
      return resolve({ safe: false, reason: 'Requests to private/internal IP addresses are blocked' });
    }

    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) {
        return resolve({ safe: false, reason: `DNS resolution failed: ${err.code || err.message}` });
      }

      for (const entry of addresses) {
        if (isPrivateIP(entry.address)) {
          return resolve({
            safe: false,
            reason: `Hostname resolves to private/internal IP address (${entry.address})`,
          });
        }
      }

      return resolve({ safe: true });
    });
  });
}

/**
 * Full SSRF-safe URL validation: parse + scheme check + DNS resolution check.
 * Combines validateOutboundUrl() and validateResolvedIP().
 */
async function ssrfSafeUrlValidation(urlString) {
  const urlCheck = validateOutboundUrl(urlString);
  if (!urlCheck.valid) {
    return urlCheck;
  }

  const dnsCheck = await validateResolvedIP(urlCheck.parsed.hostname);
  if (!dnsCheck.safe) {
    return { valid: false, reason: dnsCheck.reason };
  }

  return { valid: true, parsed: urlCheck.parsed };
}

// General API rate limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Stricter rate limiter for auth endpoints: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' },
});

app.use(requestIdMiddleware);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  })
);

// ISO 27001:2022 A.8.9 – Permissions-Policy header to restrict browser features
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());
app.use('/api', apiLimiter);
app.use('/api', noCacheMiddleware);

// Initialize data directory and users file at startup
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
}

// In-memory users cache – loaded from disk once at startup, kept in sync on every write
let usersCache = null;

function loadUsersFromDisk() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    usersCache = JSON.parse(data).map((u) => ({
      ...u,
      passwordResetRequired: !!u.passwordResetRequired,
    }));
  } catch {
    usersCache = [];
  }
}

// Eagerly load the cache at module init (data dir / file are guaranteed to exist above)
loadUsersFromDisk();

const ADMIN_USERNAME = 'admin';

// ISO 27001:2022 A.8.25 – Server-side username validation (mirrors client-side rules)
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function validateUsername(username) {
  const errors = [];
  if (username.length < MIN_USERNAME_LENGTH) {
    errors.push(`Username must be at least ${MIN_USERNAME_LENGTH} characters`);
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    errors.push(`Username must be at most ${MAX_USERNAME_LENGTH} characters`);
  }
  if (!USERNAME_PATTERN.test(username)) {
    errors.push('Username can only contain letters, numbers, hyphens, and underscores');
  }
  return errors;
}

function normalizeUsername(username) {
  return username.toLowerCase();
}

async function ensureAdminAccount() {
  const users = readUsers();
  if (users.some((u) => u.username === ADMIN_USERNAME)) {
    return null;
  }

  // Generate a cryptographically random password (192 bits of entropy, ~32 URL-safe chars)
  const adminPassword = crypto.randomBytes(24).toString('base64url');

  // The Angular client pre-hashes passwords with SHA-256 before sending them to the server.
  // We replicate that transformation here so the generated password works with the login flow.
  // The resulting value is immediately passed through PBKDF2 (hashPassword) before storage;
  // the SHA-256 digest itself is never persisted.
  const clientPreHash = crypto.createHash('sha256').update(adminPassword).digest('hex'); // lgtm[js/insufficient-password-hash]
  const salt = generateSalt();
  const passwordHash = await hashPassword(clientPreHash, salt);

  const adminUser = {
    username: ADMIN_USERNAME,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    passwordResetRequired: false,
  };

  users.push(adminUser);
  writeUsers(users);

  console.log('===========================================');
  console.log('  Admin account created.');
  console.log(`  Username : ${ADMIN_USERNAME}`);
  console.log(`  Password : ${adminPassword}`);
  console.log('  Change this password after first login!');
  console.log('===========================================');

  return adminPassword;
}

function readUsers() {
  return usersCache;
}

function writeUsers(users) {
  usersCache = users.map((u) => ({ ...u, passwordResetRequired: !!u.passwordResetRequired }));
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersCache, null, 2), 'utf-8');
}

function findUser(username) {
  const normalized = normalizeUsername(username);
  const users = readUsers();
  return users.find((u) => u.username === normalized);
}

async function verifyAdminCredentials(adminUsername, adminPassword) {
  if (!adminUsername || !adminPassword) {
    return false;
  }

  const adminUser = findUser(adminUsername);
  if (!adminUser || adminUser.username !== ADMIN_USERNAME) {
    return false;
  }

  const hash = await hashPassword(adminPassword, adminUser.salt);
  return timingSafeCompare(hash, adminUser.passwordHash);
}

// Flush the in-memory cache to disk (called during graceful shutdown)
function saveAllData() {
  if (usersCache !== null) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersCache, null, 2), 'utf-8');
  }
}

// Register SIGTERM / SIGINT handlers so all data is persisted before exit
function setupGracefulShutdown(server) {
  let shuttingDown = false;

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n${signal} received. Saving data and shutting down...`);

    // Persist data first to guarantee nothing is lost
    saveAllData();

    // Stop accepting new connections and wait for in-flight requests
    server.close(() => {
      console.log('All data saved. Server shut down gracefully.');
      process.exit(0);
    });

    // Force exit if server.close() hangs (e.g. long-lived connections)
    setTimeout(() => {
      console.error('Shutdown timed out – forcing exit.');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

function timingSafeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function generateSalt() {
  return crypto.randomBytes(SALT_BYTES).toString('hex');
}

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, HASH_BYTES, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

// POST /api/auth/signup
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    // A.8.25: Server-side username validation
    const usernameErrors = validateUsername(username);
    if (usernameErrors.length > 0) {
      auditLog({ event: 'SIGNUP_FAILURE', message: `Validation failed: ${usernameErrors[0]}`, username, req });
      return res.status(400).json({ success: false, error: usernameErrors[0] });
    }

    const normalizedUsername = normalizeUsername(username);
    const users = readUsers();

    if (users.some((u) => u.username === normalizedUsername)) {
      auditLog({ event: 'SIGNUP_FAILURE', message: 'Username already exists', username: normalizedUsername, req });
      return res.status(409).json({ success: false, error: 'Username already exists' });
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const newUser = {
      username: normalizedUsername,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      passwordResetRequired: false,
    };

    users.push(newUser);
    writeUsers(users);

    auditLog({ event: 'SIGNUP_SUCCESS', message: 'New account created', username: normalizedUsername, req });
    res.status(201).json({ success: true, username: normalizedUsername });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const normalizedUsername = normalizeUsername(username);
    const users = readUsers();
    const user = users.find((u) => u.username === normalizedUsername);

    if (!user) {
      auditLog({ event: 'LOGIN_FAILURE', message: 'Invalid username or password', username: normalizedUsername, req });
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const passwordHash = await hashPassword(password, user.salt);

    if (!timingSafeCompare(passwordHash, user.passwordHash)) {
      auditLog({ event: 'LOGIN_FAILURE', message: 'Invalid username or password', username: normalizedUsername, req });
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    auditLog({ event: 'LOGIN_SUCCESS', message: 'User logged in', username: user.username, req });
    res.json({ success: true, username: user.username, passwordResetRequired: !!user.passwordResetRequired });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/auth/change-password
app.put('/api/auth/change-password', authLimiter, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'Current password is required' });
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'New password is required' });
    }

    const normalizedUsername = normalizeUsername(username);
    const users = readUsers();
    const userIndex = users.findIndex((u) => u.username === normalizedUsername);

    if (userIndex === -1) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[userIndex];
    const currentHash = await hashPassword(currentPassword, user.salt);

    if (!timingSafeCompare(currentHash, user.passwordHash)) {
      auditLog({ event: 'PASSWORD_CHANGE_FAILURE', message: 'Current password is incorrect', username: normalizedUsername, req });
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    // Verify new password differs from current password using the same salt
    const newPasswordWithOldSalt = await hashPassword(newPassword, user.salt);
    if (timingSafeCompare(newPasswordWithOldSalt, user.passwordHash)) {
      return res.status(400).json({ success: false, error: 'New password must be different from current password' });
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);

    users[userIndex] = { ...user, passwordHash: newHash, salt: newSalt, passwordResetRequired: false };
    writeUsers(users);

    auditLog({ event: 'PASSWORD_CHANGED', message: 'Password changed successfully', username: normalizedUsername, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/auth/account
app.delete('/api/auth/account', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const normalizedUsername = normalizeUsername(username);
    const users = readUsers();
    const userIndex = users.findIndex((u) => u.username === normalizedUsername);

    if (userIndex === -1) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[userIndex];
    const passwordHash = await hashPassword(password, user.salt);

    if (!timingSafeCompare(passwordHash, user.passwordHash)) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    users.splice(userIndex, 1);
    writeUsers(users);

    auditLog({ event: 'ACCOUNT_DELETED', message: 'Account deleted', username: normalizedUsername, req });

    // Recreate the admin account if it was just deleted
    if (normalizedUsername === ADMIN_USERNAME) {
      await ensureAdminAccount();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: list users (use general API limiter to avoid auth limiter exhaustion)
app.post('/api/admin/users/list', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin list attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const users = readUsers().map((u) => ({
      username: u.username,
      createdAt: u.createdAt,
      passwordResetRequired: !!u.passwordResetRequired,
    }));

    auditLog({ event: 'ADMIN_LIST_USERS', message: 'Admin listed users', username: adminUsername, req });
    return res.json({ success: true, users });
  } catch (err) {
    console.error('Admin list users error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: reset password requirement
app.post('/api/admin/users/reset-password', async (req, res) => {
  try {
    const { adminUsername, adminPassword, username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin reset-password attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const normalizedUsername = normalizeUsername(username);
    const users = readUsers();
    const userIndex = users.findIndex((u) => u.username === normalizedUsername);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    users[userIndex] = { ...users[userIndex], passwordResetRequired: true };
    writeUsers(users);

    auditLog({ event: 'ADMIN_RESET_PASSWORD', message: `Admin flagged password reset for ${normalizedUsername}`, username: adminUsername, req });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin reset password error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: delete user
app.post('/api/admin/users/delete', async (req, res) => {
  try {
    const { adminUsername, adminPassword, username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin delete attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername === ADMIN_USERNAME) {
      return res.status(400).json({ success: false, error: 'Cannot delete the admin account' });
    }

    const users = readUsers();
    const userIndex = users.findIndex((u) => u.username === normalizedUsername);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    users.splice(userIndex, 1);
    writeUsers(users);

    auditLog({ event: 'ADMIN_DELETE_USER', message: `Admin deleted user ${normalizedUsername}`, username: adminUsername, req });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/auth/password-reset-status
app.get('/api/auth/password-reset-status', (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const user = findUser(username);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, passwordResetRequired: !!user.passwordResetRequired });
  } catch (err) {
    console.error('Password reset status error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const SUPPORTED_LANGUAGES = ['en', 'ko', 'ja', 'ru'];

// GET /api/user/language
app.get('/api/user/language', (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const normalizedUsername = normalizeUsername(username);
    const users = readUsers();
    const user = users.find((u) => u.username === normalizedUsername);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, language: user.language || 'en' });
  } catch (err) {
    console.error('Get language error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/user/language
app.put('/api/user/language', (req, res) => {
  try {
    const { username, language } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ success: false, error: 'Language is required' });
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, error: 'Unsupported language' });
    }

    const normalizedUsername = normalizeUsername(username);
    const users = readUsers();
    const userIndex = users.findIndex((u) => u.username === normalizedUsername);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    users[userIndex] = { ...users[userIndex], language };
    writeUsers(users);

    res.json({ success: true, language });
  } catch (err) {
    console.error('Set language error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Generate or load self-signed TLS certificate for HTTPS (development only)
const CERT_DIR = path.join(__dirname, '..', 'data');
const CERT_KEY_FILE = path.join(CERT_DIR, 'dev-key.pem');
const CERT_FILE = path.join(CERT_DIR, 'dev-cert.pem');

async function getOrCreateCert() {
  if (fs.existsSync(CERT_KEY_FILE) && fs.existsSync(CERT_FILE)) {
    return {
      key: fs.readFileSync(CERT_KEY_FILE, 'utf-8'),
      cert: fs.readFileSync(CERT_FILE, 'utf-8'),
    };
  }

  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = await selfsigned.generate(attrs, { days: 365, keySize: 2048 });

  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }
  fs.writeFileSync(CERT_KEY_FILE, pems.private, 'utf-8');
  fs.writeFileSync(CERT_FILE, pems.cert, 'utf-8');

  return { key: pems.private, cert: pems.cert };
}

async function createHttpsServer() {
  await ensureAdminAccount();
  const httpsOptions = await getOrCreateCert();
  return https.createServer(httpsOptions, app);
}

if (require.main === module) {
  createHttpsServer().then((server) => {
    server.listen(PORT, () => {
      console.log(`Server running on HTTPS port ${PORT}`);
    });
    setupGracefulShutdown(server);
  });
}

module.exports = { app, createHttpsServer, saveAllData, setupGracefulShutdown, ensureAdminAccount, readUsers, writeUsers, isPrivateIP, validateOutboundUrl, validateResolvedIP, ssrfSafeUrlValidation, auditLog, validateUsername, AUDIT_LOG_FILE };
