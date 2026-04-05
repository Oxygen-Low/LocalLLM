const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const dns = require('dns');
const { execFileSync, spawn } = require('child_process');
const { rateLimit } = require('express-rate-limit');
const selfsigned = require('selfsigned');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_INSTANCE_ID = crypto.randomUUID();
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UNIVERSES_FILE = path.join(DATA_DIR, 'universes.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CHATS_DIR = path.join(DATA_DIR, 'chats');
const PERSONAS_DIR = path.join(DATA_DIR, 'personas');
const ROLEPLAY_DIR = path.join(DATA_DIR, 'roleplay');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit.log');
const PYTHON_VENV_DIR = path.join(DATA_DIR, 'python_env');
const PYTHON_SERVICE_SCRIPT = path.join(__dirname, 'python_service.py');
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

// In-memory cache for derived user keys to optimize encryption/decryption performance.
// PBKDF2 is computationally expensive (100,000 iterations), so we cache the result.
const userKeyCache = new Map();

function deriveUserKey(username) {
  if (userKeyCache.has(username)) {
    return userKeyCache.get(username);
  }
  const key = crypto.pbkdf2Sync(MASTER_KEY, `user:${username}`, PBKDF2_ITERATIONS, 32, 'sha256');
  userKeyCache.set(username, key);
  return key;
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
// Local LLM model management (HuggingFace models via Python transformers)
// ---------------------------------------------------------------------------
const MODELS_DIR = path.join(DATA_DIR, 'models');
const MODELS_REGISTRY_FILE = path.join(DATA_DIR, 'models.json');
const PYTHON_SERVICE_PORT = parseInt(process.env.PYTHON_SERVICE_PORT || '5555', 10);
const PYTHON_SERVICE_URL = `http://127.0.0.1:${PYTHON_SERVICE_PORT}`;

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// In-process mutex for model registry mutations (prevents read-modify-write races)
let _modelsRegistryLock = Promise.resolve();

function withModelsLock(fn) {
  const next = _modelsRegistryLock.then(fn, fn);
  _modelsRegistryLock = next.catch(() => {});
  return next;
}

/**
 * Read the local models registry from disk.
 * Returns an array of { id, name, filename, uploadedAt }.
 */
function readLocalModels() {
  if (!fs.existsSync(MODELS_REGISTRY_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(MODELS_REGISTRY_FILE, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Write the local models registry to disk.
 */
function writeLocalModels(models) {
  fs.writeFileSync(MODELS_REGISTRY_FILE, JSON.stringify(models, null, 2), 'utf-8');
}

/**
 * Get the absolute directory path for a registered model.
 */
function getModelDirPath(model) {
  const dirPath = path.join(MODELS_DIR, model.directory);
  ensureWithinDir(MODELS_DIR, dirPath);
  return dirPath;
}

/**
 * Check whether the Python LLM service is reachable.
 */
async function checkPythonServiceHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${PYTHON_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

const LLM_PROXY_TIMEOUT_MS = 60000; // 60-second timeout for LLM proxy requests
const LOCAL_MODEL_TIMEOUT_MULTIPLIER = 5; // Local models are slower, allow more time
const LLM_DEFAULT_MAX_TOKENS = 4096;
const THINK_MAX_TOKENS = 16000; // Higher limit to accommodate thinking + response tokens
const ANTHROPIC_THINKING_BUDGET = 10000; // Budget tokens for Anthropic extended thinking
const GOOGLE_THINKING_BUDGET = 8192; // Budget tokens for Google thinking mode

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
        return resolve({ safe: false, reason: 'DNS resolution failed' });
      }

      for (const entry of addresses) {
        if (isPrivateIP(entry.address)) {
          return resolve({
            safe: false,
            reason: 'Hostname resolves to a blocked address',
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

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  exposedHeaders: ['X-Server-Instance-ID']
}));
app.use((req, res, next) => {
  res.setHeader('X-Server-Instance-ID', SERVER_INSTANCE_ID);
  next();
});
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
if (!fs.existsSync(PERSONAS_DIR)) {
  fs.mkdirSync(PERSONAS_DIR, { recursive: true });
}
if (!fs.existsSync(ROLEPLAY_DIR)) {
  fs.mkdirSync(ROLEPLAY_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
}
if (!fs.existsSync(UNIVERSES_FILE)) {
  fs.writeFileSync(UNIVERSES_FILE, JSON.stringify([]), 'utf-8');
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ riskyAppsEnabled: true }), 'utf-8');
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

// ---------------------------------------------------------------------------
// Universes & Characters – in-memory cache with disk persistence
// ---------------------------------------------------------------------------
let universesCache = null;

function loadUniversesFromDisk() {
  try {
    const data = fs.readFileSync(UNIVERSES_FILE, 'utf-8');
    universesCache = JSON.parse(data);
    if (!Array.isArray(universesCache)) universesCache = [];
  } catch {
    universesCache = [];
  }
}

loadUniversesFromDisk();

function readUniverses() {
  return universesCache;
}

function writeUniverses(universes) {
  universesCache = universes;
  fs.writeFileSync(UNIVERSES_FILE, JSON.stringify(universesCache, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// App Settings – in-memory cache with disk persistence
// ---------------------------------------------------------------------------
let settingsCache = null;

const DEFAULT_SETTINGS = { riskyAppsEnabled: true };

function loadSettingsFromDisk() {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    settingsCache = { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    settingsCache = { ...DEFAULT_SETTINGS };
  }
}

loadSettingsFromDisk();

function readSettings() {
  return settingsCache;
}

function writeSettings(settings) {
  settingsCache = { ...DEFAULT_SETTINGS, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsCache, null, 2), 'utf-8');
}

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

/**
 * Defense-in-depth: verify that the resolved absolutePath stays within parentDir.
 * Throws if the path escapes the expected directory (e.g. via path traversal).
 */
function ensureWithinDir(parentDir, absolutePath) {
  const resolvedParent = path.resolve(parentDir) + path.sep;
  const resolvedChild = path.resolve(absolutePath);
  if (!resolvedChild.startsWith(resolvedParent)) {
    throw new Error('Path traversal detected');
  }
  return resolvedChild;
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

  if (!validatePasswordHash(adminPassword)) {
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
  if (universesCache !== null) {
    fs.writeFileSync(UNIVERSES_FILE, JSON.stringify(universesCache, null, 2), 'utf-8');
  }
  if (settingsCache !== null) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsCache, null, 2), 'utf-8');
  }
}

// ---------------------------------------------------------------------------
// Python virtual-environment process management
// ---------------------------------------------------------------------------
let pythonProcess = null;

/**
 * Ensures a Python venv exists, installs transformers + torch, and spawns the
 * python_service.py script inside it. The child process is kept alive for the
 * lifetime of the server and is terminated during graceful shutdown.
 */
function startPythonProcess() {
  // Determine the system Python binary
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';

  // Create the virtual environment if it does not already exist
  const venvPython = process.platform === 'win32'
    ? path.join(PYTHON_VENV_DIR, 'Scripts', 'python.exe')
    : path.join(PYTHON_VENV_DIR, 'bin', 'python3');

  const venvPip = process.platform === 'win32'
    ? path.join(PYTHON_VENV_DIR, 'Scripts', 'pip.exe')
    : path.join(PYTHON_VENV_DIR, 'bin', 'pip');

  if (!fs.existsSync(venvPython)) {
    console.log('Creating Python virtual environment...');
    try {
      execFileSync(pythonBin, ['-m', 'venv', PYTHON_VENV_DIR], {
        timeout: 60000,
        stdio: 'pipe',
      });
      console.log('Python virtual environment created at', PYTHON_VENV_DIR);
    } catch (err) {
      console.error('Failed to create Python venv:', err.message);
      return;
    }
  }

  // Install transformers, torch and huggingface_hub automatically on first run.
  // Set ALLOW_RUNTIME_TRANSFORMERS_INSTALL=false to skip runtime installation
  // (e.g. when the dependencies are preinstalled at build/deploy time).
  const transformersMarker = path.join(PYTHON_VENV_DIR, '.transformers_installed');
  const allowRuntimeInstall = process.env.ALLOW_RUNTIME_TRANSFORMERS_INSTALL !== 'false';
  if (!fs.existsSync(transformersMarker)) {
    if (!allowRuntimeInstall) {
      console.warn(
        'Skipping runtime installation of transformers/torch. ' +
        'Preinstall these dependencies during build/deploy time, or remove ' +
        'ALLOW_RUNTIME_TRANSFORMERS_INSTALL=false to re-enable the automatic installer.'
      );
      console.error('The local LLM feature will be unavailable until the dependencies are installed.');
      return;
    }

    console.log('Installing transformers, torch, and huggingface_hub (this may take a few minutes)...');
    try {
      // Install CPU-only torch first (much smaller than full CUDA torch)
      console.log('Installing PyTorch (CPU-only)...');
      execFileSync(venvPip, [
        'install', 'torch', '--index-url', 'https://download.pytorch.org/whl/cpu',
      ], {
        timeout: 600000, // 10 minutes
        stdio: 'inherit',
      });

      // Install transformers and huggingface_hub
      console.log('Installing transformers and huggingface_hub...');
      execFileSync(venvPip, [
        'install', 'transformers', 'huggingface_hub', 'accelerate',
      ], {
        timeout: 300000, // 5 minutes
        stdio: 'inherit',
      });

      fs.writeFileSync(transformersMarker, new Date().toISOString(), 'utf-8');
      console.log('transformers, torch, and huggingface_hub installed successfully');
    } catch (err) {
      console.error('Failed to install Python dependencies:', err.message);
      console.error('The local LLM feature will be unavailable until the dependencies are installed.');
      return;
    }
  }

  // Spawn the service script inside the venv
  function spawnPython() {
    try {
      const proc = spawn(venvPython, [PYTHON_SERVICE_SCRIPT, String(PYTHON_SERVICE_PORT), MODELS_DIR], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdout.on('data', (data) => {
        console.log(`[python] ${data.toString().trim()}`);
      });

      proc.stderr.on('data', (data) => {
        console.error(`[python] ${data.toString().trim()}`);
      });

      proc.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.warn(`[python] Process exited unexpectedly with code ${code}, restarting...`);
          pythonProcess = null;
          setTimeout(spawnPython, 1000);
        } else {
          console.log(`[python] Process exited with code ${code}`);
          pythonProcess = null;
        }
      });

      proc.on('error', (err) => {
        console.error('[python] Failed to start:', err.message);
        pythonProcess = null;
      });

      pythonProcess = proc;
      console.log('Python LLM service started (pid:', proc.pid + ')');
    } catch (err) {
      console.error('Failed to start Python service:', err.message);
    }
  }

  spawnPython();
}

/**
 * Terminate the Python child process (if running).
 */
function stopPythonProcess() {
  if (pythonProcess) {
    console.log('Stopping Python service...');
    const proc = pythonProcess;
    pythonProcess = null; // Prevent auto-restart in the close handler
    proc.kill('SIGTERM');

    // Force-kill if the process does not exit within 5 seconds
    const killTimer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* already exited */ }
    }, 5000);
    killTimer.unref();

    proc.on('close', () => clearTimeout(killTimer));
  }
}

// Register SIGTERM / SIGINT handlers so all data is persisted before exit
function setupGracefulShutdown(server) {
  let shuttingDown = false;

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n${signal} received. Saving data and shutting down...`);

    // Stop the stale-container cleanup timer
    if (typeof staleContainerCleanupTimer !== 'undefined') {
      clearInterval(staleContainerCleanupTimer);
    }

    // Clear all repo inactivity timers
    for (const entry of repoRegistry.values()) {
      clearTimeout(entry.archiveTimer);
    }

    // Persist data first to guarantee nothing is lost
    saveAllData();

    // Terminate the managed Python process
    stopPythonProcess();

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

/**
 * Asynchronously execute a command and return its output.
 * Uses child_process.spawn to avoid blocking the event loop.
 */
function runCommandAsync(command, args, options = {}) {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      ...options,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        const err = new Error(`Command failed with exit code ${code}: ${stderr || stdout}`);
        err.status = code;
        err.stderr = stderr;
        err.stdout = stdout;
        reject(err);
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });

    if (options.timeout) {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timed out after ${options.timeout}ms`));
      }, options.timeout);
    }
  });
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

    if (!validatePasswordHash(password)) {
      return res.status(400).json({ success: false, error: 'Invalid password format' });
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
    res.status(201).json({ success: true, username: normalizedUsername, token, instanceId: SERVER_INSTANCE_ID });
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

    if (!validatePasswordHash(password)) {
      return res.status(400).json({ success: false, error: 'Invalid password format' });
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
    res.json({ success: true, username: user.username, token, passwordResetRequired: !!user.passwordResetRequired, instanceId: SERVER_INSTANCE_ID });
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

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, error: 'New password is required' });
    }

    if (!validatePasswordHash(newPassword)) {
      return res.status(400).json({ success: false, error: 'Invalid password format' });
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

    // Skip current password verification when admin required a password reset
    if (!user.passwordResetRequired) {
      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({ success: false, error: 'Current password is required' });
      }
      const currentHash = await hashPassword(currentPassword, user.salt);
      if (!timingSafeCompare(currentHash, user.passwordHash)) {
        auditLog({ event: 'PASSWORD_CHANGE_FAILURE', message: 'Current password is incorrect', username: normalizedUsername, req });
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
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

    // Re-encrypt API keys under the new username key.
    // readUserApiKeysSafe returns null when the file exists but cannot be decrypted.
    const apiKeysData = readUserApiKeysSafe(oldUsername);
    const oldApiKeysFile = getUserApiKeysFile(oldUsername);

    if (apiKeysData === null) {
      // File is corrupt / unreadable – abort to avoid data loss
      console.error(`Change-username: failed to read API keys for ${oldUsername}, aborting username change`);
      return res.status(500).json({ success: false, error: 'Failed to migrate API keys. Please try again later.' });
    }

    if (Object.keys(apiKeysData).length > 0) {
      writeUserApiKeys(normalizedNew, apiKeysData);
    }
    // Remove the old file after a successful read (even if it contained no keys)
    if (fs.existsSync(oldApiKeysFile)) {
      fs.unlinkSync(oldApiKeysFile);
    }

    // Re-encrypt persona file under the new username key
    const personasData = readPersonas(oldUsername);
    const oldPersonasFile = getPersonasFile(oldUsername);
    if (personasData.length > 0) {
      writePersonas(normalizedNew, personasData);
    }
    if (fs.existsSync(oldPersonasFile)) {
      fs.unlinkSync(oldPersonasFile);
    }

    // Re-encrypt chat files under the new username key (atomic: separate re-encrypt from delete)
    const oldChatsDir = path.join(CHATS_DIR, path.basename(sanitizeUsernameForPath(oldUsername)));
    const newChatsDir = path.join(CHATS_DIR, path.basename(sanitizeUsernameForPath(normalizedNew)));
    ensureWithinDir(CHATS_DIR, oldChatsDir);
    ensureWithinDir(CHATS_DIR, newChatsDir);
    if (fs.existsSync(oldChatsDir)) {
      fs.mkdirSync(newChatsDir, { recursive: true });
      const chatFiles = fs.readdirSync(oldChatsDir).filter((f) => f.endsWith('.enc'));

      // Phase 1: re-encrypt all files into newChatsDir without deleting originals
      const migratedFiles = [];
      let migrationFailed = false;
      for (const file of chatFiles) {
        const safeFile = path.basename(file);
        const oldPath = path.join(oldChatsDir, safeFile);
        const newPath = path.join(newChatsDir, safeFile);
        ensureWithinDir(oldChatsDir, oldPath);
        ensureWithinDir(newChatsDir, newPath);
        try {
          const encryptedContent = fs.readFileSync(oldPath, 'utf-8');
          const decrypted = decryptData(encryptedContent, oldUsername);
          const reEncrypted = encryptData(decrypted, normalizedNew);
          fs.writeFileSync(newPath, reEncrypted, { encoding: 'utf-8', mode: 0o600 });
          migratedFiles.push({ oldPath, newPath });
        } catch (migrationErr) {
          console.error('Change-username: failed to re-encrypt chat file %s for %s:', file, oldUsername, migrationErr);
          migrationFailed = true;
          break; // stop further attempts to keep behaviour closer to atomic
        }
      }

      if (migrationFailed) {
        // Phase 2 (rollback): remove any newly written files; leave originals intact
        for (const { newPath } of migratedFiles) {
          try { if (fs.existsSync(newPath)) fs.unlinkSync(newPath); } catch (e) {
            console.error('Change-username: rollback failed to remove', newPath, e);
          }
        }
        try {
          if (fs.readdirSync(newChatsDir).length === 0) fs.rmdirSync(newChatsDir);
        } catch { /* ignore */ }
        // Also restore the API keys file we already migrated
        try {
          if (Object.keys(apiKeysData).length > 0) {
            const newApiKeysFile = getUserApiKeysFile(normalizedNew);
            if (fs.existsSync(newApiKeysFile)) fs.unlinkSync(newApiKeysFile);
          }
        } catch { /* ignore */ }
        return res.status(500).json({ success: false, error: 'Failed to migrate chat files. Username change aborted.' });
      }

      // Phase 2 (success): delete originals and clean up old directory
      for (const { oldPath } of migratedFiles) {
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) {
          console.error('Change-username: failed to remove original chat file', oldPath, e);
        }
      }
      try {
        if (fs.readdirSync(oldChatsDir).length === 0) fs.rmdirSync(oldChatsDir);
      } catch { /* ignore */ }
    }

    // Update user record
    users[userIndex] = { ...users[userIndex], username: normalizedNew };
    writeUsers(users);

    // Invalidate old sessions and issue a new token for the renamed user
    invalidateUserSessions(oldUsername);
    userKeyCache.delete(oldUsername);
    const newToken = createSessionToken(normalizedNew);

    // Transfer any password-change cooldown to the new username
    if (passwordChangeCooldowns.has(oldUsername)) {
      passwordChangeCooldowns.set(normalizedNew, passwordChangeCooldowns.get(oldUsername));
      passwordChangeCooldowns.delete(oldUsername);
    }
    usernameChangeCooldowns.set(normalizedNew, Date.now());

    auditLog({ event: 'USERNAME_CHANGED', message: `Username changed from ${oldUsername} to ${normalizedNew}`, username: normalizedNew, req });
    res.json({ success: true, username: normalizedNew, token: newToken, instanceId: SERVER_INSTANCE_ID });
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

    if (!validatePasswordHash(password)) {
      return res.status(400).json({ success: false, error: 'Invalid password format' });
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
    userKeyCache.delete(normalizedUsername);

    // Clean up all Docker containers owned by this user
    deleteAllUserContainers(normalizedUsername);

    // Clean up all Local.LLM repositories owned by this user
    deleteAllUserRepos(normalizedUsername);

    // Clean up personas file
    const personaFile = getPersonasFile(normalizedUsername);
    if (fs.existsSync(personaFile)) {
      fs.unlinkSync(personaFile);
    }

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
// Universes & Characters – Admin management endpoints
// ---------------------------------------------------------------------------


// GET /api/universes – List all universes with characters (names only for non-admin)
app.get('/api/universes', requireSession, (req, res) => {
  try {
    const universes = readUniverses().map((u) => ({
      id: u.id,
      name: u.name,
      characters: (u.characters || []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    }));
    return res.json({ success: true, universes });
  } catch (err) {
    console.error('List universes error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/universes/admin – List all universes with full character details (admin only)
app.post('/api/admin/universes/list', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin universes list attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const universes = readUniverses();
    return res.json({ success: true, universes });
  } catch (err) {
    console.error('Admin list universes error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/universes – Create a new universe
app.post('/api/admin/universes', async (req, res) => {
  try {
    const { adminUsername, adminPassword, name, description } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin create universe attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Universe name is required' });
    }
    if (description != null && typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Universe description must be a string' });
    }

    const universes = readUniverses();
    const universe = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: (description || '').trim(),
      characters: [],
    };
    universes.push(universe);
    writeUniverses(universes);

    auditLog({ event: 'ADMIN_CREATE_UNIVERSE', message: `Admin created universe "${universe.name}"`, username: adminUsername, req });
    return res.status(201).json({ success: true, universe });
  } catch (err) {
    console.error('Admin create universe error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/universes/:id – Update a universe
app.put('/api/admin/universes/:id', async (req, res) => {
  try {
    const { adminUsername, adminPassword, name, description } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin update universe attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Universe name is required' });
    }
    if (description != null && typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Universe description must be a string' });
    }

    const universes = readUniverses();
    const index = universes.findIndex((u) => u.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Universe not found' });
    }

    universes[index] = {
      ...universes[index],
      name: name.trim(),
      description: (description || '').trim(),
    };
    writeUniverses(universes);

    auditLog({ event: 'ADMIN_UPDATE_UNIVERSE', message: `Admin updated universe "${name.trim()}"`, username: adminUsername, req });
    return res.json({ success: true, universe: universes[index] });
  } catch (err) {
    console.error('Admin update universe error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/admin/universes/:id – Delete a universe
app.delete('/api/admin/universes/:id', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin delete universe attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const universes = readUniverses();
    const index = universes.findIndex((u) => u.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Universe not found' });
    }

    const removed = universes.splice(index, 1)[0];
    writeUniverses(universes);

    auditLog({ event: 'ADMIN_DELETE_UNIVERSE', message: `Admin deleted universe "${removed.name}"`, username: adminUsername, req });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete universe error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/universes/:universeId/characters – Create a character in a universe
app.post('/api/admin/universes/:universeId/characters', async (req, res) => {
  try {
    const { adminUsername, adminPassword, name, description } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin create character attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Character name is required' });
    }
    if (description != null && typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Character description must be a string' });
    }

    const universes = readUniverses();
    const universe = universes.find((u) => u.id === req.params.universeId);
    if (!universe) {
      return res.status(404).json({ success: false, error: 'Universe not found' });
    }

    const character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: (description || '').trim(),
    };
    if (!universe.characters) universe.characters = [];
    universe.characters.push(character);
    writeUniverses(universes);

    auditLog({ event: 'ADMIN_CREATE_CHARACTER', message: `Admin created character "${character.name}" in universe "${universe.name}"`, username: adminUsername, req });
    return res.status(201).json({ success: true, character });
  } catch (err) {
    console.error('Admin create character error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/universes/:universeId/characters/:characterId – Update a character
app.put('/api/admin/universes/:universeId/characters/:characterId', async (req, res) => {
  try {
    const { adminUsername, adminPassword, name, description } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin update character attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Character name is required' });
    }
    if (description != null && typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Character description must be a string' });
    }

    const universes = readUniverses();
    const universe = universes.find((u) => u.id === req.params.universeId);
    if (!universe) {
      return res.status(404).json({ success: false, error: 'Universe not found' });
    }

    const characters = universe.characters || [];
    const charIndex = characters.findIndex((c) => c.id === req.params.characterId);
    if (charIndex === -1) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    characters[charIndex] = {
      ...characters[charIndex],
      name: name.trim(),
      description: (description || '').trim(),
    };
    writeUniverses(universes);

    auditLog({ event: 'ADMIN_UPDATE_CHARACTER', message: `Admin updated character "${name.trim()}" in universe "${universe.name}"`, username: adminUsername, req });
    return res.json({ success: true, character: characters[charIndex] });
  } catch (err) {
    console.error('Admin update character error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/admin/universes/:universeId/characters/:characterId – Delete a character
app.delete('/api/admin/universes/:universeId/characters/:characterId', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin delete character attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const universes = readUniverses();
    const universe = universes.find((u) => u.id === req.params.universeId);
    if (!universe) {
      return res.status(404).json({ success: false, error: 'Universe not found' });
    }

    const characters = universe.characters || [];
    const charIndex = characters.findIndex((c) => c.id === req.params.characterId);
    if (charIndex === -1) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    const removed = characters.splice(charIndex, 1)[0];
    writeUniverses(universes);

    auditLog({ event: 'ADMIN_DELETE_CHARACTER', message: `Admin deleted character "${removed.name}" from universe "${universe.name}"`, username: adminUsername, req });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete character error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// App Settings endpoints
// ---------------------------------------------------------------------------

// GET /api/settings/apps – Returns current app settings (requires valid session)
app.get('/api/settings/apps', requireSession, (req, res) => {
  try {
    const settings = readSettings();
    return res.json({ success: true, riskyAppsEnabled: settings.riskyAppsEnabled });
  } catch (err) {
    console.error('Get app settings error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/settings/risky-apps – Enable or disable risky apps (admin only)
app.post('/api/admin/settings/risky-apps', async (req, res) => {
  try {
    const { adminUsername, adminPassword, enabled } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized admin risky-apps settings attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled must be a boolean' });
    }

    const settings = readSettings();
    writeSettings({ ...settings, riskyAppsEnabled: enabled });

    auditLog({ event: 'ADMIN_SET_RISKY_APPS', message: `Admin set riskyAppsEnabled to ${enabled}`, username: adminUsername, req });
    return res.json({ success: true, riskyAppsEnabled: enabled });
  } catch (err) {
    console.error('Admin set risky apps error:', err);
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
// Roleplay Sessions management – Encrypted per-user storage
// ---------------------------------------------------------------------------

function getRoleplayFile(username) {
  const safeUsername = path.basename(sanitizeUsernameForPath(username));
  const filePath = path.join(ROLEPLAY_DIR, `${safeUsername}.enc`);
  return ensureWithinDir(ROLEPLAY_DIR, filePath);
}

function readRoleplaySessions(username) {
  const file = getRoleplayFile(username);
  if (!fs.existsSync(file)) return [];
  try {
    const encrypted = fs.readFileSync(file, 'utf-8');
    return JSON.parse(decryptData(encrypted, username));
  } catch {
    return [];
  }
}

function writeRoleplaySessions(username, sessions) {
  const file = getRoleplayFile(username);
  const encrypted = encryptData(JSON.stringify(sessions), username);
  fs.writeFileSync(file, encrypted, { encoding: 'utf-8', mode: 0o600 });
}

// GET /api/roleplay/sessions – List sessions
app.get('/api/roleplay/sessions', requireSession, (req, res) => {
  try {
    const sessions = readRoleplaySessions(req.sessionUser);
    res.json({ success: true, sessions });
  } catch (err) {
    console.error('List roleplay sessions error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/roleplay/sessions – Create a session
app.post('/api/roleplay/sessions', requireSession, async (req, res) => {
  try {
    const { name, universeId, characterIds, personaId } = req.body;

    if (!name || !universeId) {
      return res.status(400).json({ success: false, error: 'Name and Universe ID are required' });
    }

    const universes = readUniverses();
    const universe = universes.find(u => u.id === universeId);
    if (!universe) {
      return res.status(404).json({ success: false, error: 'Universe not found' });
    }

    const selectedCharacters = (universe.characters || []).filter(c => (characterIds || []).includes(c.id));

    // Bulk generate 100-200 random characters for the universe
    const numRandom = Math.floor(Math.random() * 101) + 100;
    let randomCharacters = [];

    // Attempt to generate character names/jobs via AI
    try {
      const prompt = `Generate ${numRandom} unique background characters for a roleplay session in the "${universe.name}" universe.
Universe Description: ${universe.description || 'A generic setting.'}
Respond ONLY with a JSON array of objects, each with: name, job, role, personality. Ensure they are diverse and fit the universe setting.`;

      const response = await getLLMCompletion(req.sessionUser, [{ role: 'user', content: prompt }]);
      // Clean the response in case it has markdown blocks
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      randomCharacters = JSON.parse(cleanedResponse).map(c => ({
        ...c,
        id: crypto.randomUUID(),
        isGenerated: true
      }));
    } catch (e) {
      console.error('Failed to generate characters via LLM, falling back to simulated ones:', e);
      for (let i = 0; i < numRandom; i++) {
        randomCharacters.push({
          id: crypto.randomUUID(),
          name: `Generated Character ${i + 1}`,
          job: 'Citizen',
          role: 'NPC',
          personality: 'Average',
          isGenerated: true
        });
      }
    }

    const allSessionCharacters = [
      ...selectedCharacters.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        job: c.job || 'Main Character',
        role: c.role || 'Key Figure',
        personality: c.personality || 'Detailed',
        isGenerated: false
      })),
      ...randomCharacters
    ];

    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const sessionName = `${universe.name} - ${timestamp}`;

    const session = {
      id: crypto.randomUUID(),
      name: sessionName,
      universeId,
      universeName: universe.name,
      universeDescription: universe.description,
      personaId: personaId || null,
      characters: allSessionCharacters,
      currentDate: new Date().toISOString().split('T')[0],
      posts: [],
      history: [], // For rewind
      createdAt: new Date().toISOString()
    };

    const sessions = readRoleplaySessions(req.sessionUser);
    sessions.push(session);
    writeRoleplaySessions(req.sessionUser, sessions);

    res.status(201).json({ success: true, session });
  } catch (err) {
    console.error('Create roleplay session error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/roleplay/sessions/:id – Get session
app.get('/api/roleplay/sessions/:id', requireSession, (req, res) => {
  try {
    const sessions = readRoleplaySessions(req.sessionUser);
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/roleplay/sessions/:id/end-day – End the day
app.post('/api/roleplay/sessions/:id/end-day', requireSession, async (req, res) => {
  try {
    const sessions = readRoleplaySessions(req.sessionUser);
    const index = sessions.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Session not found' });

    const session = sessions[index];

    // Save current state to history for rewind
    if (!session.history) session.history = [];
    session.history.push({
      currentDate: session.currentDate,
      posts: [...session.posts]
    });
    // Keep history manageable, e.g., last 30 days
    if (session.history.length > 30) session.history.shift();

    // Increment date
    const date = new Date(session.currentDate);
    date.setDate(date.getDate() + 1);
    session.currentDate = date.toISOString().split('T')[0];

    // Trigger characters to post
    const mainCharacters = session.characters.filter(c => !c.isGenerated);
    const generatedCharacters = session.characters.filter(c => c.isGenerated);

    // Pick 4 random generated characters
    const randomNPCs = [];
    if (generatedCharacters.length > 0) {
      const shuffled = [...generatedCharacters].sort(() => 0.5 - Math.random());
      randomNPCs.push(...shuffled.slice(0, Math.min(4, shuffled.length)));
    }

    const charactersToPost = [...mainCharacters, ...randomNPCs];
    const recentPosts = (session.posts || []).slice(0, 10);
    const userInvolvedThreads = new Set();

    // Check if user replied in the last day's posts
    const lastDayPosts = session.history?.[session.history.length - 1]?.posts || [];
    const lastDayPostIds = new Set(lastDayPosts.map(p => p.id));

    for (const post of (session.posts || [])) {
      if (lastDayPostIds.has(post.id)) {
        const hasUserReply = (post.replies || []).some(r => r.characterId === 'user' || r.personaId);
        if (hasUserReply) userInvolvedThreads.add(post.id);
      }
    }

    // Generate posts via LLM
    try {
      const prompt = `It is currently ${session.currentDate} in the "${session.universeName}" universe.
Setting: ${session.universeDescription || 'N/A'}
The following characters are going to post on a Twitter-like social media platform.
Characters:
${charactersToPost.map(c => `- ${c.name} (Job: ${c.job}, Personality: ${c.personality})`).join('\n')}

Recent feed context:
${recentPosts.map(p => `[${p.characterName}]: ${p.content}`).join('\n')}

Task: Generate one short, Twitter-style post for each character.
Also, for each post, decide if another character should reply to it.
Main characters should only reply to other main characters or to the user's previous posts if the user was involved in that thread.
Respond ONLY with a JSON array of objects: { characterId, content, replyToPostId (optional), replyFromCharacterId (optional), replyContent (optional) }.`;

      const response = await getLLMCompletion(req.sessionUser, [{ role: 'user', content: prompt }]);
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const generatedActions = JSON.parse(cleanedResponse);

      for (const action of generatedActions) {
        const char = charactersToPost.find(c => c.id === action.characterId);
        if (!char) continue;

        const newPostId = crypto.randomUUID();
        const newPost = {
          id: newPostId,
          characterId: char.id,
          characterName: char.name,
          content: action.content,
          timestamp: new Date().toISOString(),
          likes: Math.floor(Math.random() * 20),
          replies: []
        };

        if (action.replyFromCharacterId && action.replyContent) {
          const replyingChar = session.characters.find(c => c.id === action.replyFromCharacterId);
          if (replyingChar) {
            newPost.replies.push({
              id: crypto.randomUUID(),
              characterId: replyingChar.id,
              characterName: replyingChar.name,
              content: action.replyContent,
              timestamp: new Date().toISOString(),
              likes: Math.floor(Math.random() * 10)
            });
          }
        }
        session.posts.unshift(newPost);
      }
    } catch (e) {
      console.error('Failed to generate posts via LLM:', e);
      // Fallback
      for (const char of charactersToPost) {
        session.posts.unshift({
          id: crypto.randomUUID(),
          characterId: char.id,
          characterName: char.name,
          content: `[${session.currentDate}] ${char.name} is active in ${session.universeName}.`,
          timestamp: new Date().toISOString(),
          likes: Math.floor(Math.random() * 5),
          replies: []
        });
      }
    }

    writeRoleplaySessions(req.sessionUser, sessions);
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/roleplay/sessions/:id/post – User creates a post
app.post('/api/roleplay/sessions/:id/post', requireSession, (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, error: 'Content is required' });

    const sessions = readRoleplaySessions(req.sessionUser);
    const index = sessions.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Session not found' });

    const session = sessions[index];

    let authorName = 'You';
    if (session.personaId) {
      const personas = readPersonas(req.sessionUser);
      const persona = personas.find(p => p.id === session.personaId);
      if (persona) authorName = persona.name;
    }

    const newPost = {
      id: crypto.randomUUID(),
      characterId: 'user',
      personaId: session.personaId,
      characterName: authorName,
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: []
    };

    session.posts.unshift(newPost);
    writeRoleplaySessions(req.sessionUser, sessions);
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/roleplay/sessions/:id/reply – User replies to a post
app.post('/api/roleplay/sessions/:id/reply', requireSession, (req, res) => {
  try {
    const { postId, content } = req.body;
    if (!postId || !content) return res.status(400).json({ success: false, error: 'Post ID and Content are required' });

    const sessions = readRoleplaySessions(req.sessionUser);
    const index = sessions.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Session not found' });

    const session = sessions[index];
    const post = session.posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    let authorName = 'You';
    if (session.personaId) {
      const personas = readPersonas(req.sessionUser);
      const persona = personas.find(p => p.id === session.personaId);
      if (persona) authorName = persona.name;
    }

    const reply = {
      id: crypto.randomUUID(),
      characterId: 'user',
      personaId: session.personaId,
      characterName: authorName,
      content,
      timestamp: new Date().toISOString(),
      likes: 0
    };

    if (!post.replies) post.replies = [];
    post.replies.push(reply);

    writeRoleplaySessions(req.sessionUser, sessions);
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/roleplay/sessions/:id/like – User likes a post
app.post('/api/roleplay/sessions/:id/like', requireSession, (req, res) => {
  try {
    const { postId } = req.body;
    const sessions = readRoleplaySessions(req.sessionUser);
    const index = sessions.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Session not found' });

    const session = sessions[index];
    const post = session.posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    post.likes = (post.likes || 0) + 1;

    writeRoleplaySessions(req.sessionUser, sessions);
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/roleplay/sessions/:id/repost – User reposts a post
app.post('/api/roleplay/sessions/:id/repost', requireSession, (req, res) => {
  try {
    const { postId } = req.body;
    const sessions = readRoleplaySessions(req.sessionUser);
    const index = sessions.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Session not found' });

    const session = sessions[index];
    const post = session.posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    let authorName = 'You';
    if (session.personaId) {
      const personas = readPersonas(req.sessionUser);
      const persona = personas.find(p => p.id === session.personaId);
      if (persona) authorName = persona.name;
    }

    const repost = {
      id: crypto.randomUUID(),
      characterId: 'user',
      personaId: session.personaId,
      characterName: authorName,
      content: `RT @${post.characterName}: ${post.content}`,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: []
    };

    session.posts.unshift(repost);

    writeRoleplaySessions(req.sessionUser, sessions);
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/roleplay/sessions/:id/rewind – Rewind a day
app.post('/api/roleplay/sessions/:id/rewind', requireSession, (req, res) => {
  try {
    const sessions = readRoleplaySessions(req.sessionUser);
    const index = sessions.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Session not found' });

    const session = sessions[index];
    if (!session.history || session.history.length === 0) {
      return res.status(400).json({ success: false, error: 'No history to rewind' });
    }

    const prevState = session.history.pop();
    session.currentDate = prevState.currentDate;
    session.posts = prevState.posts;

    writeRoleplaySessions(req.sessionUser, sessions);
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/roleplay/sessions/:id – Delete session
app.delete('/api/roleplay/sessions/:id', requireSession, (req, res) => {
  try {
    const sessions = readRoleplaySessions(req.sessionUser);
    const updated = sessions.filter(s => s.id !== req.params.id);
    writeRoleplaySessions(req.sessionUser, updated);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Personas management – Encrypted per-user storage
// ---------------------------------------------------------------------------

const MAX_PERSONA_NAME_LENGTH = 100;
const MAX_PERSONA_DESCRIPTION_LENGTH = 5000;

function getPersonasFile(username) {
  const safeUsername = path.basename(sanitizeUsernameForPath(username));
  const filePath = path.join(PERSONAS_DIR, `${safeUsername}.enc`);
  return ensureWithinDir(PERSONAS_DIR, filePath);
}

function readPersonas(username) {
  const file = getPersonasFile(username);
  if (!fs.existsSync(file)) return [];
  try {
    const encrypted = fs.readFileSync(file, 'utf-8');
    return JSON.parse(decryptData(encrypted, username));
  } catch {
    return [];
  }
}

function writePersonas(username, personas) {
  const file = getPersonasFile(username);
  const encrypted = encryptData(JSON.stringify(personas), username);
  fs.writeFileSync(file, encrypted, { encoding: 'utf-8', mode: 0o600 });
}

// GET /api/user/personas – List user's personas
app.get('/api/user/personas', requireSession, (req, res) => {
  try {
    const personas = readPersonas(req.sessionUser);
    res.json({ success: true, personas });
  } catch (err) {
    console.error('Get personas error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/user/personas – Create a new persona
app.post('/api/user/personas', requireSession, (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Persona name is required' });
    }
    if (name.trim().length > MAX_PERSONA_NAME_LENGTH) {
      return res.status(400).json({ success: false, error: `Persona name must be at most ${MAX_PERSONA_NAME_LENGTH} characters` });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Persona description is required' });
    }
    if (description.trim().length > MAX_PERSONA_DESCRIPTION_LENGTH) {
      return res.status(400).json({ success: false, error: `Persona description must be at most ${MAX_PERSONA_DESCRIPTION_LENGTH} characters` });
    }

    const personas = readPersonas(req.sessionUser);
    const newPersona = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    personas.push(newPersona);
    writePersonas(req.sessionUser, personas);

    auditLog({ event: 'PERSONA_CREATED', message: `Persona "${newPersona.name}" created`, username: req.sessionUser, req });
    res.status(201).json({ success: true, persona: newPersona });
  } catch (err) {
    console.error('Create persona error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/user/personas/:id – Update a persona
app.put('/api/user/personas/:id', requireSession, (req, res) => {
  try {
    const { name, description } = req.body;
    const personaId = req.params.id;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Persona name is required' });
    }
    if (name.trim().length > MAX_PERSONA_NAME_LENGTH) {
      return res.status(400).json({ success: false, error: `Persona name must be at most ${MAX_PERSONA_NAME_LENGTH} characters` });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Persona description is required' });
    }
    if (description.trim().length > MAX_PERSONA_DESCRIPTION_LENGTH) {
      return res.status(400).json({ success: false, error: `Persona description must be at most ${MAX_PERSONA_DESCRIPTION_LENGTH} characters` });
    }

    const personas = readPersonas(req.sessionUser);
    const index = personas.findIndex((p) => p.id === personaId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Persona not found' });
    }

    personas[index] = {
      ...personas[index],
      name: name.trim(),
      description: description.trim(),
      updatedAt: new Date().toISOString(),
    };
    writePersonas(req.sessionUser, personas);

    auditLog({ event: 'PERSONA_UPDATED', message: `Persona "${name.trim()}" updated`, username: req.sessionUser, req });
    res.json({ success: true, persona: personas[index] });
  } catch (err) {
    console.error('Update persona error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/user/personas/:id – Delete a persona
app.delete('/api/user/personas/:id', requireSession, (req, res) => {
  try {
    const personaId = req.params.id;
    const personas = readPersonas(req.sessionUser);
    const index = personas.findIndex((p) => p.id === personaId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Persona not found' });
    }

    const removed = personas.splice(index, 1)[0];
    writePersonas(req.sessionUser, personas);

    // If default persona is deleted, clear it from user settings
    const user = findUser(req.sessionUser);
    if (user && user.defaultPersonaId === personaId) {
      const users = readUsers();
      const uIndex = users.findIndex(u => u.username === req.sessionUser);
      if (uIndex !== -1) {
        users[uIndex].defaultPersonaId = null;
        writeUsers(users);
      }
    }

    auditLog({ event: 'PERSONA_DELETED', message: `Persona "${removed.name}" deleted`, username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete persona error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/user/settings/default-persona – Set default persona
app.put('/api/user/settings/default-persona', requireSession, (req, res) => {
  try {
    const { personaId } = req.body;
    const personas = readPersonas(req.sessionUser);

    if (personaId && !personas.some(p => p.id === personaId)) {
      return res.status(400).json({ success: false, error: 'Invalid persona ID' });
    }

    const users = readUsers();
    const index = users.findIndex(u => u.username === req.sessionUser);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    users[index].defaultPersonaId = personaId || null;
    writeUsers(users);

    res.json({ success: true });
  } catch (err) {
    console.error('Set default persona error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/user/settings/default-persona – Get default persona ID
app.get('/api/user/settings/default-persona', requireSession, (req, res) => {
  try {
    const user = findUser(req.sessionUser);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, defaultPersonaId: user.defaultPersonaId || null });
  } catch (err) {
    console.error('Get default persona error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// API Keys management – Encrypted per-user storage
// ---------------------------------------------------------------------------

const VALID_PROVIDERS = Object.keys(AI_PROVIDERS);

function getUserApiKeysFile(username) {
  const safeUsername = path.basename(sanitizeUsernameForPath(username));
  const filePath = path.join(DATA_DIR, `apikeys_${safeUsername}.enc`);
  return ensureWithinDir(DATA_DIR, filePath);
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

/**
 * Like readUserApiKeys but distinguishes between "file absent" (returns {})
 * and "file present but unreadable/corrupt" (returns null).
 * Used by change-username to decide whether to abort the migration.
 */
function readUserApiKeysSafe(username) {
  const file = getUserApiKeysFile(username);
  if (!fs.existsSync(file)) return {};
  try {
    const encrypted = fs.readFileSync(file, 'utf-8');
    return JSON.parse(decryptData(encrypted, username));
  } catch {
    return null;
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
// GitHub Integration (Coding Agent)
// ---------------------------------------------------------------------------

// Helper functions for GitHub integration data
function readUserIntegrations(username) {
  const keys = readUserApiKeys(username);
  return keys._integrations || {};
}

function writeUserIntegration(username, integrationId, data) {
  const keys = readUserApiKeys(username);
  if (!keys._integrations) keys._integrations = {};
  keys._integrations[integrationId] = data;
  writeUserApiKeys(username, keys);
}

function removeUserIntegration(username, integrationId) {
  const keys = readUserApiKeys(username);
  if (keys._integrations) {
    delete keys._integrations[integrationId];
    writeUserApiKeys(username, keys);
  }
}

// GET /api/user/integrations/github/status - Check if GitHub token is configured
app.get('/api/user/integrations/github/status', requireSession, (req, res) => {
  try {
    const integrations = readUserIntegrations(req.sessionUser);
    const github = integrations.github;
    res.json({
      success: true,
      configured: !!github?.token,
      username: github?.ghUsername || null,
    });
  } catch (err) {
    console.error('GitHub status error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/user/integrations/github - Save GitHub PAT token
app.put('/api/user/integrations/github', requireSession, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string' || token.length > 500) {
      return res.status(400).json({ success: false, error: 'Valid GitHub token is required' });
    }

    // Validate token by calling GitHub API
    let ghUsername;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const ghRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'LocalLLM-CodingAgent',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!ghRes.ok) {
        return res.status(400).json({ success: false, error: 'Invalid GitHub token. Please check your token and try again.' });
      }

      const ghUser = await ghRes.json();
      ghUsername = ghUser.login;
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ success: false, error: 'GitHub API request timed out' });
      }
      return res.status(502).json({ success: false, error: 'Could not connect to GitHub API' });
    }

    writeUserIntegration(req.sessionUser, 'github', { token, ghUsername });
    auditLog({ event: 'GITHUB_TOKEN_SET', message: `GitHub token configured for ${ghUsername}`, username: req.sessionUser, req });
    res.json({ success: true, username: ghUsername });
  } catch (err) {
    console.error('Set GitHub token error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/user/integrations/github - Remove GitHub token
app.delete('/api/user/integrations/github', requireSession, (req, res) => {
  try {
    removeUserIntegration(req.sessionUser, 'github');
    auditLog({ event: 'GITHUB_TOKEN_REMOVED', message: 'GitHub token removed', username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove GitHub token error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/user/integrations/github/repos - List user's GitHub repositories
app.get('/api/user/integrations/github/repos', requireSession, async (req, res) => {
  try {
    const integrations = readUserIntegrations(req.sessionUser);
    const github = integrations.github;

    if (!github?.token) {
      return res.status(400).json({ success: false, error: 'GitHub token not configured' });
    }

    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.per_page) || 30, 100);
    const search = req.query.search || '';

    let url = `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc&type=all`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const ghRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${github.token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'LocalLLM-CodingAgent',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!ghRes.ok) {
      if (ghRes.status === 401) {
        return res.status(401).json({ success: false, error: 'GitHub token expired or invalid' });
      }
      return res.status(502).json({ success: false, error: 'GitHub API error' });
    }

    let repos = await ghRes.json();

    // Server-side search filtering
    if (search) {
      const lowerSearch = search.toLowerCase();
      repos = repos.filter(r =>
        r.full_name.toLowerCase().includes(lowerSearch) ||
        (r.description && r.description.toLowerCase().includes(lowerSearch))
      );
    }

    const result = repos.map(r => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      private: r.private,
      defaultBranch: r.default_branch,
      language: r.language,
      updatedAt: r.updated_at,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
    }));

    res.json({ success: true, repos: result });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, error: 'GitHub API request timed out' });
    }
    console.error('GitHub repos error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Docker Container Management (Coding Agent)
// ---------------------------------------------------------------------------

const CONTAINERS_DIR = path.join(DATA_DIR, 'containers');
if (!fs.existsSync(CONTAINERS_DIR)) fs.mkdirSync(CONTAINERS_DIR, { recursive: true });

// In-memory container tracking with inactivity timeouts.
// Containers are automatically stopped after 10 minutes of inactivity to
// conserve resources. Activity is refreshed on exec, file read/write, and
// status checks so that actively-used containers remain running.
const containerRegistry = new Map();
const CONTAINER_INACTIVITY_TIMEOUT_MS = parseInt(process.env.CONTAINER_TIMEOUT_MINUTES || '10', 10) * 60 * 1000;
const CONTAINER_STALE_THRESHOLD_MS = parseInt(process.env.CONTAINER_STALE_DAYS || '3', 10) * 24 * 60 * 60 * 1000;
const CONTAINER_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const MAX_EXEC_COMMAND_LENGTH = 2000;
const MAX_ACTIVE_CONTAINERS_PER_WORKSPACE = 3;
const AGENT_EXEC_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for agent terminal commands
const MAX_MEMORY_CONTENT_LENGTH = 2000;
const MAX_MEMORIES_PER_REPO = 50;

// Agent memories directory (per-user, per-repo persistent memories)
const AGENT_MEMORIES_DIR = path.join(DATA_DIR, 'agent_memories');
if (!fs.existsSync(AGENT_MEMORIES_DIR)) fs.mkdirSync(AGENT_MEMORIES_DIR, { recursive: true });

function getAgentMemoriesFile(username, repoKey) {
  const safeUser = path.basename(sanitizeUsernameForPath(username));
  const userDir = path.join(AGENT_MEMORIES_DIR, safeUser);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true, mode: 0o700 });
  const safeRepo = repoKey.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
  const filePath = path.join(userDir, `${safeRepo}.json`);
  return ensureWithinDir(userDir, filePath);
}

function readAgentMemories(username, repoKey) {
  try {
    const file = getAgentMemoriesFile(username, repoKey);
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch { return []; }
}

function writeAgentMemories(username, repoKey, memories) {
  const file = getAgentMemoriesFile(username, repoKey);
  fs.writeFileSync(file, JSON.stringify(memories, null, 2), { mode: 0o600 });
}

function getUserContainersFile(username) {
  const safeUsername = path.basename(sanitizeUsernameForPath(username));
  const filePath = path.join(CONTAINERS_DIR, `${safeUsername}.json`);
  return ensureWithinDir(CONTAINERS_DIR, filePath);
}

function readUserContainers(username) {
  const file = getUserContainersFile(username);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function writeUserContainers(username, containers) {
  const file = getUserContainersFile(username);
  fs.writeFileSync(file, JSON.stringify(containers, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

function touchContainerActivity(containerId) {
  const entry = containerRegistry.get(containerId);
  if (entry) {
    clearTimeout(entry.inactivityTimer);
    entry.lastActivity = Date.now();
    entry.inactivityTimer = setTimeout(() => stopContainerByInactivity(containerId), CONTAINER_INACTIVITY_TIMEOUT_MS);
    // Also refresh the linked repo's inactivity timer if present
    if (entry.localRepoId) {
      touchRepoActivity(entry.localRepoId);
    }
  }
}

async function stopContainerByInactivity(containerId) {
  try {
    const { execFileSync } = require('child_process');
    // containerId here is actually the dockerName from the registry
    const entry = containerRegistry.get(containerId);
    if (entry) {
      execFileSync('docker', ['stop', entry.dockerName], { timeout: 30000 });
      entry.status = 'stopped';
      clearTimeout(entry.inactivityTimer);
    }
    console.log(`Container ${containerId} stopped due to inactivity`);
  } catch (err) {
    console.error(`Failed to stop container ${containerId}:`, err.message);
  }
}

// Helper: check if Docker is available
function isDockerAvailable() {
  try {
    const { execFileSync } = require('child_process');
    execFileSync('docker', ['info'], { timeout: 5000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Delete all Docker containers owned by a user (called on account deletion)
function deleteAllUserContainers(username) {
  const containers = readUserContainers(username);
  const { execFileSync } = require('child_process');

  for (const container of containers) {
    // Remove Docker container
    try {
      execFileSync('docker', ['rm', '-f', container.dockerName], { timeout: 30000 });
    } catch {
      // Container might not exist in Docker
    }

    // Clean up in-memory registry
    const entry = containerRegistry.get(container.id);
    if (entry) {
      clearTimeout(entry.inactivityTimer);
      containerRegistry.delete(container.id);
    }
  }

  // Remove the containers JSON file
  const file = getUserContainersFile(username);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

// Periodically remove containers unused for CONTAINER_STALE_THRESHOLD_MS (default 3 days).
// Runs every hour and checks lastActivity timestamps for all users.
function cleanupStaleContainers() {
  try {
    const files = fs.readdirSync(CONTAINERS_DIR).filter(f => f.endsWith('.json'));
    const now = Date.now();
    const { execFileSync } = require('child_process');

    for (const file of files) {
      const filePath = path.join(CONTAINERS_DIR, file);
      let containers;
      try {
        containers = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        continue;
      }

      if (!Array.isArray(containers)) continue;

      const kept = [];
      for (const container of containers) {
        const lastUsed = container.lastActivity || new Date(container.createdAt).getTime();
        if (now - lastUsed > CONTAINER_STALE_THRESHOLD_MS) {
          // Remove stale container from Docker
          try {
            execFileSync('docker', ['rm', '-f', container.dockerName], { timeout: 30000 });
          } catch {
            // Container might not exist
          }

          // Clean up in-memory registry
          const entry = containerRegistry.get(container.id);
          if (entry) {
            clearTimeout(entry.inactivityTimer);
            containerRegistry.delete(container.id);
          }

          console.log(`Stale container ${container.dockerName} removed (unused for ${Math.round((now - lastUsed) / 86400000)}d)`);
        } else {
          kept.push(container);
        }
      }

      // Update or remove the file
      if (kept.length !== containers.length) {
        if (kept.length === 0) {
          fs.unlinkSync(filePath);
        } else {
          fs.writeFileSync(filePath, JSON.stringify(kept, null, 2), { encoding: 'utf-8', mode: 0o600 });
        }
      }
    }
  } catch (err) {
    console.error('Stale container cleanup error:', err.message);
  }
}

// Start periodic stale-container cleanup
const staleContainerCleanupTimer = setInterval(cleanupStaleContainers, CONTAINER_CLEANUP_INTERVAL_MS);
// Don't let the timer prevent process exit
if (staleContainerCleanupTimer.unref) staleContainerCleanupTimer.unref();

// GET /api/coding-agent/docker/status - Check Docker availability
app.get('/api/coding-agent/docker/status', requireSession, (req, res) => {
  res.json({ success: true, available: isDockerAvailable() });
});

// POST /api/coding-agent/containers - Create and start a container for a repo
app.post('/api/coding-agent/containers', requireSession, async (req, res) => {
  try {
    const { repoFullName, cloneUrl, branch, mode, localRepoId } = req.body;

    // When localRepoId is provided, mount the local bare repo inside the container
    if (localRepoId) {
      // Validate that the repo exists and belongs to the user
      const repos = readUserRepos(req.sessionUser);
      const localRepo = repos.find(r => r.id === localRepoId && r.status === 'active');
      if (!localRepo) {
        return res.status(404).json({ success: false, error: 'Local repository not found or not active' });
      }

      if (!isDockerAvailable()) {
        return res.status(503).json({ success: false, error: 'Docker is not available on this server' });
      }

      // Enforce max active containers per workspace
      const existingContainers = readUserContainers(req.sessionUser);
      const activeForRepo = existingContainers.filter(c => c.localRepoId === localRepoId && c.status !== 'stopped');
      if (activeForRepo.length >= MAX_ACTIVE_CONTAINERS_PER_WORKSPACE) {
        return res.status(409).json({ success: false, error: `Maximum ${MAX_ACTIVE_CONTAINERS_PER_WORKSPACE} active containers per workspace reached` });
      }

      let bareDir;
      try { bareDir = getUserRepoBareDir(req.sessionUser, localRepoId); }
      catch { return res.status(400).json({ success: false, error: 'Invalid local repo ID' }); }

      const containerId = crypto.randomUUID();
      const containerName = `localllm-${sanitizeUsernameForPath(req.sessionUser)}-${containerId.slice(0, 8)}`;

      const initScript = [
        'set -e',
        'mkdir -p /workspace',
        'apt-get update -qq && apt-get install -y -qq git > /dev/null 2>&1',
        'git config --global user.email "localllm@local"',
        'git config --global user.name "LocalLLM"',
        'git clone /bare-repo.git /workspace || true',
        'cd /workspace',
        'if [ -f package.json ]; then npm install --silent 2>/dev/null || true; fi',
        'tail -f /dev/null',
      ].join(' && ');

      try {
        const { execFileSync } = require('child_process');
        const dockerArgs = [
          'run', '-d',
          '--name', containerName,
          '--memory=512m',
          '--cpus=1',
          '--network=bridge',
          '-v', `${bareDir}:/bare-repo.git:rw`,
          'node:20-slim',
          'bash', '-c', initScript,
        ];

        const dockerId = execFileSync('docker', dockerArgs, { timeout: 60000, encoding: 'utf-8' }).trim();

        const containerEntry = {
          id: containerId,
          dockerId: dockerId.slice(0, 12),
          dockerName: containerName,
          repoFullName: localRepo.name,
          branch: localRepo.defaultBranch || 'main',
          mode: mode || 'manual',
          status: 'running',
          createdAt: new Date().toISOString(),
          lastActivity: Date.now(),
          localRepoId,
        };

        containerRegistry.set(containerId, {
          ...containerEntry,
          inactivityTimer: setTimeout(() => stopContainerByInactivity(containerId), CONTAINER_INACTIVITY_TIMEOUT_MS),
        });

        const containers = readUserContainers(req.sessionUser);
        containers.push(containerEntry);
        writeUserContainers(req.sessionUser, containers);

        // Link container back to the local repo
        const repoIdx = repos.findIndex(r => r.id === localRepoId);
        if (repoIdx !== -1) {
          repos[repoIdx].containerId = containerId;
          repos[repoIdx].containerName = containerName;
          writeUserRepos(req.sessionUser, repos);
        }

        auditLog({ event: 'CONTAINER_CREATED', message: `Container created for local repo "${localRepo.name}"`, username: req.sessionUser, req });
        res.json({ success: true, container: containerEntry });
      } catch (dockerErr) {
        console.error('Docker create error (local repo):', dockerErr.message);
        res.status(500).json({ success: false, error: 'Failed to create container' });
      }
      return;
    }

    if (!repoFullName || !cloneUrl || !mode) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!['background', 'manual'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'Invalid mode. Must be "background" or "manual"' });
    }

    // SSRF-safe URL validation for outbound clone request
    const ssrfCheck = await ssrfSafeUrlValidation(cloneUrl);
    if (!ssrfCheck.valid || ssrfCheck.parsed.protocol !== 'https:') {
      const reason = !ssrfCheck.valid ? ssrfCheck.reason : 'Only HTTPS URLs are supported';
      return res.status(400).json({ success: false, error: `Invalid clone URL: ${reason}` });
    }

    if (!isDockerAvailable()) {
      return res.status(503).json({ success: false, error: 'Docker is not available on this server' });
    }

    // Enforce max active containers per workspace
    const existingContainers = readUserContainers(req.sessionUser);
    const activeForRepo = existingContainers.filter(c => c.repoFullName === repoFullName && c.status !== 'stopped');
    if (activeForRepo.length >= MAX_ACTIVE_CONTAINERS_PER_WORKSPACE) {
      return res.status(409).json({ success: false, error: `Maximum ${MAX_ACTIVE_CONTAINERS_PER_WORKSPACE} active containers per workspace reached` });
    }

    // Load GitHub token if configured - used for private repositories
    const integrations = readUserIntegrations(req.sessionUser);
    const gitToken = integrations.github?.token || null;

    const containerId = crypto.randomUUID();
    const containerName = `localllm-${sanitizeUsernameForPath(req.sessionUser)}-${containerId.slice(0, 8)}`;
    const branchName = (branch || 'main').replace(/[^a-zA-Z0-9._/-]/g, '');

    if (!branchName) {
      return res.status(400).json({ success: false, error: 'Invalid branch name' });
    }

    try {
      const { execFileSync } = require('child_process');

      // Build a shell script that conditionally uses a git credential helper when a
      // token is available (private repos). For public repos no token is required.
      // The token is passed via environment variable and never appears in the process
      // argument list or shell history.
      const credentialHelperStep = gitToken
        ? 'git config --global credential.helper \'!f() { echo "password=$GIT_TOKEN"; }; f\''
        : null;
      const b64Branch = Buffer.from(branchName).toString('base64');
      const b64CloneUrl = Buffer.from(cloneUrl).toString('base64');
      const initScript = [
        'set -e',
        'mkdir -p /workspace',
        'apt-get update -qq && apt-get install -y -qq git > /dev/null 2>&1',
        ...(credentialHelperStep ? [credentialHelperStep] : []),
        `git clone --branch "$(echo '${b64Branch}' | base64 -d)" --single-branch "$(echo '${b64CloneUrl}' | base64 -d)" /workspace 2>/dev/null || (echo "ERROR: Failed to clone repository. If this is a private repository, configure a Personal Access Token in Settings." >&2 && exit 1)`,
        'unset GIT_TOKEN',
        'cd /workspace',
        'if [ -f package.json ]; then npm install --silent 2>/dev/null || true; fi',
        'tail -f /dev/null',
      ].join(' && ');

      // Use execFileSync with argument array to prevent shell injection.
      // Only pass GIT_TOKEN env var when a token is available.
      const dockerArgs = [
        'run', '-d',
        '--name', containerName,
        '--memory=512m',
        '--cpus=1',
        '--network=bridge',
        ...(gitToken ? ['-e', `GIT_TOKEN=${gitToken}`] : []),
        'node:20-slim',
        'bash', '-c', initScript,
      ];

      const dockerId = execFileSync('docker', dockerArgs, { timeout: 60000, encoding: 'utf-8' }).trim();

      // Track container
      const containerEntry = {
        id: containerId,
        dockerId: dockerId.slice(0, 12),
        dockerName: containerName,
        repoFullName,
        branch: branchName,
        mode,
        status: 'running',
        createdAt: new Date().toISOString(),
        lastActivity: Date.now(),
      };

      containerRegistry.set(containerId, {
        ...containerEntry,
        inactivityTimer: setTimeout(() => stopContainerByInactivity(containerId), CONTAINER_INACTIVITY_TIMEOUT_MS),
      });

      // Persist to disk
      const containers = readUserContainers(req.sessionUser);
      containers.push(containerEntry);
      writeUserContainers(req.sessionUser, containers);

      auditLog({ event: 'CONTAINER_CREATED', message: `Container created for ${repoFullName} (${mode})`, username: req.sessionUser, req });
      res.json({ success: true, container: containerEntry });
    } catch (dockerErr) {
      console.error('Docker create error:', dockerErr.message);
      res.status(500).json({ success: false, error: 'Failed to create container' });
    }
  } catch (err) {
    console.error('Container create error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/coding-agent/containers - List user's containers
app.get('/api/coding-agent/containers', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    // Update status from registry
    const updated = containers.map(c => {
      const entry = containerRegistry.get(c.id);
      return { ...c, status: entry?.status || c.status };
    });
    res.json({ success: true, containers: updated });
  } catch (err) {
    console.error('List containers error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/coding-agent/containers/:id - Get container status
app.get('/api/coding-agent/containers/:id', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    const entry = containerRegistry.get(container.id);
    container.status = entry?.status || container.status;

    touchContainerActivity(container.id);
    res.json({ success: true, container });
  } catch (err) {
    console.error('Get container error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/coding-agent/containers/:id/stop - Stop a container
app.post('/api/coding-agent/containers/:id/stop', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    try {
      const { execFileSync } = require('child_process');
      execFileSync('docker', ['stop', container.dockerName], { timeout: 30000 });
    } catch {
      // Container might already be stopped
    }

    const entry = containerRegistry.get(container.id);
    if (entry) {
      clearTimeout(entry.inactivityTimer);
      entry.status = 'stopped';
    }

    // Update stored data
    const idx = containers.findIndex(c => c.id === req.params.id);
    if (idx !== -1) {
      containers[idx].status = 'stopped';
      writeUserContainers(req.sessionUser, containers);
    }

    auditLog({ event: 'CONTAINER_STOPPED', message: `Container stopped for ${container.repoFullName}`, username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Stop container error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/coding-agent/containers/:id/start - Restart a stopped container
app.post('/api/coding-agent/containers/:id/start', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    try {
      const { execFileSync } = require('child_process');
      execFileSync('docker', ['start', container.dockerName], { timeout: 30000 });
    } catch (dockerErr) {
      return res.status(500).json({ success: false, error: 'Failed to start container' });
    }

    // Re-register in memory
    containerRegistry.set(container.id, {
      ...container,
      status: 'running',
      lastActivity: Date.now(),
      inactivityTimer: setTimeout(() => stopContainerByInactivity(container.id), CONTAINER_INACTIVITY_TIMEOUT_MS),
    });

    const idx = containers.findIndex(c => c.id === req.params.id);
    if (idx !== -1) {
      containers[idx].status = 'running';
      writeUserContainers(req.sessionUser, containers);
    }

    auditLog({ event: 'CONTAINER_STARTED', message: `Container restarted for ${container.repoFullName}`, username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Start container error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/coding-agent/containers/:id/exec - Execute a command in a container
app.post('/api/coding-agent/containers/:id/exec', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    const { command } = req.body;
    if (!command || typeof command !== 'string' || command.length > MAX_EXEC_COMMAND_LENGTH) {
      return res.status(400).json({ success: false, error: 'Invalid command' });
    }

    touchContainerActivity(container.id);

    try {
      const { execFileSync } = require('child_process');
      // Use docker exec with explicit arguments; pass command via base64 to avoid
      // any shell metacharacter issues on the outer shell. Inside the container,
      // bash -c executes the decoded command.
      const b64Cmd = Buffer.from(command).toString('base64');
      const output = execFileSync('docker', [
        'exec', container.dockerName,
        'bash', '-c', `cd /workspace && echo '${b64Cmd}' | base64 -d | bash`,
      ], {
        timeout: 30000,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
      });
      res.json({ success: true, output });
    } catch (execErr) {
      res.json({ success: true, output: execErr.stderr || execErr.stdout || execErr.message, exitCode: execErr.status || 1 });
    }
  } catch (err) {
    console.error('Exec container error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/coding-agent/containers/:id/files - List files in container
app.get('/api/coding-agent/containers/:id/files', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    const dirPath = typeof req.query.path === 'string' ? req.query.path : '.';
    // Sanitize path: block traversal and absolute paths
    if (dirPath.includes('..') || path.isAbsolute(dirPath)) {
      return res.status(400).json({ success: false, error: 'Invalid path' });
    }

    touchContainerActivity(container.id);

    try {
      const { execFileSync } = require('child_process');
      const b64DirPath = Buffer.from(dirPath).toString('base64');
      const output = execFileSync('docker', [
        'exec', container.dockerName,
        'bash', '-c', `cd /workspace && find "$(echo '${b64DirPath}' | base64 -d)" -maxdepth 1 -printf '%y %p\\n' 2>/dev/null | head -500`,
      ], { timeout: 10000, encoding: 'utf-8' });

      const files = output.trim().split('\n').filter(Boolean).map(line => {
        const type = line.charAt(0);
        const name = line.substring(2);
        return { name, type: type === 'd' ? 'directory' : 'file' };
      }).filter(f => f.name !== dirPath);

      res.json({ success: true, files });
    } catch (execErr) {
      res.json({ success: true, files: [] });
    }
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/coding-agent/containers/:id/file - Read a file from container
app.get('/api/coding-agent/containers/:id/file', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    const filePath = typeof req.query.path === 'string' ? req.query.path : '';
    if (!filePath || filePath.includes('..') || path.isAbsolute(filePath)) {
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }

    touchContainerActivity(container.id);

    try {
      const { execFileSync } = require('child_process');
      const content = execFileSync('docker', [
        'exec', container.dockerName,
        'cat', `/workspace/${filePath}`,
      ], { timeout: 10000, encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 });
      res.json({ success: true, content });
    } catch {
      res.status(404).json({ success: false, error: 'File not found or too large' });
    }
  } catch (err) {
    console.error('Read file error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/coding-agent/containers/:id/file - Write a file in container
app.put('/api/coding-agent/containers/:id/file', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    const { path: filePath, content } = req.body;
    if (!filePath || filePath.includes('..') || path.isAbsolute(filePath) || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid file path or content' });
    }

    if (content.length > 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File content too large (max 1MB)' });
    }

    touchContainerActivity(container.id);

    try {
      const { execFileSync } = require('child_process');
      // Write content via base64 piped to base64 -d; using execFileSync avoids outer shell injection
      const b64Content = Buffer.from(content).toString('base64');
      execFileSync('docker', [
        'exec', container.dockerName,
        'bash', '-c', `echo '${b64Content}' | base64 -d > '/workspace/${filePath}'`,
      ], { timeout: 10000 });
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to write file' });
    }
  } catch (err) {
    console.error('Write file error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/coding-agent/containers/:id - Remove a container
app.delete('/api/coding-agent/containers/:id', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    try {
      const { execFileSync } = require('child_process');
      execFileSync('docker', ['rm', '-f', container.dockerName], { timeout: 30000 });
    } catch {
      // Container might not exist
    }

    const entry = containerRegistry.get(container.id);
    if (entry) {
      clearTimeout(entry.inactivityTimer);
      containerRegistry.delete(container.id);
    }

    const updated = containers.filter(c => c.id !== req.params.id);
    writeUserContainers(req.sessionUser, updated);

    auditLog({ event: 'CONTAINER_REMOVED', message: `Container removed for ${container.repoFullName}`, username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove container error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/coding-agent/containers/:id/agent-exec - Execute command with 10-min timeout for AI agent
app.post('/api/coding-agent/containers/:id/agent-exec', requireSession, (req, res) => {
  try {
    const containers = readUserContainers(req.sessionUser);
    const container = containers.find(c => c.id === req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    const { command } = req.body;
    if (!command || typeof command !== 'string' || command.length > MAX_EXEC_COMMAND_LENGTH) {
      return res.status(400).json({ success: false, error: 'Invalid command' });
    }

    touchContainerActivity(container.id);

    try {
      const { execFileSync } = require('child_process');
      const b64Cmd = Buffer.from(command).toString('base64');
      const output = execFileSync('docker', [
        'exec', container.dockerName,
        'bash', '-c', `cd /workspace && echo '${b64Cmd}' | base64 -d | bash`,
      ], {
        timeout: AGENT_EXEC_TIMEOUT_MS,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
      });
      res.json({ success: true, output });
    } catch (execErr) {
      const timedOut = execErr.killed || (execErr.signal === 'SIGTERM');
      res.json({
        success: true,
        output: (execErr.stderr || execErr.stdout || execErr.message) + (timedOut ? '\n[Command timed out after 10 minutes]' : ''),
        exitCode: execErr.status || 1,
        timedOut,
      });
    }
  } catch (err) {
    console.error('Agent exec error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/coding-agent/memories - List memories for a repository
app.get('/api/coding-agent/memories', requireSession, (req, res) => {
  try {
    const repoKey = typeof req.query.repo === 'string' ? req.query.repo : '';
    if (!repoKey) {
      return res.status(400).json({ success: false, error: 'Missing repo query parameter' });
    }
    const memories = readAgentMemories(req.sessionUser, repoKey);
    res.json({ success: true, memories });
  } catch (err) {
    console.error('Read memories error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/coding-agent/memories - Add a memory
app.post('/api/coding-agent/memories', requireSession, (req, res) => {
  try {
    const { repo, content } = req.body;
    if (!repo || !content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing repo or content' });
    }
    if (content.length > MAX_MEMORY_CONTENT_LENGTH) {
      return res.status(400).json({ success: false, error: `Memory content too long (max ${MAX_MEMORY_CONTENT_LENGTH} chars)` });
    }
    const memories = readAgentMemories(req.sessionUser, repo);
    if (memories.length >= MAX_MEMORIES_PER_REPO) {
      return res.status(409).json({ success: false, error: `Maximum ${MAX_MEMORIES_PER_REPO} memories per repository reached` });
    }
    const memory = { id: crypto.randomUUID(), content, createdAt: new Date().toISOString() };
    memories.push(memory);
    writeAgentMemories(req.sessionUser, repo, memories);
    res.json({ success: true, memory });
  } catch (err) {
    console.error('Create memory error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/coding-agent/memories/:id - Delete a memory
app.delete('/api/coding-agent/memories/:id', requireSession, (req, res) => {
  try {
    const repoKey = typeof req.query.repo === 'string' ? req.query.repo : '';
    if (!repoKey) {
      return res.status(400).json({ success: false, error: 'Missing repo query parameter' });
    }
    const memories = readAgentMemories(req.sessionUser, repoKey);
    const idx = memories.findIndex(m => m.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }
    memories.splice(idx, 1);
    writeAgentMemories(req.sessionUser, repoKey, memories);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete memory error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Local.LLM Repository Management
// ---------------------------------------------------------------------------

const REPOS_DIR = path.join(DATA_DIR, 'repositories');
if (!fs.existsSync(REPOS_DIR)) fs.mkdirSync(REPOS_DIR, { recursive: true });

// Per-repository max size (1 GB) and per-user total max (10 GB)
const REPO_MAX_SIZE_BYTES = parseInt(process.env.REPO_MAX_SIZE_BYTES || String(1073741824), 10);
const USER_MAX_STORAGE_BYTES = parseInt(process.env.USER_MAX_STORAGE_BYTES || String(10737418240), 10);

// After 60 minutes of no git activity the repo is automatically archived
const REPO_INACTIVITY_MS = parseInt(process.env.REPO_INACTIVITY_MINUTES || '60', 10) * 60 * 1000;

// Valid repo name: letters, digits, hyphens, underscores, dots; 1–100 chars
const REPO_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,98}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

// ---------------------------------------------------------------------------
// Web SEO App Management
// ---------------------------------------------------------------------------

const WEB_SEO_DIR = path.join(DATA_DIR, 'web_seo');
if (!fs.existsSync(WEB_SEO_DIR)) fs.mkdirSync(WEB_SEO_DIR, { recursive: true });

function getUserWebSeoFile(username) {
  const safeUsername = path.basename(sanitizeUsernameForPath(username));
  const filePath = path.join(WEB_SEO_DIR, `${safeUsername}.json`);
  return ensureWithinDir(WEB_SEO_DIR, filePath);
}

function readUserWebSeo(username) {
  const file = getUserWebSeoFile(username);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function writeUserWebSeo(username, apps) {
  const file = getUserWebSeoFile(username);
  fs.writeFileSync(file, JSON.stringify(apps, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

// GET /api/web-seo/apps - List user's SEO apps
app.get('/api/web-seo/apps', requireSession, (req, res) => {
  try {
    const apps = readUserWebSeo(req.sessionUser);
    res.json({ success: true, apps });
  } catch (err) {
    console.error('List SEO apps error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/web-seo/apps - Create a new SEO app
app.post('/api/web-seo/apps', requireSession, async (req, res) => {
  try {
    const { name, type, url, repoFullName, cloneUrl, buildCommand, startCommand } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Name and type are required' });
    }

    if (type === 'url') {
      if (!url) {
        return res.status(400).json({ success: false, error: 'URL is required for URL type' });
      }
      const ssrfCheck = await ssrfSafeUrlValidation(url);
      if (!ssrfCheck.valid || (ssrfCheck.parsed.protocol !== 'http:' && ssrfCheck.parsed.protocol !== 'https:')) {
        const reason = !ssrfCheck.valid ? ssrfCheck.reason : 'Only HTTP/HTTPS URLs are supported';
        return res.status(400).json({ success: false, error: `Invalid URL: ${reason}` });
      }
    }

    if (type === 'repo') {
      if (!repoFullName || !cloneUrl) {
        return res.status(400).json({ success: false, error: 'Repo details are required for repo type' });
      }
      const ssrfCheck = await ssrfSafeUrlValidation(cloneUrl);
      if (!ssrfCheck.valid || ssrfCheck.parsed.protocol !== 'https:') {
        const reason = !ssrfCheck.valid ? ssrfCheck.reason : 'Only HTTPS URLs are supported';
        return res.status(400).json({ success: false, error: `Invalid clone URL: ${reason}` });
      }
    }

    const apps = readUserWebSeo(req.sessionUser);
    const newApp = {
      id: crypto.randomUUID(),
      name,
      type,
      url: url || null,
      repoFullName: repoFullName || null,
      cloneUrl: cloneUrl || null,
      buildCommand: buildCommand || null,
      startCommand: startCommand || null,
      createdAt: new Date().toISOString(),
      lastCheck: null,
    };

    apps.push(newApp);
    writeUserWebSeo(req.sessionUser, apps);

    auditLog({ event: 'SEO_APP_CREATED', message: `SEO app "${name}" created`, username: req.sessionUser, req });
    res.status(201).json({ success: true, app: newApp });
  } catch (err) {
    console.error('Create SEO app error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/web-seo/apps/:id - Delete an SEO app
app.delete('/api/web-seo/apps/:id', requireSession, (req, res) => {
  try {
    const apps = readUserWebSeo(req.sessionUser);
    const updated = apps.filter(a => a.id !== req.params.id);
    writeUserWebSeo(req.sessionUser, updated);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete SEO app error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/web-seo/check/:id - Run SEO check for an app
app.post('/api/web-seo/check/:id', requireSession, async (req, res) => {
  let containerName = null;
  try {
    const apps = readUserWebSeo(req.sessionUser);
    const appEntry = apps.find(a => a.id === req.params.id);
    if (!appEntry) {
      return res.status(404).json({ success: false, error: 'SEO app not found' });
    }

    if (!isDockerAvailable()) {
      return res.status(503).json({ success: false, error: 'Docker is not available' });
    }

    const checkId = crypto.randomUUID();
    containerName = `seo-check-${sanitizeUsernameForPath(req.sessionUser)}-${checkId.slice(0, 8)}`;

    // Start SSE for progress updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendProgress = (step, message, status = 'running') => {
      sendSSE(res, 'progress', { step, message, status });
    };

    sendProgress('init', 'Starting SEO check container...');

    // We use playwright image which has browsers pre-installed
    const dockerArgs = [
      'run', '-d',
      '--name', containerName,
      '--memory=1.5g',
      '--cpus=1',
      '--network=bridge',
      'mcr.microsoft.com/playwright:v1.45.0-jammy',
      'bash', '-c', 'mkdir -p /workspace && tail -f /dev/null'
    ];

    await runCommandAsync('docker', dockerArgs, { timeout: 120000 });

    // Environment setup
    sendProgress('setup', 'Setting up analysis environment...');
    try {
      await runCommandAsync('docker', ['exec', containerName, 'bash', '-c', 'apt-get update -qq && apt-get install -y -qq git curl > /dev/null 2>&1'], { timeout: 60000 });
    } catch (setupErr) {
      console.warn('Environment setup warning (some tools might be missing):', setupErr.message);
    }

    let targetUrl = appEntry.url;

    if (appEntry.type === 'repo') {
      sendProgress('clone', `Cloning repository ${appEntry.repoFullName}...`);

      const integrations = readUserIntegrations(req.sessionUser);
      const gitToken = integrations.github?.token || null;

      const cloneCmd = gitToken
        ? `git config --global credential.helper '!f() { echo "password=$GIT_TOKEN"; }; f' && git clone "${appEntry.cloneUrl}" /workspace`
        : `git clone "${appEntry.cloneUrl}" /workspace`;

      const cloneArgs = [
        'exec',
        ...(gitToken ? ['-e', `GIT_TOKEN=${gitToken}`] : []),
        containerName,
        'bash', '-c', cloneCmd
      ];

      try {
        await runCommandAsync('docker', cloneArgs, { timeout: 120000 });
      } catch (err) {
        throw new Error(`Failed to clone repository: ${err.message}`);
      }

      if (appEntry.buildCommand) {
        sendProgress('build', `Running build command: ${appEntry.buildCommand}...`);
        const b64Build = Buffer.from(appEntry.buildCommand).toString('base64');
        await runCommandAsync('docker', ['exec', containerName, 'bash', '-c', `cd /workspace && echo '${b64Build}' | base64 -d | bash`], { timeout: 300000 });
      }

      sendProgress('start', `Starting application: ${appEntry.startCommand}...`);
      const b64Start = Buffer.from(appEntry.startCommand).toString('base64');
      await runCommandAsync('docker', ['exec', '-d', containerName, 'bash', '-c', `cd /workspace && echo '${b64Start}' | base64 -d | bash`], { timeout: 30000 });

      sendProgress('wait', 'Waiting for application to respond...');
      let ready = false;
      for (let i = 0; i < 30; i++) {
        try {
          await runCommandAsync('docker', ['exec', containerName, 'curl', '-s', 'http://localhost:3000'], { timeout: 2000 });
          ready = true;
          targetUrl = 'http://localhost:3000';
          break;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!ready) {
        const ports = [8080, 5173, 4200, 3001];
        for (const port of ports) {
          try {
            await runCommandAsync('docker', ['exec', containerName, 'curl', '-s', `http://localhost:${port}`], { timeout: 2000 });
            ready = true;
            targetUrl = `http://localhost:${port}`;
            break;
          } catch {}
        }
      }

      if (!ready) {
        throw new Error('Application failed to start or is not responding on common ports (3000, 8080, 5173, 4200).');
      }
    }

    sendProgress('analyze', 'Installing Playwright and analyzing page...');

    const playwrightScript = `
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const metrics = [];
  page.on('metrics', m => metrics.push(m));

  try {
    await page.goto('${targetUrl}', { waitUntil: 'networkidle', timeout: 30000 });

    const title = await page.title();
    const html = await page.content();
    const screenshot = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 60 });
    const screenshotB64 = screenshot.toString('base64');

    const seoData = await page.evaluate(() => {
      const getMeta = (name) => document.querySelector(\`meta[name="\${name}"], meta[property="\${name}"]\`)?.content;
      return {
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText),
        description: getMeta('description') || getMeta('og:description'),
        keywords: getMeta('keywords'),
        robots: getMeta('robots'),
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        altTexts: Array.from(document.querySelectorAll('img')).map(img => ({ src: img.src, alt: img.alt })),
        links: Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText })),
      };
    });

    let robotsTxt = null;
    try {
      const baseUrl = new URL('${targetUrl}').origin;
      const robotsRes = await page.request.get(\`\${baseUrl}/robots.txt\`);
      if (robotsRes.ok()) robotsTxt = await robotsRes.text();
    } catch {}

    console.log(JSON.stringify({
      success: true,
      title,
      seoData,
      robotsTxt,
      metrics: metrics[metrics.length - 1],
      screenshot: screenshotB64,
      html: html.slice(0, 50000)
    }));

  } catch (err) {
    console.log(JSON.stringify({ success: false, error: err.message }));
  } finally {
    await browser.close();
  }
})();
`;
    const b64Script = Buffer.from(playwrightScript).toString('base64');
    const playwrightResultRaw = await runCommandAsync('docker', ['exec', containerName, 'bash', '-c', `npm install playwright-core@1.45.0 > /dev/null 2>&1 && echo '${b64Script}' | base64 -d > /tmp/check.js && node /tmp/check.js`], { timeout: 120000 });

    let playwrightResult;
    try {
      playwrightResult = JSON.parse(playwrightResultRaw);
    } catch (e) {
      throw new Error('Failed to parse Playwright results');
    }

    if (!playwrightResult.success) {
      throw new Error(`Playwright analysis failed: ${playwrightResult.error}`);
    }

    sendProgress('ai', 'Generating AI SEO report...');

    const keys = readUserApiKeys(req.sessionUser);
    let selectedProvider = null;
    let selectedModel = null;

    const visionModels = ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'gpt-4-turbo'];

    for (const [pId, pConfig] of Object.entries(AI_PROVIDERS)) {
      if (keys[pId]?.apiKey) {
        const model = keys[pId].selectedModel;
        if (model && visionModels.some(vm => model.toLowerCase().includes(vm))) {
          selectedProvider = pId;
          selectedModel = model;
          break;
        }
      }
    }

    if (!selectedProvider) {
      for (const [pId, pConfig] of Object.entries(AI_PROVIDERS)) {
        if (keys[pId]?.apiKey) {
          selectedProvider = pId;
          selectedModel = keys[pId].selectedModel;
          break;
        }
      }
    }

    if (!selectedProvider) {
      const kobold = await checkKoboldStatus();
      if (kobold.available) {
        selectedProvider = 'kobold';
        selectedModel = kobold.model;
      } else {
        const ollama = await checkOllamaStatus();
        if (ollama.available && ollama.models.length > 0) {
          selectedProvider = 'ollama';
          selectedModel = ollama.models[0];
        }
      }
    }

    if (!selectedProvider) {
      throw new Error('No AI provider configured for SEO analysis');
    }

    const visionAvailable = visionModels.some(vm => selectedModel?.toLowerCase().includes(vm));

    const analysisPrompt = `You are an expert SEO auditor. Analyze the following website data and provide a structured SEO report.
Website Title: ${playwrightResult.title}
SEO Metadata: ${JSON.stringify(playwrightResult.seoData)}
Robots.txt: ${playwrightResult.robotsTxt || 'Not found'}
Performance Metrics: ${JSON.stringify(playwrightResult.metrics)}

${!visionAvailable ? 'NOTE: You do not have vision capabilities, so analyze the HTML and metadata provided.' : 'Analyze the attached screenshot for visual SEO, UI/UX consistency, and mobile friendliness.'}

Provide your response in JSON format with the following keys:
- totalScore: (0-100)
- categories: { performance: score, accessibility: score, bestPractices: score, seo: score } (all 0-100)
- summary: (brief overview)
- findings: [ { category, type: 'error'|'warning'|'success', message, suggestion } ]
- visionWarning: (boolean, true if vision was needed but unavailable)

Ensure the JSON is valid and only return the JSON block.`;

    const analysisMessages = [
      { role: 'system', content: 'You are an SEO analysis AI. Respond only with valid JSON.' },
      {
        role: 'user',
        content: visionAvailable ? [
          { type: 'text', text: analysisPrompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${playwrightResult.screenshot}` } }
        ] : analysisPrompt
      }
    ];

    // Helper to capture LLM output
    let fullAiResponse = '';
    const mockRes = {
      writable: true,
      write: (data) => {
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.content) fullAiResponse += parsed.content;
            } catch {}
          }
        }
      },
      end: () => {},
      setHeader: () => {},
      flushHeaders: () => {},
      finished: false,
      destroyed: false
    };

    // Call the appropriate streaming function based on provider
    let aiReport;
    try {
      const providerConfig = AI_PROVIDERS[selectedProvider];
      const pKeys = keys[selectedProvider];

      if (selectedProvider === 'kobold') {
        await streamFromKobold(mockRes, analysisMessages, {}, null);
      } else if (selectedProvider === 'ollama') {
        await streamFromOllama(mockRes, analysisMessages, selectedModel, {}, null);
      } else if (selectedProvider === 'anthropic') {
        await streamFromAnthropic(mockRes, analysisMessages, pKeys.apiKey, selectedModel, {}, null);
      } else if (selectedProvider === 'google') {
        await streamFromGoogle(mockRes, analysisMessages, pKeys.apiKey, selectedModel, {}, null);
      } else {
        await streamFromOpenAICompatible(mockRes, analysisMessages, pKeys.apiKey, providerConfig.baseUrl, providerConfig.chatEndpoint, selectedModel, {}, null);
      }

      // Extract JSON from response (sometimes models wrap in markdown blocks)
      const jsonMatch = fullAiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiReport = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI failed to return a valid JSON report');
      }
    } catch (aiErr) {
      console.error('AI Analysis failed:', aiErr);
      // Minimal fallback report if AI fails
      aiReport = {
        totalScore: 0,
        categories: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
        summary: "AI analysis failed to generate a report.",
        findings: [{ category: "System", type: "error", message: "AI Analysis failed", suggestion: aiErr.message }],
        visionWarning: false
      };
    }

    // Save result
    appEntry.lastCheck = {
      id: checkId,
      timestamp: new Date().toISOString(),
      report: aiReport,
      screenshot: playwrightResult.screenshot
    };
    writeUserWebSeo(req.sessionUser, apps);

    sendProgress('done', 'SEO check completed successfully!', 'completed');
    sendSSE(res, 'result', { report: aiReport, screenshot: playwrightResult.screenshot });
    res.end();

  } catch (err) {
    console.error('SEO check error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      sendSSE(res, 'error', { error: err.message });
      res.end();
    }
  } finally {
    if (containerName) {
      try {
        const { execFileSync } = require('child_process');
        execFileSync('docker', ['rm', '-f', containerName], { timeout: 30000 });
      } catch (e) {}
    }
  }
});

// In-memory registry: repoId -> { archiveTimer, lastActivity, username }
const repoRegistry = new Map();

function getUserReposDir(username) {
  const safe = path.basename(sanitizeUsernameForPath(username));
  const dir = path.join(REPOS_DIR, safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return ensureWithinDir(REPOS_DIR, dir);
}

function getUserReposMetaFile(username) {
  const safe = path.basename(sanitizeUsernameForPath(username));
  return ensureWithinDir(REPOS_DIR, path.join(REPOS_DIR, `${safe}.json`));
}

function readUserRepos(username) {
  const file = getUserReposMetaFile(username);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return []; }
}

function writeUserRepos(username, repos) {
  const file = getUserReposMetaFile(username);
  fs.writeFileSync(file, JSON.stringify(repos, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

function getUserRepoBareDir(username, repoId) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(repoId)) {
    throw new Error('Invalid repo ID');
  }
  const userDir = getUserReposDir(username);
  return ensureWithinDir(userDir, path.join(userDir, `${repoId}.git`));
}

function getUserRepoArchivePath(username, repoId) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(repoId)) {
    throw new Error('Invalid repo ID');
  }
  const userDir = getUserReposDir(username);
  return ensureWithinDir(userDir, path.join(userDir, `${repoId}.tar.gz`));
}

function getUserStorageBytes(username) {
  try {
    const { execFileSync } = require('child_process');
    const userDir = path.join(REPOS_DIR, path.basename(sanitizeUsernameForPath(username)));
    if (!fs.existsSync(userDir)) return 0;
    const out = execFileSync('du', ['-sb', userDir], { encoding: 'utf-8', timeout: 15000 });
    return parseInt(out.split('\t')[0], 10) || 0;
  } catch { return 0; }
}

function getRepoBytesOnDisk(username, repoId) {
  try {
    const { execFileSync } = require('child_process');
    let target;
    try { target = getUserRepoBareDir(username, repoId); } catch { return 0; }
    if (!fs.existsSync(target)) {
      try { target = getUserRepoArchivePath(username, repoId); } catch { return 0; }
    }
    if (!fs.existsSync(target)) return 0;
    const out = execFileSync('du', ['-sb', target], { encoding: 'utf-8', timeout: 10000 });
    return parseInt(out.split('\t')[0], 10) || 0;
  } catch { return 0; }
}

function isGitAvailable() {
  try {
    const { execFileSync } = require('child_process');
    execFileSync('git', ['--version'], { timeout: 5000, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Repository inactivity timer
// ---------------------------------------------------------------------------

function touchRepoActivity(repoId) {
  const entry = repoRegistry.get(repoId);
  if (entry) {
    clearTimeout(entry.archiveTimer);
    entry.lastActivity = Date.now();
    entry.archiveTimer = setTimeout(() => archiveRepoByInactivity(repoId), REPO_INACTIVITY_MS);
  }
}

function registerRepoInMemory(username, repoId) {
  const existing = repoRegistry.get(repoId);
  if (existing) clearTimeout(existing.archiveTimer);
  repoRegistry.set(repoId, {
    username,
    lastActivity: Date.now(),
    archiveTimer: setTimeout(() => archiveRepoByInactivity(repoId), REPO_INACTIVITY_MS),
  });
}

async function archiveRepoByInactivity(repoId) {
  console.log(`Archiving repo ${repoId} due to inactivity`);
  const entry = repoRegistry.get(repoId);
  if (!entry) return;
  try { await performArchiveRepo(entry.username, repoId); }
  catch (err) { console.error(`Failed to archive repo ${repoId}:`, err.message); }
}

// Load active repos into memory at startup
function loadReposIntoRegistry() {
  try {
    const files = fs.readdirSync(REPOS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const repos = JSON.parse(fs.readFileSync(path.join(REPOS_DIR, file), 'utf-8'));
        if (!Array.isArray(repos)) continue;
        for (const repo of repos) {
          if (repo.status === 'active' && repo.id && repo.username) {
            registerRepoInMemory(repo.username, repo.id);
          }
        }
      } catch {}
    }
  } catch {}
}
loadReposIntoRegistry();

// ---------------------------------------------------------------------------
// Archive / unarchive operations
// ---------------------------------------------------------------------------

async function performArchiveRepo(username, repoId) {
  const repos = readUserRepos(username);
  const repoIdx = repos.findIndex(r => r.id === repoId && r.status === 'active');
  if (repoIdx === -1) return;
  const repo = repos[repoIdx];
  const { execFileSync } = require('child_process');

  // Handle linked container: commit uncommitted changes then delete it
  if (repo.containerId) {
    const containerEntry = containerRegistry.get(repo.containerId);
    const containerName = containerEntry?.dockerName || repo.containerName;
    if (containerName) {
      try {
        let containerExists = false;
        try {
          execFileSync('docker', ['inspect', '--format', '{{.Name}}', containerName], { timeout: 10000, stdio: 'pipe' });
          containerExists = true;
        } catch {}

        if (containerExists) {
          let wasRunning = false;
          try {
            const stateOut = execFileSync('docker', ['inspect', '--format', '{{.State.Running}}', containerName], { timeout: 10000, encoding: 'utf-8' });
            wasRunning = stateOut.trim() === 'true';
          } catch {}

          if (!wasRunning) {
            try { execFileSync('docker', ['start', containerName], { timeout: 30000 }); } catch {}
          }

          let hasUncommitted = false;
          try {
            const statusOut = execFileSync('docker', ['exec', containerName,
              'bash', '-c', 'cd /workspace && git status --porcelain 2>/dev/null'],
              { timeout: 15000, encoding: 'utf-8' });
            hasUncommitted = statusOut.trim().length > 0;
          } catch {}

          if (hasUncommitted) {
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const branchName = `localllm-auto-save-${ts}`;
            try {
              execFileSync('docker', ['exec', containerName, 'bash', '-c',
                `cd /workspace && git add -A && git checkout -b "${branchName}" && git -c user.email="localllm@local" -c user.name="LocalLLM" commit -m "Auto-save before archive"`],
                { timeout: 60000, encoding: 'utf-8' });
            } catch (commitErr) {
              console.error(`Auto-commit error for repo ${repoId}:`, commitErr.message);
            }
          }
          try { execFileSync('docker', ['rm', '-f', containerName], { timeout: 30000 }); } catch {}
        }
      } catch (err) {
        console.error(`Archive container cleanup error for ${repoId}:`, err.message);
      }
      if (containerEntry) {
        clearTimeout(containerEntry.inactivityTimer);
        containerRegistry.delete(repo.containerId);
      }
    }
    const userContainers = readUserContainers(username);
    writeUserContainers(username, userContainers.filter(c => c.id !== repo.containerId));
  }

  // Compress bare repo to tar.gz
  const bareDir = getUserRepoBareDir(username, repoId);
  const archivePath = getUserRepoArchivePath(username, repoId);
  if (fs.existsSync(bareDir)) {
    const userDir = getUserReposDir(username);
    execFileSync('tar', ['-czf', archivePath, '-C', userDir, `${repoId}.git`], { timeout: 180000 });
    fs.rmSync(bareDir, { recursive: true, force: true });
  }

  repos[repoIdx] = { ...repo, status: 'archived', archivedAt: new Date().toISOString(), containerId: null, containerName: null };
  writeUserRepos(username, repos);

  const entry = repoRegistry.get(repoId);
  if (entry) { clearTimeout(entry.archiveTimer); repoRegistry.delete(repoId); }
  auditLog({ event: 'REPO_ARCHIVED', message: `Repository "${repo.name}" archived`, username });
}

function performUnarchiveRepo(username, repoId) {
  const repos = readUserRepos(username);
  const repoIdx = repos.findIndex(r => r.id === repoId && r.status === 'archived');
  if (repoIdx === -1) throw new Error('Repository not found or not archived');
  const repo = repos[repoIdx];
  const { execFileSync } = require('child_process');
  const archivePath = getUserRepoArchivePath(username, repoId);
  if (!fs.existsSync(archivePath)) throw new Error('Archive file not found');
  const userDir = getUserReposDir(username);
  execFileSync('tar', ['-xzf', archivePath, '-C', userDir], { timeout: 180000 });
  fs.unlinkSync(archivePath);
  repos[repoIdx] = { ...repo, status: 'active', archivedAt: null };
  writeUserRepos(username, repos);
  registerRepoInMemory(username, repoId);
  auditLog({ event: 'REPO_UNARCHIVED', message: `Repository "${repo.name}" unarchived`, username });
}

function deleteAllUserRepos(username) {
  try {
    const repos = readUserRepos(username);
    for (const repo of repos) {
      const entry = repoRegistry.get(repo.id);
      if (entry) { clearTimeout(entry.archiveTimer); repoRegistry.delete(repo.id); }
    }
    const userDir = path.join(REPOS_DIR, path.basename(sanitizeUsernameForPath(username)));
    if (fs.existsSync(userDir)) fs.rmSync(userDir, { recursive: true, force: true });
    const metaFile = getUserReposMetaFile(username);
    if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
  } catch (err) {
    console.error(`deleteAllUserRepos error for ${username}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Git HTTP Smart Protocol (git http-backend CGI)
// ---------------------------------------------------------------------------

function authenticateGitRequest(req, repoId) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { ok: false, status: 401, error: 'Authentication required', wwwAuthenticate: 'Basic realm="LocalLLM Git"' };
  }

  if (authHeader.startsWith('Bearer ')) {
    const session = validateSession(authHeader.slice(7));
    if (!session) return { ok: false, status: 401, error: 'Invalid or expired session', wwwAuthenticate: 'Basic realm="LocalLLM Git"' };
    const repos = readUserRepos(session.username);
    const repo = repos.find(r => r.id === repoId);
    if (!repo) return { ok: false, status: 404, error: 'Repository not found' };
    return { ok: true, username: session.username, repo };
  }

  if (authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const colonIdx = decoded.indexOf(':');
    const providedKey = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded;
    // Scan metadata files to find the repo with a matching auth key
    try {
      const files = fs.readdirSync(REPOS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const repos = JSON.parse(fs.readFileSync(path.join(REPOS_DIR, file), 'utf-8'));
          if (!Array.isArray(repos)) continue;
          const repo = repos.find(r => r.id === repoId);
          if (repo && repo.authKey && timingSafeCompare(repo.authKey, providedKey)) {
            return { ok: true, username: repo.username, repo };
          }
        } catch {}
      }
    } catch {}
    return { ok: false, status: 401, error: 'Invalid credentials', wwwAuthenticate: 'Basic realm="LocalLLM Git"' };
  }

  return { ok: false, status: 401, error: 'Invalid authorization format', wwwAuthenticate: 'Basic realm="LocalLLM Git"' };
}

function handleGitHttpBackend(req, res, repoId, gitPathSuffix) {
  const auth = authenticateGitRequest(req, repoId);
  if (!auth.ok) {
    if (auth.wwwAuthenticate) res.setHeader('WWW-Authenticate', auth.wwwAuthenticate);
    return res.status(auth.status).json({ error: auth.error });
  }

  const { username, repo } = auth;
  if (repo.status !== 'active') {
    return res.status(409).json({ error: 'Repository is archived. Unarchive it first.' });
  }

  let bareDir;
  try { bareDir = getUserRepoBareDir(username, repoId); }
  catch { return res.status(404).json({ error: 'Repository not found' }); }
  if (!fs.existsSync(bareDir)) return res.status(404).json({ error: 'Repository directory not found' });

  touchRepoActivity(repoId);

  const { spawn } = require('child_process');
  const userDir = getUserReposDir(username);
  const pathInfo = `/${repoId}.git/${gitPathSuffix}`;
  const rawUrl = req.url || '';
  const qIdx = rawUrl.indexOf('?');
  const queryString = qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '';

  const env = {
    ...process.env,
    GIT_PROJECT_ROOT: userDir,
    GIT_HTTP_EXPORT_ALL: '1',
    PATH_INFO: pathInfo,
    REQUEST_METHOD: req.method,
    QUERY_STRING: queryString,
    CONTENT_TYPE: req.headers['content-type'] || '',
    CONTENT_LENGTH: req.headers['content-length'] || '0',
    REMOTE_ADDR: req.ip || '',
    SERVER_NAME: req.hostname || 'localhost',
    SERVER_PORT: String(req.socket?.localPort || 3000),
    SERVER_PROTOCOL: 'HTTP/1.1',
    GIT_HTTP_MAX_REQUEST_BUFFER: '100m',
  };
  if (req.headers['git-protocol']) env.GIT_PROTOCOL = req.headers['git-protocol'];

  const gitProc = spawn('git', ['http-backend'], { env });
  req.pipe(gitProc.stdin);

  let headersDone = false;
  let buf = Buffer.alloc(0);

  gitProc.stdout.on('data', (chunk) => {
    if (headersDone) { res.write(chunk); return; }
    buf = Buffer.concat([buf, chunk]);
    // git http-backend uses \r\n\r\n or \n\n to separate headers from body
    let sepIdx = buf.indexOf('\r\n\r\n');
    let sepLen = 4;
    if (sepIdx < 0) { sepIdx = buf.indexOf('\n\n'); sepLen = 2; }
    if (sepIdx < 0) return;

    const headerStr = buf.slice(0, sepIdx).toString('utf-8');
    let statusCode = 200;
    for (const line of headerStr.split(/\r?\n/)) {
      const ci = line.indexOf(':');
      if (ci < 0) continue;
      const hName = line.slice(0, ci).trim().toLowerCase();
      const hVal = line.slice(ci + 1).trim();
      if (hName === 'status') { statusCode = parseInt(hVal.split(' ')[0], 10); }
      else { res.setHeader(hName, hVal); }
    }
    res.status(statusCode);
    headersDone = true;
    const body = buf.slice(sepIdx + sepLen);
    if (body.length > 0) res.write(body);
  });

  gitProc.stdout.on('end', () => res.end());
  gitProc.stderr.on('data', (d) => console.error('git http-backend:', d.toString().trim()));
  gitProc.on('error', (err) => {
    console.error('git http-backend spawn error:', err.message);
    if (!res.headersSent) res.status(503).json({ error: 'Git service unavailable' });
    else res.end();
  });
}

// Git Smart HTTP endpoints
app.get('/api/repositories/:id/git/info/refs', (req, res) => {
  handleGitHttpBackend(req, res, req.params.id, 'info/refs');
});
app.post('/api/repositories/:id/git/git-upload-pack', (req, res) => {
  handleGitHttpBackend(req, res, req.params.id, 'git-upload-pack');
});
app.post('/api/repositories/:id/git/git-receive-pack', (req, res) => {
  handleGitHttpBackend(req, res, req.params.id, 'git-receive-pack');
});

// ---------------------------------------------------------------------------
// Repository CRUD & lifecycle endpoints
// ---------------------------------------------------------------------------

// POST /api/repositories – Create a new Local.LLM bare git repository
app.post('/api/repositories', requireSession, async (req, res) => {
  try {
    const { name, description, initReadme } = req.body;
    if (!name || typeof name !== 'string' || !REPO_NAME_REGEX.test(name)) {
      return res.status(400).json({ success: false, error: 'Invalid repository name. Use letters, digits, hyphens, underscores, or dots (1–100 chars).' });
    }
    if (!isGitAvailable()) {
      return res.status(503).json({ success: false, error: 'Git is not available on this server' });
    }
    const currentStorage = getUserStorageBytes(req.sessionUser);
    if (currentStorage >= USER_MAX_STORAGE_BYTES) {
      return res.status(409).json({ success: false, error: `Storage quota exceeded (max ${Math.round(USER_MAX_STORAGE_BYTES / 1073741824)} GB per user)` });
    }
    const repos = readUserRepos(req.sessionUser);
    if (repos.some(r => r.name === name && r.status !== 'archived')) {
      return res.status(409).json({ success: false, error: 'A repository with this name already exists' });
    }

    const repoId = crypto.randomUUID();
    const authKey = crypto.randomBytes(32).toString('base64url');
    const { execFileSync } = require('child_process');

    try {
      const bareDir = getUserRepoBareDir(req.sessionUser, repoId);
      fs.mkdirSync(bareDir, { recursive: true });
      execFileSync('git', ['init', '--bare', bareDir], { timeout: 30000 });

      if (initReadme) {
        const os = require('os');
        const tmpDir = path.join(os.tmpdir(), `localllm-init-${repoId}`);
        try {
          execFileSync('git', ['clone', bareDir, tmpDir], { timeout: 30000 });
          fs.writeFileSync(path.join(tmpDir, 'README.md'), `# ${name}\n\n${description || ''}\n`);
          execFileSync('git', ['-C', tmpDir, 'config', 'user.email', 'localllm@local'], { timeout: 5000 });
          execFileSync('git', ['-C', tmpDir, 'config', 'user.name', 'LocalLLM'], { timeout: 5000 });
          execFileSync('git', ['-C', tmpDir, 'add', '.'], { timeout: 5000 });
          execFileSync('git', ['-C', tmpDir, 'commit', '-m', 'Initial commit'], { timeout: 10000 });
          execFileSync('git', ['-C', tmpDir, 'push', 'origin', 'HEAD'], { timeout: 30000 });
        } finally {
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        }
      }
    } catch (gitErr) {
      try { const bd = getUserRepoBareDir(req.sessionUser, repoId); fs.rmSync(bd, { recursive: true, force: true }); } catch {}
      console.error('Git init error:', gitErr.message);
      return res.status(500).json({ success: false, error: 'Failed to initialize repository' });
    }

    const repoEntry = {
      id: repoId, name, description: description || '', status: 'active',
      authKey, username: req.sessionUser, defaultBranch: 'main',
      createdAt: new Date().toISOString(), lastActivity: Date.now(),
      archivedAt: null, containerId: null, containerName: null,
    };
    repos.push(repoEntry);
    writeUserRepos(req.sessionUser, repos);
    registerRepoInMemory(req.sessionUser, repoId);
    auditLog({ event: 'REPO_CREATED', message: `Repository "${name}" created`, username: req.sessionUser, req });
    res.json({ success: true, repo: repoEntry });
  } catch (err) {
    console.error('Create repo error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/repositories – List user's repositories
app.get('/api/repositories', requireSession, (req, res) => {
  try {
    const repos = readUserRepos(req.sessionUser);
    const storageUsed = getUserStorageBytes(req.sessionUser);
    // Omit authKey from list response; clients call GET /:id for the key
    const sanitized = repos.map(({ authKey, ...r }) => r);
    res.json({ success: true, repos: sanitized, storageUsed, storageMax: USER_MAX_STORAGE_BYTES });
  } catch (err) {
    console.error('List repos error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/repositories/:id – Get single repo details (includes authKey for owner)
app.get('/api/repositories/:id', requireSession, (req, res) => {
  try {
    const repos = readUserRepos(req.sessionUser);
    const repo = repos.find(r => r.id === req.params.id);
    if (!repo) return res.status(404).json({ success: false, error: 'Repository not found' });
    touchRepoActivity(repo.id);
    const size = getRepoBytesOnDisk(req.sessionUser, repo.id);
    res.json({ success: true, repo: { ...repo, size } });
  } catch (err) {
    console.error('Get repo error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/repositories/:id – Delete a repository and any linked container
app.delete('/api/repositories/:id', requireSession, (req, res) => {
  try {
    const repos = readUserRepos(req.sessionUser);
    const repoIdx = repos.findIndex(r => r.id === req.params.id);
    if (repoIdx === -1) return res.status(404).json({ success: false, error: 'Repository not found' });
    const repo = repos[repoIdx];
    const { execFileSync } = require('child_process');

    if (repo.containerId) {
      const containerEntry = containerRegistry.get(repo.containerId);
      const containerName = containerEntry?.dockerName || repo.containerName;
      if (containerName) { try { execFileSync('docker', ['rm', '-f', containerName], { timeout: 30000 }); } catch {} }
      if (containerEntry) { clearTimeout(containerEntry.inactivityTimer); containerRegistry.delete(repo.containerId); }
      const userContainers = readUserContainers(req.sessionUser);
      writeUserContainers(req.sessionUser, userContainers.filter(c => c.id !== repo.containerId));
    }

    if (repo.status === 'active') {
      try { const bd = getUserRepoBareDir(req.sessionUser, repo.id); if (fs.existsSync(bd)) fs.rmSync(bd, { recursive: true, force: true }); } catch {}
    } else {
      try { const ap = getUserRepoArchivePath(req.sessionUser, repo.id); if (fs.existsSync(ap)) fs.unlinkSync(ap); } catch {}
    }

    const regEntry = repoRegistry.get(repo.id);
    if (regEntry) { clearTimeout(regEntry.archiveTimer); repoRegistry.delete(repo.id); }

    repos.splice(repoIdx, 1);
    writeUserRepos(req.sessionUser, repos);
    auditLog({ event: 'REPO_DELETED', message: `Repository "${repo.name}" deleted`, username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete repo error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/repositories/:id/archive – Manually archive
app.post('/api/repositories/:id/archive', requireSession, async (req, res) => {
  try {
    const repos = readUserRepos(req.sessionUser);
    const repo = repos.find(r => r.id === req.params.id && r.status === 'active');
    if (!repo) return res.status(404).json({ success: false, error: 'Active repository not found' });
    await performArchiveRepo(req.sessionUser, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Archive repo error:', err);
    res.status(500).json({ success: false, error: 'Failed to archive repository' });
  }
});

// POST /api/repositories/:id/unarchive – Restore from archive
app.post('/api/repositories/:id/unarchive', requireSession, (req, res) => {
  try {
    const repos = readUserRepos(req.sessionUser);
    if (!repos.find(r => r.id === req.params.id && r.status === 'archived')) {
      return res.status(404).json({ success: false, error: 'Archived repository not found' });
    }
    const currentStorage = getUserStorageBytes(req.sessionUser);
    if (currentStorage >= USER_MAX_STORAGE_BYTES) {
      return res.status(409).json({ success: false, error: 'Storage quota exceeded' });
    }
    performUnarchiveRepo(req.sessionUser, req.params.id);
    auditLog({ event: 'REPO_UNARCHIVED', message: `Repository "${repos.find(r => r.id === req.params.id)?.name ?? req.params.id}" unarchived`, username: req.sessionUser, req });
    res.json({ success: true });
  } catch (err) {
    console.error('Unarchive repo error:', err);
    res.status(500).json({ success: false, error: 'Failed to unarchive repository' });
  }
});

// POST /api/repositories/:id/regenerate-key – Generate a new auth key
app.post('/api/repositories/:id/regenerate-key', requireSession, (req, res) => {
  try {
    const repos = readUserRepos(req.sessionUser);
    const repoIdx = repos.findIndex(r => r.id === req.params.id);
    if (repoIdx === -1) return res.status(404).json({ success: false, error: 'Repository not found' });
    const newKey = crypto.randomBytes(32).toString('base64url');
    repos[repoIdx].authKey = newKey;
    writeUserRepos(req.sessionUser, repos);
    auditLog({ event: 'REPO_KEY_REGENERATED', message: `Auth key regenerated for "${repos[repoIdx].name}"`, username: req.sessionUser, req });
    res.json({ success: true, authKey: newKey });
  } catch (err) {
    console.error('Regenerate key error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/repositories/import-github – Clone a GitHub repo as a Local.LLM repository
app.post('/api/repositories/import-github', requireSession, async (req, res) => {
  try {
    const { cloneUrl, name, description } = req.body;
    if (!cloneUrl || typeof cloneUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Clone URL is required' });
    }
    // SSRF-safe URL validation for outbound clone request
    const ssrfCheck = await ssrfSafeUrlValidation(cloneUrl);
    if (!ssrfCheck.valid || ssrfCheck.parsed.protocol !== 'https:') {
      const reason = !ssrfCheck.valid ? ssrfCheck.reason : 'Only HTTPS URLs are supported';
      return res.status(400).json({ success: false, error: `Invalid clone URL: ${reason}` });
    }
    // Additional hardening: ensure cloneUrl is a well-formed HTTPS URL and not an option-like argument
    let parsedCloneUrl;
    try {
      parsedCloneUrl = new URL(cloneUrl);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid clone URL: malformed URL' });
    }
    if (parsedCloneUrl.protocol !== 'https:' || !parsedCloneUrl.hostname) {
      return res.status(400).json({ success: false, error: 'Invalid clone URL: must be HTTPS with a valid host' });
    }
    // Disallow values that might be interpreted as git options or contain unsafe whitespace
    if (/^\s*-/.test(cloneUrl) || /\s/.test(cloneUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid clone URL: unsafe format' });
    }
    const repoName = (name || cloneUrl.split('/').pop()?.replace(/\.git$/, '') || 'imported-repo')
      .replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100);
    if (!REPO_NAME_REGEX.test(repoName)) {
      return res.status(400).json({ success: false, error: 'Invalid repository name' });
    }
    if (!isGitAvailable()) {
      return res.status(503).json({ success: false, error: 'Git is not available on this server' });
    }
    const currentStorage = getUserStorageBytes(req.sessionUser);
    if (currentStorage >= USER_MAX_STORAGE_BYTES) {
      return res.status(409).json({ success: false, error: 'Storage quota exceeded' });
    }
    const repos = readUserRepos(req.sessionUser);
    if (repos.some(r => r.name === repoName && r.status !== 'archived')) {
      return res.status(409).json({ success: false, error: 'A repository with this name already exists' });
    }

    const integrations = readUserIntegrations(req.sessionUser);
    const gitToken = integrations.github?.token || null;
    const repoId = crypto.randomUUID();
    const authKey = crypto.randomBytes(32).toString('base64url');
    const { execFileSync } = require('child_process');
    const os = require('os');

    try {
      const bareDir = getUserRepoBareDir(req.sessionUser, repoId);
      const cloneEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
      let tmpAskPass = null;
      if (gitToken) {
        tmpAskPass = path.join(os.tmpdir(), `localllm-askpass-${repoId}.sh`);
        fs.writeFileSync(tmpAskPass, `#!/bin/sh\necho "$GIT_TOKEN"\n`, { mode: 0o700 });
        cloneEnv.GIT_ASKPASS = tmpAskPass;
        cloneEnv.GIT_TOKEN = gitToken;
      }
      try {
        execFileSync('git', ['clone', '--bare', cloneUrl, bareDir], { timeout: 300000, env: cloneEnv });
      } finally {
        if (tmpAskPass) { try { fs.unlinkSync(tmpAskPass); } catch {} }
      }
    } catch (gitErr) {
      try { const bd = getUserRepoBareDir(req.sessionUser, repoId); fs.rmSync(bd, { recursive: true, force: true }); } catch {}
      console.error('Git clone error:', gitErr.message);
      return res.status(500).json({ success: false, error: 'Failed to clone repository. Verify the URL is correct and you have access.' });
    }

    const repoSize = getRepoBytesOnDisk(req.sessionUser, repoId);
    if (repoSize > REPO_MAX_SIZE_BYTES) {
      try { const bd = getUserRepoBareDir(req.sessionUser, repoId); fs.rmSync(bd, { recursive: true, force: true }); } catch {}
      return res.status(409).json({ success: false, error: `Repository exceeds max size (${Math.round(REPO_MAX_SIZE_BYTES / 1073741824)} GB)` });
    }

    const repoEntry = {
      id: repoId, name: repoName, description: description || '', status: 'active',
      authKey, username: req.sessionUser, defaultBranch: 'main',
      createdAt: new Date().toISOString(), lastActivity: Date.now(),
      archivedAt: null, containerId: null, containerName: null,
    };
    repos.push(repoEntry);
    writeUserRepos(req.sessionUser, repos);
    registerRepoInMemory(req.sessionUser, repoId);
    auditLog({ event: 'REPO_IMPORTED', message: `Repository "${repoName}" imported from ${cloneUrl}`, username: req.sessionUser, req });
    res.json({ success: true, repo: repoEntry });
  } catch (err) {
    console.error('Import GitHub repo error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/repositories/:id/export-github – Mirror-push to a new GitHub repository
app.post('/api/repositories/:id/export-github', requireSession, async (req, res) => {
  try {
    const { newRepoName, isPrivate, deleteLocal } = req.body;
    const repos = readUserRepos(req.sessionUser);
    const repoIdx = repos.findIndex(r => r.id === req.params.id && r.status === 'active');
    if (repoIdx === -1) return res.status(404).json({ success: false, error: 'Active repository not found' });
    const repo = repos[repoIdx];

    const integrations = readUserIntegrations(req.sessionUser);
    const github = integrations.github;
    if (!github?.token) {
      return res.status(400).json({ success: false, error: 'GitHub token not configured. Add a GitHub token in Settings.' });
    }

    const ghName = (newRepoName || repo.name).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100);

    let ghRepoData;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${github.token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'LocalLLM-Repositories',
        },
        body: JSON.stringify({ name: ghName, description: repo.description, private: !!isPrivate, auto_init: false }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!createRes.ok) {
        const errData = await createRes.json();
        return res.status(400).json({ success: false, error: errData.message || 'Failed to create GitHub repository' });
      }
      ghRepoData = await createRes.json();
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') return res.status(504).json({ success: false, error: 'GitHub API request timed out' });
      return res.status(502).json({ success: false, error: 'Could not connect to GitHub API' });
    }

    try {
      const { execFileSync } = require('child_process');
      const bareDir = getUserRepoBareDir(req.sessionUser, repo.id);
      // Embed token in URL for one-shot mirror push (not persisted anywhere)
      const pushUrl = ghRepoData.clone_url.replace('https://', `https://x:${github.token}@`);
      execFileSync('git', ['-C', bareDir, 'push', '--mirror', pushUrl], { timeout: 300000 });
    } catch (pushErr) {
      console.error('Git mirror push error:', pushErr.message);
      return res.status(500).json({ success: false, error: 'Failed to push to GitHub' });
    }

    auditLog({ event: 'REPO_EXPORTED', message: `Repository "${repo.name}" exported to GitHub as ${ghName}`, username: req.sessionUser, req });

    if (deleteLocal) {
      try { await performArchiveRepo(req.sessionUser, repo.id); } catch {}
      // Then delete the archive too
      try { const ap = getUserRepoArchivePath(req.sessionUser, repo.id); if (fs.existsSync(ap)) fs.unlinkSync(ap); } catch {}
      const updatedRepos = readUserRepos(req.sessionUser);
      const idx = updatedRepos.findIndex(r => r.id === repo.id);
      if (idx !== -1) { updatedRepos.splice(idx, 1); writeUserRepos(req.sessionUser, updatedRepos); }
    }

    res.json({ success: true, githubUrl: ghRepoData.html_url, githubCloneUrl: ghRepoData.clone_url });
  } catch (err) {
    console.error('Export GitHub repo error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/local-repositories – active repos for the logged-in user (used by coding agent)
app.get('/api/local-repositories', requireSession, (req, res) => {
  try {
    const repos = readUserRepos(req.sessionUser);
    const activeRepos = repos.filter(r => r.status === 'active').map(({ authKey, ...r }) => r);
    res.json({ success: true, repos: activeRepos });
  } catch (err) {
    console.error('List local repos error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Local LLM model endpoints (admin download/delete, user list/status)
// ---------------------------------------------------------------------------

// Maximum allowed model download timeout (30 minutes – large models take time)
const MODEL_DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;

// Admin: download a HuggingFace model
app.post('/api/admin/models', async (req, res) => {
  try {
    const { adminUsername, adminPassword, repoId, name } = req.body;

    if (!adminUsername || !adminPassword) {
      return res.status(401).json({ success: false, error: 'Missing admin credentials' });
    }

    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      auditLog({ event: 'ADMIN_AUTH_FAILURE', message: 'Unauthorized model download attempt', username: adminUsername, req });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (!repoId || typeof repoId !== 'string' || !repoId.trim()) {
      return res.status(400).json({ success: false, error: 'repoId is required (e.g. "TinyLlama/TinyLlama-1.1B-Chat-v1.0")' });
    }

    // Validate repoId format (must be "owner/model" style)
    const trimmedRepoId = repoId.trim();
    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(trimmedRepoId)) {
      return res.status(400).json({ success: false, error: 'Invalid repoId format. Expected "owner/model" (e.g. "TinyLlama/TinyLlama-1.1B-Chat-v1.0")' });
    }

    // Check Python service is healthy before starting download
    const serviceHealthy = await checkPythonServiceHealth();
    if (!serviceHealthy) {
      return res.status(503).json({ success: false, error: 'Python LLM service is not running. Please wait for it to start.' });
    }

    const modelId = crypto.randomUUID();
    const modelDirName = modelId;
    const targetDir = path.join(path.resolve(MODELS_DIR), modelDirName);
    ensureWithinDir(MODELS_DIR, targetDir);

    const displayName = (name || trimmedRepoId.split('/').pop()).trim().substring(0, 200);

    // Request the Python service to download the model
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MODEL_DOWNLOAD_TIMEOUT_MS);

      const downloadRes = await fetch(`${PYTHON_SERVICE_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: trimmedRepoId, target_dir: targetDir }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const downloadResult = await downloadRes.json();
      if (!downloadRes.ok || downloadResult.error) {
        // Cleanup the directory on failure
        try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch { /* ignore */ }
        return res.status(500).json({ success: false, error: downloadResult.error || 'Download failed' });
      }

      // Register the model
      await withModelsLock(async () => {
        const models = readLocalModels();
        const newModel = {
          id: modelId,
          name: displayName,
          huggingFaceId: trimmedRepoId,
          directory: modelDirName,
          size: downloadResult.size || 0,
          downloadedAt: new Date().toISOString(),
        };
        models.push(newModel);
        writeLocalModels(models);

        auditLog({ event: 'ADMIN_DOWNLOAD_MODEL', message: `Admin downloaded model: ${displayName} (${trimmedRepoId})`, username: adminUsername, req });
        res.json({ success: true, model: newModel });
      });
    } catch (downloadErr) {
      // Cleanup the directory on failure
      try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch { /* ignore */ }
      if (downloadErr.name === 'AbortError') {
        return res.status(504).json({ success: false, error: 'Model download timed out' });
      }
      return res.status(500).json({ success: false, error: `Download failed: ${downloadErr.message}` });
    }
  } catch (err) {
    console.error('Model download error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: list all uploaded models
app.post('/api/admin/models/list', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const models = readLocalModels();
    res.json({ success: true, models });
  } catch (err) {
    console.error('Admin list models error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: delete a model
app.delete('/api/admin/models/:id', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!(await verifyAdminCredentials(adminUsername, adminPassword))) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const modelId = req.params.id;

    // Use mutex to prevent read-modify-write race conditions
    let notFound = false;
    await withModelsLock(async () => {
      const models = readLocalModels();
      const idx = models.findIndex(m => m.id === modelId);
      if (idx === -1) {
        notFound = true;
        return;
      }

      const model = models[idx];
      // Remove the model directory from disk
      const modelDir = getModelDirPath(model);
      if (fs.existsSync(modelDir)) {
        fs.rmSync(modelDir, { recursive: true, force: true });
      }

      models.splice(idx, 1);
      writeLocalModels(models);

      auditLog({ event: 'ADMIN_DELETE_MODEL', message: `Admin deleted model: ${model.name}`, username: adminUsername, req });
    });

    if (notFound) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete model error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// User: list available local models (requires session)
app.get('/api/local-models', requireSession, (req, res) => {
  try {
    const models = readLocalModels().map(m => ({
      id: m.id,
      name: m.name,
      huggingFaceId: m.huggingFaceId,
      size: m.size,
      downloadedAt: m.downloadedAt,
    }));
    res.json({ success: true, models });
  } catch (err) {
    console.error('List local models error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Chat storage – Encrypted per-user
// ---------------------------------------------------------------------------

function getUserChatsDir(username) {
  const safeUsername = path.basename(sanitizeUsernameForPath(username));
  const dir = path.join(CHATS_DIR, safeUsername);
  ensureWithinDir(CHATS_DIR, dir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getChatFilePath(username, chatId) {
  // Strict UUID format check to prevent path traversal
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(chatId)) {
    throw new Error('Invalid chat ID');
  }
  const userDir = getUserChatsDir(username);
  const filePath = path.join(userDir, `${chatId}.enc`);
  return ensureWithinDir(userDir, filePath);
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
      const safePath = ensureWithinDir(dir, path.join(dir, path.basename(file)));
      const encrypted = fs.readFileSync(safePath, 'utf-8');
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
      characterId: req.body.characterId || null,
      personaId: req.body.personaId || null,
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
      characterId: req.body.characterId ?? existing.characterId,
      personaId: req.body.personaId ?? existing.personaId,
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
// LLM Chat Proxy – Routes messages to the selected provider (SSE streaming)
// ---------------------------------------------------------------------------

function enhanceMessagesForThink(messages) {
  const thinkInstruction = '\n\nThink step by step. Consider the problem carefully and show your reasoning before providing your final answer.';
  const systemIdx = messages.findIndex(m => m.role === 'system');
  const enhanced = [...messages];
  if (systemIdx >= 0) {
    const originalContent = enhanced[systemIdx].content;
    if (typeof originalContent === 'string') {
      enhanced[systemIdx] = { ...enhanced[systemIdx], content: originalContent + thinkInstruction };
    } else {
      enhanced[systemIdx] = {
        ...enhanced[systemIdx],
        content: [...originalContent, { type: 'text', text: thinkInstruction }]
      };
    }
  } else {
    enhanced.unshift({ role: 'system', content: thinkInstruction.trim() });
  }
  return enhanced;
}

// Send a Server-Sent Event to the client
function sendSSE(res, event, data) {
  if (!res || res.writableEnded || res.finished || res.destroyed || !res.writable) {
    return;
  }
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    if (err && err.code === 'ERR_STREAM_WRITE_AFTER_END') {
      return;
    }
    throw err;
  }
}

/**
 * Simple non-streaming LLM completion helper for background tasks.
 * Tries to find any available provider for the user.
 */
async function getLLMCompletion(username, messages, options = {}) {
  const keys = readUserApiKeys(username);
  let provider = null;
  for (const p of VALID_PROVIDERS) {
    if (keys[p]?.apiKey) {
      provider = p;
      break;
    }
  }

  if (!provider) {
    throw new Error('No AI provider configured. Please add an API key in Settings.');
  }

  const providerKeys = keys[provider];
  const model = options.model || providerKeys.selectedModel;
  if (!model) {
    throw new Error(`No model selected for provider ${provider}.`);
  }

  const config = AI_PROVIDERS[provider];
  const baseUrl = config.baseUrl;
  const chatEndpoint = config.chatEndpoint;

  const body = {
    model,
    messages: messages.map(m => {
      if (m.role === 'system' && Array.isArray(m.content)) {
        return { ...m, content: m.content.map(p => p.text || '').join('\n') };
      }
      return m;
    }),
    max_tokens: options.max_tokens || 2048,
    temperature: options.temperature || 0.7,
    stream: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 1 minute timeout for background tasks

  try {
    const response = await fetch(`${baseUrl}${chatEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerKeys.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    // Handle different provider response formats
    if (provider === 'anthropic') {
      return data.content[0].text;
    } else {
      // OpenAI-compatible
      return data.choices[0].message.content;
    }
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// Parse an SSE stream from a fetch Response, calling onEvent(eventType, data) for each
async function parseSSEStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const segments = buffer.split('\n\n');
      buffer = segments.pop() || '';

      for (const segment of segments) {
        if (!segment.trim()) continue;
        const lines = segment.split('\n');
        let eventType = 'message';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim();
          else if (line.startsWith('data: ')) eventData += line.slice(6);
          else if (line.startsWith('data:')) eventData += line.slice(5);
        }

        if (eventData) {
          onEvent(eventType, eventData.trim());
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream a chat completion from the local Python LLM service.
 * @param {object} res  Express response (SSE stream)
 * @param {Array}  messages  Chat messages
 * @param {string} modelId  The local model registry ID
 * @param {object} options  { think }
 * @param {AbortSignal} signal  Abort signal for client disconnect
 */
async function streamFromLocalModel(res, messages, modelId, options = {}, signal) {
  if (options.think) {
    messages = enhanceMessagesForThink(messages);
  }

  // Resolve the model directory path from the registry
  const models = readLocalModels();
  const modelEntry = models.find(m => m.id === modelId);
  if (!modelEntry) {
    throw new Error('Local model not found');
  }
  const modelDir = getModelDirPath(modelEntry);
  if (!fs.existsSync(modelDir)) {
    throw new Error('Model directory not found on disk');
  }

  // Prepare messages (flatten multimodal content to text)
  const chatMessages = messages.map(m => {
    if (typeof m.content === 'string') return { role: m.role, content: m.content };
    const text = m.content.filter(p => p.type === 'text').map(p => p.text || '').join('\n');
    return { role: m.role, content: text };
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_PROXY_TIMEOUT_MS * LOCAL_MODEL_TIMEOUT_MULTIPLIER);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  let response;
  try {
    response = await fetch(`${PYTHON_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_dir: modelDir,
        messages: chatMessages,
        max_tokens: LLM_DEFAULT_MAX_TOKENS,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Local LLM service error: ${response.status} – ${errText}`);
  }

  let fullContent = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.done) {
            fullContent = parsed.content || fullContent;
            break;
          }
          const chunk = parsed.content || '';
          if (chunk) {
            fullContent += chunk;
            sendSSE(res, 'content', { content: chunk });
          }
        } catch (e) {
          // Only ignore JSON parse errors; rethrow everything else (e.g. explicit {error:...} payloads)
          if (!(e instanceof SyntaxError)) throw e;
        }
      }
    }

    // Flush remaining buffer
    buffer += decoder.decode();
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.error) throw new Error(parsed.error);
        if (!parsed.done) {
          const chunk = parsed.content || '';
          if (chunk) {
            fullContent += chunk;
            sendSSE(res, 'content', { content: chunk });
          }
        } else {
          fullContent = parsed.content || fullContent;
        }
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { content: fullContent, thinking: '' };
}

async function streamFromOpenAICompatible(res, messages, apiKey, baseUrl, chatEndpoint, model, options = {}, signal) {
  if (options.think) {
    messages = enhanceMessagesForThink(messages);
  }

  const body = {
    model,
    messages: messages.map(m => {
      // OpenAI-compatible providers usually support arrays in content for multi-modal.
      // But we should ensure system messages are strings if they don't support arrays there.
      if (m.role === 'system' && Array.isArray(m.content)) {
        return { ...m, content: m.content.map(p => p.text || '').join('\n') };
      }
      return m;
    }),
    max_tokens: options.think ? THINK_MAX_TOKENS : LLM_DEFAULT_MAX_TOKENS,
    temperature: 0.7,
    stream: true,
  };

  if (options.webSearch) {
    body.tools = [{ type: 'web_search_preview' }];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_PROXY_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  const response = await fetch(`${baseUrl}${chatEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  let fullContent = '';
  let fullThinking = '';
  let inThinkTag = false;
  const searches = [];

  await parseSSEStream(response, (eventType, eventData) => {
    if (eventData === '[DONE]') return;
    try {
      const parsed = JSON.parse(eventData);
      const delta = parsed.choices?.[0]?.delta;
      if (!delta) return;

      // Handle reasoning_content (OpenAI o-series models)
      if (delta.reasoning_content) {
        fullThinking += delta.reasoning_content;
        sendSSE(res, 'thinking', { content: delta.reasoning_content });
      }

      if (delta.content != null) {
        let chunk = delta.content;

        // Handle <think> tags (DeepSeek and similar models)
        while (chunk.length > 0) {
          if (inThinkTag) {
            const endIdx = chunk.indexOf('</think>');
            if (endIdx !== -1) {
              const thinkPart = chunk.substring(0, endIdx);
              fullThinking += thinkPart;
              if (thinkPart) sendSSE(res, 'thinking', { content: thinkPart });
              inThinkTag = false;
              chunk = chunk.substring(endIdx + 8);
            } else {
              fullThinking += chunk;
              sendSSE(res, 'thinking', { content: chunk });
              chunk = '';
            }
          } else {
            const startIdx = chunk.indexOf('<think>');
            if (startIdx !== -1) {
              const contentPart = chunk.substring(0, startIdx);
              if (contentPart) {
                fullContent += contentPart;
                sendSSE(res, 'content', { content: contentPart });
              }
              inThinkTag = true;
              chunk = chunk.substring(startIdx + 7);
            } else {
              fullContent += chunk;
              sendSSE(res, 'content', { content: chunk });
              chunk = '';
            }
          }
        }
      }

      // Detect search annotations (url_citation) from OpenAI web_search_preview
      if (delta.annotations) {
        for (const ann of delta.annotations) {
          if (ann.type === 'url_citation' && ann.url) {
            searches.push({ status: 'searched', query: ann.title || ann.url, url: ann.url });
            sendSSE(res, 'search', { status: 'searched', query: ann.title || ann.url, url: ann.url });
          }
        }
      }
    } catch (_e) { /* skip unparseable chunks */ }
  });

  return { content: fullContent, thinking: fullThinking, searches };
}

async function streamFromAnthropic(res, messages, apiKey, model, options = {}, signal) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const body = {
    model,
    max_tokens: options.think ? THINK_MAX_TOKENS : LLM_DEFAULT_MAX_TOKENS,
    messages: chatMessages.map(m => {
      if (typeof m.content === 'string') return m;
      return {
        ...m,
        content: m.content.map(p => {
          if (p.type === 'text') return { type: 'text', text: p.text };
          if (p.type === 'image_url') {
            const url = p.image_url.url;
            if (url.startsWith('data:')) {
              const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
              if (match) {
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: match[1],
                    data: match[2],
                  }
                };
              }
            }
            // Anthropic doesn't support hosted image URLs directly in the same way,
            // they usually want base64. For now, we'll just ignore non-data URLs
            // or pass them as text if they are not base64.
            return { type: 'text', text: `[Image: ${url}]` };
          }
          return { type: 'text', text: '' };
        })
      };
    }),
    stream: true,
  };
  if (systemMsg) {
    body.system = typeof systemMsg.content === 'string' ? systemMsg.content : systemMsg.content.map(p => p.text || '').join('\n');
  }

  if (options.think) {
    body.thinking = { type: 'enabled', budget_tokens: ANTHROPIC_THINKING_BUDGET };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_PROXY_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
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

  let fullContent = '';
  let fullThinking = '';
  let currentBlockType = null;

  await parseSSEStream(response, (_eventType, eventData) => {
    try {
      const parsed = JSON.parse(eventData);

      if (parsed.type === 'content_block_start') {
        currentBlockType = parsed.content_block?.type;
      } else if (parsed.type === 'content_block_delta') {
        if (currentBlockType === 'thinking') {
          const text = parsed.delta?.thinking || '';
          fullThinking += text;
          if (text) sendSSE(res, 'thinking', { content: text });
        } else if (currentBlockType === 'text') {
          const text = parsed.delta?.text || '';
          fullContent += text;
          if (text) sendSSE(res, 'content', { content: text });
        }
      } else if (parsed.type === 'content_block_stop') {
        currentBlockType = null;
      }
    } catch (_e) { /* skip unparseable chunks */ }
  });

  return { content: fullContent, thinking: fullThinking };
}

async function streamFromGoogle(res, messages, apiKey, model, options = {}, signal) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const contents = chatMessages.map(m => {
    const parts = [];
    if (typeof m.content === 'string') {
      parts.push({ text: m.content });
    } else {
      for (const p of m.content) {
        if (p.type === 'text') {
          parts.push({ text: p.text });
        } else if (p.type === 'image_url') {
          const url = p.image_url.url;
          if (url.startsWith('data:')) {
            const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              parts.push({
                inline_data: {
                  mime_type: match[1],
                  data: match[2],
                }
              });
            }
          } else {
            // For hosted URLs, Google has its own File API, or you can pass them differently.
            // For now, simpler to just treat as text.
            parts.push({ text: `[Image: ${url}]` });
          }
        }
      }
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const body = { contents };
  if (systemMsg) {
    const systemText = typeof systemMsg.content === 'string' ? systemMsg.content : systemMsg.content.map(p => p.text || '').join('\n');
    body.systemInstruction = { parts: [{ text: systemText }] };
  }
  if (options.webSearch) {
    body.tools = [{ googleSearch: {} }];
  }
  if (options.think) {
    body.generationConfig = { thinkingConfig: { thinkingBudget: GOOGLE_THINKING_BUDGET } };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_PROXY_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
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

  let fullContent = '';
  let fullThinking = '';
  const searches = [];

  await parseSSEStream(response, (_eventType, eventData) => {
    try {
      const parsed = JSON.parse(eventData);
      const parts = parsed.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
        if (part.text != null) {
          if (part.thought) {
            fullThinking += part.text;
            sendSSE(res, 'thinking', { content: part.text });
          } else {
            fullContent += part.text;
            sendSSE(res, 'content', { content: part.text });
          }
        }
      }

      // Extract grounding metadata for search results
      const grounding = parsed.candidates?.[0]?.groundingMetadata;
      if (grounding?.groundingChunks) {
        for (const chunk of grounding.groundingChunks) {
          if (chunk.web) {
            const search = { status: 'searched', query: chunk.web.title || chunk.web.uri, url: chunk.web.uri };
            searches.push(search);
            sendSSE(res, 'search', search);
          }
        }
      }
    } catch (_e) { /* skip unparseable chunks */ }
  });

  return { content: fullContent, thinking: fullThinking, searches };
}

// POST /api/chat/send – Send message to LLM (SSE streaming)
app.post('/api/chat/send', requireSession, async (req, res) => {
  let processedMessages = [];
  try {
    const { messages, provider, model } = req.body;
    const webSearch = req.body.webSearch === true;
    const think = req.body.think === true;
    const characterId = typeof req.body.characterId === 'string' ? req.body.characterId : null;
    const personaId = typeof req.body.personaId === 'string' ? req.body.personaId : null;
    const options = { webSearch, think };

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
      if (!msg.content || (typeof msg.content !== 'string' && !Array.isArray(msg.content))) {
        return res.status(400).json({ success: false, error: 'Invalid message content format' });
      }
    }

    // If a characterId or personaId is provided, look up their details and inject them
    // into the first system message so the AI adopts that role and understands who it's talking to.
    processedMessages = [...messages];
    let characterPrompt = '';
    let personaPrompt = '';

    if (characterId) {
      const universes = readUniverses();
      let character = null;
      let universe = null;
      for (const u of universes) {
        character = (u.characters || []).find((c) => c.id === characterId);
        if (character) {
          universe = u;
          break;
        }
      }
      if (character) {
        characterPrompt = `### ROLEPLAY CONTEXT: CHARACTER ROLE\n`;
        characterPrompt += `You are playing the role of: ${character.name}\n`;
        if (universe) {
          characterPrompt += `Universe Name: ${universe.name}\n`;
          if (universe.description) {
            characterPrompt += `Universe Setting: ${universe.description}\n`;
          }
        }
        if (character.description) {
          characterPrompt += `Character Background: ${character.description}\n`;
        }
        characterPrompt += '\n';
      }
    }

    if (personaId) {
      const personas = readPersonas(req.sessionUser);
      const persona = personas.find(p => p.id === personaId);
      if (persona) {
        personaPrompt = `### ROLEPLAY CONTEXT: USER PERSONA\n`;
        personaPrompt += `The user you are talking to is: ${persona.name}\n`;
        personaPrompt += `Persona Context: ${persona.description}\n\n`;
      }
    }

    if (characterPrompt || personaPrompt) {
      const combinedPrompt = characterPrompt + personaPrompt + "### GENERAL INSTRUCTIONS\n";
      let systemFound = false;
      processedMessages = processedMessages.map((msg, idx) => {
        if (msg.role === 'system' && idx === 0) {
          systemFound = true;
          if (typeof msg.content === 'string') {
            return { ...msg, content: combinedPrompt + msg.content };
          } else {
            return {
              ...msg,
              content: [
                { type: 'text', text: combinedPrompt },
                ...msg.content
              ]
            };
          }
        }
        return msg;
      });

      if (!systemFound) {
        processedMessages = [
          { role: 'system', content: combinedPrompt.trim() },
          ...processedMessages,
        ];
      }
    }

    // Validate provider and API key before starting SSE stream
    let providerKeys, selectedModel, providerConfig;
    if (provider === 'local') {
      // Local model requires a valid model ID
      if (typeof model !== 'string' || !model.trim()) {
        return res.status(400).json({ success: false, error: 'No model selected for local provider' });
      }
      selectedModel = model.trim();
      // Verify the model exists in registry
      const localModels = readLocalModels();
      if (!localModels.some(m => m.id === selectedModel)) {
        return res.status(400).json({ success: false, error: 'Selected local model not found' });
      }
    } else if (VALID_PROVIDERS.includes(provider)) {
      const keys = readUserApiKeys(req.sessionUser);
      providerKeys = keys[provider];
      if (!providerKeys?.apiKey) {
        return res.status(400).json({ success: false, error: `API key not configured for ${provider}` });
      }
      selectedModel = model || providerKeys.selectedModel;
      if (!selectedModel) {
        return res.status(400).json({ success: false, error: 'No model selected' });
      }
      providerConfig = AI_PROVIDERS[provider];
    } else {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    // Start SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Abort upstream provider requests when client disconnects
    const clientAbort = new AbortController();
    res.on('close', () => clientAbort.abort());

    // Emit searching event if web search is enabled
    if (webSearch) {
      const lastUserMsg = [...processedMessages].reverse().find(m => m.role === 'user');
      sendSSE(res, 'search', { status: 'searching', query: lastUserMsg?.content?.substring(0, 100) || 'web search' });
    }

    let result;
    if (provider === 'local') {
      result = await streamFromLocalModel(res, processedMessages, selectedModel, options, clientAbort.signal);
    } else if (provider === 'anthropic') {
      result = await streamFromAnthropic(res, processedMessages, providerKeys.apiKey, selectedModel, options, clientAbort.signal);
    } else if (provider === 'google') {
      result = await streamFromGoogle(res, processedMessages, providerKeys.apiKey, selectedModel, options, clientAbort.signal);
    } else {
      result = await streamFromOpenAICompatible(
        res, processedMessages, providerKeys.apiKey, providerConfig.baseUrl,
        providerConfig.chatEndpoint, selectedModel, options, clientAbort.signal
      );
    }

    sendSSE(res, 'done', {
      content: result.content,
      thinking: result.thinking || '',
      searches: result.searches || [],
    });
    res.end();
  } catch (err) {
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      // Expected when client disconnects or request times out
      if (!res.writableEnded) res.end();
      return;
    }
    const errorId = crypto.randomUUID();
    console.error(`Chat send error [${errorId}]:`, err);
    if (processedMessages && processedMessages.length > 0) {
      console.log(`[${errorId}] PROCESSED MESSAGES:`, JSON.stringify(processedMessages, null, 2));
    }
    // If headers already sent (SSE started), send error as SSE event
    if (res.headersSent) {
      sendSSE(res, 'error', { error: 'Failed to get response from LLM', requestId: errorId });
      res.end();
    } else {
      res.status(502).json({
        success: false,
        error: 'Failed to get response from LLM',
        requestId: errorId,
      });
    }
  }
});

/**
 * Perform a web search using a temporary Docker container with Playwright.
 */
async function performWebSearch(query, username) {
  const containerId = crypto.randomUUID();
  const containerName = `search-${sanitizeUsernameForPath(username)}-${containerId.slice(0, 8)}`;

  try {
    // Read the search script
    const searchScript = fs.readFileSync(path.join(__dirname, 'search-tool.js'), 'utf-8');
    const b64Script = Buffer.from(searchScript).toString('base64');

    // We use the same playwright image as for Web SEO
    const b64Query = Buffer.from(query).toString('base64');
    const dockerArgs = [
      'run', '--rm', '-i',
      '--name', containerName,
      '--memory=1g',
      '--cpus=1',
      '--network=bridge',
      'mcr.microsoft.com/playwright:v1.45.0-jammy',
      'bash', '-c', `npm install playwright-core@1.45.0 > /dev/null 2>&1 && echo '${b64Script}' | base64 -d > /tmp/search.js && echo '${b64Query}' | base64 -d | node /tmp/search.js`
    ];

    const resultRaw = await runCommandAsync('docker', dockerArgs, { timeout: 120000 });
    return JSON.parse(resultRaw);
  } catch (err) {
    console.error('Web search error:', err.message);
    throw new Error('Web search failed: ' + err.message);
  }
}

// POST /api/search – Perform a web search
app.post('/api/search', requireSession, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    if (!isDockerAvailable()) {
      return res.status(503).json({ success: false, error: 'Docker is not available' });
    }

    const results = await performWebSearch(query, req.sessionUser);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/providers – List available providers and their status for user
app.get('/api/providers', requireSession, async (req, res) => {
  try {
    const keys = readUserApiKeys(req.sessionUser);
    const providers = [];

    // Check local models (HuggingFace models served by Python service)
    const localModels = readLocalModels();
    if (localModels.length > 0) {
      const serviceHealthy = await checkPythonServiceHealth();
      providers.push({
        id: 'local',
        name: 'Local Model',
        model: localModels[0].id,
        models: localModels.map(m => ({ id: m.id, name: m.name })),
        available: serviceHealthy,
      });
    }

    // Check configured cloud providers
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
      startPythonProcess();
    });
    setupGracefulShutdown(server);
  });
}

module.exports = { app, createHttpsServer, saveAllData, setupGracefulShutdown, ensureAdminAccount, readUsers, writeUsers, readUniverses, writeUniverses, readSettings, writeSettings, isPrivateIP, validateOutboundUrl, validateResolvedIP, ssrfSafeUrlValidation, auditLog, validateUsername, AUDIT_LOG_FILE, createSessionToken, validateSession, invalidateSession, invalidateUserSessions, sessions, checkServerLockout, recordServerFailedAttempt, clearServerLoginAttempts, loginAttempts, validatePasswordHash, authLimiter, encryptData, decryptData, AI_PROVIDERS, VALID_PROVIDERS, sanitizeUsernameForPath, ensureWithinDir, getUserApiKeysFile, DATA_DIR, passwordChangeCooldowns, usernameChangeCooldowns, PASSWORD_CHANGE_COOLDOWN_MS, USERNAME_CHANGE_COOLDOWN_MS, checkCooldown, enhanceMessagesForThink, readLocalModels, writeLocalModels, MODELS_DIR, sendSSE, parseSSEStream, readUserIntegrations, writeUserIntegration, removeUserIntegration, containerRegistry, CONTAINERS_DIR, isDockerAvailable, deleteAllUserContainers, cleanupStaleContainers, CONTAINER_STALE_THRESHOLD_MS, REPOS_DIR, repoRegistry, readUserRepos, writeUserRepos, getUserRepoBareDir, getUserStorageBytes, deleteAllUserRepos, performArchiveRepo, performUnarchiveRepo, registerRepoInMemory, isGitAvailable, REPO_MAX_SIZE_BYTES, USER_MAX_STORAGE_BYTES, REPO_INACTIVITY_MS, MAX_ACTIVE_CONTAINERS_PER_WORKSPACE, AGENT_EXEC_TIMEOUT_MS, AGENT_MEMORIES_DIR, readAgentMemories, writeAgentMemories, MAX_MEMORY_CONTENT_LENGTH, MAX_MEMORIES_PER_REPO, startPythonProcess, stopPythonProcess, PYTHON_VENV_DIR };
