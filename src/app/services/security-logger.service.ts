import { Injectable } from '@angular/core';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  details: string;
  username?: string;
}

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_RATE_LIMITED'
  | 'ACCOUNT_LOCKED'
  | 'SIGNUP_SUCCESS'
  | 'SIGNUP_FAILURE'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'SESSION_RESTORED'
  | 'INACTIVITY_LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_CHANGE_FAILURE'
  | 'ACCOUNT_DELETED'
  | 'ACCOUNT_DELETE_FAILURE';

const MAX_LOG_ENTRIES = 100;
const SECURITY_LOG_KEY = 'localllm_security_log';

@Injectable({
  providedIn: 'root',
})
export class SecurityLoggerService {
  log(type: SecurityEventType, details: string, username?: string): void {
    const event: SecurityEvent = {
      type,
      timestamp: new Date().toISOString(),
      details,
      username,
    };

    const logs = this.getLogs();
    logs.push(event);

    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }

    try {
      sessionStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(logs));
    } catch {
      // Storage full or unavailable - silently fail
    }
  }

  getLogs(): SecurityEvent[] {
    try {
      const data = sessionStorage.getItem(SECURITY_LOG_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  clearLogs(): void {
    sessionStorage.removeItem(SECURITY_LOG_KEY);
  }
}
