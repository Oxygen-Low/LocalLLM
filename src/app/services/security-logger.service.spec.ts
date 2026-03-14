import { TestBed } from '@angular/core/testing';
import { SecurityLoggerService, SecurityEvent } from './security-logger.service';

describe('SecurityLoggerService', () => {
  let service: SecurityLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SecurityLoggerService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log a security event', () => {
    service.log('LOGIN_SUCCESS', 'User logged in', 'testuser');
    const logs = service.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('LOGIN_SUCCESS');
    expect(logs[0].details).toBe('User logged in');
    expect(logs[0].username).toBe('testuser');
    expect(logs[0].timestamp).toBeTruthy();
  });

  it('should log events without username', () => {
    service.log('SESSION_EXPIRED', 'Session expired');
    const logs = service.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].username).toBeUndefined();
  });

  it('should keep multiple log entries', () => {
    service.log('LOGIN_FAILURE', 'Failed attempt 1', 'user1');
    service.log('LOGIN_FAILURE', 'Failed attempt 2', 'user1');
    service.log('ACCOUNT_LOCKED', 'Account locked', 'user1');
    const logs = service.getLogs();
    expect(logs.length).toBe(3);
  });

  it('should limit log entries to MAX_LOG_ENTRIES', () => {
    for (let i = 0; i < 110; i++) {
      service.log('LOGIN_FAILURE', `Attempt ${i}`, 'user');
    }
    const logs = service.getLogs();
    expect(logs.length).toBe(100);
    expect(logs[0].details).toBe('Attempt 10');
  });

  it('should clear logs', () => {
    service.log('LOGIN_SUCCESS', 'Test', 'user');
    expect(service.getLogs().length).toBe(1);
    service.clearLogs();
    expect(service.getLogs().length).toBe(0);
  });

  it('should return empty array when no logs exist', () => {
    const logs = service.getLogs();
    expect(logs).toEqual([]);
  });
});
