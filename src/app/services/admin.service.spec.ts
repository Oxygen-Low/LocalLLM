import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  const mockAuthService = {
    getSessionToken: () => 'test-token',
    username: () => 'admin',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Universe methods ---

  describe('listUniverses', () => {
    it('should fetch universe list from admin endpoint', async () => {
      const mockUniverses = [
        { id: 'u1', name: 'Fantasy', characters: [] },
      ];
      const promise = service.listUniverses('hash123');
      const req = httpMock.expectOne('/api/admin/universes/list');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        adminUsername: 'admin',
        adminPassword: 'hash123',
      });
      req.flush({ success: true, universes: mockUniverses });
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.universes).toEqual(mockUniverses);
    });

    it('should return error on failure', async () => {
      const promise = service.listUniverses('hash123');
      const req = httpMock.expectOne('/api/admin/universes/list');
      req.flush({ success: false, error: 'Unauthorized' }, { status: 403, statusText: 'Forbidden' });
      const result = await promise;
      expect(result.success).toBe(false);
    });
  });

  describe('createUniverse', () => {
    it('should send POST request to create universe', async () => {
      const mockUniverse = { id: 'u1', name: 'SciFi', characters: [] };
      const promise = service.createUniverse('SciFi', 'hash123');
      const req = httpMock.expectOne('/api/admin/universes');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        adminUsername: 'admin',
        adminPassword: 'hash123',
        name: 'SciFi',
      });
      req.flush({ success: true, universe: mockUniverse });
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.universe?.name).toBe('SciFi');
    });
  });

  describe('updateUniverse', () => {
    it('should send PUT request to update universe', async () => {
      const mockUniverse = { id: 'u1', name: 'Updated', characters: [] };
      const promise = service.updateUniverse('u1', 'Updated', 'hash123');
      const req = httpMock.expectOne('/api/admin/universes/u1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        adminUsername: 'admin',
        adminPassword: 'hash123',
        name: 'Updated',
      });
      req.flush({ success: true, universe: mockUniverse });
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.universe?.name).toBe('Updated');
    });
  });

  describe('deleteUniverse', () => {
    it('should send DELETE request to delete universe', async () => {
      const promise = service.deleteUniverse('u1', 'hash123');
      const req = httpMock.expectOne('/api/admin/universes/u1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      const result = await promise;
      expect(result.success).toBe(true);
    });
  });

  // --- Character methods ---

  describe('createCharacter', () => {
    it('should send POST request to create character', async () => {
      const mockChar = { id: 'c1', name: 'Wizard', description: 'A wise wizard.' };
      const promise = service.createCharacter('u1', 'Wizard', 'A wise wizard.', 'hash123');
      const req = httpMock.expectOne('/api/admin/universes/u1/characters');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        adminUsername: 'admin',
        adminPassword: 'hash123',
        name: 'Wizard',
        description: 'A wise wizard.',
      });
      req.flush({ success: true, character: mockChar });
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.character?.name).toBe('Wizard');
    });
  });

  describe('updateCharacter', () => {
    it('should send PUT request to update character', async () => {
      const mockChar = { id: 'c1', name: 'Sorcerer', description: 'Updated desc.' };
      const promise = service.updateCharacter('u1', 'c1', 'Sorcerer', 'Updated desc.', 'hash123');
      const req = httpMock.expectOne('/api/admin/universes/u1/characters/c1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        adminUsername: 'admin',
        adminPassword: 'hash123',
        name: 'Sorcerer',
        description: 'Updated desc.',
      });
      req.flush({ success: true, character: mockChar });
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.character?.name).toBe('Sorcerer');
    });
  });

  describe('deleteCharacter', () => {
    it('should send DELETE request to delete character', async () => {
      const promise = service.deleteCharacter('u1', 'c1', 'hash123');
      const req = httpMock.expectOne('/api/admin/universes/u1/characters/c1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      const result = await promise;
      expect(result.success).toBe(true);
    });
  });

  // --- App Settings methods ---

  describe('getRiskyAppsEnabled', () => {
    it('should GET /api/settings/apps and return riskyAppsEnabled', async () => {
      const promise = service.getRiskyAppsEnabled();
      const req = httpMock.expectOne('/api/settings/apps');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, riskyAppsEnabled: true });
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.riskyAppsEnabled).toBe(true);
    });

    it('should return error on failure', async () => {
      const promise = service.getRiskyAppsEnabled();
      const req = httpMock.expectOne('/api/settings/apps');
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      const result = await promise;
      expect(result.success).toBe(false);
    });
  });

  describe('setRiskyAppsEnabled', () => {
    it('should POST to /api/admin/settings/risky-apps to disable', async () => {
      const promise = service.setRiskyAppsEnabled(false, 'hash123');
      const req = httpMock.expectOne('/api/admin/settings/risky-apps');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        adminUsername: 'admin',
        adminPassword: 'hash123',
        enabled: false,
      });
      req.flush({ success: true, riskyAppsEnabled: false });
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.riskyAppsEnabled).toBe(false);
    });

    it('should POST to /api/admin/settings/risky-apps to enable', async () => {
      const promise = service.setRiskyAppsEnabled(true, 'hash123');
      const req = httpMock.expectOne('/api/admin/settings/risky-apps');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        adminUsername: 'admin',
        adminPassword: 'hash123',
        enabled: true,
      });
      req.flush({ success: true, riskyAppsEnabled: true });
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.riskyAppsEnabled).toBe(true);
    });

    it('should return error on failure', async () => {
      const promise = service.setRiskyAppsEnabled(false, 'badhash');
      const req = httpMock.expectOne('/api/admin/settings/risky-apps');
      req.flush({ error: 'Unauthorized' }, { status: 403, statusText: 'Forbidden' });
      const result = await promise;
      expect(result.success).toBe(false);
    });
  });
});
