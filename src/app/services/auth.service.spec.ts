import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { SecurityLoggerService } from './security-logger.service';

async function flushAsync(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  await new Promise<void>(resolve => setTimeout(resolve, 0));
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  function flushPasswordStatus(username: string, required = false): void {
    const statusReq = httpMock.match(
      req => req.method === 'GET' && req.url.includes('/api/auth/password-reset-status') && req.params.get('username') === username
    )[0];
    if (statusReq) {
      statusReq.flush({ success: true, passwordResetRequired: required });
    }
  }

  function drainPasswordStatusRequests(): void {
    const pending = httpMock.match(req => req.method === 'GET' && req.url.includes('/api/auth/password-reset-status'));
    pending.forEach(req => req.flush({ success: true, passwordResetRequired: false }));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    sessionStorage.clear();
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    drainPasswordStatusRequests();
    service.logout();
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not be authenticated initially', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  describe('hashPassword', () => {
    it('should return a 64-character hex string', async () => {
      const hash = await service.hashPassword('Password1!');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should not return the plain text password', async () => {
      const hash = await service.hashPassword('Password1!');
      expect(hash).not.toBe('Password1!');
    });

    it('should produce consistent hashes for the same input', async () => {
      const hash1 = await service.hashPassword('Password1!');
      const hash2 = await service.hashPassword('Password1!');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await service.hashPassword('Password1!');
      const hash2 = await service.hashPassword('Password2!');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validatePassword', () => {
    it('should reject short passwords', () => {
      const errors = service.validatePassword('Ab1!');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('at least 8 characters');
    });

    it('should require uppercase letter', () => {
      const errors = service.validatePassword('abcdef1!');
      expect(errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const errors = service.validatePassword('ABCDEF1!');
      expect(errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require a number', () => {
      const errors = service.validatePassword('Abcdefg!');
      expect(errors).toContain('Password must contain at least one number');
    });

    it('should require a special character', () => {
      const errors = service.validatePassword('Abcdefg1');
      expect(errors).toContain('Password must contain at least one special character');
    });

    it('should accept valid passwords', () => {
      const errors = service.validatePassword('Abcdef1!');
      expect(errors.length).toBe(0);
    });
  });

  describe('validateUsername', () => {
    it('should reject short usernames', () => {
      const errors = service.validateUsername('ab');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject long usernames', () => {
      const errors = service.validateUsername('a'.repeat(31));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject usernames with special characters', () => {
      const errors = service.validateUsername('user@name');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid usernames', () => {
      const errors = service.validateUsername('test-user_123');
      expect(errors.length).toBe(0);
    });
  });

  describe('signup', () => {
    it('should create a new user', async () => {
    const signupPromise = service.signup('testuser', 'Password1!');
    await flushAsync();

    const req = httpMock.expectOne('/api/auth/signup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.username).toBe('testuser');
    expect(req.request.body.password).toMatch(/^[a-f0-9]{64}$/);
    expect(req.request.body.password).not.toBe('Password1!');
    req.flush({ success: true, username: 'testuser' });
    flushPasswordStatus('testuser');

    const result = await signupPromise;
    expect(result.success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('testuser');
    });

    it('should reject duplicate usernames', async () => {
      const signupPromise = service.signup('testuser', 'Password1!');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: false, error: 'Username already exists' }, { status: 409, statusText: 'Conflict' });

      const result = await signupPromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should normalize username to lowercase', async () => {
    const signupPromise = service.signup('TestUser', 'Password1!');
    await flushAsync();

    const req = httpMock.expectOne('/api/auth/signup');
    expect(req.request.body.username).toBe('TestUser');
    req.flush({ success: true, username: 'testuser' });
    flushPasswordStatus('testuser');

    const result = await signupPromise;
    expect(result.success).toBe(true);
    expect(service.username()).toBe('testuser');
  });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
    const loginPromise = service.login('testuser', 'Password1!');
    await flushAsync();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, username: 'testuser' });
    flushPasswordStatus('testuser', false);

    const result = await loginPromise;
    expect(result.success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.passwordResetRequired()).toBe(false);
  });

    it('should reject incorrect password', async () => {
      const loginPromise = service.login('testuser', 'WrongPassword1!');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

      const result = await loginPromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('should reject nonexistent user', async () => {
      const loginPromise = service.login('nonexistent', 'Password1!');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

      const result = await loginPromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('should use generic error for invalid credentials', async () => {
      const loginPromise = service.login('testuser', 'WrongPass1!');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

      const result = await loginPromise;
      expect(result.error).toBe('Invalid username or password');
    });

    it('should return connection error when server is unreachable', async () => {
      const loginPromise = service.login('testuser', 'Password1!');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/login');
      req.error(new ProgressEvent('error'));

      const result = await loginPromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed to server');
    });

    it('should still record failed attempt on connection error', async () => {
      expect(service.getRemainingAttempts('conntest')).toBe(5);

      const loginPromise = service.login('conntest', 'Password1!');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/login');
      req.error(new ProgressEvent('error'));

      await loginPromise;
      expect(service.getRemainingAttempts('conntest')).toBe(4);
    });
  });

  describe('rate limiting (A04/A07)', () => {
    it('should track remaining login attempts', () => {
      expect(service.getRemainingAttempts('ratetest')).toBe(5);
    });

    it('should decrement remaining attempts after failed login', async () => {
      const loginPromise = service.login('ratetest', 'Wrong1!aa');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

      await loginPromise;
      expect(service.getRemainingAttempts('ratetest')).toBe(4);
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        const loginPromise = service.login('ratetest', 'Wrong1!aa');
        await flushAsync();
        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });
        await loginPromise;
      }
      expect(service.getRemainingAttempts('ratetest')).toBe(0);

      const result = await service.login('ratetest', 'Password1!');
      expect(result.success).toBe(false);
      expect(result.error).toContain('temporarily locked');
    });

    it('should clear attempts on successful login', async () => {
      // Two failed attempts
      for (let i = 0; i < 2; i++) {
        const loginPromise = service.login('ratetest', 'Wrong1!aa');
        await flushAsync();
        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });
        await loginPromise;
      }
      expect(service.getRemainingAttempts('ratetest')).toBe(3);

      // Successful login
      const loginPromise = service.login('ratetest', 'Password1!');
      await flushAsync();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: true, username: 'ratetest' });
      flushPasswordStatus('ratetest');
      await loginPromise;

      expect(service.getRemainingAttempts('ratetest')).toBe(5);
    });
  });

  describe('logout', () => {
    it('should clear authentication state', async () => {
      const signupPromise = service.signup('testuser', 'Password1!');
      await flushAsync();
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'testuser' });
      flushPasswordStatus('testuser');
      await signupPromise;

      expect(service.isAuthenticated()).toBe(true);
      service.logout();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.username()).toBeNull();
    });
  });

  describe('security logging (A09)', () => {
    let logger: SecurityLoggerService;

    beforeEach(() => {
      logger = TestBed.inject(SecurityLoggerService);
      logger.clearLogs();
    });

    it('should log successful signup', async () => {
      const signupPromise = service.signup('logtest', 'Password1!');
      await flushAsync();
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'logtest' });
      flushPasswordStatus('logtest');
      await signupPromise;

      const logs = logger.getLogs();
      const signupLog = logs.find(l => l.type === 'SIGNUP_SUCCESS');
      expect(signupLog).toBeTruthy();
      expect(signupLog!.username).toBe('logtest');
    });

    it('should log failed login attempts', async () => {
      logger.clearLogs();
      const loginPromise = service.login('logtest2', 'WrongPass1!');
      await flushAsync();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });
      await loginPromise;

      const logs = logger.getLogs();
      const failLog = logs.find(l => l.type === 'LOGIN_FAILURE');
      expect(failLog).toBeTruthy();
    });

    it('should log successful login', async () => {
      logger.clearLogs();
      const loginPromise = service.login('logtest3', 'Password1!');
      await flushAsync();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: true, username: 'logtest3' });
      flushPasswordStatus('logtest3');
      await loginPromise;

      const logs = logger.getLogs();
      const successLog = logs.find(l => l.type === 'LOGIN_SUCCESS');
      expect(successLog).toBeTruthy();
    });

    it('should log account lockout', async () => {
      logger.clearLogs();

      // Clear any previous attempts so we don't start already locked
      // Make 4 failed attempts first
      for (let i = 0; i < 4; i++) {
        const loginPromise = service.login('locktest', 'WrongPass1!');
        await flushAsync();
        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });
        await loginPromise;
      }

      // The 5th attempt gets blocked by rate check before reaching HTTP mock
      const finalLoginPromise = service.login('locktest', 'WrongPass1!');
      await flushAsync();
      // On the 5th attempt, checkRateLimit returns false, so NO HTTP request is made!
      // But it still logs LOGIN_RATE_LIMITED.
      // Actually, wait, when does it log ACCOUNT_LOCKED?
      // During recordFailedAttempt, which runs AFTER the API call returns failure.
      // So the 5th attempt *should* reach the API, fail, and then log ACCOUNT_LOCKED.
      // And the 6th attempt would be blocked. Let's see!
      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });
      await finalLoginPromise;

      const logs = logger.getLogs();
      const lockLog = logs.find(l => l.type === 'ACCOUNT_LOCKED');
      expect(lockLog).toBeTruthy();
    });

    it('should log logout', async () => {
      const signupPromise = service.signup('logouttest', 'Password1!');
      await flushAsync();
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'logouttest' });
      flushPasswordStatus('logouttest');
      await signupPromise;

      logger.clearLogs();
      service.logout();
      const logs = logger.getLogs();
      const logoutLog = logs.find(l => l.type === 'LOGOUT');
      expect(logoutLog).toBeTruthy();
    });
  });

  describe('server-side storage (no localStorage)', () => {
    it('should not store any user data in localStorage', async () => {
      localStorage.clear();

      const signupPromise = service.signup('testuser', 'Password1!');
      await flushAsync();
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'testuser' });
      flushPasswordStatus('testuser');
      await signupPromise;

      expect(localStorage.length).toBe(0);
    });

    it('should send credentials to server API on signup', async () => {
      const signupPromise = service.signup('newuser', 'Password1!');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/signup');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.username).toBe('newuser');
      expect(req.request.body.password).toMatch(/^[a-f0-9]{64}$/);
      expect(req.request.body.password).not.toBe('Password1!');
      req.flush({ success: true, username: 'newuser' });
      flushPasswordStatus('newuser');

      await signupPromise;
    });

    it('should send credentials to server API on login', async () => {
      const loginPromise = service.login('existinguser', 'Password1!');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.username).toBe('existinguser');
      expect(req.request.body.password).toMatch(/^[a-f0-9]{64}$/);
      expect(req.request.body.password).not.toBe('Password1!');
      req.flush({ success: true, username: 'existinguser' });
      flushPasswordStatus('existinguser');

      await loginPromise;
    });
  });

  describe('changeUsername', () => {
    beforeEach(async () => {
      // Establish an authenticated session before each username change test.
      // No `token` in the response so that the global afterEach's service.logout()
      // does not queue a fire-and-forget POST /api/auth/logout.
      const signupPromise = service.signup('originaluser', 'Password1!');
      await flushAsync();
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'originaluser' });
      flushPasswordStatus('originaluser');
      await signupPromise;
    });

    afterEach(() => {
      // Drain any fire-and-forget POST /api/auth/logout so the global
      // afterEach's httpMock.verify() sees no open requests.
      httpMock
        .match(req => req.method === 'POST' && req.url.includes('/api/auth/logout'))
        .forEach(req => req.flush({}));
    });

    it('should return error when not authenticated', async () => {
      service.logout(); // clears session; logout POST is drained by local afterEach
      const result = await service.changeUsername('newuser');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('should return validation error without making HTTP request for short username', async () => {
      const result = await service.changeUsername('ab');
      expect(result.success).toBe(false);
      expect(result.error).toContain('3 characters');
      httpMock.expectNone('/api/auth/change-username');
    });

    it('should return validation error without making HTTP request for invalid characters', async () => {
      const result = await service.changeUsername('bad name!');
      expect(result.success).toBe(false);
      expect(result.error).toContain('letters, numbers');
      httpMock.expectNone('/api/auth/change-username');
    });

    it('should call PUT /api/auth/change-username with the newUsername body', async () => {
      const changePromise = service.changeUsername('newusername');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/change-username');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.newUsername).toBe('newusername');
      req.flush({ success: true, username: 'newusername' });
      flushPasswordStatus('newusername');
      await changePromise;
    });

    it('should update username signal on success', async () => {
      const changePromise = service.changeUsername('newusername');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/change-username');
      req.flush({ success: true, username: 'newusername' });
      flushPasswordStatus('newusername');

      const result = await changePromise;
      expect(result.success).toBe(true);
      expect(service.username()).toBe('newusername');
    });

    it('should return error from server when username is taken', async () => {
      const changePromise = service.changeUsername('takenuser');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/change-username');
      req.flush({ success: false, error: 'Username already taken' }, { status: 409, statusText: 'Conflict' });

      const result = await changePromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already taken');
    });

    it('should surface retryAfterSeconds on 429 response', async () => {
      const changePromise = service.changeUsername('newusername');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/change-username');
      req.flush(
        { success: false, error: 'Username was changed recently.', retryAfterSeconds: 600 },
        { status: 429, statusText: 'Too Many Requests' }
      );

      const result = await changePromise;
      expect(result.success).toBe(false);
      expect(result.retryAfterSeconds).toBe(600);
    });

    it('should return generic error on network failure', async () => {
      const changePromise = service.changeUsername('newusername');
      await flushAsync();

      const req = httpMock.expectOne('/api/auth/change-username');
      req.error(new ProgressEvent('error'));

      const result = await changePromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to change username. Please try again.');
    });
  });
});
