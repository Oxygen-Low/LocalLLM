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
      this.http.get<{ success: boolean; spaces: BookSpace[] }>(
        `${environment.apiUrl}/api/books/spaces`
      )
    );
    return res.spaces || [];
  }

  async createSpace(data: { title: string; inspiration?: string; description?: string }): Promise<BookSpace> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; space: BookSpace }>(
        `${environment.apiUrl}/api/books/spaces`,
        data
      )
    );
    return res.space;
  }

  async getSpace(id: string): Promise<BookSpace> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; space: BookSpace }>(
        `${environment.apiUrl}/api/books/spaces/${id}`
      )
    );
    return res.space;
  }

  async deleteSpace(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/books/spaces/${id}`)
    );
  }

  async uploadBook(spaceId: string, file: File): Promise<Book> {
    const formData = new FormData();
    formData.append('book', file);
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; book: Book }>(
        `${environment.apiUrl}/api/books/spaces/${spaceId}/books`,
        formData
      )
    );
    return res.book;
  }

  async deleteBook(spaceId: string, bookId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/books/spaces/${spaceId}/books/${bookId}`)
    );
  }

  async generateTask(spaceId: string, type: 'book' | 'paragraph' | 'sentence', generateSample: boolean): Promise<WritingTask> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; task: WritingTask }>(
        `${environment.apiUrl}/api/books/spaces/${spaceId}/generate-task`,
        { type, generateSample }
      )
    );
    return res.task;
  }

  async evaluateScene(spaceId: string, task: WritingTask, writtenContent: string): Promise<Evaluation> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; evaluation: Evaluation }>(
        `${environment.apiUrl}/api/books/spaces/${spaceId}/evaluate`,
        { task, writtenContent }
      )
    );
    return res.evaluation;
  }
}
