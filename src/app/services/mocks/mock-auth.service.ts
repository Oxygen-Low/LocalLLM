import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MockAuthService {
  private currentUser = signal<string | null>('demo_user');
  isAuthenticated = computed(() => true);
  username = computed(() => 'demo_user');
  isAdmin = computed(() => true);
  passwordResetRequired = signal(false);

  getSessionToken(): string | null {
    return 'mock-token';
  }

  getSessionServerId(): string | null {
    return 'mock-server-id';
  }

  async hashPassword(password: string): Promise<string> {
    return 'mock-hash';
  }

  getRemainingAttempts(username: string): number {
    return 5;
  }

  validatePassword(password: string): string[] {
    return [];
  }

  validateUsername(username: string): string[] {
    return [];
  }

  async signup(username: string, password: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async login(username: string, password: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  logout(): void {
    console.log('Mock Logout');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async changeUsername(newUsername: string): Promise<{ success: boolean; username: string }> {
    return { success: true, username: newUsername };
  }

  async deleteAccount(password: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}
