import { Component } from '@angular/core';
import { DocsContentTranslationDirective } from './docs-content-translation.directive';

@Component({
  selector: 'app-docs-api-models',
  standalone: true,
  imports: [DocsContentTranslationDirective],
  template: `
    <div appDocsContentTranslation class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API Reference</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Models</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Models API</h1>
        <p class="text-lg text-secondary-600">
          Query, manage, and interact with AI models in Local.LLM.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- List Available Models -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">List Available Models</h2>
          <p class="text-secondary-700 mb-4">
            Retrieve a list of all available AI models.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">GET /api/models</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Query Parameters</h3>
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
                <td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">category</code></td>
                <td class="py-2 px-3 text-secondary-700">string</td>
                <td class="py-2 px-3 text-secondary-700">Filter by category (chat, code, image, etc.)</td>
              </tr>
              <tr class="border-b border-secondary-200">
                <td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">provider</code></td>
                <td class="py-2 px-3 text-secondary-700">string</td>
                <td class="py-2 px-3 text-secondary-700">Filter by provider (openai, anthropic, etc.)</td>
              </tr>
              <tr>
                <td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">limit</code></td>
                <td class="py-2 px-3 text-secondary-700">number</td>
                <td class="py-2 px-3 text-secondary-700">Maximum results (default: 20, max: 100)</td>
              </tr>
            </tbody>
          </table>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Example Request</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X GET "http://localhost:3000/api/models?category=chat&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Response</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">&#123;
  "models": [
    &#123;
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "openai",
      "category": "chat",
      "description": "Most capable model for complex tasks",
      "contextWindow": 8192,
      "costPer1kTokens": &#123;
        "input": 0.03,
        "output": 0.06
      &#125;,
      "capabilities": [
        "conversation",
        "code-generation",
        "reasoning"
      ],
      "isAvailable": true,
      "version": "gpt-4-0613"
    &#125;,
    &#123;
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo",
      "provider": "openai",
      "category": "chat",
      "description": "Fast and efficient model for most tasks",
      "contextWindow": 4096,
      "costPer1kTokens": &#123;
        "input": 0.0015,
        "output": 0.002
      &#125;,
      "capabilities": [
        "conversation",
        "summarization",
        "translation"
      ],
      "isAvailable": true,
      "version": "gpt-3.5-turbo-0613"
    &#125;
  ],
  "count": 2,
  "total": 15
&#125;</pre>
          </div>
        </section>

        <!-- Get Model Details -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Get Model Details</h2>
          <p class="text-secondary-700 mb-4">
            Retrieve detailed information about a specific model.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">GET /api/models/:id</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Example Request</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/models/gpt-4 \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Response</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">&#123;
  "id": "gpt-4",
  "name": "GPT-4",
  "provider": "openai",
  "category": "chat",
  "description": "Most capable model for complex tasks",
  "contextWindow": 8192,
  "maxTokens": 2048,
  "costPer1kTokens": &#123;
    "input": 0.03,
    "output": 0.06
  &#125;,
  "capabilities": [
    "conversation",
    "code-generation",
    "reasoning",
    "web-search"
  ],
  "supportedLanguages": [
    "en",
    "es",
    "fr",
    "de",
    "zh"
  ],
  "isAvailable": true,
  "version": "gpt-4-0613",
  "releaseDate": "2023-06-27",
  "documentation": "https://platform.openai.com/docs/models/gpt-4"
&#125;</pre>
          </div>
        </section>

        <!-- Complete API Request -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Complete API Request</h2>
          <p class="text-secondary-700 mb-4">
            Send a request to an AI model for processing.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">POST /api/models/:id/complete</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Request Body</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">&#123;
  "prompt": "Explain quantum computing in simple terms",
  "temperature": 0.7,
  "maxTokens": 500,
  "topP": 1.0,
  "frequencyPenalty": 0,
  "presencePenalty": 0,
  "stop": ["\n\n"]
&#125;</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Example Request</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/models/gpt-4/complete \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '&#123;
    "prompt": "What is machine learning?",
    "temperature": 0.7,
    "maxTokens": 256
  &#125;'</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Response</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">&#123;
  "id": "completion-abc123",
  "model": "gpt-4",
  "text": "Machine learning is a subset of artificial intelligence...",
  "tokens": &#123;
    "prompt": 5,
    "completion": 42,
    "total": 47
  &#125;,
  "finishReason": "stop",
  "createdAt": "2024-03-14T10:30:00Z",
  "processingTime": 2.345
&#125;</pre>
          </div>
        </section>

        <!-- Stream Completion -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Stream Completion</h2>
          <p class="text-secondary-700 mb-4">
            Stream responses for real-time output as tokens are generated.
          </p>

          <div class="bg-secondary-50 rounded-lg p-4 mb-4">
            <p class="text-secondary-900 font-semibold">POST /api/models/:id/complete-stream</p>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Example Request</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/models/gpt-4/complete-stream \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '&#123;
    "prompt": "Write a poem about nature",
    "temperature": 0.8,
    "maxTokens": 256
  &#125;'</pre>
          </div>

          <h3 class="text-lg font-semibold text-secondary-900 mb-2">Streaming Response</h3>
          <p class="text-secondary-700 mb-2">Server-Sent Events (SSE) stream:</p>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">data: &#123;"token":"The","index":0&#125;

data: &#123;"token":" quiet","index":1&#125;

data: &#123;"token":" forest","index":2&#125;

data: &#123;"done":true,"totalTokens":42&#125;</pre>
          </div>
        </section>

        <!-- Model Parameters -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Model Parameters</h2>
          <p class="text-secondary-700 mb-4">
            Common parameters for model completion requests:
          </p>

          <div class="space-y-4">
            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">temperature</h4>
              <p class="text-secondary-700 text-sm">Controls randomness (0.0 to 2.0). Lower = more deterministic, higher = more creative</p>
              <p class="text-secondary-700 text-sm mt-2">Default: <code class="bg-secondary-100 px-2 py-1 rounded">0.7</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">maxTokens</h4>
              <p class="text-secondary-700 text-sm">Maximum tokens in the response</p>
              <p class="text-secondary-700 text-sm mt-2">Default: <code class="bg-secondary-100 px-2 py-1 rounded">256</code> | Max: varies by model</p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">topP</h4>
              <p class="text-secondary-700 text-sm">Nucleus sampling parameter (0.0 to 1.0). Controls diversity</p>
              <p class="text-secondary-700 text-sm mt-2">Default: <code class="bg-secondary-100 px-2 py-1 rounded">1.0</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">frequencyPenalty</h4>
              <p class="text-secondary-700 text-sm">Reduces repetition of frequent tokens (-2.0 to 2.0)</p>
              <p class="text-secondary-700 text-sm mt-2">Default: <code class="bg-secondary-100 px-2 py-1 rounded">0</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">presencePenalty</h4>
              <p class="text-secondary-700 text-sm">Reduces repetition of any tokens (-2.0 to 2.0)</p>
              <p class="text-secondary-700 text-sm mt-2">Default: <code class="bg-secondary-100 px-2 py-1 rounded">0</code></p>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">stop</h4>
              <p class="text-secondary-700 text-sm">Stop sequences that end generation early</p>
              <p class="text-secondary-700 text-sm mt-2">Example: <code class="bg-secondary-100 px-2 py-1 rounded">["\\n\\n", "User:"]</code></p>
            </div>
          </div>
        </section>

        <!-- Next Steps -->
        <section class="bg-primary-50 rounded-lg p-6 border border-primary-200">
          <h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3>
          <ul class="space-y-2 text-secondary-700">
            <li>
              <a href="/docs/api-applications" class="text-primary-600 hover:text-primary-700 font-medium">API: Applications</a> - Manage AI applications
            </li>
            <li>
              <a href="/docs/api-auth" class="text-primary-600 hover:text-primary-700 font-medium">API: Authentication</a> - Secure your API calls
            </li>
            <li>
              <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">Configuration</a> - Configure models and deployment
            </li>
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DocsApiModelsPageComponent {}
