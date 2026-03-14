import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-deployment-docker',
  standalone: true,
  template: `
    <div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Deployment</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Docker</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Docker Deployment</h1>
        <p class="text-lg text-secondary-600">
          Deploy Local.LLM using Docker for consistent, reproducible deployments across environments.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- Prerequisites -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Prerequisites</h2>
          <ul class="space-y-2 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Docker Engine 20.10 or later installed and running</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Docker Compose 1.29 or later (for multi-container setup)</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>At least 4GB of available RAM</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>10GB of disk space for models and data</span>
            </li>
          </ul>
        </section>

        <!-- Quick Start -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Quick Start with Docker</h2>
          <p class="text-secondary-700 mb-4">
            The simplest way to run Local.LLM is using our official Docker image:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">docker run -d \
  --name local-llm \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -e API_KEY=your-api-key \
  -v local_llm_data:/app/data \
  locallm/local-llm:latest</pre>
          </div>

          <p class="text-secondary-700 text-sm">
            This will start Local.LLM and make it available at <code class="bg-secondary-100 px-2 py-1 rounded">http://localhost:3000</code>
          </p>
        </section>

        <!-- Docker Compose -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Using Docker Compose</h2>
          <p class="text-secondary-700 mb-4">
            For a production-ready setup with PostgreSQL database:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">version: '3.8'

services:
  local-llm:
    image: locallm/local-llm:latest
    container_name: local-llm
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
      - API_KEY=your-api-key
      - DB_URL=postgresql://user:password@postgres:5432/local_llm
      - DEPLOYMENT_MODE=self-hosted
      - ENABLE_GPU=false
    volumes:
      - local_llm_data:/app/data
      - local_llm_models:/app/models
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: local-llm-db
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=local_llm
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  local_llm_data:
  local_llm_models:
  postgres_data:</pre>
          </div>

          <p class="text-secondary-700">
            Save this as <code class="bg-secondary-100 px-2 py-1 rounded">docker-compose.yml</code> and run:
          </p>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mt-2">
            <pre class="text-white text-sm font-mono">docker-compose up -d</pre>
          </div>
        </section>

        <!-- GPU Support -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">GPU Support</h2>
          <p class="text-secondary-700 mb-4">
            To enable GPU acceleration, install NVIDIA Container Toolkit and modify your docker-compose.yml:
          </p>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-blue-900">
              <strong>GPU Setup:</strong> NVIDIA Container Toolkit must be installed on your host machine. See the <a href="https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html" class="text-primary-600 hover:text-primary-700 underline">official installation guide</a>.
            </p>
          </div>

          <div class="bg-black rounded-lg p-4 overflow-x-auto">
            <pre class="text-white text-sm font-mono">services:
  local-llm:
    image: locallm/local-llm:latest
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - ENABLE_GPU=true
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]</pre>
          </div>
        </section>

        <!-- Volume Persistence -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Volume Persistence</h2>
          <p class="text-secondary-700 mb-4">
            Data persistence is crucial for production deployments. Local.LLM uses two main volumes:
          </p>

          <ul class="space-y-3 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">local_llm_data:</span>
              <span>Application data, configuration, and logs</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">local_llm_models:</span>
              <span>Cached AI models and weights</span>
            </li>
          </ul>

          <p class="text-secondary-700 mt-4">
            For production, consider using named volumes or host-mounted paths for better backup and recovery:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mt-4">
            <pre class="text-white text-sm font-mono">volumes:
  - /data/local-llm/data:/app/data
  - /data/local-llm/models:/app/models</pre>
          </div>
        </section>

        <!-- Networking -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Networking</h2>
          <p class="text-secondary-700 mb-4">
            By default, Local.LLM runs on port 3000. For production deployments:
          </p>

          <ul class="space-y-2 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Use a reverse proxy (nginx, Traefik) for SSL/TLS termination</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Run on a private network and access through a VPN</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Configure firewall rules to restrict access</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Use environment variables for sensitive configuration</span>
            </li>
          </ul>
        </section>

        <!-- Troubleshooting -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Troubleshooting</h2>

          <div class="space-y-4">
            <div class="border-l-4 border-orange-400 bg-orange-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Out of Memory</h4>
              <p class="text-secondary-700 text-sm">
                Increase Docker's memory allocation or reduce model cache size with <code class="bg-white px-1">MODEL_CACHE_SIZE=5gb</code>
              </p>
            </div>

            <div class="border-l-4 border-orange-400 bg-orange-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Permission Denied</h4>
              <p class="text-secondary-700 text-sm">
                Ensure proper volume permissions. Run: <code class="bg-white px-1">docker exec local-llm chown -R app:app /app/data</code>
              </p>
            </div>

            <div class="border-l-4 border-orange-400 bg-orange-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Database Connection Failed</h4>
              <p class="text-secondary-700 text-sm">
                Verify the database service is running and accessible. Check logs: <code class="bg-white px-1">docker logs local-llm</code>
              </p>
            </div>
          </div>
        </section>

        <!-- Next Steps -->
        <section class="bg-primary-50 rounded-lg p-6 border border-primary-200">
          <h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3>
          <ul class="space-y-2 text-secondary-700">
            <li>
              <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">Configuration Guide</a> - Learn about all available environment variables
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
export class DocsDeploymentDockerPageComponent {}
