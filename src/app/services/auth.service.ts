import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { SecurityLoggerService } from './security-logger.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthSession {
  username: string;
  expiresAt: number;
  passwordResetRequired?: boolean;
  token?: string;
  serverId?: string;
}

interface LoginAttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  username?: string;
  passwordResetRequired?: boolean;
  token?: string;
  retryAfterSeconds?: number;
  instanceId?: string;
}

const SESSION_STORAGE_KEY = 'localllm_session';
const LOGIN_ATTEMPTS_KEY = 'localllm_login_attempts';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_PASSWORD_LENGTH = 8;

// A04/A07: Rate limiting and account lockout constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15-minute lockout

// A07: Inactivity timeout
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Pure JavaScript SHA-256 fallback for non-secure contexts where crypto.subtle
 * is unavailable (plain HTTP on non-localhost). This ensures password pre-hashing
 * works regardless of the connection type.
 */
async function sha256Fallback(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // SHA-256 constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // Initial hash values: first 32 bits of the fractional parts of the square roots of the first 8 primes
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  // Pre-processing: add padding
  const bitLen = data.length * 8;
  const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64);
  padded.set(data);
  padded[data.length] = 0x80;
  // Append original length in bits as 64-bit big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);

  // Process each 512-bit (64-byte) block
  for (let offset = 0; offset < padded.length; offset += 64) {
    const W = new Array<number>(64);
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (((W[i - 15] >>> 7) | (W[i - 15] << 25)) ^ ((W[i - 15] >>> 18) | (W[i - 15] << 14)) ^ (W[i - 15] >>> 3)) >>> 0;
      const s1 = (((W[i - 2] >>> 17) | (W[i - 2] << 15)) ^ ((W[i - 2] >>> 19) | (W[i - 2] << 13)) ^ (W[i - 2] >>> 10)) >>> 0;
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(v => v.toString(16).padStart(8, '0'))
    .join('');
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = signal<string | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);
  username = computed(() => this.currentUser());
  isAdmin = computed(() => this.currentUser() === 'admin');
  passwordResetRequired = signal(false);

  /** SOC2 CC6.1: Returns the server-issued session token for authenticated API requests */
  getSessionToken(): string | null {
    try {
      const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) return null;
      const session: AuthSession = JSON.parse(sessionData);
      return session.token ?? null;
    } catch {
      return null;
    }
  }

  /** Returns the server ID associated with the current session */
  getSessionServerId(): string | null {
    try {
      const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) return null;
      const session: AuthSession = JSON.parse(sessionData);
      return session.serverId ?? null;
    } catch {
      return null;
    }
  }

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly userActivityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
  private boundResetInactivity = this.resetInactivityTimer.bind(this);
  private passwordResetCheckInterval: ReturnType<typeof setInterval> | null = null;

  private securityLogger = inject(SecurityLoggerService);
  private ngZone = inject(NgZone);
  private http = inject(HttpClient);

  constructor() {
    this.restoreSession();
  }

  async hashPassword(password: string): Promise<string> {
    if (crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for non-secure contexts (plain HTTP on non-localhost)
    return sha256Fallback(password);
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
        this.passwordResetRequired.set(!!session.passwordResetRequired);
        this.securityLogger.log('SESSION_RESTORED', 'Session restored from storage', session.username);
        this.startInactivityTimer();
        this.startPasswordResetMonitor();
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        this.securityLogger.log('SESSION_EXPIRED', 'Expired session removed during restore');
      }
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  private async createSession(username: string, passwordResetRequired = false, token?: string, serverId?: string): Promise<void> {
    const session: AuthSession = {
      username,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      passwordResetRequired,
      token,
      serverId,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.currentUser.set(username);
    this.passwordResetRequired.set(passwordResetRequired);
    this.startInactivityTimer();
    this.startPasswordResetMonitor();
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

  private startPasswordResetMonitor(): void {
    this.stopPasswordResetMonitor();
    if (!this.isAuthenticated()) {
      return;
    }

    // Check immediately, then every minute
    void this.checkPasswordResetStatus();
    this.passwordResetCheckInterval = setInterval(() => {
      void this.checkPasswordResetStatus();
    }, 60_000);
  }

  private stopPasswordResetMonitor(): void {
    if (this.passwordResetCheckInterval) {
      clearInterval(this.passwordResetCheckInterval);
      this.passwordResetCheckInterval = null;
    }
  }

  private updateSessionPasswordResetFlag(required: boolean): void {
    try {
      const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) return;
      const session: AuthSession = JSON.parse(sessionData);
      session.passwordResetRequired = required;
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable - silently fail
    }
  }

  private async checkPasswordResetStatus(): Promise<void> {
    const user = this.username();
    if (!user) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; passwordResetRequired: boolean }>(
          `${environment.apiUrl}/api/auth/password-reset-status`
        )
      );

      if (response.success) {
        const required = !!response.passwordResetRequired;
        this.passwordResetRequired.set(required);
        this.updateSessionPasswordResetFlag(required);
      }
    } catch (error) {
      // A 401 response means the session is invalid or expired
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.securityLogger.log('SESSION_EXPIRED', 'Session invalidated during status check', user);
        this.logout();
      }
      // Other errors (network, 500) stay silent to avoid impacting UX
    }
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

    try {
      const hashedPassword = await this.hashPassword(password);
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/signup`, { username, password: hashedPassword })
      );

      if (response.success && response.username) {
        await this.createSession(response.username, false, response.token, response.instanceId);
        this.securityLogger.log('SIGNUP_SUCCESS', 'New account created', response.username);
        return { success: true };
      }

      this.securityLogger.log('SIGNUP_FAILURE', response.error ?? 'Unknown error', username);
      return { success: false, error: response.error };
    } catch (err: unknown) {
      const error = err as { error?: AuthResponse; status?: number };
      const message = error.error?.error ?? 'Failed to create account. Please try again.';
      this.securityLogger.log('SIGNUP_FAILURE', message, username);
      return { success: false, error: message };
    }
  }

  async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string; passwordResetRequired?: boolean }> {
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

    try {
      const hashedPassword = await this.hashPassword(password);
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, { username, password: hashedPassword })
      );

      if (response.success && response.username) {
        this.clearLoginAttempts(normalizedUsername);
        await this.createSession(response.username, !!response.passwordResetRequired, response.token, response.instanceId);
        this.securityLogger.log('LOGIN_SUCCESS', 'User logged in successfully', response.username);
        return { success: true, passwordResetRequired: !!response.passwordResetRequired };
      }

      this.recordFailedAttempt(normalizedUsername);
      this.securityLogger.log('LOGIN_FAILURE', 'Invalid credentials', normalizedUsername);
      return { success: false, error: 'Invalid username or password' };
    } catch (error) {
      this.recordFailedAttempt(normalizedUsername);

      if (error instanceof HttpErrorResponse && error.status > 0) {
        this.securityLogger.log('LOGIN_FAILURE', 'Invalid credentials', normalizedUsername);
        return { success: false, error: 'Invalid username or password' };
      }

      this.securityLogger.log('LOGIN_FAILURE', 'Connection failed to server', normalizedUsername);
      return { success: false, error: 'Connection failed to server' };
    }
  }

  logout(): void {
    const user = this.username();
    const token = this.getSessionToken();
    this.stopInactivityTimer();
    this.stopPasswordResetMonitor();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    this.currentUser.set(null);
    this.passwordResetRequired.set(false);
    this.securityLogger.log('LOGOUT', 'User logged out', user ?? undefined);

    // SOC2 CC6.3: Invalidate server-side session (fire-and-forget).
    // Client state is already cleared above, so a new login will issue a fresh token
    // even if this request fails. Not awaiting avoids blocking the UI on network issues.
    if (token) {
      firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/auth/logout`, {})
      ).catch(() => {
        // Silent failure – session is already cleared client-side
      });
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string; retryAfterSeconds?: number }> {
    const user = this.username();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const passwordErrors = this.validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return { success: false, error: passwordErrors[0] };
    }

    try {
      const hashedNewPassword = await this.hashPassword(newPassword);
      const body: { newPassword: string; currentPassword?: string } = { newPassword: hashedNewPassword };
      if (currentPassword) {
        body.currentPassword = await this.hashPassword(currentPassword);
      }
      const response = await firstValueFrom(
        this.http.put<AuthResponse>(`${environment.apiUrl}/api/auth/change-password`, body)
      );

      if (response.success) {
        this.securityLogger.log('PASSWORD_CHANGED', 'Password changed successfully', user);
        this.passwordResetRequired.set(false);
        this.updateSessionPasswordResetFlag(false);
        return { success: true };
      }

      return { success: false, error: response.error, retryAfterSeconds: response.retryAfterSeconds };
    } catch (err: unknown) {
      const error = err as { error?: AuthResponse; status?: number };
      const message = error.error?.error ?? 'Failed to change password. Please try again.';
      const retryAfterSeconds = error.error?.retryAfterSeconds;
      this.securityLogger.log('PASSWORD_CHANGE_FAILURE', message, user);
      return { success: false, error: message, retryAfterSeconds };
    }
  }

  async changeUsername(
    newUsername: string
  ): Promise<{ success: boolean; error?: string; retryAfterSeconds?: number }> {
    const user = this.username();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const usernameErrors = this.validateUsername(newUsername);
    if (usernameErrors.length > 0) {
      return { success: false, error: usernameErrors[0] };
    }

    try {
      const response = await firstValueFrom(
        this.http.put<AuthResponse>(`${environment.apiUrl}/api/auth/change-username`, {
          newUsername,
        })
      );

      if (response.success && response.username) {
        this.securityLogger.log('USERNAME_CHANGED', 'Username changed successfully', response.username);
        await this.createSession(response.username, this.passwordResetRequired(), response.token, response.instanceId);
        return { success: true };
      }

      return { success: false, error: response.error, retryAfterSeconds: response.retryAfterSeconds };
    } catch (err: unknown) {
      const error = err as { error?: AuthResponse; status?: number };
      const message = error.error?.error ?? 'Failed to change username. Please try again.';
      const retryAfterSeconds = error.error?.retryAfterSeconds;
      this.securityLogger.log('USERNAME_CHANGE_FAILURE', message, user);
      return { success: false, error: message, retryAfterSeconds };
    }
  }

  async deleteAccount(
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.username();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const hashedPassword = await this.hashPassword(password);
      const response = await firstValueFrom(
        this.http.delete<AuthResponse>(`${environment.apiUrl}/api/auth/account`, {
          body: { password: hashedPassword },
        })
      );

      if (response.success) {
        this.securityLogger.log('ACCOUNT_DELETED', 'Account deleted', user);
         this.logout();
         return { success: true };
      }

      return { success: false, error: response.error };
    } catch (err: unknown) {
      const error = err as { error?: AuthResponse; status?: number };
      const message = error.error?.error ?? 'Failed to delete account. Please try again.';
      this.securityLogger.log('ACCOUNT_DELETE_FAILURE', message, user);
      return { success: false, error: message };
    }
  }
}
