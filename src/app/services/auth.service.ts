import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { SecurityLoggerService } from './security-logger.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthSession {
  username: string;
  token: string;
  expiresAt: number;
  passwordResetRequired?: boolean;
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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = signal<string | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);
  username = computed(() => this.currentUser());
  isAdmin = computed(() => this.currentUser() === 'admin');
  passwordResetRequired = signal(false);

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
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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

  private async generateSessionToken(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async createSession(username: string, passwordResetRequired = false): Promise<void> {
    const token = await this.generateSessionToken();
    const session: AuthSession = {
      username,
      token,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      passwordResetRequired,
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

  private async checkPasswordResetStatus(): Promise<void> {
    const user = this.username();
    if (!user) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; passwordResetRequired: boolean }>(
          `${environment.apiUrl}/api/auth/password-reset-status`,
          {
            params: { username: user },
          }
        )
      );

      if (response.success) {
        const required = !!response.passwordResetRequired;
        this.passwordResetRequired.set(required);
      }
    } catch {
      // Silent failure to avoid impacting UX on network issues
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
        await this.createSession(response.username);
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
        await this.createSession(response.username, !!response.passwordResetRequired);
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
    this.stopInactivityTimer();
    this.stopPasswordResetMonitor();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    this.currentUser.set(null);
    this.passwordResetRequired.set(false);
    this.securityLogger.log('LOGOUT', 'User logged out', user ?? undefined);
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.username();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const passwordErrors = this.validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return { success: false, error: passwordErrors[0] };
    }

    try {
      const hashedCurrentPassword = await this.hashPassword(currentPassword);
      const hashedNewPassword = await this.hashPassword(newPassword);
      const response = await firstValueFrom(
        this.http.put<AuthResponse>(`${environment.apiUrl}/api/auth/change-password`, {
          username: user,
          currentPassword: hashedCurrentPassword,
          newPassword: hashedNewPassword,
        })
      );

      if (response.success) {
        this.securityLogger.log('PASSWORD_CHANGED', 'Password changed successfully', user);
        this.passwordResetRequired.set(false);
        return { success: true };
      }

      return { success: false, error: response.error };
    } catch (err: unknown) {
      const error = err as { error?: AuthResponse; status?: number };
      const message = error.error?.error ?? 'Failed to change password. Please try again.';
      this.securityLogger.log('PASSWORD_CHANGE_FAILURE', message, user);
      return { success: false, error: message };
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
          body: { username: user, password: hashedPassword },
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
