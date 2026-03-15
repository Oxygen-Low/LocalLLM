import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
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
            Terms of Service
          </h1>
          <p class="text-lg text-muted">
            By using the Local.LLM cloud service provided by Oxygen Low's Software, you agree to the following terms. Violation of these terms may result in warnings, account restrictions, or permanent account deletion.
          </p>
          <p class="text-sm text-muted mt-2">Last updated: March 2026</p>
        </div>

        <!-- Terms of Service Content -->
        <div class="card p-8 sm:p-12 max-w-4xl">
          <div class="prose prose-lg max-w-none text-secondary-900 space-y-10">

            <!-- 1. AI Usage -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">1. AI Usage</h2>
              <p class="text-secondary-700 mb-4">
                The Local.LLM cloud service is intended for lawful and responsible use. The following rules apply to all content generated using the LLM:
              </p>
              <div class="space-y-4">
                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">NSFW Content</h4>
                  <p class="text-secondary-700 text-sm">
                    Generating NSFW (Not Safe For Work) content using the LLM will result in a <strong>warning</strong> being issued to your account.
                  </p>
                </div>
                <div class="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h4 class="font-semibold text-red-900 mb-1">Illegal or Harmful Content</h4>
                  <p class="text-red-800 text-sm">
                    Generating certain categories of content (including but not limited to content that exploits minors, promotes terrorism, or constitutes other serious offences) will result in an <strong>immediate account mark of deletion</strong>. In such cases, your IP address and associated information may be <strong>reported to law enforcement</strong>.
                  </p>
                </div>
              </div>
            </section>

            <!-- 2. Hacking / Exploiting -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">2. Hacking and Exploiting</h2>
              <p class="text-secondary-700 mb-4">
                Attempting to hack, exploit, or otherwise abuse the service is strictly prohibited. This includes, but is not limited to:
              </p>
              <ul class="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                <li>Attempting to hijack or gain unauthorised access to other users' accounts.</li>
                <li>Bypassing or attempting to bypass safety restrictions, content filters, or moderation systems.</li>
                <li>Exploiting vulnerabilities in the service infrastructure.</li>
              </ul>
              <div class="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 class="font-semibold text-red-900 mb-1">Consequences</h4>
                <p class="text-red-800 text-sm">
                  Violations will result in an <strong>IP and hardware-based account deletion</strong>. This means:
                </p>
                <ul class="list-disc list-inside text-red-800 text-sm mt-2 space-y-1">
                  <li>All new account registrations from the associated IP address or hardware will be <strong>rejected</strong>.</li>
                  <li>All existing accounts that have previously used the associated IP address or hardware will be <strong>marked for deletion</strong>.</li>
                </ul>
              </div>
            </section>

            <!-- 3. Warnings and Account Deletion -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">3. Warnings and Account Deletion</h2>
              <p class="text-secondary-700 mb-4">
                The warning and deletion system works as follows:
              </p>

              <div class="space-y-4">
                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">Warning Limit</h4>
                  <p class="text-secondary-700 text-sm">
                    An account can receive up to <strong>3 warnings</strong> before being marked for deletion. Each warning expires individually <strong>30 days</strong> after it is issued.
                  </p>
                </div>

                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">Deletion Marking (30-Day Period)</h4>
                  <p class="text-secondary-700 text-sm">
                    When an account is marked for deletion, it enters a <strong>30-day deletion period</strong>. During this time:
                  </p>
                  <ul class="list-disc list-inside text-secondary-700 text-sm mt-2 space-y-1">
                    <li>The account can still be signed into.</li>
                    <li>The user will be <strong>unable to change settings or interact</strong> with any service features.</li>
                    <li>The user will always be <strong>redirected to an appeal page</strong> displaying the reason for deletion.</li>
                    <li>Appeals can be submitted via support during this period.</li>
                  </ul>
                </div>

                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">Archiving (After 30 Days)</h4>
                  <p class="text-secondary-700 text-sm">
                    After the 30-day deletion period has ended, the account is <strong>archived</strong>:
                  </p>
                  <ul class="list-disc list-inside text-secondary-700 text-sm mt-2 space-y-1">
                    <li>The username is replaced with <strong>deleteduser[randomnumber]</strong>.</li>
                    <li>All personal information associated with the account on the platform is deleted.</li>
                    <li>The password is deleted.</li>
                  </ul>
                </div>

                <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                  <h4 class="font-semibold text-secondary-900 mb-1">Permanent Deletion (After 3 Additional Days)</h4>
                  <p class="text-secondary-700 text-sm">
                    An archived account remains for <strong>3 days</strong> before being <strong>fully and permanently deleted</strong> from our systems.
                  </p>
                </div>
              </div>
            </section>

            <!-- 4. Self-Hosted Instances -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">4. Self-Hosted Instances</h2>
              <p class="text-secondary-700 mb-4">
                Local.LLM can be self-hosted by individuals and organisations. The following applies to self-hosted deployments:
              </p>
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
                <p class="text-secondary-700 text-sm">
                  Oxygen Low's Software is <strong>not responsible</strong> for any content that is generated on self-hosted versions of Local.LLM. The individual or organisation hosting the instance is solely responsible for moderating usage and establishing their own rules and policies.
                </p>
              </div>
            </section>

            <!-- 5. Changes to These Terms -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">5. Changes to These Terms</h2>
              <p class="text-secondary-700">
                We may update these Terms of Service from time to time to reflect changes in our practices or legal requirements. Any changes will be posted on this page with an updated revision date. Continued use of the service after changes are posted constitutes acceptance of the revised terms.
              </p>
            </section>

            <!-- 6. Contact -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">6. Contact</h2>
              <p class="text-secondary-700">
                If you have any questions about these terms, or if you wish to submit an appeal, please contact us through our GitHub repository:
              </p>
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200 mt-3">
                <p class="text-secondary-700 text-sm">
                  <strong>Oxygen Low's Software</strong><br>
                  GitHub: <a href="https://github.com/Oxygen-Low/LocalLLM" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700">github.com/Oxygen-Low/LocalLLM</a>
                </p>
              </div>
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
export class TermsPageComponent {}
