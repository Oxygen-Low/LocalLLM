import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocsContentTranslationDirective } from './docs-content-translation.directive';

@Component({
  selector: 'app-docs-getting-started',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocsContentTranslationDirective],
  template: `
    <div appDocsContentTranslation class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Getting Started</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Getting Started</h1>
        <p class="text-lg text-secondary-600">
          Learn how to get up and running with Local.LLM in minutes.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- What is Local.LLM -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">What is Local.LLM?</h2>
          <p class="text-secondary-700 leading-relaxed">
            Local.LLM is a unified platform for accessing and managing multiple AI applications. Whether you're using our cloud service or self-hosting on your own infrastructure, Local.LLM provides a consistent interface to run, manage, and scale AI workloads.
          </p>
        </section>

        <!-- Key Features -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Key Features</h2>
          <ul class="space-y-3 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">•</span>
              <span><strong>Cloud & Self-Hosted:</strong> Deploy on our infrastructure or host it yourself</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">•</span>
              <span><strong>Enterprise Ready:</strong> Built for production workloads with security and scalability</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">•</span>
              <span><strong>Open Source:</strong> Fully transparent, community-driven development</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">•</span>
              <span><strong>Multiple AI Apps:</strong> Access chatbots, code assistants, content generators, and more</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">•</span>
              <span><strong>Performance Monitoring:</strong> Real-time insights into resource usage and model performance</span>
            </li>
          </ul>
        </section>

        <!-- Quick Start -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Quick Start</h2>
          <p class="text-secondary-700 mb-4">Get started with Local.LLM in three simple steps:</p>

          <div class="space-y-4">
            <!-- Step 1 -->
            <div class="border-l-4 border-primary-600 pl-4">
              <h3 class="font-semibold text-secondary-900 mb-2">1. Create an Account</h3>
              <p class="text-secondary-700 text-sm">
                Sign up at <a href="#" class="text-primary-600 hover:text-primary-700">local.llm</a> to access the cloud platform.
              </p>
            </div>

            <!-- Step 2 -->
            <div class="border-l-4 border-primary-600 pl-4">
              <h3 class="font-semibold text-secondary-900 mb-2">2. Choose Your Deployment</h3>
              <p class="text-secondary-700 text-sm">
                Select between our managed cloud service or self-hosted deployment on your infrastructure.
              </p>
            </div>

            <!-- Step 3 -->
            <div class="border-l-4 border-primary-600 pl-4">
              <h3 class="font-semibold text-secondary-900 mb-2">3. Launch Your First App</h3>
              <p class="text-secondary-700 text-sm">
                Browse the application dashboard and launch any AI app to start using it immediately.
              </p>
            </div>
          </div>
        </section>

        <!-- Next Steps -->
        <section class="bg-secondary-50 rounded-lg p-6">
          <h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3>
          <ul class="space-y-2 text-secondary-700 text-sm">
            <li><a href="/docs/installation" class="text-primary-600 hover:text-primary-700 font-medium">→ Installation Guide</a></li>
            <li><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 font-medium">→ Deployment Options</a></li>
            <li><a href="/docs/api" class="text-primary-600 hover:text-primary-700 font-medium">→ API Reference</a></li>
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DocsGettingStartedPageComponent {}
