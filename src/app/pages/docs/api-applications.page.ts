import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-api-applications',
  standalone: true,
  template: `
    <div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API Reference</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Applications</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Applications API</h1>
        <p class="text-lg text-secondary-600">
          Manage and interact with AI applications through the Local.LLM API.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- Get All Applications -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Get All Applications</h2>
          <p class="text-secondary-700 mb-4">
            Retrieve a list of all available AI applications.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">GET /api/applications</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Example Request</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Response</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">{{ '{' }}
  "applications": [
    {{ '{' }}
      "id": "chatbot",
      "name": "AI Chatbot",
      "description": "Conversational AI for customer support",
      "category": "chat",
      "status": "active",
      "version": "1.0.0",
      "icon": "chat-bubble",
      "color": "blue"
    {{ '}' }},
    {{ '{' }}
      "id": "code-assistant",
      "name": "Code Assistant",
      "description": "AI-powered code generation and analysis",
      "category": "development",
      "status": "active",
      "version": "2.1.0",
      "icon": "code",
      "color": "purple"
    {{ '}' }}
  ],
  "count": 2
{{ '}' }}</pre>
          </div>
        </section>

        <!-- Get Application Details -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Get Application Details</h2>
          <p class="text-secondary-700 mb-4">
            Retrieve detailed information about a specific application.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">GET /api/applications/:id</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Parameters</h3>
          <table class="w-full border-collapse mb-4">
            <thead>
              <tr class="border-b-2 border-secondary-300">
                <th class="text-left py-2 px-3 font-semibold text-secondary-900">Parameter</th>
                <th class="text-left py-2 px-3 font-semibold text-secondary-900">Type</th>
                <th class="text-left py-2 px-3 font-semibold text-secondary-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-secondary-200">
                <td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">id</code></td>
                <td class="py-2 px-3 text-secondary-700">string</td>
                <td class="py-2 px-3 text-secondary-700">Application identifier</td>
              </tr>
            </tbody>
          </table>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Example Request</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/applications/chatbot \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Response</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">{{ '{' }}
  "id": "chatbot",
  "name": "AI Chatbot",
  "description": "Conversational AI for customer support",
  "category": "chat",
  "status": "active",
  "version": "1.0.0",
  "icon": "chat-bubble",
  "color": "blue",
  "capabilities": [
    "conversation",
    "sentiment-analysis",
    "language-detection"
  ],
  "supportedLanguages": [
    "en",
    "es",
    "fr",
    "de"
  ],
  "rateLimit": {{ '{' }}
    "requests": 1000,
    "period": "1h"
  {{ '}' }},
  "documentation": "https://locallm.ai/docs/chatbot"
{{ '}' }}</pre>
          </div>
        </section>

        <!-- Launch Application -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Launch Application</h2>
          <p class="text-secondary-700 mb-4">
            Start an application instance with custom configuration.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">POST /api/applications/:id/launch</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Request Body</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">{{ '{' }}
  "config": {{ '{' }}
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2048
  {{ '}' }},
  "metadata": {{ '{' }}
    "userId": "user123",
    "sessionId": "session456"
  {{ '}' }}
{{ '}' }}</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Example Request</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/applications/chatbot/launch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{{ '{' }}
    "config": {{ '{' }}
      "model": "gpt-4",
      "temperature": 0.7
    {{ '}' }}
  {{ '}' }}'</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Response</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">{{ '{' }}
  "instanceId": "inst_abc123",
  "applicationId": "chatbot",
  "status": "running",
  "url": "http://localhost:3001",
  "launchedAt": "2024-03-14T10:30:00Z",
  "expiresAt": "2024-03-14T12:30:00Z"
{{ '}' }}</pre>
          </div>
        </section>

        <!-- Get Application Status -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Get Application Status</h2>
          <p class="text-secondary-700 mb-4">
            Check the current status of a running application instance.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">GET /api/applications/:id/status</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Response</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">{{ '{' }}
  "id": "chatbot",
  "status": "active",
  "uptime": 3600,
  "requestsProcessed": 42,
  "averageLatency": 245,
  "lastRequest": "2024-03-14T10:50:00Z",
  "resourceUsage": {{ '{' }}
    "cpu": 45,
    "memory": 2048,
    "gpu": 30
  {{ '}' }}
{{ '}' }}</pre>
          </div>
        </section>

        <!-- Stop Application -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Stop Application</h2>
          <p class="text-secondary-700 mb-4">
            Stop a running application instance.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">POST /api/applications/:id/stop</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Example Request</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/applications/chatbot/stop \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Response</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">{{ '{' }}
  "id": "chatbot",
  "status": "stopped",
  "stoppedAt": "2024-03-14T11:00:00Z",
  "totalUptime": 1800
{{ '}' }}</pre>
          </div>
        </section>

        <!-- Error Handling -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Error Handling</h2>

          <div class="space-y-4">
            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">404 Not Found</h4>
              <p class="text-secondary-700 text-sm mb-2">Application not found</p>
              <div class="bg-black rounded p-3 overflow-x-auto">
                <pre class="text-white text-xs font-mono">{{ '{' }}
  "error": "application_not_found",
  "message": "No application with ID 'invalid-id' exists"
{{ '}' }}</pre>
              </div>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">409 Conflict</h4>
              <p class="text-secondary-700 text-sm mb-2">Application is already running</p>
              <div class="bg-black rounded p-3 overflow-x-auto">
                <pre class="text-white text-xs font-mono">{{ '{' }}
  "error": "application_already_running",
  "message": "Application 'chatbot' is already active"
{{ '}' }}</pre>
              </div>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">429 Too Many Requests</h4>
              <p class="text-secondary-700 text-sm mb-2">Rate limit exceeded</p>
              <div class="bg-black rounded p-3 overflow-x-auto">
                <pre class="text-white text-xs font-mono">{{ '{' }}
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Retry after 60 seconds"
{{ '}' }}</pre>
              </div>
            </div>
          </div>
        </section>

        <!-- Next Steps -->
        <section class="bg-primary-50 rounded-lg p-6 border border-primary-200">
          <h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3>
          <ul class="space-y-2 text-secondary-700">
            <li>
              <a href="/docs/api-models" class="text-primary-600 hover:text-primary-700 font-medium">API: Models</a> - Work with AI models
            </li>
            <li>
              <a href="/docs/api-auth" class="text-primary-600 hover:text-primary-700 font-medium">API: Authentication</a> - Learn about API security
            </li>
            <li>
              <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">Configuration</a> - Configure your deployment
            </li>
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DocsApiApplicationsPageComponent {}
