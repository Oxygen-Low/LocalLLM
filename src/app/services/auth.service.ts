import { Injectable, signal, computed } from '@angular/core';

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

const USERS_STORAGE_KEY = 'localllm_users';
const SESSION_STORAGE_KEY = 'localllm_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_PASSWORD_LENGTH = 8;
const PBKDF2_ITERATIONS = 100000;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = signal<string | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);
  username = computed(() => this.currentUser());

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
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
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
      return { success: false, error: usernameErrors[0] };
    }

    const passwordErrors = this.validatePassword(password);
    if (passwordErrors.length > 0) {
      return { success: false, error: passwordErrors[0] };
    }

    const users = this.getStoredUsers();
    const normalizedUsername = username.toLowerCase();

    if (users.some((u) => u.username.toLowerCase() === normalizedUsername)) {
      return { success: false, error: 'Username already exists' };
    }

    const salt = await this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);

    const newUser: StoredUser = {
      username,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    await this.createSession(username);

    return { success: true };
  }

  async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const users = this.getStoredUsers();
    const normalizedUsername = username.toLowerCase();
    const user = users.find(
      (u) => u.username.toLowerCase() === normalizedUsername
    );

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const passwordHash = await this.hashPassword(password, user.salt);

    if (passwordHash !== user.passwordHash) {
      return { success: false, error: 'Invalid username or password' };
    }

    await this.createSession(user.username);
    return { success: true };
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    this.currentUser.set(null);
  }
}
