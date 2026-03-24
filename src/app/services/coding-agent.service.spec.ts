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
});
