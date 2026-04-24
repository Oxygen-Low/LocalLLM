import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-12 sm:py-16 lg:py-20">
        <!-- Header -->
        <div class="max-w-3xl mb-12">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
            Legal
          </div>
          <h1 class="text-4xl sm:text-5xl font-bold text-secondary-900 mb-4">
            Privacy Policy
          </h1>
          <p class="text-lg text-muted">
            How Oxygen Low's Software collects, uses, and protects your personal data through the Local.LLM service, in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
          </p>
          <p class="text-sm text-muted mt-2">Last updated: March 2026</p>
        </div>

        <!-- Privacy Policy Content -->
        <div class="card p-8 sm:p-12 max-w-4xl">
          <div class="prose prose-lg max-w-none text-secondary-900 space-y-10">

            <!-- 1. Data Controller -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">1. Data Controller</h2>
              <p class="text-secondary-700">
                Oxygen Low's Software ("we", "us", "our"), operating the Local.LLM service, is the data controller responsible for your personal data. If you have any questions about this privacy policy or how we handle your data, please contact us at the details provided in Section 10.
              </p>
            </section>

            <!-- 2. Data We Collect -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">2. Data We Collect</h2>
              <p class="text-secondary-700 mb-4">
                We collect and store only the minimum personal data necessary to provide and maintain our service:
              </p>
              <div class="space-y-4">
                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">Account Information</h4>
                  <p class="text-secondary-700 text-sm">
                    <strong>Username and password</strong> — collected when you register for an account. Your password is stored on our server in a securely hashed format using industry-standard cryptographic algorithms and is never stored in plain text. No sensitive account data (such as password hashes or salts) is stored in your browser's local storage.
                  </p>
                </div>
                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">Chat Data</h4>
                  <p class="text-secondary-700 text-sm">
                    <strong>Chat messages and conversations</strong> — the content of your interactions with AI models through our platform.
                  </p>
                </div>
                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">Technical Data</h4>
                  <p class="text-secondary-700 text-sm">
                    <strong>Session and log data</strong> — such as session identifiers, access timestamps, and security event logs necessary for the operation and security of the service.
                  </p>
                </div>
                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">Moderation Data</h4>
                  <p class="text-secondary-700 text-sm">
                    <strong>IP address and hardware identifiers</strong> — collected and stored when your account is flagged for violations of our <a routerLink="/terms" class="text-primary-600 hover:text-primary-700">Terms of Service</a>, such as generating prohibited content or attempting to exploit the service. This data is used solely for content moderation, abuse prevention, and enforcement of our Terms of Service, and may be shared with law enforcement where required.
                  </p>
                </div>
              </div>
            </section>

            <!-- 3. Purpose and Lawful Basis -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">3. Purpose and Lawful Basis for Processing</h2>
              <p class="text-secondary-700 mb-4">
                Under Article 6 of the UK GDPR, we process your personal data on the following lawful bases:
              </p>
              <div class="overflow-x-auto">
                <table class="w-full text-sm border border-secondary-200 rounded-lg">
                  <thead>
                    <tr class="bg-secondary-100">
                      <th class="text-left p-3 font-semibold text-secondary-900 border-b border-secondary-200">Data</th>
                      <th class="text-left p-3 font-semibold text-secondary-900 border-b border-secondary-200">Purpose</th>
                      <th class="text-left p-3 font-semibold text-secondary-900 border-b border-secondary-200">Lawful Basis</th>
                    </tr>
                  </thead>
                  <tbody class="text-secondary-700">
                    <tr class="border-b border-secondary-200">
                      <td class="p-3">Username &amp; Password</td>
                      <td class="p-3">Authentication and identification</td>
                      <td class="p-3">Performance of a contract (Art. 6(1)(b))</td>
                    </tr>
                    <tr class="border-b border-secondary-200">
                      <td class="p-3">Chat Data</td>
                      <td class="p-3">Service delivery, storage, and moderation</td>
                      <td class="p-3">Performance of a contract (Art. 6(1)(b)) and Legitimate interests (Art. 6(1)(f))</td>
                    </tr>
                    <tr>
                      <td class="p-3">Technical Data</td>
                      <td class="p-3">Security, service operation, and abuse prevention</td>
                      <td class="p-3">Legitimate interests (Art. 6(1)(f))</td>
                    </tr>
                    <tr>
                      <td class="p-3">Moderation Data</td>
                      <td class="p-3">Content moderation, abuse prevention, and Terms of Service enforcement</td>
                      <td class="p-3">Legitimate interests (Art. 6(1)(f)) and Legal obligation (Art. 6(1)(c))</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- 4. Data Retention -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">4. Data Retention</h2>
              <p class="text-secondary-700">
                We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected:
              </p>
              <ul class="list-disc list-inside text-secondary-700 mt-3 space-y-2">
                <li><strong>Account data</strong> is retained for the lifetime of your account and deleted upon account deletion.</li>
                <li><strong>Chat data</strong> is retained for the lifetime of your account unless you delete individual conversations.</li>
                <li><strong>Technical data</strong> such as security logs is retained for a reasonable period necessary for security and operational purposes, after which it is automatically purged.</li>
                <li><strong>Moderation data</strong> such as IP addresses and hardware identifiers collected during Terms of Service enforcement is retained for as long as necessary to enforce account restrictions and prevent abuse, and may be retained where required for legal or law enforcement purposes.</li>
              </ul>
            </section>

            <!-- 5. Data Sharing -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">5. Data Sharing and Third Parties</h2>
              <p class="text-secondary-700">
                We do not sell your personal data. We may share your data only in the following circumstances:
              </p>
              <ul class="list-disc list-inside text-secondary-700 mt-3 space-y-2">
                <li><strong>Service providers:</strong> Trusted third-party providers who assist us in operating the service, subject to contractual data protection obligations.</li>
                <li><strong>Legal obligations:</strong> Where required by law, regulation, or legal process.</li>
                <li><strong>Safety and security:</strong> Where necessary to protect the rights, safety, or property of our users or the public.</li>
                <li><strong>Terms of Service enforcement:</strong> IP addresses and hardware identifiers associated with accounts that violate our <a routerLink="/terms" class="text-primary-600 hover:text-primary-700">Terms of Service</a> (such as generating prohibited content) may be shared with law enforcement authorities.</li>
              </ul>
            </section>

            <!-- 6. Data Security -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">6. Data Security</h2>
              <p class="text-secondary-700">
                We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul class="list-disc list-inside text-secondary-700 mt-3 space-y-2">
                <li>Passwords are hashed using industry-standard cryptographic algorithms and are never stored in plain text.</li>
                <li>All sensitive user data (credentials, password hashes, salts) is stored securely on the server, not in client-side browser storage.</li>
                <li>Rate limiting and account lockout mechanisms to prevent brute-force attacks.</li>
                <li>Session management with automatic inactivity timeouts.</li>
                <li>Security event logging and monitoring.</li>
              </ul>
            </section>

            <!-- 7. International Transfers -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">7. International Data Transfers</h2>
              <p class="text-secondary-700">
                If your personal data is transferred outside of the United Kingdom, we ensure that appropriate safeguards are in place as required by the UK GDPR, such as Standard Contractual Clauses or an adequacy decision by the Secretary of State.
              </p>
            </section>

            <!-- 8. Your Rights -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">8. Your Rights</h2>
              <p class="text-secondary-700 mb-4">
                Under the UK GDPR and the Data Protection Act 2018, you have the following rights regarding your personal data:
              </p>
              <ul class="space-y-3 text-secondary-700">
                <li class="flex gap-3">
                  <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                  <span><strong>Right of access:</strong> You can request a copy of the personal data we hold about you.</span>
                </li>
                <li class="flex gap-3">
                  <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                  <span><strong>Right to rectification:</strong> You can request correction of inaccurate or incomplete data.</span>
                </li>
                <li class="flex gap-3">
                  <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                  <span><strong>Right to erasure:</strong> You can request deletion of your personal data where there is no compelling reason for its continued processing.</span>
                </li>
                <li class="flex gap-3">
                  <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                  <span><strong>Right to restrict processing:</strong> You can request that we limit how we use your data.</span>
                </li>
                <li class="flex gap-3">
                  <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                  <span><strong>Right to data portability:</strong> You can request your data in a structured, commonly used, and machine-readable format.</span>
                </li>
                <li class="flex gap-3">
                  <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                  <span><strong>Right to object:</strong> You can object to processing based on legitimate interests.</span>
                </li>
              </ul>
              <p class="text-secondary-700 mt-4">
                To exercise any of these rights, please contact us using the details in Section 10. We will respond to your request within one month, as required by law.
              </p>
            </section>

            <!-- 9. Complaints -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">9. Complaints</h2>
              <p class="text-secondary-700">
                If you are unhappy with how we have handled your personal data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO), the UK's supervisory authority for data protection:
              </p>
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200 mt-3">
                <p class="text-secondary-700 text-sm">
                  <strong>Information Commissioner's Office</strong><br>
                  Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700">ico.org.uk</a><br>
                  Telephone: 0303 123 1113
                </p>
              </div>
            </section>

            <!-- 10. Contact Us -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">10. Contact Us</h2>
              <p class="text-secondary-700">
                If you have any questions about this privacy policy or wish to exercise your data protection rights, please contact us through our GitHub repository:
              </p>
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200 mt-3">
                <p class="text-secondary-700 text-sm">
                  <strong>Oxygen Low's Software</strong><br>
                  GitHub: <a href="https://github.com/Oxygen-Low/LocalLLM" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700">github.com/Oxygen-Low/LocalLLM</a>
                </p>
              </div>
            </section>

            <!-- 11. Changes to This Policy -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">11. Changes to This Policy</h2>
              <p class="text-secondary-700">
                We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.
              </p>
            </section>

          </div>
        </div>

        <!-- Back Link -->
        <div class="mt-8">
          <a routerLink="/" class="text-primary-600 hover:text-primary-700 font-medium transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  `,
})
export class PrivacyPageComponent {}
