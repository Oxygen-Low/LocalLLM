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
const CHATS_DIR = path.join(DATA_DIR, 'chats');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit.log');
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const MAX_AUDIT_LOG_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Encryption helpers for API keys and chat data (AES-256-GCM)
// ---------------------------------------------------------------------------
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

// Derive a per-user encryption key from the server's master key + username.
// Key is persisted to data/encryption.key so it survives server restarts.
const ENCRYPTION_KEY_FILE = path.join(DATA_DIR, 'encryption.key');

function getOrCreateMasterKey() {
  if (process.env.ENCRYPTION_KEY) {
    return process.env.ENCRYPTION_KEY;
  }
  // Ensure data dir exists before reading/writing key file
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(ENCRYPTION_KEY_FILE)) {
    return fs.readFileSync(ENCRYPTION_KEY_FILE, 'utf-8').trim();
  }
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(ENCRYPTION_KEY_FILE, key, { mode: 0o600 });
  return key;
}

const MASTER_KEY = getOrCreateMasterKey();

function deriveUserKey(username) {
  return crypto.pbkdf2Sync(MASTER_KEY, `user:${username}`, PBKDF2_ITERATIONS, 32, 'sha256');
}

function encryptData(plaintext, username) {
  const key = deriveUserKey(username);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptData(encryptedStr, username) {
  const key = deriveUserKey(username);
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

// ---------------------------------------------------------------------------
// Kobold.cpp configuration
// ---------------------------------------------------------------------------
const KOBOLD_API_URL = process.env.KOBOLD_API_URL || 'http://localhost:5001';
const LLM_PROXY_TIMEOUT_MS = 60000; // 60-second timeout for LLM proxy requests

// ---------------------------------------------------------------------------
// Supported AI providers and their API configurations
// ---------------------------------------------------------------------------
const AI_PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
  anthropic: {
    name: 'Anthropic/Claude',
    baseUrl: 'https://api.anthropic.com',
    modelsEndpoint: '/v1/models',
    chatEndpoint: '/v1/messages',
  },
  openai: {
    name: 'OpenAI/ChatGPT',
    baseUrl: 'https://api.openai.com',
    modelsEndpoint: '/v1/models',
    chatEndpoint: '/v1/chat/completions',
  },
  deepseek: {
    name: 'Deepseek',
    baseUrl: 'https://api.deepseek.com',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
  xai: {
    name: 'xAI/Grok',
    baseUrl: 'https://api.x.ai',
    modelsEndpoint: '/v1/models',
    chatEndpoint: '/v1/chat/completions',
  },
  google: {
    name: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com',
    chatEndpoint: '/v1beta/models/{model}:generateContent',
  },
};

// ---------------------------------------------------------------------------
// SOC2 CC6.1/CC6.2 – Server-side session management
// ---------------------------------------------------------------------------
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const sessions = new Map(); // token -> { username, createdAt, expiresAt }

function createSessionToken(username) {
  const token = crypto.randomUUID();
  const now = Date.now();
  sessions.set(token, {
    username,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE_MS,
  });
  return token;
}

function validateSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function invalidateSession(token) {
  sessions.delete(token);
}

function invalidateUserSessions(username) {
  const tokensToDelete = [];
  for (const [token, session] of sessions.entries()) {
    if (session.username === username) {
      tokensToDelete.push(token);
    }
  }
  for (const token of tokensToDelete) {
    sessions.delete(token);
  }
}

// Periodic cleanup of expired sessions (every hour)
const sessionCleanupInterval = setInterval(() => {
  const now = Date.now();
  const expiredTokens = [];
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      expiredTokens.push(token);
    }
  }
  for (const token of expiredTokens) {
    sessions.delete(token);
  }
}, 60 * 60 * 1000);
sessionCleanupInterval.unref();

// SOC2 CC6.1 – Session authentication middleware
function requireSession(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  const session = validateSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
  req.sessionUser = session.username;
  req.sessionToken = token;
  next();
}

// ---------------------------------------------------------------------------
// SOC2 CC6.8 – Server-side account lockout
// ---------------------------------------------------------------------------
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15-minute lockout
const loginAttempts = new Map(); // username -> { count, firstAttempt, lockedUntil }

function checkServerLockout(username) {
  const record = loginAttempts.get(username);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, retryAfterMs: record.lockedUntil - now };
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    loginAttempts.delete(username);
    return { allowed: true };
  }

  if (now - record.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(username);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordServerFailedAttempt(username) {
  const now = Date.now();
  let record = loginAttempts.get(username);

  if (!record || (record.count > 0 && now - record.firstAttempt > LOGIN_WINDOW_MS)) {
    record = { count: 0, firstAttempt: now, lockedUntil: null };
  }

  record.count++;

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  loginAttempts.set(username, record);
}

function clearServerLoginAttempts(username) {
  loginAttempts.delete(username);
}

// ---------------------------------------------------------------------------
// Action cooldown tracking (password change: 3 min, username change: 15 min)
// ---------------------------------------------------------------------------
const PASSWORD_CHANGE_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes
const USERNAME_CHANGE_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const passwordChangeCooldowns = new Map(); // username -> lastChangedAtMs
const usernameChangeCooldowns = new Map(); // username -> lastChangedAtMs

/**
 * Check whether a user is still within a cooldown period.
 * Returns { allowed: true } when the cooldown has elapsed, or
 * { allowed: false, retryAfterMs } while it is still active.
 */
function checkCooldown(cooldownMap, username, cooldownMs) {
  const lastChange = cooldownMap.get(username);
  if (!lastChange) return { allowed: true };
  const elapsed = Date.now() - lastChange;
  if (elapsed < cooldownMs) {
    return { allowed: false, retryAfterMs: cooldownMs - elapsed };
  }
  cooldownMap.delete(username);
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// SOC2 CC6.1 – Server-side password hash format validation
// ---------------------------------------------------------------------------
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

function validatePasswordHash(password) {
  return typeof password === 'string' && SHA256_HEX_PATTERN.test(password);
}

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

function requestIdMiddleware(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

// ---------------------------------------------------------------------------
// ISO 27001:2022 A.8.9 – Cache-Control for sensitive API responses
// ---------------------------------------------------------------------------

function noCacheMiddleware(req, res, next) {
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
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4200' }));
// SOC2 PI1.1 – Explicit request body size limit (increased for chat messages)
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);
app.use('/api', noCacheMiddleware);

// ---------------------------------------------------------------------------
// SOC2 A1.1/CC7.1 – Health check endpoint for availability monitoring
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize data directory and users file at startup
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CHATS_DIR)) {
  fs.mkdirSync(CHATS_DIR, { recursive: true });
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

// Sanitize a username so it is safe to use as a single filesystem path segment.
// This does NOT change the logical username stored in the system; it only affects
// how we map a username to a filename on disk.
function sanitizeUsernameForPath(username) {
  if (typeof username !== 'string') {
    return 'user';
  }
  const normalized = normalizeUsername(username);
  // Allow only lowercase letters, digits, underscore and hyphen; replace others with "_".
  const safe = normalized.replace(/[^a-z0-9_-]/g, '_');
  // Avoid empty filenames.
  return safe.length > 0 ? safe : 'user';
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

    // SOC2 CC6.2: Issue session token on signup
    const token = createSessionToken(normalizedUsername);

    auditLog({ event: 'SIGNUP_SUCCESS', message: 'New account created', username: normalizedUsername, req });
    res.status(201).json({ success: true, username: normalizedUsername, token });
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

    // SOC2 CC6.8: Server-side account lockout check
    const lockoutCheck = checkServerLockout(normalizedUsername);
    if (!lockoutCheck.allowed) {
      const retrySeconds = Math.ceil(lockoutCheck.retryAfterMs / 1000);
      auditLog({ event: 'LOGIN_FAILURE', message: `Account locked (retry in ${retrySeconds}s)`, username: normalizedUsername, req });
      return res.status(429).json({ success: false, error: 'Account temporarily locked due to too many failed attempts. Please try again later.' });
    }

    const users = readUsers();
    const user = users.find((u) => u.username === normalizedUsername);

    if (!user) {
      recordServerFailedAttempt(normalizedUsername);
      auditLog({ event: 'LOGIN_FAILURE', message: 'Invalid username or password', username: normalizedUsername, req });
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const passwordHash = await hashPassword(password, user.salt);

    if (!timingSafeCompare(passwordHash, user.passwordHash)) {
      recordServerFailedAttempt(normalizedUsername);
      auditLog({ event: 'LOGIN_FAILURE', message: 'Invalid username or password', username: normalizedUsername, req });
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    // SOC2 CC6.8: Clear lockout on successful login
    clearServerLoginAttempts(normalizedUsername);

    // SOC2 CC6.2: Issue session token on login
    const token = createSessionToken(user.username);

    auditLog({ event: 'LOGIN_SUCCESS', message: 'User logged in', username: user.username, req });
    res.json({ success: true, username: user.username, token, passwordResetRequired: !!user.passwordResetRequired });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/auth/change-password – SOC2 CC6.1: requires valid session
app.put('/api/auth/change-password', authLimiter, requireSession, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const normalizedUsername = req.sessionUser;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'Current password is required' });
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'New password is required' });
    }

    // Enforce 3-minute cooldown between password changes
    const cooldownCheck = checkCooldown(passwordChangeCooldowns, normalizedUsername, PASSWORD_CHANGE_COOLDOWN_MS);
    if (!cooldownCheck.allowed) {
      const retryAfterSeconds = Math.ceil(cooldownCheck.retryAfterMs / 1000);
      return res.status(429).json({ success: false, error: 'Password was changed recently. Please wait before changing it again.', retryAfterSeconds });
    }

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

    passwordChangeCooldowns.set(normalizedUsername, Date.now());
    auditLog({ event: 'PASSWORD_CHANGED', message: 'Password changed successfully', username: normalizedUsername, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/auth/change-username – requires valid session; enforces 15-min cooldown
app.put('/api/auth/change-username', authLimiter, requireSession, async (req, res) => {
  try {
    const { newUsername } = req.body;
    const oldUsername = req.sessionUser;

    if (!newUsername || typeof newUsername !== 'string') {
      return res.status(400).json({ success: false, error: 'New username is required' });
    }

    // Admin account username is fixed
    if (oldUsername === ADMIN_USERNAME) {
      return res.status(403).json({ success: false, error: 'Admin username cannot be changed' });
    }

    // Server-side username validation
    const usernameErrors = validateUsername(newUsername);
    if (usernameErrors.length > 0) {
      return res.status(400).json({ success: false, error: usernameErrors[0] });
    }

    const normalizedNew = normalizeUsername(newUsername);

    if (normalizedNew === oldUsername) {
      return res.status(400).json({ success: false, error: 'New username must be different from current username' });
    }

    // New username must not be 'admin'
    if (normalizedNew === ADMIN_USERNAME) {
      return res.status(400).json({ success: false, error: 'That username is reserved' });
    }

    // Enforce 15-minute cooldown between username changes
    const cooldownCheck = checkCooldown(usernameChangeCooldowns, oldUsername, USERNAME_CHANGE_COOLDOWN_MS);
    if (!cooldownCheck.allowed) {
      const retryAfterSeconds = Math.ceil(cooldownCheck.retryAfterMs / 1000);
      return res.status(429).json({ success: false, error: 'Username was changed recently. Please wait before changing it again.', retryAfterSeconds });
    }

    const users = readUsers();

    if (users.some((u) => u.username === normalizedNew)) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }

    const userIndex = users.findIndex((u) => u.username === oldUsername);
    if (userIndex === -1) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Re-encrypt API keys under the new username key
    const apiKeysData = readUserApiKeys(oldUsername);
    const oldApiKeysFile = getUserApiKeysFile(oldUsername);
    if (Object.keys(apiKeysData).length > 0) {
      writeUserApiKeys(normalizedNew, apiKeysData);
    }
    // Only remove the old file after we have successfully written (or have nothing to write)
    if (fs.existsSync(oldApiKeysFile) && Object.keys(apiKeysData).length > 0) {
      fs.unlinkSync(oldApiKeysFile);
    } else if (fs.existsSync(oldApiKeysFile) && Object.keys(apiKeysData).length === 0) {
      // readUserApiKeys returned empty – file may be corrupt; leave it to avoid data loss
      console.warn(`Change-username: could not read API keys for ${oldUsername}, leaving file in place`);
    }

    // Re-encrypt chat files under the new username key and move to new directory
    const oldChatsDir = path.join(CHATS_DIR, oldUsername);
    const newChatsDir = path.join(CHATS_DIR, normalizedNew);
    if (fs.existsSync(oldChatsDir)) {
      fs.mkdirSync(newChatsDir, { recursive: true });
      const chatFiles = fs.readdirSync(oldChatsDir).filter((f) => f.endsWith('.enc'));
      for (const file of chatFiles) {
        const oldPath = path.join(oldChatsDir, file);
        try {
          const encryptedContent = fs.readFileSync(oldPath, 'utf-8');
          const decrypted = decryptData(encryptedContent, oldUsername);
          const reEncrypted = encryptData(decrypted, normalizedNew);
          fs.writeFileSync(path.join(newChatsDir, file), reEncrypted, { encoding: 'utf-8', mode: 0o600 });
          fs.unlinkSync(oldPath);
        } catch (migrationErr) {
          console.error(`Change-username: failed to re-encrypt chat file ${file} for ${oldUsername}:`, migrationErr);
          // Original file is preserved; skip so the rest of the migration continues
        }
      }
      // Remove the old directory if now empty
      if (fs.readdirSync(oldChatsDir).length === 0) {
        fs.rmdirSync(oldChatsDir);
      }
    }

    // Update user record
    users[userIndex] = { ...users[userIndex], username: normalizedNew };
    writeUsers(users);

    // Invalidate old sessions and issue a new token for the renamed user
    invalidateUserSessions(oldUsername);
    const newToken = createSessionToken(normalizedNew);

    // Transfer any password-change cooldown to the new username
    if (passwordChangeCooldowns.has(oldUsername)) {
      passwordChangeCooldowns.set(normalizedNew, passwordChangeCooldowns.get(oldUsername));
      passwordChangeCooldowns.delete(oldUsername);
    }
    usernameChangeCooldowns.set(normalizedNew, Date.now());

    auditLog({ event: 'USERNAME_CHANGED', message: `Username changed from ${oldUsername} to ${normalizedNew}`, username: normalizedNew, req });
    res.json({ success: true, username: normalizedNew, token: newToken });
  } catch (err) {
    console.error('Change username error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/auth/account – SOC2 CC6.1: requires valid session
app.delete('/api/auth/account', authLimiter, requireSession, async (req, res) => {
  try {
    const { password } = req.body;
    const normalizedUsername = req.sessionUser;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

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

    // SOC2 CC6.3: Invalidate all sessions for deleted user
    invalidateUserSessions(normalizedUsername);

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

// ---------------------------------------------------------------------------
// SOC2 CC6.3 – Logout / session invalidation
// ---------------------------------------------------------------------------
app.post('/api/auth/logout', requireSession, (req, res) => {
  invalidateSession(req.sessionToken);
  auditLog({ event: 'LOGOUT', message: 'User logged out', username: req.sessionUser, req });
  res.json({ success: true });
});

// GET /api/auth/password-reset-status – SOC2 CC6.1: requires valid session
app.get('/api/auth/password-reset-status', requireSession, (req, res) => {
  try {
    const user = findUser(req.sessionUser);
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

// GET /api/user/language – SOC2 CC6.1: requires valid session
app.get('/api/user/language', requireSession, (req, res) => {
  try {
    const normalizedUsername = req.sessionUser;
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

// PUT /api/user/language – SOC2 CC6.1: requires valid session
app.put('/api/user/language', requireSession, (req, res) => {
  try {
    const { language } = req.body;

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ success: false, error: 'Language is required' });
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, error: 'Unsupported language' });
    }

    const normalizedUsername = req.sessionUser;
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

// ---------------------------------------------------------------------------
// API Keys management – Encrypted per-user storage
// ---------------------------------------------------------------------------

const VALID_PROVIDERS = Object.keys(AI_PROVIDERS);

function getUserApiKeysFile(username) {
  const safeUsername = sanitizeUsernameForPath(username);
  return path.join(DATA_DIR, `apikeys_${safeUsername}.enc`);
}

function readUserApiKeys(username) {
  const file = getUserApiKeysFile(username);
  if (!fs.existsSync(file)) return {};
  try {
    const encrypted = fs.readFileSync(file, 'utf-8');
    return JSON.parse(decryptData(encrypted, username));
  } catch {
    return {};
  }
}

function writeUserApiKeys(username, keys) {
  const file = getUserApiKeysFile(username);
  const encrypted = encryptData(JSON.stringify(keys), username);
  fs.writeFileSync(file, encrypted, { encoding: 'utf-8', mode: 0o600 });
}

// GET /api/user/api-keys – List configured providers (no actual keys returned)
app.get('/api/user/api-keys', requireSession, (req, res) => {
  try {
    const keys = readUserApiKeys(req.sessionUser);
    const providers = {};
    for (const provider of VALID_PROVIDERS) {
      providers[provider] = {
        configured: !!keys[provider]?.apiKey,
        selectedModel: keys[provider]?.selectedModel || null,
      };
    }
    res.json({ success: true, providers });
  } catch (err) {
    console.error('Get API keys error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/user/api-keys/:provider – Set API key and model for a provider
app.put('/api/user/api-keys/:provider', requireSession, (req, res) => {
  try {
    const { provider } = req.params;
    const { apiKey, selectedModel } = req.body;

    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.length > 500) {
      return res.status(400).json({ success: false, error: 'Valid API key is required' });
    }

    if (selectedModel && (typeof selectedModel !== 'string' || selectedModel.length > 200)) {
      return res.status(400).json({ success: false, error: 'Invalid model selection' });
    }

    const keys = readUserApiKeys(req.sessionUser);
    keys[provider] = { apiKey, selectedModel: selectedModel || null };
    writeUserApiKeys(req.sessionUser, keys);

    auditLog({ event: 'API_KEY_SET', message: `API key set for ${provider}`, username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Set API key error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/user/api-keys/:provider – Remove API key for a provider
app.delete('/api/user/api-keys/:provider', requireSession, (req, res) => {
  try {
    const { provider } = req.params;

    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    const keys = readUserApiKeys(req.sessionUser);
    delete keys[provider];
    writeUserApiKeys(req.sessionUser, keys);

    auditLog({ event: 'API_KEY_REMOVED', message: `API key removed for ${provider}`, username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove API key error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/user/api-keys/:provider/model – Update selected model for a provider
app.put('/api/user/api-keys/:provider/model', requireSession, (req, res) => {
  try {
    const { provider } = req.params;
    const { selectedModel } = req.body;

    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    if (!selectedModel || typeof selectedModel !== 'string' || selectedModel.length > 200) {
      return res.status(400).json({ success: false, error: 'Valid model name is required' });
    }

    const keys = readUserApiKeys(req.sessionUser);
    if (!keys[provider]?.apiKey) {
      return res.status(400).json({ success: false, error: 'API key not configured for this provider' });
    }

    keys[provider].selectedModel = selectedModel;
    writeUserApiKeys(req.sessionUser, keys);

    res.json({ success: true });
  } catch (err) {
    console.error('Set model error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Kobold.cpp status check
// ---------------------------------------------------------------------------
app.get('/api/kobold/status', requireSession, async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${KOBOLD_API_URL}/api/v1/model`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      res.json({ success: true, available: true, model: data.result || 'Unknown Model' });
    } else {
      res.json({ success: true, available: false });
    }
  } catch {
    res.json({ success: true, available: false });
  }
});

// ---------------------------------------------------------------------------
// Chat storage – Encrypted per-user
// ---------------------------------------------------------------------------

function getUserChatsDir(username) {
  const dir = path.join(CHATS_DIR, username);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getChatFilePath(username, chatId) {
  return path.join(getUserChatsDir(username), `${chatId}.enc`);
}

function readChat(username, chatId) {
  const file = getChatFilePath(username, chatId);
  if (!fs.existsSync(file)) return null;
  try {
    const encrypted = fs.readFileSync(file, 'utf-8');
    return JSON.parse(decryptData(encrypted, username));
  } catch {
    return null;
  }
}

function writeChat(username, chatId, chatData) {
  const file = getChatFilePath(username, chatId);
  const encrypted = encryptData(JSON.stringify(chatData), username);
  fs.writeFileSync(file, encrypted, { encoding: 'utf-8', mode: 0o600 });
}

function deleteChat(username, chatId) {
  const file = getChatFilePath(username, chatId);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

function listUserChats(username) {
  const dir = getUserChatsDir(username);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.enc'));
  const chats = [];
  for (const file of files) {
    try {
      const chatId = file.replace('.enc', '');
      const encrypted = fs.readFileSync(path.join(dir, file), 'utf-8');
      const chat = JSON.parse(decryptData(encrypted, username));
      chats.push({
        id: chatId,
        title: chat.title || 'Untitled Chat',
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        provider: chat.provider,
        model: chat.model,
      });
    } catch {
      // Skip corrupted chat files
    }
  }
  return chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// GET /api/chats – List all chats for user
app.get('/api/chats', requireSession, (req, res) => {
  try {
    const chats = listUserChats(req.sessionUser);
    res.json({ success: true, chats });
  } catch (err) {
    console.error('List chats error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/chats – Create new chat
app.post('/api/chats', requireSession, (req, res) => {
  try {
    const chatId = crypto.randomUUID();
    const now = new Date().toISOString();
    const chatData = {
      id: chatId,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
      provider: req.body.provider || null,
      model: req.body.model || null,
    };
    writeChat(req.sessionUser, chatId, chatData);
    res.status(201).json({ success: true, chat: chatData });
  } catch (err) {
    console.error('Create chat error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/chats/:id – Get a specific chat
app.get('/api/chats/:id', requireSession, (req, res) => {
  try {
    const chatId = req.params.id;
    if (!/^[a-f0-9-]{36}$/.test(chatId)) {
      return res.status(400).json({ success: false, error: 'Invalid chat ID' });
    }
    const chat = readChat(req.sessionUser, chatId);
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    res.json({ success: true, chat });
  } catch (err) {
    console.error('Get chat error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/chats/:id – Update chat (title, messages, etc.)
app.put('/api/chats/:id', requireSession, (req, res) => {
  try {
    const chatId = req.params.id;
    if (!/^[a-f0-9-]{36}$/.test(chatId)) {
      return res.status(400).json({ success: false, error: 'Invalid chat ID' });
    }
    const existing = readChat(req.sessionUser, chatId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Validate messages if provided
    let validatedMessages = existing.messages;
    if (req.body.messages !== undefined) {
      if (!Array.isArray(req.body.messages)) {
        return res.status(400).json({ success: false, error: 'Messages must be an array' });
      }
      const VALID_ROLES = ['system', 'user', 'assistant'];
      for (const msg of req.body.messages) {
        if (!msg || typeof msg !== 'object') {
          return res.status(400).json({ success: false, error: 'Invalid message format' });
        }
        if (typeof msg.role !== 'string' || !VALID_ROLES.includes(msg.role)) {
          return res.status(400).json({ success: false, error: 'Invalid message role' });
        }
        if (typeof msg.content !== 'string') {
          return res.status(400).json({ success: false, error: 'Invalid message content' });
        }
      }
      validatedMessages = req.body.messages;
    }

    const updated = {
      ...existing,
      title: req.body.title || existing.title,
      messages: validatedMessages,
      provider: req.body.provider ?? existing.provider,
      model: req.body.model ?? existing.model,
      updatedAt: new Date().toISOString(),
    };
    writeChat(req.sessionUser, chatId, updated);
    res.json({ success: true, chat: updated });
  } catch (err) {
    console.error('Update chat error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/chats/:id – Delete a chat
app.delete('/api/chats/:id', requireSession, (req, res) => {
  try {
    const chatId = req.params.id;
    if (!/^[a-f0-9-]{36}$/.test(chatId)) {
      return res.status(400).json({ success: false, error: 'Invalid chat ID' });
    }
    deleteChat(req.sessionUser, chatId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete chat error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// LLM Chat Proxy – Routes messages to the selected provider
// ---------------------------------------------------------------------------

async function proxyToKobold(messages) {
  const prompt = messages.map(m => {
    if (m.role === 'system') return `### System:\n${m.content}`;
    if (m.role === 'user') return `### User:\n${m.content}`;
    return `### Assistant:\n${m.content}`;
  }).join('\n\n') + '\n\n### Assistant:\n';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_PROXY_TIMEOUT_MS);
  const response = await fetch(`${KOBOLD_API_URL}/api/v1/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      max_length: 2048,
      temperature: 0.7,
      top_p: 0.9,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Kobold.cpp error: ${response.status}`);
  }

  const data = await response.json();
  return { content: data.results?.[0]?.text || '' };
}

async function proxyToOpenAICompatible(messages, apiKey, baseUrl, chatEndpoint, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_PROXY_TIMEOUT_MS);
  const response = await fetch(`${baseUrl}${chatEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '' };
}

async function proxyToAnthropic(messages, apiKey, model) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const body = {
    model,
    max_tokens: 4096,
    messages: chatMessages,
  };
  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_PROXY_TIMEOUT_MS);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = data.content?.map(c => c.text).join('') || '';
  return { content: text };
}

async function proxyToGoogle(messages, apiKey, model) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_PROXY_TIMEOUT_MS);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  return { content: text };
}

// POST /api/chat/send – Send message to LLM
app.post('/api/chat/send', requireSession, async (req, res) => {
  try {
    const { messages, provider, model } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages are required' });
    }

    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ success: false, error: 'Provider is required' });
    }

    // Validate messages structure
    const VALID_ROLES = ['system', 'user', 'assistant'];
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid message format' });
      }
      if (typeof msg.role !== 'string' || !VALID_ROLES.includes(msg.role)) {
        return res.status(400).json({ success: false, error: 'Invalid message role' });
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid message format' });
      }
    }

    let result;

    if (provider === 'kobold') {
      result = await proxyToKobold(messages);
    } else if (VALID_PROVIDERS.includes(provider)) {
      const keys = readUserApiKeys(req.sessionUser);
      const providerKeys = keys[provider];
      if (!providerKeys?.apiKey) {
        return res.status(400).json({ success: false, error: `API key not configured for ${provider}` });
      }

      const selectedModel = model || providerKeys.selectedModel;
      if (!selectedModel) {
        return res.status(400).json({ success: false, error: 'No model selected' });
      }

      const providerConfig = AI_PROVIDERS[provider];

      if (provider === 'anthropic') {
        result = await proxyToAnthropic(messages, providerKeys.apiKey, selectedModel);
      } else if (provider === 'google') {
        result = await proxyToGoogle(messages, providerKeys.apiKey, selectedModel);
      } else {
        result = await proxyToOpenAICompatible(
          messages, providerKeys.apiKey, providerConfig.baseUrl,
          providerConfig.chatEndpoint, selectedModel
        );
      }
    } else {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    res.json({ success: true, message: { role: 'assistant', content: result.content } });
  } catch (err) {
    const errorId = crypto.randomUUID();
    console.error(`Chat send error [${errorId}]:`, err);
    res.status(502).json({
      success: false,
      error: 'Failed to get response from LLM',
      requestId: errorId,
    });
  }
});

// GET /api/providers – List available providers and their status for user
app.get('/api/providers', requireSession, async (req, res) => {
  try {
    const keys = readUserApiKeys(req.sessionUser);
    const providers = [];

    // Check kobold.cpp
    let koboldAvailable = false;
    let koboldModel = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const kRes = await fetch(`${KOBOLD_API_URL}/api/v1/model`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (kRes.ok) {
        const data = await kRes.json();
        koboldAvailable = true;
        koboldModel = data.result || 'Local Model';
      }
    } catch {
      // Not available
    }

    if (koboldAvailable) {
      providers.push({
        id: 'kobold',
        name: 'Local Model',
        model: koboldModel,
        available: true,
      });
    }

    // Check configured providers
    for (const [id, config] of Object.entries(AI_PROVIDERS)) {
      const providerKeys = keys[id];
      if (providerKeys?.apiKey) {
        providers.push({
          id,
          name: config.name,
          model: providerKeys.selectedModel || null,
          available: true,
        });
      }
    }

    res.json({ success: true, providers });
  } catch (err) {
    console.error('Get providers error:', err);
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

module.exports = { app, createHttpsServer, saveAllData, setupGracefulShutdown, ensureAdminAccount, readUsers, writeUsers, isPrivateIP, validateOutboundUrl, validateResolvedIP, ssrfSafeUrlValidation, auditLog, validateUsername, AUDIT_LOG_FILE, createSessionToken, validateSession, invalidateSession, invalidateUserSessions, sessions, checkServerLockout, recordServerFailedAttempt, clearServerLoginAttempts, loginAttempts, validatePasswordHash, authLimiter, encryptData, decryptData, AI_PROVIDERS, VALID_PROVIDERS, sanitizeUsernameForPath, getUserApiKeysFile, DATA_DIR, passwordChangeCooldowns, usernameChangeCooldowns, PASSWORD_CHANGE_COOLDOWN_MS, USERNAME_CHANGE_COOLDOWN_MS, checkCooldown };
