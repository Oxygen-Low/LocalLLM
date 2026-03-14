import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-configuration',
  standalone: true,
  template: `
    <div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Configuration</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Configuration</h1>
        <p class="text-lg text-secondary-600">
          Complete reference for configuring Local.LLM using environment variables.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- Server Configuration -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Server Configuration</h2>

          <div class="space-y-4">
            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">PORT</h4>
              <p class="text-secondary-700 text-sm mb-2">Server port number</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">3000</span>
              </div>
              <p class="text-secondary-700 text-sm">Example: <code class="bg-secondary-100 px-2 py-1 rounded">PORT=8080</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">NODE_ENV</h4>
              <p class="text-secondary-700 text-sm mb-2">Node.js environment mode</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">development</span> | Values: <span class="font-semibold">development, production, test</span>
              </div>
              <p class="text-secondary-700 text-sm">Use <code class="bg-secondary-100 px-2 py-1 rounded">production</code> for deployments</p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">LOG_LEVEL</h4>
              <p class="text-secondary-700 text-sm mb-2">Application logging level</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">info</span> | Values: <span class="font-semibold">debug, info, warn, error</span>
              </div>
              <p class="text-secondary-700 text-sm">Example: <code class="bg-secondary-100 px-2 py-1 rounded">LOG_LEVEL=debug</code></p>
            </div>
          </div>
        </section>

        <!-- Database Configuration -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Database Configuration</h2>

          <div class="space-y-4">
            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">DB_URL</h4>
              <p class="text-secondary-700 text-sm mb-2">PostgreSQL connection string</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Required for production
              </div>
              <p class="text-secondary-700 text-sm mb-2">Format: <code class="bg-secondary-100 px-2 py-1 rounded">postgresql://user:password@host:5432/database</code></p>
              <p class="text-secondary-700 text-sm">Example: <code class="bg-secondary-100 px-2 py-1 rounded">DB_URL=postgresql://llm_user:pass123@db.example.com:5432/local_llm</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">DB_POOL_SIZE</h4>
              <p class="text-secondary-700 text-sm mb-2">Database connection pool size</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">10</span>
              </div>
              <p class="text-secondary-700 text-sm">Increase for high-concurrency deployments</p>
            </div>
          </div>
        </section>

        <!-- Authentication & Security -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Authentication & Security</h2>

          <div class="space-y-4">
            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">JWT_SECRET</h4>
              <p class="text-secondary-700 text-sm mb-2">Secret key for JWT token signing</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                <span class="text-red-600 font-semibold">Required</span> - Must be at least 32 characters
              </div>
              <p class="text-secondary-700 text-sm">Generate with: <code class="bg-secondary-100 px-2 py-1 rounded">openssl rand -base64 32</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">API_KEY</h4>
              <p class="text-secondary-700 text-sm mb-2">Master API key for service-to-service authentication</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                <span class="text-red-600 font-semibold">Required</span> - Must be at least 32 characters
              </div>
              <p class="text-secondary-700 text-sm">Generate with: <code class="bg-secondary-100 px-2 py-1 rounded">openssl rand -base64 32</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">CORS_ORIGINS</h4>
              <p class="text-secondary-700 text-sm mb-2">Allowed CORS origins (comma-separated)</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">http://localhost:3000</span>
              </div>
              <p class="text-secondary-700 text-sm">Example: <code class="bg-secondary-100 px-2 py-1 rounded">CORS_ORIGINS=https://app.example.com,https://api.example.com</code></p>
            </div>
          </div>
        </section>

        <!-- AI Model Settings -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">AI Model Settings</h2>

          <div class="space-y-4">
            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">MODEL_CACHE_SIZE</h4>
              <p class="text-secondary-700 text-sm mb-2">Maximum size for model cache</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">10gb</span>
              </div>
              <p class="text-secondary-700 text-sm">Format: <code class="bg-secondary-100 px-2 py-1 rounded">10gb</code>, <code class="bg-secondary-100 px-2 py-1 rounded">512mb</code>, etc.</p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">MAX_CONCURRENT_REQUESTS</h4>
              <p class="text-secondary-700 text-sm mb-2">Maximum concurrent API requests</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">5</span>
              </div>
              <p class="text-secondary-700 text-sm">Increase based on available resources</p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">DEFAULT_MODEL</h4>
              <p class="text-secondary-700 text-sm mb-2">Default AI model to use</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">gpt-3.5-turbo</span>
              </div>
              <p class="text-secondary-700 text-sm">Supported: <code class="bg-secondary-100 px-2 py-1 rounded">gpt-3.5-turbo</code>, <code class="bg-secondary-100 px-2 py-1 rounded">gpt-4</code>, <code class="bg-secondary-100 px-2 py-1 rounded">claude-3</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">ENABLE_GPU</h4>
              <p class="text-secondary-700 text-sm mb-2">Enable GPU acceleration for models</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">false</span> | Values: <span class="font-semibold">true, false</span>
              </div>
              <p class="text-secondary-700 text-sm">Requires GPU hardware and CUDA/ROCm drivers</p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">GPU_MEMORY_FRACTION</h4>
              <p class="text-secondary-700 text-sm mb-2">Fraction of GPU memory to use (0.0 to 1.0)</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">0.8</span>
              </div>
              <p class="text-secondary-700 text-sm">Example: <code class="bg-secondary-100 px-2 py-1 rounded">GPU_MEMORY_FRACTION=0.6</code></p>
            </div>
          </div>
        </section>

        <!-- Deployment Settings -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Deployment Settings</h2>

          <div class="space-y-4">
            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">DEPLOYMENT_MODE</h4>
              <p class="text-secondary-700 text-sm mb-2">Deployment type and behavior</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Values: <span class="font-semibold">cloud, self-hosted</span>
              </div>
              <p class="text-secondary-700 text-sm">Use <code class="bg-secondary-100 px-2 py-1 rounded">cloud</code> for cloud deployments or <code class="bg-secondary-100 px-2 py-1 rounded">self-hosted</code> for self-managed</p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">ENABLE_METRICS</h4>
              <p class="text-secondary-700 text-sm mb-2">Enable Prometheus metrics endpoint</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">true</span> | Values: <span class="font-semibold">true, false</span>
              </div>
              <p class="text-secondary-700 text-sm">Metrics available at <code class="bg-secondary-100 px-2 py-1 rounded">/metrics</code> endpoint</p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">ENABLE_HEALTH_CHECK</h4>
              <p class="text-secondary-700 text-sm mb-2">Enable health check endpoint</p>
              <div class="bg-secondary-50 px-3 py-2 rounded text-sm font-mono text-secondary-900 mb-2">
                Default: <span class="font-semibold">true</span> | Values: <span class="font-semibold">true, false</span>
              </div>
              <p class="text-secondary-700 text-sm">Health check available at <code class="bg-secondary-100 px-2 py-1 rounded">/health</code> endpoint</p>
            </div>
          </div>
        </section>

        <!-- Example Configuration -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Production Configuration Example</h2>
          <p class="text-secondary-700 mb-4">
            Complete example of a production-ready .env file:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto">
            <pre class="text-white text-sm font-mono"># Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Database
DB_URL=postgresql://user:secure-password@db.example.com:5432/local_llm
DB_POOL_SIZE=20

# Security
JWT_SECRET=your-very-secure-random-jwt-secret-here
API_KEY=your-very-secure-random-api-key-here
CORS_ORIGINS=https://app.example.com,https://api.example.com

# AI Models
MODEL_CACHE_SIZE=20gb
MAX_CONCURRENT_REQUESTS=10
DEFAULT_MODEL=gpt-4
ENABLE_GPU=true
GPU_MEMORY_FRACTION=0.8

# Deployment
DEPLOYMENT_MODE=self-hosted
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true</pre>
          </div>
        </section>

        <!-- Next Steps -->
        <section class="bg-primary-50 rounded-lg p-6 border border-primary-200">
          <h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3>
          <ul class="space-y-2 text-secondary-700">
            <li>
              <a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 font-medium">Deployment Guide</a> - Learn how to deploy Local.LLM
            </li>
            <li>
              <a href="/docs/troubleshooting" class="text-primary-600 hover:text-primary-700 font-medium">Troubleshooting</a> - Common issues and solutions
            </li>
            <li>
              <a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 font-medium">API Reference</a> - Explore the Local.LLM API
            </li>
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DocsConfigurationPageComponent {}
