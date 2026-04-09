import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleplayService, RoleplaySession } from './roleplay.service';

describe('RoleplayService', () => {
  let service: RoleplayService;
  let httpMock: HttpTestingController;

  const mockSession: RoleplaySession = {
    id: 'session-1',
    name: 'Test Session',
    universeId: 'universe-1',
    universeName: 'Fantasy World',
    universeDescription: 'A magical realm',
    personaId: 'persona-1',
    characters: [
      { id: 'c1', name: 'Wizard', job: 'Mage', role: 'protagonist', personality: 'wise', isGenerated: false },
    ],
    currentDate: '2025-01-01',
    posts: [
      { id: 'p1', characterId: 'c1', characterName: 'Wizard', content: 'Hello world', timestamp: '2025-01-01T00:00:00Z', likes: 0, replies: [] },
    ],
    createdAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RoleplayService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(RoleplayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listSessions', () => {
    it('should fetch session list', async () => {
      const promise = service.listSessions();
      const req = httpMock.expectOne('/api/roleplay/sessions');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, sessions: [mockSession] });
      const result = await promise;
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Test Session');
    });

    it('should return empty array when sessions is undefined', async () => {
      const promise = service.listSessions();
      const req = httpMock.expectOne('/api/roleplay/sessions');
      req.flush({ success: true });
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('createSession', () => {
    it('should send POST request with session parameters', async () => {
      const promise = service.createSession('New Session', 'universe-1', ['c1', 'c2'], 'persona-1');
      const req = httpMock.expectOne('/api/roleplay/sessions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'New Session',
        universeId: 'universe-1',
        characterIds: ['c1', 'c2'],
        personaId: 'persona-1',
      });
      req.flush({ success: true, session: mockSession });
      const result = await promise;
      expect(result.id).toBe('session-1');
    });

    it('should handle null personaId', async () => {
      const promise = service.createSession('No Persona', 'universe-1', ['c1'], null);
      const req = httpMock.expectOne('/api/roleplay/sessions');
      expect(req.request.body.personaId).toBeNull();
      req.flush({ success: true, session: { ...mockSession, personaId: null } });
      const result = await promise;
      expect(result.personaId).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should fetch a specific session by ID', async () => {
      const promise = service.getSession('session-1');
      const req = httpMock.expectOne('/api/roleplay/sessions/session-1');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, session: mockSession });
      const result = await promise;
      expect(result.id).toBe('session-1');
      expect(result.characters.length).toBe(1);
    });
  });

  describe('endDay', () => {
    it('should send POST request to end-day endpoint', async () => {
      const updatedSession = { ...mockSession, currentDate: '2025-01-02' };
      const promise = service.endDay('session-1');
      const req = httpMock.expectOne('/api/roleplay/sessions/session-1/end-day');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true, session: updatedSession });
      const result = await promise;
      expect(result.currentDate).toBe('2025-01-02');
    });
  });

  describe('rewind', () => {
    it('should send POST request to rewind endpoint', async () => {
      const rewoundSession = { ...mockSession, posts: [] };
      const promise = service.rewind('session-1');
      const req = httpMock.expectOne('/api/roleplay/sessions/session-1/rewind');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true, session: rewoundSession });
      const result = await promise;
      expect(result.posts.length).toBe(0);
    });
  });

  describe('post', () => {
    it('should send POST request with content', async () => {
      const promise = service.post('session-1', 'Hello everyone!');
      const req = httpMock.expectOne('/api/roleplay/sessions/session-1/post');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ content: 'Hello everyone!' });
      req.flush({ success: true, session: mockSession });
      const result = await promise;
      expect(result.id).toBe('session-1');
    });
  });

  describe('reply', () => {
    it('should send POST request with postId and content', async () => {
      const promise = service.reply('session-1', 'p1', 'Great post!');
      const req = httpMock.expectOne('/api/roleplay/sessions/session-1/reply');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ postId: 'p1', content: 'Great post!' });
      req.flush({ success: true, session: mockSession });
      const result = await promise;
      expect(result.id).toBe('session-1');
    });
  });

  describe('like', () => {
    it('should send POST request with postId', async () => {
      const promise = service.like('session-1', 'p1');
      const req = httpMock.expectOne('/api/roleplay/sessions/session-1/like');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ postId: 'p1' });
      req.flush({ success: true, session: mockSession });
      const result = await promise;
      expect(result.id).toBe('session-1');
    });
  });

  describe('repost', () => {
    it('should send POST request with postId', async () => {
      const promise = service.repost('session-1', 'p1');
      const req = httpMock.expectOne('/api/roleplay/sessions/session-1/repost');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ postId: 'p1' });
      req.flush({ success: true, session: mockSession });
      const result = await promise;
      expect(result.id).toBe('session-1');
    });
  });

  describe('deleteSession', () => {
    it('should send DELETE request for session', async () => {
      const promise = service.deleteSession('session-1');
      const req = httpMock.expectOne('/api/roleplay/sessions/session-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      await promise;
    });
  });
});
