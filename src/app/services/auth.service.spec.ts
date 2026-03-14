import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SecurityLoggerService } from './security-logger.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, SecurityLoggerService],
    });
    localStorage.clear();
    sessionStorage.clear();
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
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
      const result = await service.signup('testuser', 'Password1!');
      expect(result.success).toBeTrue();
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.username()).toBe('testuser');
    });

    it('should reject duplicate usernames', async () => {
      await service.signup('testuser', 'Password1!');
      service.logout();
      const result = await service.signup('testuser', 'Password2!');
      expect(result.success).toBeFalse();
      expect(result.error).toContain('already exists');
    });

    it('should normalize username to lowercase', async () => {
      const result = await service.signup('TestUser', 'Password1!');
      expect(result.success).toBeTrue();
      expect(service.username()).toBe('testuser');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.signup('testuser', 'Password1!');
      service.logout();
    });

    it('should login with correct credentials', async () => {
      const result = await service.login('testuser', 'Password1!');
      expect(result.success).toBeTrue();
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should reject incorrect password', async () => {
      const result = await service.login('testuser', 'WrongPassword1!');
      expect(result.success).toBeFalse();
      expect(result.error).toBe('Invalid username or password');
    });

    it('should reject nonexistent user', async () => {
      const result = await service.login('nonexistent', 'Password1!');
      expect(result.success).toBeFalse();
      expect(result.error).toBe('Invalid username or password');
    });

    it('should use generic error for invalid credentials', async () => {
      const result = await service.login('testuser', 'WrongPass1!');
      expect(result.error).toBe('Invalid username or password');
    });
  });

  describe('rate limiting (A04/A07)', () => {
    beforeEach(async () => {
      await service.signup('ratetest', 'Password1!');
      service.logout();
    });

    it('should track remaining login attempts', () => {
      expect(service.getRemainingAttempts('ratetest')).toBe(5);
    });

    it('should decrement remaining attempts after failed login', async () => {
      await service.login('ratetest', 'Wrong1!aa');
      expect(service.getRemainingAttempts('ratetest')).toBe(4);
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await service.login('ratetest', 'Wrong1!aa');
      }
      expect(service.getRemainingAttempts('ratetest')).toBe(0);

      const result = await service.login('ratetest', 'Password1!');
      expect(result.success).toBeFalse();
      expect(result.error).toContain('temporarily locked');
    });

    it('should clear attempts on successful login', async () => {
      await service.login('ratetest', 'Wrong1!aa');
      await service.login('ratetest', 'Wrong1!aa');
      expect(service.getRemainingAttempts('ratetest')).toBe(3);

      await service.login('ratetest', 'Password1!');
      expect(service.getRemainingAttempts('ratetest')).toBe(5);
    });
  });

  describe('logout', () => {
    it('should clear authentication state', async () => {
      await service.signup('testuser', 'Password1!');
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
      await service.signup('logtest', 'Password1!');
      const logs = logger.getLogs();
      const signupLog = logs.find(l => l.type === 'SIGNUP_SUCCESS');
      expect(signupLog).toBeTruthy();
      expect(signupLog!.username).toBe('logtest');
    });

    it('should log failed login attempts', async () => {
      await service.signup('logtest2', 'Password1!');
      service.logout();
      logger.clearLogs();

      await service.login('logtest2', 'WrongPass1!');
      const logs = logger.getLogs();
      const failLog = logs.find(l => l.type === 'LOGIN_FAILURE');
      expect(failLog).toBeTruthy();
    });

    it('should log successful login', async () => {
      await service.signup('logtest3', 'Password1!');
      service.logout();
      logger.clearLogs();

      await service.login('logtest3', 'Password1!');
      const logs = logger.getLogs();
      const successLog = logs.find(l => l.type === 'LOGIN_SUCCESS');
      expect(successLog).toBeTruthy();
    });

    it('should log account lockout', async () => {
      await service.signup('locktest', 'Password1!');
      service.logout();
      logger.clearLogs();

      for (let i = 0; i < 5; i++) {
        await service.login('locktest', 'WrongPass1!');
      }
      const logs = logger.getLogs();
      const lockLog = logs.find(l => l.type === 'ACCOUNT_LOCKED');
      expect(lockLog).toBeTruthy();
    });

    it('should log logout', async () => {
      await service.signup('logouttest', 'Password1!');
      logger.clearLogs();
      service.logout();
      const logs = logger.getLogs();
      const logoutLog = logs.find(l => l.type === 'LOGOUT');
      expect(logoutLog).toBeTruthy();
    });
  });
});
