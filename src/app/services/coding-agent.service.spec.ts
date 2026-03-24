import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CodingAgentService } from './coding-agent.service';

describe('CodingAgentService', () => {
  let service: CodingAgentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CodingAgentService,
      ],
    });

    service = TestBed.inject(CodingAgentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- GitHub Integration ---

  describe('getGitHubStatus', () => {
    it('should return configured status', async () => {
      const promise = service.getGitHubStatus();
      const req = httpMock.expectOne('/api/user/integrations/github/status');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, configured: true, username: 'testuser' });
      const result = await promise;
      expect(result.configured).toBe(true);
      expect(result.username).toBe('testuser');
    });

    it('should return not configured status', async () => {
      const promise = service.getGitHubStatus();
      const req = httpMock.expectOne('/api/user/integrations/github/status');
      req.flush({ success: true, configured: false, username: null });
      const result = await promise;
      expect(result.configured).toBe(false);
      expect(result.username).toBeNull();
    });
  });

  describe('setGitHubToken', () => {
    it('should save token and return username', async () => {
      const promise = service.setGitHubToken('ghp_testtoken');
      const req = httpMock.expectOne('/api/user/integrations/github');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ token: 'ghp_testtoken' });
      req.flush({ success: true, username: 'testuser' });
      const result = await promise;
      expect(result.username).toBe('testuser');
    });
  });

  describe('removeGitHubToken', () => {
    it('should remove the token', async () => {
      const promise = service.removeGitHubToken();
      const req = httpMock.expectOne('/api/user/integrations/github');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('getGitHubRepos', () => {
    it('should fetch repos with default params', async () => {
      const promise = service.getGitHubRepos();
      const req = httpMock.expectOne(r => r.url === '/api/user/integrations/github/repos');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      req.flush({
        success: true,
        repos: [{ id: 1, name: 'test-repo', fullName: 'user/test-repo', description: null, private: false, defaultBranch: 'main', language: 'TypeScript', updatedAt: '2024-01-01', htmlUrl: 'https://github.com/user/test-repo', cloneUrl: 'https://github.com/user/test-repo.git' }],
      });
      const result = await promise;
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('test-repo');
    });

    it('should pass search parameter', async () => {
      const promise = service.getGitHubRepos(1, 'angular');
      const req = httpMock.expectOne(r => r.url === '/api/user/integrations/github/repos');
      expect(req.request.params.get('search')).toBe('angular');
      req.flush({ success: true, repos: [] });
      const result = await promise;
      expect(result.length).toBe(0);
    });
  });

  // --- Docker ---

  describe('getDockerStatus', () => {
    it('should return Docker availability', async () => {
      const promise = service.getDockerStatus();
      const req = httpMock.expectOne('/api/coding-agent/docker/status');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, available: true });
      const result = await promise;
      expect(result.available).toBe(true);
    });
  });

  // --- Containers ---

  describe('createContainer', () => {
    it('should create a container', async () => {
      const promise = service.createContainer('user/repo', 'https://github.com/user/repo.git', 'manual', 'main');
      const req = httpMock.expectOne('/api/coding-agent/containers');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        repoFullName: 'user/repo',
        cloneUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        mode: 'manual',
      });
      req.flush({
        success: true,
        container: {
          id: 'test-id',
          dockerId: 'abc123',
          dockerName: 'localllm-user-abc123',
          repoFullName: 'user/repo',
          branch: 'main',
          mode: 'manual',
          status: 'running',
          createdAt: '2024-01-01',
          lastActivity: Date.now(),
        },
      });
      const result = await promise;
      expect(result.id).toBe('test-id');
      expect(result.status).toBe('running');
    });
  });

  describe('listContainers', () => {
    it('should list containers', async () => {
      const promise = service.listContainers();
      const req = httpMock.expectOne('/api/coding-agent/containers');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, containers: [] });
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('stopContainer', () => {
    it('should stop a container', async () => {
      const promise = service.stopContainer('test-id');
      const req = httpMock.expectOne('/api/coding-agent/containers/test-id/stop');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('startContainer', () => {
    it('should start a container', async () => {
      const promise = service.startContainer('test-id');
      const req = httpMock.expectOne('/api/coding-agent/containers/test-id/start');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('removeContainer', () => {
    it('should remove a container', async () => {
      const promise = service.removeContainer('test-id');
      const req = httpMock.expectOne('/api/coding-agent/containers/test-id');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('execInContainer', () => {
    it('should execute a command', async () => {
      const promise = service.execInContainer('test-id', 'ls -la');
      const req = httpMock.expectOne('/api/coding-agent/containers/test-id/exec');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ command: 'ls -la' });
      req.flush({ success: true, output: 'file1.txt\nfile2.txt' });
      const result = await promise;
      expect(result.output).toBe('file1.txt\nfile2.txt');
    });
  });

  // --- Files ---

  describe('listFiles', () => {
    it('should list files', async () => {
      const promise = service.listFiles('test-id', '.');
      const req = httpMock.expectOne(r => r.url === '/api/coding-agent/containers/test-id/files');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('path')).toBe('.');
      req.flush({
        success: true,
        files: [
          { name: 'src', type: 'directory' },
          { name: 'README.md', type: 'file' },
        ],
      });
      const result = await promise;
      expect(result.length).toBe(2);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const promise = service.readFile('test-id', 'README.md');
      const req = httpMock.expectOne(r => r.url === '/api/coding-agent/containers/test-id/file');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('path')).toBe('README.md');
      req.flush({ success: true, content: '# Hello' });
      const result = await promise;
      expect(result).toBe('# Hello');
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      const promise = service.writeFile('test-id', 'README.md', '# Updated');
      const req = httpMock.expectOne('/api/coding-agent/containers/test-id/file');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ path: 'README.md', content: '# Updated' });
      req.flush({ success: true });
      await promise;
    });
  });

  // --- Agent Terminal ---

  describe('agentExec', () => {
    it('should execute a command with agent-exec endpoint', async () => {
      const promise = service.agentExec('test-id', 'npm install');
      const req = httpMock.expectOne('/api/coding-agent/containers/test-id/agent-exec');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ command: 'npm install' });
      req.flush({ success: true, output: 'added 100 packages' });
      const result = await promise;
      expect(result.output).toBe('added 100 packages');
    });

    it('should handle timed out commands', async () => {
      const promise = service.agentExec('test-id', 'long-command');
      const req = httpMock.expectOne('/api/coding-agent/containers/test-id/agent-exec');
      req.flush({ success: true, output: 'partial output\n[Command timed out after 10 minutes]', exitCode: 1, timedOut: true });
      const result = await promise;
      expect(result.timedOut).toBe(true);
      expect(result.exitCode).toBe(1);
    });
  });

  // --- Agent Memories ---

  describe('getMemories', () => {
    it('should list memories for a repo', async () => {
      const promise = service.getMemories('user/repo');
      const req = httpMock.expectOne(r => r.url === '/api/coding-agent/memories');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('repo')).toBe('user/repo');
      req.flush({ success: true, memories: [{ id: 'mem-1', content: 'uses TypeScript', createdAt: '2024-01-01' }] });
      const result = await promise;
      expect(result.length).toBe(1);
      expect(result[0].content).toBe('uses TypeScript');
    });

    it('should return empty array when no memories exist', async () => {
      const promise = service.getMemories('new/repo');
      const req = httpMock.expectOne(r => r.url === '/api/coding-agent/memories');
      req.flush({ success: true, memories: [] });
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('addMemory', () => {
    it('should add a memory', async () => {
      const promise = service.addMemory('user/repo', 'This project uses Angular');
      const req = httpMock.expectOne('/api/coding-agent/memories');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ repo: 'user/repo', content: 'This project uses Angular' });
      req.flush({ success: true, memory: { id: 'mem-new', content: 'This project uses Angular', createdAt: '2024-01-01' } });
      const result = await promise;
      expect(result.id).toBe('mem-new');
      expect(result.content).toBe('This project uses Angular');
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory', async () => {
      const promise = service.deleteMemory('user/repo', 'mem-1');
      const req = httpMock.expectOne(r => r.url === '/api/coding-agent/memories/mem-1');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.get('repo')).toBe('user/repo');
      req.flush({ success: true });
      await promise;
    });
  });
});
