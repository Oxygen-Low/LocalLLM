import { Component } from '@angular/core';
import { DocsContentTranslationDirective } from './docs-content-translation.directive';

@Component({
  selector: 'app-docs-troubleshooting',
  standalone: true,
  imports: [DocsContentTranslationDirective],
  template: `
    <div appDocsContentTranslation class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Troubleshooting</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Troubleshooting</h1>
        <p class="text-lg text-secondary-600">
          Common issues and solutions for Local.LLM deployments.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- Common Issues -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Common Issues</h2>

          <!-- Issue 1 -->
          <div class="border border-secondary-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Application won't start</h3>
            <p class="text-secondary-700 mb-4">The Local.LLM service fails to start or crashes immediately.</p>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check the logs
              </h4>
              <p class="text-secondary-700 text-sm mb-2">
                <strong>Docker:</strong> <code class="bg-white px-2 py-1 rounded">docker logs local-llm</code>
              </p>
              <p class="text-secondary-700 text-sm mb-2">
                <strong>Kubernetes:</strong> <code class="bg-white px-2 py-1 rounded">kubectl logs -n local-llm -l app=local-llm</code>
              </p>
              <p class="text-secondary-700 text-sm">
                <strong>Direct:</strong> Check <code class="bg-white px-2 py-1 rounded">/var/log/local-llm/app.log</code>
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Verify environment variables
              </h4>
              <p class="text-secondary-700 text-sm">
                Ensure all required variables are set: <code class="bg-white px-2 py-1 rounded">JWT_SECRET</code>, <code class="bg-white px-2 py-1 rounded">API_KEY</code>, and <code class="bg-white px-2 py-1 rounded">DB_URL</code> (for production)
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check system resources
              </h4>
              <p class="text-secondary-700 text-sm">
                Verify available RAM, CPU, and disk space meet minimum requirements (4GB RAM, 2 CPU cores, 10GB storage)
              </p>
            </div>
          </div>

          <!-- Issue 2 -->
          <div class="border border-secondary-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Out of Memory (OOM)</h3>
            <p class="text-secondary-700 mb-4">Application crashes due to insufficient memory.</p>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Reduce model cache size
              </h4>
              <p class="text-secondary-700 text-sm">
                Set <code class="bg-white px-2 py-1 rounded">MODEL_CACHE_SIZE=5gb</code> to limit cached models
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Reduce concurrent requests
              </h4>
              <p class="text-secondary-700 text-sm">
                Lower <code class="bg-white px-2 py-1 rounded">MAX_CONCURRENT_REQUESTS</code> to reduce memory usage per request
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Increase available RAM
              </h4>
              <p class="text-secondary-700 text-sm">
                Upgrade your host machine or Kubernetes node with more RAM
              </p>
            </div>
          </div>

          <!-- Issue 3 -->
          <div class="border border-secondary-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Database connection errors</h3>
            <p class="text-secondary-700 mb-4">Unable to connect to PostgreSQL database.</p>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Verify database is running
              </h4>
              <p class="text-secondary-700 text-sm mb-2">
                Test connectivity: <code class="bg-white px-2 py-1 rounded">psql postgresql://user:pass@host:5432/db</code>
              </p>
              <p class="text-secondary-700 text-sm">
                Check database service status (Docker, systemd, or cloud provider)
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check DB_URL format
              </h4>
              <p class="text-secondary-700 text-sm">
                Ensure correct format: <code class="bg-white px-2 py-1 rounded">postgresql://user:password@host:5432/database</code>
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Verify firewall rules
              </h4>
              <p class="text-secondary-700 text-sm">
                Ensure port 5432 is open and accessible from the application server
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check credentials
              </h4>
              <p class="text-secondary-700 text-sm">
                Verify username, password, and database name are correct
              </p>
            </div>
          </div>

          <!-- Issue 4 -->
          <div class="border border-secondary-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Slow API responses</h3>
            <p class="text-secondary-700 mb-4">API requests take an unusually long time to complete.</p>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check CPU usage
              </h4>
              <p class="text-secondary-700 text-sm">
                Monitor with <code class="bg-white px-2 py-1 rounded">top</code>, <code class="bg-white px-2 py-1 rounded">htop</code>, or cloud provider tools. Scale if consistently high.
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Review network latency
              </h4>
              <p class="text-secondary-700 text-sm">
                Test connectivity to external services and database with <code class="bg-white px-2 py-1 rounded">ping</code> and <code class="bg-white px-2 py-1 rounded">traceroute</code>
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Enable GPU acceleration
              </h4>
              <p class="text-secondary-700 text-sm">
                Set <code class="bg-white px-2 py-1 rounded">ENABLE_GPU=true</code> for significantly faster model inference
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check model loading
              </h4>
              <p class="text-secondary-700 text-sm">
                First requests load models into cache. Subsequent requests are faster.
              </p>
            </div>
          </div>

          <!-- Issue 5 -->
          <div class="border border-secondary-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Authentication fails</h3>
            <p class="text-secondary-700 mb-4">API requests return 401 or 403 errors.</p>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Verify API key format
              </h4>
              <p class="text-secondary-700 text-sm">
                Include API key in request header: <code class="bg-white px-2 py-1 rounded">Authorization: Bearer YOUR_API_KEY</code>
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check JWT tokens
              </h4>
              <p class="text-secondary-700 text-sm">
                Verify JWT token hasn't expired. Decode at <a href="https://jwt.io" class="text-primary-600 hover:text-primary-700">jwt.io</a> to inspect
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Verify credentials in .env
              </h4>
              <p class="text-secondary-700 text-sm">
                Ensure <code class="bg-white px-2 py-1 rounded">JWT_SECRET</code> and <code class="bg-white px-2 py-1 rounded">API_KEY</code> match across instances
              </p>
            </div>
          </div>

          <!-- Issue 6 -->
          <div class="border border-secondary-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Persistent volume errors (Kubernetes)</h3>
            <p class="text-secondary-700 mb-4">PersistentVolumeClaim pending or pod can't mount volumes.</p>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check storage class
              </h4>
              <p class="text-secondary-700 text-sm">
                Verify: <code class="bg-white px-2 py-1 rounded">kubectl get storageclass</code>. Create one if missing.
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4 mb-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Check PVC status
              </h4>
              <p class="text-secondary-700 text-sm">
                Run: <code class="bg-white px-2 py-1 rounded">kubectl describe pvc -n local-llm</code> for detailed error info
              </p>
            </div>

            <div class="bg-secondary-50 rounded p-4">
              <h4 class="font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                <span class="text-primary-600">✓</span> Verify node resources
              </h4>
              <p class="text-secondary-700 text-sm">
                Ensure nodes have sufficient resources: <code class="bg-white px-2 py-1 rounded">kubectl describe nodes</code>
              </p>
            </div>
          </div>
        </section>

        <!-- Performance Optimization -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Performance Optimization</h2>

          <div class="space-y-4">
            <div class="border-l-4 border-primary-400 bg-primary-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Enable GPU acceleration</h4>
              <p class="text-secondary-700 text-sm">
                Set <code class="bg-white px-2 py-1 rounded">ENABLE_GPU=true</code> for 10-50x faster inference. Requires GPU hardware and drivers.
              </p>
            </div>

            <div class="border-l-4 border-primary-400 bg-primary-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Use smaller models</h4>
              <p class="text-secondary-700 text-sm">
                Models like GPT-3.5 are faster than GPT-4. Trade accuracy for speed based on your use case.
              </p>
            </div>

            <div class="border-l-4 border-primary-400 bg-primary-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Increase model cache</h4>
              <p class="text-secondary-700 text-sm">
                Larger <code class="bg-white px-2 py-1 rounded">MODEL_CACHE_SIZE</code> keeps more models in memory, avoiding repeated downloads.
              </p>
            </div>

            <div class="border-l-4 border-primary-400 bg-primary-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Implement request batching</h4>
              <p class="text-secondary-700 text-sm">
                Batch multiple requests together for better GPU utilization and throughput.
              </p>
            </div>

            <div class="border-l-4 border-primary-400 bg-primary-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Use request caching</h4>
              <p class="text-secondary-700 text-sm">
                Cache identical requests to avoid redundant model inference.
              </p>
            </div>
          </div>
        </section>

        <!-- Getting Help -->
        <section class="bg-secondary-50 rounded-lg p-6">
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Getting Help</h2>

          <ul class="space-y-3 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">📖</span>
              <span>Check the <a href="/docs" class="text-primary-600 hover:text-primary-700 font-medium">full documentation</a></span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">💬</span>
              <span>Join our <a href="https://discord.gg/locallm" class="text-primary-600 hover:text-primary-700 font-medium">community Discord</a></span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">🐙</span>
              <span>Report issues on <a href="https://github.com/locallm/local-llm" class="text-primary-600 hover:text-primary-700 font-medium">GitHub</a></span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">📧</span>
              <span>Email support at <a href="mailto:support@locallm.ai" class="text-primary-600 hover:text-primary-700 font-medium">support@locallm.ai</a></span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DocsTroubleshootingPageComponent {}
