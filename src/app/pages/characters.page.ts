import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LlmService, UserCharacter } from '../services/llm.service';

@Component({
  selector: 'app-characters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="container-custom py-8 space-y-4">
    <h1 class="text-2xl font-bold">Characters</h1>
    <div class="grid gap-3 p-4 border rounded-lg">
      <input [(ngModel)]="newName" placeholder="Name" class="input" />
      <textarea [(ngModel)]="newDescription" placeholder="Description" class="input"></textarea>
      <input [(ngModel)]="newRelationships" placeholder="Relationships (plain text, comma-separated)" class="input" />
      <select [(ngModel)]="newPrivacy" class="input">
        <option value="public">Public</option><option value="friends">Friends-Only</option><option value="private">Private</option>
      </select>
      <button class="btn-primary" (click)="create()">Create Character</button>
    </div>
    <div class="space-y-3">
      @for (char of characters(); track char.id) {
        <div class="border rounded-lg p-4">
          <div class="flex justify-between"><h3 class="font-semibold">{{ char.name }}</h3><button (click)="remove(char.id)">Delete</button></div>
          <p class="text-sm text-muted">{{ char.description }}</p>
          <p class="text-xs">Privacy: {{ char.privacy }} • Favorite: {{ char.favorite ? 'Yes' : 'No' }}</p>
          <button class="text-sm" (click)="toggleFavorite(char)">Toggle Favorite</button>
        </div>
      }
    </div>
  </div>`
})
export class CharactersPageComponent {
  private llm = inject(LlmService);
  characters = signal<UserCharacter[]>([]);
  newName = '';
  newDescription = '';
  newRelationships = '';
  newPrivacy: 'public'|'friends'|'private' = 'private';

  constructor() { void this.load(); setInterval(() => void this.load(), 120000); }
  async load() { this.characters.set(await this.llm.getCharacters()); }
  async create() {
    await this.llm.createCharacter({ name: this.newName, description: this.newDescription, relationships: this.newRelationships.split(',').map(v => v.trim()).filter(Boolean), privacy: this.newPrivacy, favorite: false });
    this.newName=''; this.newDescription=''; this.newRelationships=''; this.newPrivacy='private';
    await this.load();
  }
  async toggleFavorite(char: UserCharacter) { await this.llm.updateCharacter(char.id, { favorite: !char.favorite }); await this.load(); }
  async remove(id: string) { await this.llm.deleteCharacter(id); await this.load(); }
}
