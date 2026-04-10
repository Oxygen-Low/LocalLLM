import { Injectable } from '@angular/core';
import {
  LocalFixSession,
  LocalFixLog,
  LocalFixCommand,
  ScriptInfo,
} from '../local-fix.service';

@Injectable({
  providedIn: 'root',
})
export class MockLocalFixService {
  private mockSession: LocalFixSession = {
    id: 'demo-session-1',
    computerName: 'demo-pc',
    issueDescription: 'Computer running slowly, high CPU usage',
    allowCommands: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastActivity: Date.now(),
    logs: [
      {
        id: 'log-1',
        type: 'info',
        content: 'Session started. Diagnosing high CPU usage...',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'log-2',
        type: 'llm',
        content: 'I will check what processes are consuming the most CPU. Let me run a diagnostic command.',
        timestamp: new Date().toISOString(),
      },
    ],
  };

  async createSession(_instanceUrl: string, _userId: string, issueDescription: string, allowCommands: boolean): Promise<LocalFixSession> {
    return {
      ...this.mockSession,
      issueDescription,
      allowCommands,
    };
  }

  async listSessions(): Promise<LocalFixSession[]> {
    return [this.mockSession];
  }

  async getSession(_id: string): Promise<LocalFixSession> {
    return this.mockSession;
  }

  async removeSession(_id: string): Promise<void> {}

  async getSetupScript(_sessionId: string): Promise<ScriptInfo> {
    return {
      bat: '@echo off\necho Setting up Local Fix agent...\necho Connected to Local.LLM instance\npause',
      sh: '#!/bin/bash\necho "Setting up Local Fix agent..."\necho "Connected to Local.LLM instance"',
    };
  }

  async getPendingCommands(_sessionId: string): Promise<LocalFixCommand[]> {
    return [
      {
        id: 'cmd-1',
        command: 'top -b -n 1 | head -20',
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    ];
  }

  async approveCommand(_sessionId: string, _commandId: string): Promise<{ output: string }> {
    return { output: 'PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n1234 user     20   0  500000  50000  10000 R  95.0   2.5   5:30.12 example-proc' };
  }

  async rejectCommand(_sessionId: string, _commandId: string): Promise<void> {}

  async sendMessage(_sessionId: string, _message: string): Promise<{ response: string }> {
    return { response: 'I can see the issue. The process `example-proc` is consuming 95% CPU. Would you like me to investigate further or attempt to fix it?' };
  }

  async readFile(_sessionId: string, _filePath: string): Promise<{ content: string }> {
    return { content: '# Example config file\nsetting=value\n' };
  }

  async writeFile(_sessionId: string, _filePath: string, _content: string): Promise<void> {}

  async getLogs(_sessionId: string): Promise<LocalFixLog[]> {
    return this.mockSession.logs;
  }
}
