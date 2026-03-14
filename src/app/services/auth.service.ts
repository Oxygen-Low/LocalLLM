import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { SecurityLoggerService } from './security-logger.service';

export interface StoredUser {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface AuthSession {
  username: string;
  token: string;
  expiresAt: number;
}

interface LoginAttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const USERS_STORAGE_KEY = 'localllm_users';
const SESSION_STORAGE_KEY = 'localllm_session';
const LOGIN_ATTEMPTS_KEY = 'localllm_login_attempts';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_PASSWORD_LENGTH = 8;
const PBKDF2_ITERATIONS = 100000;

// A04/A07: Rate limiting and account lockout constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15-minute lockout

// A07: Inactivity timeout
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = signal<string | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);
  username = computed(() => this.currentUser());

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly userActivityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
  private boundResetInactivity = this.resetInactivityTimer.bind(this);

  private securityLogger = inject(SecurityLoggerService);
  private ngZone = inject(NgZone);

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) {
        return;
      }
      const session: AuthSession = JSON.parse(sessionData);
      if (session.expiresAt > Date.now()) {
        this.currentUser.set(session.username);
        this.securityLogger.log('SESSION_RESTORED', 'Session restored from storage', session.username);
        this.startInactivityTimer();
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        this.securityLogger.log('SESSION_EXPIRED', 'Expired session removed during restore');
      }
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  private getStoredUsers(): StoredUser[] {
    try {
      const data = localStorage.getItem(USERS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveUsers(users: StoredUser[]): void {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private async generateSalt(): Promise<string> {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const saltBuffer = encoder.encode(salt);
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    return Array.from(new Uint8Array(derivedBits), (b) =>
      b.toString(16).padStart(2, '0')
    ).join('');
  }

  private async generateSessionToken(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async createSession(username: string): Promise<void> {
    const token = await this.generateSessionToken();
    const session: AuthSession = {
      username,
      token,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.currentUser.set(username);
    this.startInactivityTimer();
  }

  // A04/A07: Login attempt tracking for rate limiting
  private getLoginAttempts(username: string): LoginAttemptRecord {
    try {
      const data = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
      const attempts: Record<string, LoginAttemptRecord> = data ? JSON.parse(data) : {};
      return attempts[username] ?? { count: 0, firstAttempt: 0, lockedUntil: null };
    } catch {
      return { count: 0, firstAttempt: 0, lockedUntil: null };
    }
  }

  private setLoginAttempts(username: string, record: LoginAttemptRecord): void {
    try {
      const data = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
      const attempts: Record<string, LoginAttemptRecord> = data ? JSON.parse(data) : {};
      attempts[username] = record;
      sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch {
      // Storage unavailable - silently fail
    }
  }

  private clearLoginAttempts(username: string): void {
    try {
      const data = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
      const attempts: Record<string, LoginAttemptRecord> = data ? JSON.parse(data) : {};
      delete attempts[username];
      sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch {
      // Storage unavailable - silently fail
    }
  }

  private checkRateLimit(username: string): { allowed: boolean; retryAfterSeconds?: number } {
    const record = this.getLoginAttempts(username);
    const now = Date.now();

    // Check if account is locked
    if (record.lockedUntil && record.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    // Reset if lockout has expired
    if (record.lockedUntil && record.lockedUntil <= now) {
      this.clearLoginAttempts(username);
      return { allowed: true };
    }

    // Reset if window has passed
    if (record.count > 0 && now - record.firstAttempt > LOGIN_WINDOW_MS) {
      this.clearLoginAttempts(username);
      return { allowed: true };
    }

    return { allowed: true };
  }

  private recordFailedAttempt(username: string): void {
    const record = this.getLoginAttempts(username);
    const now = Date.now();

    // Reset window if expired
    if (record.count > 0 && now - record.firstAttempt > LOGIN_WINDOW_MS) {
      record.count = 0;
      record.firstAttempt = now;
    }

    if (record.count === 0) {
      record.firstAttempt = now;
    }

    record.count++;

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      this.securityLogger.log('ACCOUNT_LOCKED', `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts`, username);
    }

    this.setLoginAttempts(username, record);
  }

  getRemainingAttempts(username: string): number {
    const record = this.getLoginAttempts(username);
    const now = Date.now();

    if (record.lockedUntil && record.lockedUntil > now) {
      return 0;
    }

    if (record.count > 0 && now - record.firstAttempt > LOGIN_WINDOW_MS) {
      return MAX_LOGIN_ATTEMPTS;
    }

    return Math.max(0, MAX_LOGIN_ATTEMPTS - record.count);
  }

  // A07: Inactivity timer management
  private startInactivityTimer(): void {
    this.stopInactivityTimer();

    this.ngZone.runOutsideAngular(() => {
      for (const event of this.userActivityEvents) {
        document.addEventListener(event, this.boundResetInactivity, { passive: true });
      }
      this.inactivityTimer = setTimeout(() => this.handleInactivityTimeout(), INACTIVITY_TIMEOUT_MS);
    });
  }

  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    for (const event of this.userActivityEvents) {
      document.removeEventListener(event, this.boundResetInactivity);
    }
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.ngZone.runOutsideAngular(() => {
      this.inactivityTimer = setTimeout(() => this.handleInactivityTimeout(), INACTIVITY_TIMEOUT_MS);
    });
  }

  private handleInactivityTimeout(): void {
    this.ngZone.run(() => {
      if (this.isAuthenticated()) {
        const user = this.username();
        this.securityLogger.log('INACTIVITY_LOGOUT', 'User logged out due to inactivity', user ?? undefined);
        this.logout();
      }
    });
  }

  validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    return errors;
  }

  validateUsername(username: string): string[] {
    const errors: string[] = [];
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    if (username.length > 30) {
      errors.push('Username must be at most 30 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, hyphens, and underscores');
    }
    return errors;
  }

  async signup(
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const usernameErrors = this.validateUsername(username);
    if (usernameErrors.length > 0) {
      this.securityLogger.log('SIGNUP_FAILURE', `Validation failed: ${usernameErrors[0]}`, username);
      return { success: false, error: usernameErrors[0] };
    }

    const passwordErrors = this.validatePassword(password);
    if (passwordErrors.length > 0) {
      this.securityLogger.log('SIGNUP_FAILURE', 'Password validation failed', username);
      return { success: false, error: passwordErrors[0] };
    }

    const users = this.getStoredUsers();
    const normalizedUsername = username.toLowerCase();

    if (users.some((u) => u.username === normalizedUsername)) {
      this.securityLogger.log('SIGNUP_FAILURE', 'Username already exists', normalizedUsername);
      return { success: false, error: 'Username already exists' };
    }

    const salt = await this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);

    const newUser: StoredUser = {
      username: normalizedUsername,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    await this.createSession(normalizedUsername);
    this.securityLogger.log('SIGNUP_SUCCESS', 'New account created', normalizedUsername);

    return { success: true };
  }

  async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const normalizedUsername = username.toLowerCase();

    // A04/A07: Check rate limit before processing login
    const rateCheck = this.checkRateLimit(normalizedUsername);
    if (!rateCheck.allowed) {
      this.securityLogger.log('LOGIN_RATE_LIMITED', `Login blocked - retry after ${rateCheck.retryAfterSeconds}s`, normalizedUsername);
      const minutes = Math.ceil((rateCheck.retryAfterSeconds ?? 0) / 60);
      return {
        success: false,
        error: `Account temporarily locked. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
      };
    }

    const users = this.getStoredUsers();
    const user = users.find(
      (u) => u.username === normalizedUsername
    );

    if (!user) {
      this.recordFailedAttempt(normalizedUsername);
      this.securityLogger.log('LOGIN_FAILURE', 'Invalid credentials', normalizedUsername);
      return { success: false, error: 'Invalid username or password' };
    }

    const passwordHash = await this.hashPassword(password, user.salt);

    if (passwordHash !== user.passwordHash) {
      this.recordFailedAttempt(normalizedUsername);
      this.securityLogger.log('LOGIN_FAILURE', 'Invalid credentials', normalizedUsername);
      return { success: false, error: 'Invalid username or password' };
    }

    // Clear failed attempts on successful login
    this.clearLoginAttempts(normalizedUsername);

    await this.createSession(user.username);
    this.securityLogger.log('LOGIN_SUCCESS', 'User logged in successfully', user.username);
    return { success: true };
  }

  logout(): void {
    const user = this.username();
    this.stopInactivityTimer();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    this.currentUser.set(null);
    this.securityLogger.log('LOGOUT', 'User logged out', user ?? undefined);
  }
}
