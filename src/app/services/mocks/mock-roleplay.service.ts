import { Injectable } from '@angular/core';
import { RoleplaySession, RoleplayPost, RoleplayCharacter } from '../roleplay.service';

@Injectable({
  providedIn: 'root',
})
export class MockRoleplayService {
  private sessions: RoleplaySession[] = [];

  async listSessions(): Promise<RoleplaySession[]> {
    return this.sessions;
  }

  async createSession(name: string, universeId: string, characterIds: string[], personaId: string | null): Promise<RoleplaySession> {
    const session: RoleplaySession = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${universeId} - ${new Date().toISOString().replace('T', ' ').split('.')[0]}`,
      universeId,
      universeName: universeId === 'u1' ? 'Cyberpunk 2077' : 'Middle-earth',
      personaId,
      characters: [
        { id: 'c1', name: 'Johnny Silverhand', job: 'Rockerboy', role: 'Legend', personality: 'Rebellious', isGenerated: false },
        { id: 'npc1', name: 'Random NPC', job: 'Citizen', role: 'NPC', personality: 'Average', isGenerated: true }
      ],
      currentDate: new Date().toISOString().split('T')[0],
      posts: [],
      createdAt: new Date().toISOString(),
    };
    this.sessions.push(session);
    return session;
  }

  async getSession(id: string): Promise<RoleplaySession> {
    const session = this.sessions.find(s => s.id === id);
    if (!session) throw new Error('Session not found');
    return session;
  }

  async endDay(id: string): Promise<RoleplaySession> {
    const session = await this.getSession(id);
    const date = new Date(session.currentDate);
    date.setDate(date.getDate() + 1);
    session.currentDate = date.toISOString().split('T')[0];

    session.posts.unshift({
      id: Math.random().toString(36).substr(2, 9),
      characterId: 'c1',
      characterName: 'Johnny Silverhand',
      content: 'Wake up, Samurai. We have a city to burn.',
      timestamp: new Date().toISOString(),
      likes: 10,
      replies: []
    });

    return session;
  }

  async rewind(id: string): Promise<RoleplaySession> {
    return this.getSession(id);
  }

  async post(id: string, content: string): Promise<RoleplaySession> {
    const session = await this.getSession(id);
    session.posts.unshift({
      id: Math.random().toString(36).substr(2, 9),
      characterId: 'user',
      characterName: 'You',
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: []
    });
    return session;
  }

  async reply(id: string, postId: string, content: string): Promise<RoleplaySession> {
    const session = await this.getSession(id);
    const post = session.posts.find(p => p.id === postId);
    if (post) {
      post.replies.push({
        id: Math.random().toString(36).substr(2, 9),
        characterId: 'user',
        characterName: 'You',
        content,
        timestamp: new Date().toISOString(),
        likes: 0
      });
    }
    return session;
  }

  async like(id: string, postId: string): Promise<RoleplaySession> {
    const session = await this.getSession(id);
    const post = session.posts.find(p => p.id === postId);
    if (post) post.likes++;
    return session;
  }

  async repost(id: string, postId: string): Promise<RoleplaySession> {
    const session = await this.getSession(id);
    const post = session.posts.find(p => p.id === postId);
    if (post) {
      session.posts.unshift({
        id: Math.random().toString(36).substr(2, 9),
        characterId: 'user',
        characterName: 'You',
        content: `RT @${post.characterName}: ${post.content}`,
        timestamp: new Date().toISOString(),
        likes: 0,
        replies: []
      });
    }
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions = this.sessions.filter(s => s.id !== id);
  }
}
