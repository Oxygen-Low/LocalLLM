import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
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
      <input [(ngModel)]="newName" placeholder="Name" class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all" />
      <textarea [(ngModel)]="newDescription" placeholder="Description" class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"></textarea>
      <input [(ngModel)]="newRelationships" placeholder="Relationships (plain text, comma-separated)" class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all" />
      <select [(ngModel)]="newPrivacy" class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all">
        <option value="public">Public</option><option value="friends">Friends-Only</option><option value="private">Private</option>
      </select>
      <button type="button" class="btn-primary" (click)="create()">Create Character</button>
      @if (errorMessage()) {
        <p class="text-sm text-red-600">{{ errorMessage() }}</p>
      }
    </div>
    <div class="space-y-3">
      @for (char of characters(); track char.id) {
        <div class="border rounded-lg p-4">
          <div class="flex justify-between items-center gap-2">
            <h3 class="font-semibold">{{ char.name }}</h3>
            <button type="button" class="btn-primary" (click)="confirmRemove(char)">Delete</button>
          </div>
          <p class="text-sm text-muted">{{ char.description }}</p>
          <p class="text-xs">Privacy: {{ char.privacy }} • Favorite: {{ char.favorite ? 'Yes' : 'No' }}</p>
          <button type="button" class="btn-primary mt-2" (click)="toggleFavorite(char)">Toggle Favorite</button>
        </div>
      }
    </div>
  </div>`
})
export class CharactersPageComponent implements OnDestroy {
  private llm = inject(LlmService);
  characters = signal<UserCharacter[]>([]);
  errorMessage = signal('');
  newName = '';
  newDescription = '';
  newRelationships = '';
  newPrivacy: 'public'|'friends'|'private' = 'private';
  private refreshInterval: ReturnType<typeof setInterval> | undefined;

  constructor() {
    void this.load();
    this.refreshInterval = setInterval(() => void this.load(), 120000);
  }
  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
  async load() {
    try {
      const characters = await this.llm.getCharacters();
      this.characters.set(characters);
      this.errorMessage.set('');
    } catch (error) {
      console.error('Load characters failed:', error);
      this.errorMessage.set('Failed to load characters. Please refresh and try again.');
    }
  }
  async create() {
    const trimmedName = this.newName.trim();
    if (!trimmedName) {
      this.errorMessage.set('Character name is required.');
      return;
    }
    try {
      this.errorMessage.set('');
      await this.llm.createCharacter({ name: trimmedName, description: this.newDescription, relationships: this.newRelationships.split(',').map(v => v.trim()).filter(Boolean), privacy: this.newPrivacy, favorite: false });
      await this.load();
      this.newName=''; this.newDescription=''; this.newRelationships=''; this.newPrivacy='private';
    } catch (error) {
      console.error('Create character failed:', error);
      this.errorMessage.set('Failed to create character. Please try again.');
    }
  }
  async toggleFavorite(char: UserCharacter) {
    try {
      this.errorMessage.set('');
      await this.llm.updateCharacter(char.id, { favorite: !char.favorite });
      await this.load();
    } catch (error) {
      console.error('Toggle favorite failed:', error);
      this.errorMessage.set('Failed to update favorite. Please try again.');
    }
  }
  async confirmRemove(char: UserCharacter) {
    if (!confirm(`Delete character "${char.name}"?`)) return;
    await this.remove(char.id);
  }
  async remove(id: string) {
    try {
      this.errorMessage.set('');
      await this.llm.deleteCharacter(id);
      await this.load();
    } catch (error) {
      console.error('Delete character failed:', error);
      this.errorMessage.set('Failed to delete character. Please try again.');
    }
  }
}
