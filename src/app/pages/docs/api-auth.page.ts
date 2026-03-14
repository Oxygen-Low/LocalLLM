import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-api-auth',
  standalone: true,
  template: `
    <div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API Reference</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Authentication</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Authentication</h1>
        <p class="text-lg text-secondary-600">
          Learn how to authenticate requests to the Local.LLM API using API keys and JWT tokens.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- Overview -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Overview</h2>
          <p class="text-secondary-700 mb-4">
            Local.LLM supports two authentication methods:
          </p>

          <ul class="space-y-3 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">1.</span>
              <div>
                <span class="font-semibold">API Key Authentication (Bearer Token)</span> - Recommended for service-to-service communication
              </div>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">2.</span>
              <div>
                <span class="font-semibold">JWT Token Authentication</span> - For user sessions and web applications
              </div>
            </li>
          </ul>
        </section>

        <!-- API Key Authentication -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">API Key Authentication</h2>
          <p class="text-secondary-700 mb-4">
            Use API keys for service-to-service communication and integrations. This is the simplest method.
          </p>

          <h3 class="text-xl font-semibold text-secondary-900 mb-3">Getting Your API Key</h3>
          <p class="text-secondary-700 mb-4">
            Your API key is generated when Local.LLM initializes. It's stored in the <code class="bg-secondary-100 px-2 py-1 rounded">API_KEY</code> environment variable.
          </p>

          <h3 class="text-xl font-semibold text-secondary-900 mb-3">Using API Keys</h3>
          <p class="text-secondary-700 mb-4">
            Include your API key in the <code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code> header:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/models \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
          </div>

          <h3 class="text-xl font-semibold text-secondary-900 mb-3">JavaScript/TypeScript Example</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">const response = await fetch('http://localhost:3000/api/models', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

const models = await response.json();</pre>
          </div>

          <h3 class="text-xl font-semibold text-secondary-900 mb-3">Python Example</h3>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">import requests

headers = {'Authorization': 'Bearer YOUR_API_KEY'}
response = requests.get(
    'http://localhost:3000/api/models',
    headers=headers
)
models = response.json()</pre>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-blue-900">
              <strong>Security:</strong> Treat API keys like passwords. Never commit them to version control or expose them in client-side code.
            </p>
          </div>
        </section>

        <!-- JWT Token Authentication -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">JWT Token Authentication</h2>
          <p class="text-secondary-700 mb-4">
            JWT tokens are useful for user sessions and web applications. Tokens expire after a set period and must be refreshed.
          </p>

          <h3 class="text-xl font-semibold text-secondary-900 mb-3">Obtaining a JWT Token</h3>
          <p class="text-secondary-700 mb-4">
            Send your credentials to the login endpoint:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "secure-password"
  }'</pre>
          </div>

          <p class="text-secondary-700 mb-4">
            Response:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">{{ '{' }}
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
{{ '}' }}</pre>
          </div>

          <h3 class="text-xl font-semibold text-secondary-900 mb-3">Using JWT Tokens</h3>
          <p class="text-secondary-700 mb-4">
            Include the token in the <code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code> header as a Bearer token:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."</pre>
          </div>

          <h3 class="text-xl font-semibold text-secondary-900 mb-3">Refreshing Tokens</h3>
          <p class="text-secondary-700 mb-4">
            When a token expires, use the refresh token to get a new one:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'</pre>
          </div>
        </section>

        <!-- Request Headers -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Request Headers</h2>
          <p class="text-secondary-700 mb-4">
            All API requests should include these headers:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">Authorization: Bearer YOUR_API_KEY_OR_JWT_TOKEN
Content-Type: application/json
User-Agent: your-app/1.0</pre>
          </div>

          <table class="w-full border-collapse mt-4">
            <thead>
              <tr class="border-b-2 border-secondary-300">
                <th class="text-left py-2 px-3 font-semibold text-secondary-900">Header</th>
                <th class="text-left py-2 px-3 font-semibold text-secondary-900">Description</th>
                <th class="text-left py-2 px-3 font-semibold text-secondary-900">Required</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-secondary-200">
                <td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code></td>
                <td class="py-2 px-3 text-secondary-700">Bearer token (API key or JWT)</td>
                <td class="py-2 px-3 text-secondary-700">Yes</td>
              </tr>
              <tr class="border-b border-secondary-200">
                <td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Content-Type</code></td>
                <td class="py-2 px-3 text-secondary-700"><code class="bg-secondary-100 px-2 py-1 rounded">application/json</code> for JSON bodies</td>
                <td class="py-2 px-3 text-secondary-700">For POST/PUT</td>
              </tr>
              <tr>
                <td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">User-Agent</code></td>
                <td class="py-2 px-3 text-secondary-700">Your application identifier</td>
                <td class="py-2 px-3 text-secondary-700">Recommended</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Error Responses -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Error Responses</h2>
          <p class="text-secondary-700 mb-4">
            Authentication errors return specific HTTP status codes:
          </p>

          <div class="space-y-4">
            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">401 Unauthorized</h4>
              <p class="text-secondary-700 text-sm mb-2">Missing or invalid authentication credentials</p>
              <div class="bg-black rounded p-3 overflow-x-auto">
                <pre class="text-white text-xs font-mono">{{ '{' }}
  "error": "invalid_token",
  "message": "The provided token is invalid or expired"
{{ '}' }}</pre>
              </div>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">403 Forbidden</h4>
              <p class="text-secondary-700 text-sm mb-2">Authentication succeeded but user lacks permission</p>
              <div class="bg-black rounded p-3 overflow-x-auto">
                <pre class="text-white text-xs font-mono">{{ '{' }}
  "error": "insufficient_permissions",
  "message": "Your account doesn't have access to this resource"
{{ '}' }}</pre>
              </div>
            </div>

            <div class="border border-secondary-200 rounded-lg p-4">
              <h4 class="font-semibold text-secondary-900 mb-2">400 Bad Request</h4>
              <p class="text-secondary-700 text-sm mb-2">Invalid login credentials</p>
              <div class="bg-black rounded p-3 overflow-x-auto">
                <pre class="text-white text-xs font-mono">{{ '{' }}
  "error": "invalid_credentials",
  "message": "Invalid username or password"
{{ '}' }}</pre>
              </div>
            </div>
          </div>
        </section>

        <!-- Best Practices -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Security Best Practices</h2>

          <ul class="space-y-3 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Never expose keys:</strong> Keep API keys and JWT tokens secure. Use environment variables, not hardcoded values.</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Use HTTPS:</strong> Always use HTTPS in production to encrypt credentials in transit.</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Rotate tokens:</strong> Regularly refresh JWT tokens and rotate API keys.</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Scope permissions:</strong> Use separate API keys for different services/integrations.</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Monitor usage:</strong> Track API key usage and revoke compromised keys immediately.</span>
            </li>
          </ul>
        </section>

        <!-- Next Steps -->
        <section class="bg-primary-50 rounded-lg p-6 border border-primary-200">
          <h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3>
          <ul class="space-y-2 text-secondary-700">
            <li>
              <a href="/docs/api-applications" class="text-primary-600 hover:text-primary-700 font-medium">API: Applications</a> - List and manage AI applications
            </li>
            <li>
              <a href="/docs/api-models" class="text-primary-600 hover:text-primary-700 font-medium">API: Models</a> - Work with AI models
            </li>
            <li>
              <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">Configuration</a> - Configure authentication settings
            </li>
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DocsApiAuthPageComponent {}
