import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LocalFixSession {
  id: string;
  computerName: string;
  issueDescription: string;
  allowCommands: boolean;
  status: 'active' | 'completed' | 'removed';
  createdAt: string;
  lastActivity: number;
  logs: LocalFixLog[];
}

export interface LocalFixLog {
  id: string;
  type: 'command' | 'output' | 'llm' | 'file-read' | 'file-write' | 'info' | 'error';
  content: string;
  timestamp: string;
  approved?: boolean;
}

export interface LocalFixCommand {
  id: string;
  command: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  output?: string;
  timestamp: string;
}

export interface ScriptInfo {
  bat: string;
  sh: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocalFixService {
  private http = inject(HttpClient);

  // --- Sessions ---

  async createSession(instanceUrl: string, userId: string, issueDescription: string, allowCommands: boolean, provider?: string, model?: string): Promise<LocalFixSession> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; session: LocalFixSession }>(
        `${environment.apiUrl}/api/local-fix/sessions`,
        { instanceUrl, userId, issueDescription, allowCommands, provider, model }
      )
    );
    return res.session;
  }

  async listSessions(): Promise<LocalFixSession[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; sessions: LocalFixSession[] }>(
        `${environment.apiUrl}/api/local-fix/sessions`
      )
    );
    return res.sessions || [];
  }

  async getSession(id: string): Promise<LocalFixSession> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; session: LocalFixSession }>(
        `${environment.apiUrl}/api/local-fix/sessions/${id}`
      )
    );
    return res.session;
  }

  async removeSession(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/local-fix/sessions/${id}`)
    );
  }

  // --- Script Generation ---

  async getSetupScript(sessionId: string): Promise<ScriptInfo> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; bat: string; sh: string }>(
        `${environment.apiUrl}/api/local-fix/sessions/${sessionId}/script`
      )
    );
    return { bat: res.bat, sh: res.sh };
  }

  // --- Commands ---

  async getPendingCommands(sessionId: string): Promise<LocalFixCommand[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; commands: LocalFixCommand[] }>(
        `${environment.apiUrl}/api/local-fix/sessions/${sessionId}/commands`
      )
    );
    return res.commands || [];
  }

  async approveCommand(sessionId: string, commandId: string): Promise<{ output: string }> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; output: string }>(
        `${environment.apiUrl}/api/local-fix/sessions/${sessionId}/commands/${commandId}/approve`,
        {}
      )
    );
    return { output: res.output || '' };
  }

  async rejectCommand(sessionId: string, commandId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${environment.apiUrl}/api/local-fix/sessions/${sessionId}/commands/${commandId}/reject`,
        {}
      )
    );
  }

  // --- LLM Interaction ---

  async sendMessage(sessionId: string, message: string): Promise<{ response: string }> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; response: string }>(
        `${environment.apiUrl}/api/local-fix/sessions/${sessionId}/chat`,
        { message }
      )
    );
    return { response: res.response };
  }

  // --- File Operations ---

  async readFile(sessionId: string, filePath: string): Promise<{ content: string }> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; content: string }>(
        `${environment.apiUrl}/api/local-fix/sessions/${sessionId}/file`,
        { params: { path: filePath } }
      )
    );
    return { content: res.content || '' };
  }

  async writeFile(sessionId: string, filePath: string, content: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/api/local-fix/sessions/${sessionId}/file`, {
        path: filePath,
        content,
      })
    );
  }

  // --- Logs ---

  async getLogs(sessionId: string): Promise<LocalFixLog[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; logs: LocalFixLog[] }>(
        `${environment.apiUrl}/api/local-fix/sessions/${sessionId}/logs`
      )
    );
    return res.logs || [];
  }
}
