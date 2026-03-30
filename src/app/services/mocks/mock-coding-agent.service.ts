import { Injectable } from '@angular/core';
import {
  ContainerInfo,
  CodingAgentService,
  GitHubRepo,
  LocalRepoInfo,
  FileEntry,
  AgentMemory
} from '../coding-agent.service';

@Injectable({
  providedIn: 'root',
})
export class MockCodingAgentService {
  async getGitHubStatus(): Promise<{ configured: boolean; username: string | null }> {
    return { configured: true, username: 'demo_user' };
  }
  async setGitHubToken(token: string): Promise<{ username: string }> {
    return { username: 'demo_user' };
  }
  async removeGitHubToken(): Promise<void> {}
  async getGitHubRepos(): Promise<GitHubRepo[]> { return []; }

  async getLocalRepos(): Promise<LocalRepoInfo[]> {
    return [
      {
        id: '1',
        name: 'Demo Project',
        description: 'An example repository for the preview.',
        status: 'active',
        defaultBranch: 'main',
        createdAt: new Date().toISOString(),
        lastActivity: Date.now(),
      }
    ];
  }

  async getDockerStatus(): Promise<{ available: boolean }> {
    return { available: true };
  }

  async createContainer(): Promise<ContainerInfo> {
    return this.getMockContainer('1');
  }
  async createLocalRepoContainer(): Promise<ContainerInfo> {
    return this.getMockContainer('1');
  }
  async listContainers(): Promise<ContainerInfo[]> {
    return [this.getMockContainer('1')];
  }
  async getContainer(id: string): Promise<ContainerInfo> {
    return this.getMockContainer(id);
  }
  async stopContainer(): Promise<void> {}
  async startContainer(): Promise<void> {}
  async removeContainer(): Promise<void> {}

  async execInContainer(): Promise<{ output: string }> {
    return { output: 'Mock output from container.' };
  }

  async listFiles(): Promise<FileEntry[]> {
    return [
      { name: 'src', type: 'directory' },
      { name: 'package.json', type: 'file' },
      { name: 'README.md', type: 'file' },
    ];
  }
  async readFile(): Promise<string> {
    return '# Demo Project\n\nThis is a mock file content for the preview mode.';
  }
  async writeFile(): Promise<void> {}

  async agentExec(): Promise<{ output: string }> {
    return { output: 'Agent executed mock command.' };
  }

  async getMemories(): Promise<AgentMemory[]> { return []; }
  async addMemory(): Promise<AgentMemory> {
     return { id: '1', content: 'Mock memory', createdAt: new Date().toISOString() };
  }
  async deleteMemory(): Promise<void> {}

  private getMockContainer(id: string): ContainerInfo {
    return {
      id,
      dockerId: 'mock-docker-id',
      dockerName: 'mock-container',
      repoFullName: 'demo/project',
      branch: 'main',
      mode: 'manual',
      status: 'running',
      createdAt: new Date().toISOString(),
      lastActivity: Date.now(),
      localRepoId: '1',
    };
  }
}
