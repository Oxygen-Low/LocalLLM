import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RoleplayCharacter {
  id: string;
  name: string;
  description?: string;
  job: string;
  role: string;
  personality: string;
  isGenerated: boolean;
}

export interface RoleplayPost {
  id: string;
  characterId: string;
  characterName: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: any[];
}

export interface RoleplaySession {
  id: string;
  name: string;
  universeId: string;
  universeName: string;
  universeDescription?: string;
  personaId: string | null;
  characters: RoleplayCharacter[];
  currentDate: string;
  posts: RoleplayPost[];
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class RoleplayService {
  private http = inject(HttpClient);

  async listSessions(): Promise<RoleplaySession[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; sessions: RoleplaySession[] }>(
        `${environment.apiUrl}/api/roleplay/sessions`
      )
    );
    return res.sessions || [];
  }

  async createSession(name: string, universeId: string, characterIds: string[], personaId: string | null): Promise<RoleplaySession> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; session: RoleplaySession }>(
        `${environment.apiUrl}/api/roleplay/sessions`,
        { name, universeId, characterIds, personaId }
      )
    );
    return res.session;
  }

  async getSession(id: string): Promise<RoleplaySession> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; session: RoleplaySession }>(
        `${environment.apiUrl}/api/roleplay/sessions/${id}`
      )
    );
    return res.session;
  }

  async endDay(id: string): Promise<RoleplaySession> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; session: RoleplaySession }>(
        `${environment.apiUrl}/api/roleplay/sessions/${id}/end-day`,
        {}
      )
    );
    return res.session;
  }

  async rewind(id: string): Promise<RoleplaySession> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; session: RoleplaySession }>(
        `${environment.apiUrl}/api/roleplay/sessions/${id}/rewind`,
        {}
      )
    );
    return res.session;
  }

  async post(id: string, content: string): Promise<RoleplaySession> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; session: RoleplaySession }>(
        `${environment.apiUrl}/api/roleplay/sessions/${id}/post`,
        { content }
      )
    );
    return res.session;
  }

  async reply(id: string, postId: string, content: string): Promise<RoleplaySession> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; session: RoleplaySession }>(
        `${environment.apiUrl}/api/roleplay/sessions/${id}/reply`,
        { postId, content }
      )
    );
    return res.session;
  }

  async like(id: string, postId: string): Promise<RoleplaySession> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; session: RoleplaySession }>(
        `${environment.apiUrl}/api/roleplay/sessions/${id}/like`,
        { postId }
      )
    );
    return res.session;
  }

  async repost(id: string, postId: string): Promise<RoleplaySession> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; session: RoleplaySession }>(
        `${environment.apiUrl}/api/roleplay/sessions/${id}/repost`,
        { postId }
      )
    );
    return res.session;
  }

  async deleteSession(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/roleplay/sessions/${id}`)
    );
  }
}
