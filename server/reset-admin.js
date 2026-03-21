#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Must match the constants in server.js
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_USERNAME = 'admin';
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

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
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

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

resetAdmin().catch((err) => {
  console.error('Failed to reset admin account:', err);
  process.exit(1);
});
