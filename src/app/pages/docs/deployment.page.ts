import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocsContentTranslationDirective } from './docs-content-translation.directive';

@Component({
  selector: 'app-docs-deployment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocsContentTranslationDirective],
  template: `
    <div appDocsContentTranslation class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Deployment</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Deployment</h1>
        <p class="text-lg text-secondary-600">
          Deploy Local.LLM on your infrastructure using Docker, Kubernetes, or other container platforms.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- Deployment Options -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Deployment Options</h2>

          <div class="space-y-6">
            <!-- Docker -->
            <div class="border border-secondary-200 rounded-lg p-6">
              <h3 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <svg class="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                Docker
              </h3>
              <p class="text-secondary-700 text-sm mb-3">
                The recommended way to deploy Local.LLM. Docker ensures consistent deployment across different environments.
              </p>
              <a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View Docker Deployment Guide →
              </a>
            </div>

            <!-- Kubernetes -->
            <div class="border border-secondary-200 rounded-lg p-6">
              <h3 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <svg class="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                Kubernetes
              </h3>
              <p class="text-secondary-700 text-sm mb-3">
                For enterprise-scale deployments with automatic scaling, high availability, and advanced management.
              </p>
              <a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View Kubernetes Deployment Guide →
              </a>
            </div>
          </div>
        </section>

        <!-- Environment Configuration -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Environment Configuration</h2>
          <p class="text-secondary-700 mb-4">
            Configure Local.LLM using environment variables. Common configuration options:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto">
            <pre class="text-white text-sm font-mono"><code># Server Configuration
PORT=3000
NODE_ENV=production

# Database
DB_URL=postgresql://user:pass@localhost:5432/local_llm

# Authentication
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# AI Model Settings
MODEL_CACHE_SIZE=10gb
MAX_CONCURRENT_REQUESTS=5

# Deployment Mode
DEPLOYMENT_MODE=cloud  # or 'self-hosted'
ENABLE_GPU=true</code></pre>
          </div>

          <p class="text-secondary-700 text-sm mt-3">
            See <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700">Configuration Guide</a> for all available options.
          </p>
        </section>

        <!-- Deployment Checklist -->
        <section class="bg-secondary-50 rounded-lg p-6">
          <h3 class="font-semibold text-secondary-900 mb-4">Pre-Deployment Checklist</h3>
          <ul class="space-y-2 text-secondary-700 text-sm">
            <li class="flex gap-2">
              <input type="checkbox" disabled class="flex-shrink-0" />
              <span>Configure environment variables</span>
            </li>
            <li class="flex gap-2">
              <input type="checkbox" disabled class="flex-shrink-0" />
              <span>Set up database and backups</span>
            </li>
            <li class="flex gap-2">
              <input type="checkbox" disabled class="flex-shrink-0" />
              <span>Configure SSL/TLS certificates</span>
            </li>
            <li class="flex gap-2">
              <input type="checkbox" disabled class="flex-shrink-0" />
              <span>Set up monitoring and logging</span>
            </li>
            <li class="flex gap-2">
              <input type="checkbox" disabled class="flex-shrink-0" />
              <span>Test authentication and security</span>
            </li>
            <li class="flex gap-2">
              <input type="checkbox" disabled class="flex-shrink-0" />
              <span>Plan for scaling and high availability</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DocsDeploymentPageComponent {}
