import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { SecurityLoggerService } from './security-logger.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

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
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not be authenticated initially', () => {
    expect(service.isAuthenticated()).toBeFalse();
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

      const req = httpMock.expectOne('/api/auth/signup');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.username).toBe('testuser');
      expect(req.request.body.password).toBe('Password1!');
      req.flush({ success: true, username: 'testuser' });

      const result = await signupPromise;
      expect(result.success).toBeTrue();
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.username()).toBe('testuser');
    });

    it('should reject duplicate usernames', async () => {
      const signupPromise = service.signup('testuser', 'Password1!');

      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: false, error: 'Username already exists' }, { status: 409, statusText: 'Conflict' });

      const result = await signupPromise;
      expect(result.success).toBeFalse();
      expect(result.error).toContain('already exists');
    });

    it('should normalize username to lowercase', async () => {
      const signupPromise = service.signup('TestUser', 'Password1!');

      const req = httpMock.expectOne('/api/auth/signup');
      expect(req.request.body.username).toBe('TestUser');
      req.flush({ success: true, username: 'testuser' });

      const result = await signupPromise;
      expect(result.success).toBeTrue();
      expect(service.username()).toBe('testuser');
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const loginPromise = service.login('testuser', 'Password1!');

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, username: 'testuser' });

      const result = await loginPromise;
      expect(result.success).toBeTrue();
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should reject incorrect password', async () => {
      const loginPromise = service.login('testuser', 'WrongPassword1!');

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

      const result = await loginPromise;
      expect(result.success).toBeFalse();
      expect(result.error).toBe('Invalid username or password');
    });

    it('should reject nonexistent user', async () => {
      const loginPromise = service.login('nonexistent', 'Password1!');

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

      const result = await loginPromise;
      expect(result.success).toBeFalse();
      expect(result.error).toBe('Invalid username or password');
    });

    it('should use generic error for invalid credentials', async () => {
      const loginPromise = service.login('testuser', 'WrongPass1!');

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

      const result = await loginPromise;
      expect(result.error).toBe('Invalid username or password');
    });
  });

  describe('rate limiting (A04/A07)', () => {
    it('should track remaining login attempts', () => {
      expect(service.getRemainingAttempts('ratetest')).toBe(5);
    });

    it('should decrement remaining attempts after failed login', async () => {
      const loginPromise = service.login('ratetest', 'Wrong1!aa');

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

      await loginPromise;
      expect(service.getRemainingAttempts('ratetest')).toBe(4);
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        const loginPromise = service.login('ratetest', 'Wrong1!aa');
        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });
        await loginPromise;
      }
      expect(service.getRemainingAttempts('ratetest')).toBe(0);

      const result = await service.login('ratetest', 'Password1!');
      expect(result.success).toBeFalse();
      expect(result.error).toContain('temporarily locked');
    });

    it('should clear attempts on successful login', async () => {
      // Two failed attempts
      for (let i = 0; i < 2; i++) {
        const loginPromise = service.login('ratetest', 'Wrong1!aa');
        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });
        await loginPromise;
      }
      expect(service.getRemainingAttempts('ratetest')).toBe(3);

      // Successful login
      const loginPromise = service.login('ratetest', 'Password1!');
      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: true, username: 'ratetest' });
      await loginPromise;

      expect(service.getRemainingAttempts('ratetest')).toBe(5);
    });
  });

  describe('logout', () => {
    it('should clear authentication state', async () => {
      const signupPromise = service.signup('testuser', 'Password1!');
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'testuser' });
      await signupPromise;

      expect(service.isAuthenticated()).toBeTrue();
      service.logout();
      expect(service.isAuthenticated()).toBeFalse();
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
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'logtest' });
      await signupPromise;

      const logs = logger.getLogs();
      const signupLog = logs.find(l => l.type === 'SIGNUP_SUCCESS');
      expect(signupLog).toBeTruthy();
      expect(signupLog!.username).toBe('logtest');
    });

    it('should log failed login attempts', async () => {
      logger.clearLogs();
      const loginPromise = service.login('logtest2', 'WrongPass1!');
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
      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ success: true, username: 'logtest3' });
      await loginPromise;

      const logs = logger.getLogs();
      const successLog = logs.find(l => l.type === 'LOGIN_SUCCESS');
      expect(successLog).toBeTruthy();
    });

    it('should log account lockout', async () => {
      logger.clearLogs();

      for (let i = 0; i < 5; i++) {
        const loginPromise = service.login('locktest', 'WrongPass1!');
        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ success: false, error: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });
        await loginPromise;
      }
      const logs = logger.getLogs();
      const lockLog = logs.find(l => l.type === 'ACCOUNT_LOCKED');
      expect(lockLog).toBeTruthy();
    });

    it('should log logout', async () => {
      const signupPromise = service.signup('logouttest', 'Password1!');
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'logouttest' });
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
      const req = httpMock.expectOne('/api/auth/signup');
      req.flush({ success: true, username: 'testuser' });
      await signupPromise;

      expect(localStorage.length).toBe(0);
    });

    it('should send credentials to server API on signup', async () => {
      const signupPromise = service.signup('newuser', 'Password1!');

      const req = httpMock.expectOne('/api/auth/signup');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'newuser', password: 'Password1!' });
      req.flush({ success: true, username: 'newuser' });

      await signupPromise;
    });

    it('should send credentials to server API on login', async () => {
      const loginPromise = service.login('existinguser', 'Password1!');

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'existinguser', password: 'Password1!' });
      req.flush({ success: true, username: 'existinguser' });

      await loginPromise;
    });
  });
});
