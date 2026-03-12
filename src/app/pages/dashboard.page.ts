import { Component } from '@angular/core';
import { AppCardComponent, type AIApp } from '../components/app-card.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AppCardComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-12 sm:py-16 lg:py-20">
        <!-- Header -->
        <div class="max-w-3xl mb-12 sm:mb-16">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
            Dashboard
          </div>
          <h1 class="text-4xl sm:text-5xl font-bold text-secondary-900 mb-4">
            AI Applications Hub
          </h1>
          <p class="text-lg text-muted">
            Access your suite of AI applications. Available on our cloud platform or self-hosted on your infrastructure.
          </p>
        </div>

        <!-- Filter/Search Bar -->
        <div class="mb-12 sm:mb-16">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="flex-1 w-full">
              <input
                type="text"
                placeholder="Search applications..."
                class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
            <div class="flex gap-2">
              <button class="px-4 py-3 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors font-medium text-secondary-900">
                All
              </button>
              <button class="px-4 py-3 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors font-medium text-secondary-900">
                Tools
              </button>
              <button class="px-4 py-3 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors font-medium text-secondary-900">
                Models
              </button>
            </div>
          </div>
        </div>

        <!-- Apps Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          @for (app of apps; track app.id) {
            <app-app-card [app]="app"></app-app-card>
          }
        </div>

        <!-- Empty State (shown when no apps match search) -->
        @if (apps.length === 0) {
          <div class="text-center py-12">
            <div class="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">No applications found</h3>
            <p class="text-muted">Try adjusting your search or filters</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardPageComponent {
  apps: AIApp[] = [
    {
      id: 'chatbot',
      name: 'AI Chatbot',
      description: 'Conversational AI assistant for answering questions and having meaningful discussions.',
      icon: '💬',
      category: 'Conversation',
      color: 'blue',
    },
    {
      id: 'code-assistant',
      name: 'Code Assistant',
      description: 'Intelligent code completion, generation, and debugging for multiple programming languages.',
      icon: '⚙️',
      category: 'Development',
      color: 'purple',
    },
    {
      id: 'content-generator',
      name: 'Content Generator',
      description: 'Create high-quality written content for blogs, marketing, and creative projects.',
      icon: '✍️',
      category: 'Content',
      color: 'orange',
    },
    {
      id: 'research-tool',
      name: 'Research Tool',
      description: 'Summarize documents, extract insights, and analyze research papers efficiently.',
      icon: '🔍',
      category: 'Analysis',
      color: 'green',
    },
    {
      id: 'creative-writer',
      name: 'Creative Writer',
      description: 'AI-powered creative writing assistant for stories, poetry, and imaginative content.',
      icon: '📖',
      category: 'Creative',
      color: 'pink',
    },
    {
      id: 'translator',
      name: 'Translator',
      description: 'Translate between multiple languages with context-aware, natural translations.',
      icon: '🌍',
      category: 'Languages',
      color: 'cyan',
    },
    {
      id: 'image-analyzer',
      name: 'Image Analyzer',
      description: 'Analyze images, extract text, and understand visual content using AI vision.',
      icon: '🖼️',
      category: 'Vision',
      color: 'blue',
    },
    {
      id: 'data-processor',
      name: 'Data Processor',
      description: 'Process and analyze large datasets with AI-powered insights and visualizations.',
      icon: '📊',
      category: 'Analytics',
      color: 'purple',
    },
    {
      id: 'voice-ai',
      name: 'Voice AI',
      description: 'Text-to-speech and speech-to-text conversion with natural voice synthesis.',
      icon: '🎤',
      category: 'Audio',
      color: 'orange',
    },
  ];
}
