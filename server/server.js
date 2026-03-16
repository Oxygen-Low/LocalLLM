const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { rateLimit } = require('express-rate-limit');
const selfsigned = require('selfsigned');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

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

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());
app.use('/api', apiLimiter);

// Content-Security-Policy header
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
});

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
  return hash === adminUser.passwordHash;
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

    const normalizedUsername = normalizeUsername(username);
    const users = readUsers();

    if (users.some((u) => u.username === normalizedUsername)) {
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
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const passwordHash = await hashPassword(password, user.salt);

    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

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

    if (currentHash !== user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    // Verify new password differs from current password using the same salt
    const newPasswordWithOldSalt = await hashPassword(newPassword, user.salt);
    if (newPasswordWithOldSalt === user.passwordHash) {
      return res.status(400).json({ success: false, error: 'New password must be different from current password' });
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);

    users[userIndex] = { ...user, passwordHash: newHash, salt: newSalt, passwordResetRequired: false };
    writeUsers(users);

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

    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    users.splice(userIndex, 1);
    writeUsers(users);

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
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const users = readUsers().map((u) => ({
      username: u.username,
      createdAt: u.createdAt,
      passwordResetRequired: !!u.passwordResetRequired,
    }));

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

module.exports = { app, createHttpsServer, saveAllData, setupGracefulShutdown, ensureAdminAccount, readUsers, writeUsers };
