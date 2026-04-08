import { Injectable } from '@angular/core';
import { AdminUserSummary, AdminService, Universe, Character } from '../admin.service';

@Injectable({
  providedIn: 'root',
})
export class MockAdminService {
  async listUsers(): Promise<{ success: boolean; users: AdminUserSummary[] }> {
    return {
      success: true,
      users: [
        { username: 'admin', createdAt: new Date().toISOString(), passwordResetRequired: false },
        { username: 'demo_user', createdAt: new Date().toISOString(), passwordResetRequired: false },
      ],
    };
  }

  async resetPassword(): Promise<{ success: boolean }> { return { success: true }; }
  async deleteUser(): Promise<{ success: boolean }> { return { success: true }; }

  async listUniverses(): Promise<{ success: boolean; universes: Universe[] }> {
    return {
      success: true,
      universes: [
        {
          id: '1',
          name: 'Preview Universe',
          characters: [
            { id: '1', name: 'Assistant', description: 'A helpful assistant' }
          ]
        }
      ],
    };
  }

  async createUniverse(name: string): Promise<{ success: boolean; universe: Universe }> {
    return { success: true, universe: { id: '2', name, characters: [] } };
  }
  async updateUniverse(id: string, name: string): Promise<{ success: boolean; universe: Universe }> {
    return { success: true, universe: { id, name, characters: [] } };
  }
  async deleteUniverse(): Promise<{ success: boolean }> { return { success: true }; }

  async createCharacter(uId: string, name: string, description: string): Promise<{ success: boolean; character: Character }> {
    return { success: true, character: { id: '2', name, description } };
  }
  async updateCharacter(uId: string, cId: string, name: string, description: string): Promise<{ success: boolean; character: Character }> {
    return { success: true, character: { id: cId, name, description } };
  }
  async deleteCharacter(): Promise<{ success: boolean }> { return { success: true }; }

  async getRiskyAppsEnabled(): Promise<{ success: boolean; riskyAppsEnabled: boolean; koboldEnabled: boolean; ollamaEnabled: boolean; maxDatasetTokensGB: number }> {
    return { success: true, riskyAppsEnabled: true, koboldEnabled: false, ollamaEnabled: false, maxDatasetTokensGB: 40 };
  }
  async setRiskyAppsEnabled(enabled: boolean): Promise<{ success: boolean; riskyAppsEnabled: boolean }> {
    return { success: true, riskyAppsEnabled: enabled };
  }
  async setKoboldEnabled(enabled: boolean): Promise<{ success: boolean; koboldEnabled: boolean }> {
    return { success: true, koboldEnabled: enabled };
  }
  async setOllamaEnabled(enabled: boolean): Promise<{ success: boolean; ollamaEnabled: boolean }> {
    return { success: true, ollamaEnabled: enabled };
  }
  async setDatasetTokenLimit(maxDatasetTokensGB: number): Promise<{ success: boolean; maxDatasetTokensGB: number }> {
    return { success: true, maxDatasetTokensGB };
  }
}
