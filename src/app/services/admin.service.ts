import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface AdminUserSummary {
  username: string;
  createdAt?: string;
  passwordResetRequired?: boolean;
}

interface AdminListResponse {
  success: boolean;
  error?: string;
  users?: AdminUserSummary[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  async listUsers(adminPasswordHash: string): Promise<AdminListResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AdminListResponse>(`${environment.apiUrl}/api/admin/users/list`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to load users' };
    }
  }

  async resetPassword(username: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string }>(`${environment.apiUrl}/api/admin/users/reset-password`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          username,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to reset password' };
    }
  }

  async deleteUser(username: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string }>(`${environment.apiUrl}/api/admin/users/delete`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          username,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to delete account' };
    }
  }
}
