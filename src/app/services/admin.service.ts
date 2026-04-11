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
  koboldEnabled?: boolean;
  ollamaEnabled?: boolean;
  maxDatasetTokensGB?: number;
}

export interface AutoSyncConfig {
  enabled: boolean;
  directory: string;
  excludeModels: boolean;
  encrypt: boolean;
}

export interface AutoSyncStatusResponse {
  success: boolean;
  error?: string;
  autoSync?: AutoSyncConfig;
  status?: { lastSync: string | null; lastError: string | null; syncing: boolean };
  hasExistingData?: boolean;
  remoteDate?: string | null;
}

export interface AutoSyncTriggerResponse {
  success: boolean;
  error?: string;
  direction?: string;
  timestamp?: string;
}

export interface AutoSyncImportResponse {
  success: boolean;
  error?: string;
  importedDate?: string;
}

export interface McpServer {
  id: string;
  name: string;
  image: string;
  description: string;
  enabled: boolean;
  authRequired: boolean;
  authDescription: string;
  authEnvVar: string;
  createdAt: string;
}

interface McpServerListResponse {
  success: boolean;
  error?: string;
  servers?: McpServer[];
}

interface McpServerResponse {
  success: boolean;
  error?: string;
  server?: McpServer;
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

  async setKoboldEnabled(enabled: boolean, adminPasswordHash: string): Promise<AppSettingsResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AppSettingsResponse>(`${environment.apiUrl}/api/admin/settings/kobold`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          enabled,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to update Kobold.cpp settings' };
    }
  }

  async setOllamaEnabled(enabled: boolean, adminPasswordHash: string): Promise<AppSettingsResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AppSettingsResponse>(`${environment.apiUrl}/api/admin/settings/ollama`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          enabled,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to update Ollama settings' };
    }
  }

  async setDatasetTokenLimit(maxDatasetTokensGB: number, adminPasswordHash: string): Promise<AppSettingsResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AppSettingsResponse>(`${environment.apiUrl}/api/admin/settings/dataset-token-limit`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          maxDatasetTokensGB,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to update dataset token limit' };
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

  async downloadModel(repoId: string, name: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string; downloadId?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string; downloadId?: string }>(`${environment.apiUrl}/api/admin/models`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          repoId,
          name,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to start model download' };
    }
  }

  async getDownloadStatus(downloadId: string, adminPasswordHash: string): Promise<{
    success: boolean;
    error?: string;
    status?: string;
    downloadedFiles?: number;
    totalFiles?: number;
    model?: LocalModel;
  }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{
          success: boolean;
          error?: string;
          status?: string;
          downloadedFiles?: number;
          totalFiles?: number;
          model?: LocalModel;
        }>(`${environment.apiUrl}/api/admin/models/download-status`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          downloadId,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to get download status' };
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

  // --- Auto-Sync ---

  async setAutoSync(config: { enabled: boolean; directory: string; excludeModels: boolean; encrypt: boolean }, adminPasswordHash: string): Promise<{ success: boolean; error?: string; autoSync?: AutoSyncConfig }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string; autoSync?: AutoSyncConfig }>(`${environment.apiUrl}/api/admin/settings/auto-sync`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          ...config,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to update auto-sync settings' };
    }
  }

  async getAutoSyncStatus(adminPasswordHash: string): Promise<AutoSyncStatusResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AutoSyncStatusResponse>(`${environment.apiUrl}/api/admin/auto-sync/status`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to get auto-sync status' };
    }
  }

  async triggerAutoSync(direction: string, adminPasswordHash: string): Promise<AutoSyncTriggerResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AutoSyncTriggerResponse>(`${environment.apiUrl}/api/admin/auto-sync/trigger`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          direction,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to trigger auto-sync' };
    }
  }

  async importAutoSync(directory: string, adminPasswordHash: string): Promise<AutoSyncImportResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AutoSyncImportResponse>(`${environment.apiUrl}/api/admin/auto-sync/import`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          directory,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to import sync data' };
    }
  }

  // --- MCP Server Management ---

  async listMcpServers(adminPasswordHash: string): Promise<McpServerListResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<McpServerListResponse>(`${environment.apiUrl}/api/admin/mcp-servers/list`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to list MCP servers' };
    }
  }

  async addMcpServer(
    server: { name: string; image: string; description?: string; authRequired?: boolean; authDescription?: string; authEnvVar?: string },
    adminPasswordHash: string
  ): Promise<McpServerResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<McpServerResponse>(`${environment.apiUrl}/api/admin/mcp-servers`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          ...server,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to add MCP server' };
    }
  }

  async updateMcpServer(
    serverId: string,
    updates: { name?: string; image?: string; description?: string; enabled?: boolean; authRequired?: boolean; authDescription?: string; authEnvVar?: string },
    adminPasswordHash: string
  ): Promise<McpServerResponse> {
    try {
      const response = await firstValueFrom(
        this.http.put<McpServerResponse>(`${environment.apiUrl}/api/admin/mcp-servers/${serverId}`, {
          adminUsername: this.authService.username(),
          adminPassword: adminPasswordHash,
          ...updates,
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to update MCP server' };
    }
  }

  async deleteMcpServer(serverId: string, adminPasswordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.delete<{ success: boolean; error?: string }>(`${environment.apiUrl}/api/admin/mcp-servers/${serverId}`, {
          body: {
            adminUsername: this.authService.username(),
            adminPassword: adminPasswordHash,
          },
        })
      );
      return response;
    } catch (error: unknown) {
      return { success: false, error: (error as { error?: { error?: string } }).error?.error ?? 'Failed to delete MCP server' };
    }
  }
}
