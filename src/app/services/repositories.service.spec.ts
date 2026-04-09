import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RepositoriesService, LocalRepo, RepoListResponse } from './repositories.service';

describe('RepositoriesService', () => {
  let service: RepositoriesService;
  let httpMock: HttpTestingController;

  const mockRepo: LocalRepo = {
    id: 'repo-1',
    name: 'test-repo',
    description: 'A test repository',
    status: 'active',
    username: 'testuser',
    defaultBranch: 'main',
    createdAt: '2025-01-01T00:00:00Z',
    lastActivity: Date.now(),
    archivedAt: null,
    containerId: null,
    containerName: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RepositoriesService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(RepositoriesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listRepos', () => {
    it('should fetch repository list', async () => {
      const promise = service.listRepos();
      const req = httpMock.expectOne('/api/repositories');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, repos: [mockRepo], storageUsed: 1024, storageMax: 1048576 });
      const result = await promise;
      expect(result.repos.length).toBe(1);
      expect(result.repos[0].name).toBe('test-repo');
      expect(result.storageUsed).toBe(1024);
      expect(result.storageMax).toBe(1048576);
    });
  });

  describe('getRepo', () => {
    it('should fetch a specific repository by ID', async () => {
      const repoWithKey = { ...mockRepo, authKey: 'key-abc', size: 2048 };
      const promise = service.getRepo('repo-1');
      const req = httpMock.expectOne('/api/repositories/repo-1');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, repo: repoWithKey });
      const result = await promise;
      expect(result.id).toBe('repo-1');
      expect(result.authKey).toBe('key-abc');
      expect(result.size).toBe(2048);
    });
  });

  describe('createRepo', () => {
    it('should send POST request with repo details', async () => {
      const promise = service.createRepo('new-repo', 'New repository', true);
      const req = httpMock.expectOne('/api/repositories');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'new-repo',
        description: 'New repository',
        initReadme: true,
      });
      req.flush({ success: true, repo: { ...mockRepo, name: 'new-repo' } });
      const result = await promise;
      expect(result.name).toBe('new-repo');
    });

    it('should send initReadme as false when not requested', async () => {
      const promise = service.createRepo('bare-repo', 'No readme', false);
      const req = httpMock.expectOne('/api/repositories');
      expect(req.request.body).toEqual({
        name: 'bare-repo',
        description: 'No readme',
        initReadme: false,
      });
      req.flush({ success: true, repo: mockRepo });
      await promise;
    });
  });

  describe('deleteRepo', () => {
    it('should send DELETE request for repository', async () => {
      const promise = service.deleteRepo('repo-1');
      const req = httpMock.expectOne('/api/repositories/repo-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      await promise;
    });
  });

  describe('archiveRepo', () => {
    it('should send POST request to archive endpoint', async () => {
      const promise = service.archiveRepo('repo-1');
      const req = httpMock.expectOne('/api/repositories/repo-1/archive');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true });
      await promise;
    });
  });

  describe('unarchiveRepo', () => {
    it('should send POST request to unarchive endpoint', async () => {
      const promise = service.unarchiveRepo('repo-1');
      const req = httpMock.expectOne('/api/repositories/repo-1/unarchive');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true });
      await promise;
    });
  });

  describe('regenerateKey', () => {
    it('should send POST request and return new auth key', async () => {
      const promise = service.regenerateKey('repo-1');
      const req = httpMock.expectOne('/api/repositories/repo-1/regenerate-key');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true, authKey: 'new-key-xyz' });
      const result = await promise;
      expect(result).toBe('new-key-xyz');
    });
  });

  describe('importFromGitHub', () => {
    it('should send POST request with GitHub import parameters', async () => {
      const promise = service.importFromGitHub('https://github.com/user/repo.git', 'imported-repo', 'From GitHub');
      const req = httpMock.expectOne('/api/repositories/import-github');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        cloneUrl: 'https://github.com/user/repo.git',
        name: 'imported-repo',
        description: 'From GitHub',
      });
      req.flush({ success: true, repo: { ...mockRepo, name: 'imported-repo' } });
      const result = await promise;
      expect(result.name).toBe('imported-repo');
    });
  });

  describe('exportToGitHub', () => {
    it('should send POST request with export parameters and return URLs', async () => {
      const promise = service.exportToGitHub('repo-1', 'gh-repo', true, false);
      const req = httpMock.expectOne('/api/repositories/repo-1/export-github');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        newRepoName: 'gh-repo',
        isPrivate: true,
        deleteLocal: false,
      });
      req.flush({
        success: true,
        githubUrl: 'https://github.com/user/gh-repo',
        githubCloneUrl: 'https://github.com/user/gh-repo.git',
      });
      const result = await promise;
      expect(result.githubUrl).toBe('https://github.com/user/gh-repo');
      expect(result.githubCloneUrl).toBe('https://github.com/user/gh-repo.git');
    });

    it('should handle deleteLocal true and isPrivate false', async () => {
      const promise = service.exportToGitHub('repo-1', 'public-repo', false, true);
      const req = httpMock.expectOne('/api/repositories/repo-1/export-github');
      expect(req.request.body).toEqual({
        newRepoName: 'public-repo',
        isPrivate: false,
        deleteLocal: true,
      });
      req.flush({
        success: true,
        githubUrl: 'https://github.com/user/public-repo',
        githubCloneUrl: 'https://github.com/user/public-repo.git',
      });
      await promise;
    });
  });

  describe('listActiveRepos', () => {
    it('should fetch active repos from local-repositories endpoint', async () => {
      const promise = service.listActiveRepos();
      const req = httpMock.expectOne('/api/local-repositories');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, repos: [mockRepo] });
      const result = await promise;
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('repo-1');
    });

    it('should return empty array when repos is undefined', async () => {
      const promise = service.listActiveRepos();
      const req = httpMock.expectOne('/api/local-repositories');
      req.flush({ success: true });
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('getCloneUrl', () => {
    it('should return correct clone URL', () => {
      const url = service.getCloneUrl('repo-1');
      expect(url).toBe('/api/repositories/repo-1/git/');
    });
  });

  describe('formatBytes', () => {
    it('should return "0 B" for zero bytes', () => {
      expect(service.formatBytes(0)).toBe('0 B');
    });

    it('should format bytes correctly', () => {
      expect(service.formatBytes(500)).toBe('500 B');
    });

    it('should format kilobytes correctly', () => {
      expect(service.formatBytes(1024)).toBe('1 KB');
    });

    it('should format megabytes correctly', () => {
      expect(service.formatBytes(1048576)).toBe('1 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(service.formatBytes(1073741824)).toBe('1 GB');
    });

    it('should format fractional sizes with one decimal', () => {
      expect(service.formatBytes(1536)).toBe('1.5 KB');
    });
  });
});
