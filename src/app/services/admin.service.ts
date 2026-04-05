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

export interface Character {
  id: string;
  name: string;
  description: string;
}

export interface Universe {
  id: string;
  name: string;
  description?: string;
  characters: Character[];
}

export interface LocalModel {
  id: string;
  name: string;
  huggingFaceId: string;
  directory: string;
  filename?: string;
  type?: 'transformers' | 'gguf';
  size: number;
  downloadedAt: string;
}

interface AdminListResponse {
  success: boolean;
  error?: string;
  users?: AdminUserSummary[];
}

interface AdminUniversesResponse {
  success: boolean;
  error?: string;
  universes?: Universe[];
}

interface AppSettingsResponse {
  success: boolean;
  error?: string;
  riskyAppsEnabled?: boolean;
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

  // --- Universes ---

  async listUniverses(adminPasswordHash: string): Promise<AdminUniversesResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AdminUniversesResponse>(`${environment.apiUrl}/api/admin/universes/list`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to load universes' };
    }
  }

  async createUniverse(name: string, description: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string; universe?: Universe }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string; universe?: Universe }>(`${environment.apiUrl}/api/admin/universes`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          name,
          description,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to create universe' };
    }
  }

  async updateUniverse(universeId: string, name: string, description: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string; universe?: Universe }> {
    try {
      const response = await firstValueFrom(
        this.http.put<{ success: boolean; error?: string; universe?: Universe }>(`${environment.apiUrl}/api/admin/universes/${universeId}`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          name,
          description,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to update universe' };
    }
  }

  async deleteUniverse(universeId: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.delete<{ success: boolean; error?: string }>(`${environment.apiUrl}/api/admin/universes/${universeId}`, {
          body: {
            adminUsername: this.authService.username(),
            adminPassword: adminPasswordHash,
          },
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to delete universe' };
    }
  }

  // --- Characters ---

  async createCharacter(universeId: string, name: string, description: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string; character?: Character }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string; character?: Character }>(`${environment.apiUrl}/api/admin/universes/${universeId}/characters`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          name,
          description,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to create character' };
    }
  }

  async updateCharacter(universeId: string, characterId: string, name: string, description: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string; character?: Character }> {
    try {
      const response = await firstValueFrom(
        this.http.put<{ success: boolean; error?: string; character?: Character }>(`${environment.apiUrl}/api/admin/universes/${universeId}/characters/${characterId}`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          name,
          description,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to update character' };
    }
  }

  async deleteCharacter(universeId: string, characterId: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.delete<{ success: boolean; error?: string }>(`${environment.apiUrl}/api/admin/universes/${universeId}/characters/${characterId}`, {
          body: {
            adminUsername: this.authService.username(),
            adminPassword: adminPasswordHash,
          },
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to delete character' };
    }
  }

  // --- App Settings ---

  async getRiskyAppsEnabled(): Promise<AppSettingsResponse> {
    try {
      const response = await firstValueFrom(
        this.http.get<AppSettingsResponse>(`${environment.apiUrl}/api/settings/apps`)
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to load app settings' };
    }
  }

  async setRiskyAppsEnabled(enabled: boolean, adminPasswordHash: string): Promise<AppSettingsResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AppSettingsResponse>(`${environment.apiUrl}/api/admin/settings/risky-apps`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          enabled,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to update app settings' };
    }
  }

  // --- LLM Models ---

  async listModels(adminPasswordHash: string): Promise<{ success: boolean; error?: string; models?: LocalModel[] }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string; models?: LocalModel[] }>(`${environment.apiUrl}/api/admin/models/list`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to load models' };
    }
  }

  async downloadModel(repoId: string, name: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string; model?: LocalModel }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string; model?: LocalModel }>(`${environment.apiUrl}/api/admin/models`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          repoId,
          name,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to download model' };
    }
  }

  async deleteModel(modelId: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.delete<{ success: boolean; error?: string }>(`${environment.apiUrl}/api/admin/models/${modelId}`, {
          body: {
            adminUsername: this.authService.username(),
            adminPassword: adminPasswordHash,
          },
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to delete model' };
    }
  }

  async uploadModel(file: File, name: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string; model?: LocalModel }> {
    try {
      const formData = new FormData();
      formData.append('model', file);
      if (name) {
        formData.append('name', name);
      }
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string; model?: LocalModel }>(
          `${environment.apiUrl}/api/admin/models/upload`,
          formData,
          {
            headers: {
              'X-Admin-Username': this.authService.username() ?? '',
              'X-Admin-Password': adminPasswordHash,
            },
          }
        )
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to upload model' };
    }
  }
}
