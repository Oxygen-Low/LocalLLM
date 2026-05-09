import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Book {
  id: string;
  name: string;
  filename: string;
  uploadedAt: string;
}

export interface BookSpace {
  id: string;
  title: string;
  inspiration: string;
  description: string;
  books: Book[];
  createdAt: string;
  updatedAt: string;
}

export interface WritingTask {
  characters: Array<{ name: string; description: string }>;
  setting: string;
  task: string;
  sample?: string;
}

export interface InlineComment {
  text: string;
  comment: string;
  type: 'word' | 'sentence' | 'paragraph';
}

export interface Evaluation {
  overallFeedback: string;
  suggestions: string;
  inlineComments: InlineComment[];
}

@Injectable({
  providedIn: 'root',
})
export class BooksService {
  private http = inject(HttpClient);

  async listSpaces(): Promise<BookSpace[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; spaces: BookSpace[]; error?: string }>(
        `${environment.apiUrl}/api/books/spaces`
      )
    );
    if (!res.success) throw new Error(res.error || 'Failed to list spaces');
    return res.spaces || [];
  }

  async createSpace(data: { title: string; inspiration?: string; description?: string }): Promise<BookSpace> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; space: BookSpace; error?: string }>(
        `${environment.apiUrl}/api/books/spaces`,
        data
      )
    );
    if (!res.success) throw new Error(res.error || 'Failed to create space');
    return res.space;
  }

  async getSpace(id: string): Promise<BookSpace> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; space: BookSpace; error?: string }>(
        `${environment.apiUrl}/api/books/spaces/${id}`
      )
    );
    if (!res.success) throw new Error(res.error || 'Failed to get space');
    return res.space;
  }

  async deleteSpace(id: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.delete<{ success: boolean; error?: string }>(`${environment.apiUrl}/api/books/spaces/${id}`)
    );
    if (!res.success) throw new Error(res.error || 'Failed to delete space');
  }

  async uploadBook(spaceId: string, file: File): Promise<Book> {
    const formData = new FormData();
    formData.append('book', file);
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; book: Book; error?: string }>(
        `${environment.apiUrl}/api/books/spaces/${spaceId}/books`,
        formData
      )
    );
    if (!res.success) {
      const err = new Error(res.error || 'Failed to upload book');
      (err as any).error = res;
      throw err;
    }
    return res.book;
  }

  async deleteBook(spaceId: string, bookId: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.delete<{ success: boolean; error?: string }>(`${environment.apiUrl}/api/books/spaces/${spaceId}/books/${bookId}`)
    );
    if (!res.success) throw new Error(res.error || 'Failed to delete book');
  }

  async generateTask(spaceId: string, type: 'book' | 'paragraph' | 'sentence', generateSample: boolean): Promise<WritingTask> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; task: WritingTask; error?: string }>(
        `${environment.apiUrl}/api/books/spaces/${spaceId}/generate-task`,
        { type, generateSample }
      )
    );
    if (!res.success) throw new Error(res.error || 'Failed to generate task');
    return res.task;
  }

  async evaluateScene(spaceId: string, task: WritingTask, writtenContent: string): Promise<Evaluation> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; evaluation: Evaluation; error?: string }>(
        `${environment.apiUrl}/api/books/spaces/${spaceId}/evaluate`,
        { task, writtenContent }
      )
    );
    if (!res.success) throw new Error(res.error || 'Failed to evaluate scene');
    return res.evaluation;
  }
}
