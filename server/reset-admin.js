#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Must match the constants in server.js
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const ENCRYPTION_KEY_FILE = path.join(DATA_DIR, 'encryption.key');
const AUTO_SYNC_FOLDER_NAME = 'LocalLLM Data';
const AUTO_SYNC_DATE_FILE = 'Date';
const ADMIN_USERNAME = 'admin';
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

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

async function resetAdmin() {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Read existing users (or start with empty array)
  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }

  // Remove existing admin account
  users = users.filter((u) => u.username !== ADMIN_USERNAME);

  // Generate a cryptographically random password (192 bits of entropy, ~32 URL-safe chars)
  const adminPassword = crypto.randomBytes(24).toString('base64url');

  // The Angular client pre-hashes passwords with SHA-256 before sending them to the server.
  // We replicate that transformation here so the generated password works with the login flow.
  // The resulting value is immediately passed through PBKDF2 (hashPassword) before storage;
  // the SHA-256 digest itself is never persisted.
  const clientPreHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
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

  // Write back with consistent formatting
  const usersJson = JSON.stringify(users, null, 2);
  fs.writeFileSync(USERS_FILE, usersJson, 'utf-8');

  // Also update users.json in the sync directory (if auto-sync is configured)
  updateSyncDirectory(usersJson);

  console.log('===========================================');
  console.log('  Admin account password has been reset.');
  console.log(`  Username : ${ADMIN_USERNAME}`);
  console.log(`  Password : ${adminPassword}`);
  console.log('  Change this password after first login!');
  console.log('===========================================');
  console.log('');
  console.log('If the server is currently running, restart it to');
  console.log('apply the new password and clear active admin sessions.');
}

/**
 * If auto-sync is enabled, update users.json in the sync directory and
 * refresh the Date file so the next startup pull won't overwrite the reset.
 */
function updateSyncDirectory(usersJson) {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return;
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    const syncConfig = settings.autoSync;
    if (!syncConfig || !syncConfig.enabled || !syncConfig.directory) return;

    const syncDataDir = path.join(path.resolve(syncConfig.directory), AUTO_SYNC_FOLDER_NAME);
    if (!fs.existsSync(syncDataDir)) return;

    const isEncrypted = fs.readdirSync(syncDataDir).some(f => f.endsWith('.enc'));

    if (isEncrypted) {
      const encryptedPath = path.join(syncDataDir, 'users.json.enc');
      if (!fs.existsSync(encryptedPath)) return;
      const encrypted = encryptSyncData(Buffer.from(usersJson, 'utf-8'));
      fs.writeFileSync(encryptedPath, encrypted, 'utf-8');
      console.log('[reset-admin] Updated encrypted users.json in sync directory.');
    } else {
      const syncUsersFile = path.join(syncDataDir, 'users.json');
      if (!fs.existsSync(syncUsersFile)) return;
      fs.writeFileSync(syncUsersFile, usersJson, 'utf-8');
      console.log('[reset-admin] Updated users.json in sync directory.');
    }

    // Update the sync Date file so next startup won't pull stale data
    const syncDateFile = path.join(syncDataDir, AUTO_SYNC_DATE_FILE);
    fs.writeFileSync(syncDateFile, new Date().toISOString(), 'utf-8');
  } catch (err) {
    console.warn('[reset-admin] Warning: could not update sync directory:', err.message);
  }
}

/**
 * Read the server master key from data/encryption.key.
 * Returns null if the key file doesn't exist.
 */
function getMasterKey() {
  if (process.env.ENCRYPTION_KEY) return process.env.ENCRYPTION_KEY;
  if (!fs.existsSync(ENCRYPTION_KEY_FILE)) return null;
  return fs.readFileSync(ENCRYPTION_KEY_FILE, 'utf-8').trim();
}

/**
 * Encrypt file contents with AES-256-GCM using the server master key.
 * Must match encryptSyncData in server.js.
 */
function encryptSyncData(buffer) {
  const masterKey = getMasterKey();
  if (!masterKey) throw new Error('No master key available for encryption');
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = crypto.pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

resetAdmin().catch((err) => {
  console.error('Failed to reset admin account:', err);
  process.exit(1);
});
