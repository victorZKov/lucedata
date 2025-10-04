export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
        <h1>Terms of Use</h1>
        <p className="text-muted-foreground"><strong>Effective Date:</strong> October 4, 2025<br />
        <strong>Last Updated:</strong> October 4, 2025</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By downloading, installing, or using LuceData (the &quot;App&quot;), you agree to be bound by these Terms of Use (&quot;Terms&quot;). If you do not agree to these Terms, do not use the App.</p>

        <h2>2. Beta Program</h2>

        <h3>2.1 Beta Status</h3>
        <p>The App is currently in <strong>beta testing</strong>. This means:</p>
        <ul>
          <li>The App is provided <strong>free of charge</strong> during the beta period</li>
          <li>Features and functionality may change without notice</li>
          <li>The App may contain bugs, errors, or incomplete features</li>
          <li>Service availability is not guaranteed</li>
        </ul>

        <h3>2.2 Beta Access</h3>
        <ul>
          <li>Access is granted upon registration through our website</li>
          <li>We reserve the right to approve or deny beta access requests</li>
          <li>Beta access may be revoked at any time without notice</li>
        </ul>

        <h3>2.3 Feedback</h3>
        <p>By participating in the beta program, you agree to:</p>
        <ul>
          <li>Provide feedback, bug reports, and suggestions</li>
          <li>Allow us to use your feedback without compensation</li>
          <li>Help us improve the App for general release</li>
        </ul>

        <h2>3. License Grant</h2>

        <h3>3.1 Limited License</h3>
        <p>Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to:</p>
        <ul>
          <li>Download and install the App on devices you own or control</li>
          <li>Use the App for your personal or internal business purposes</li>
        </ul>

        <h3>3.2 Restrictions</h3>
        <p>You may <strong>not</strong>:</p>
        <ul>
          <li>Reverse engineer, decompile, or disassemble the App</li>
          <li>Modify, adapt, or create derivative works</li>
          <li>Distribute, sublicense, lease, rent, or lend the App</li>
          <li>Remove or alter any proprietary notices or labels</li>
          <li>Use the App for any illegal or unauthorized purpose</li>
          <li>Attempt to gain unauthorized access to our systems or other users&apos; data</li>
        </ul>

        <h2>4. Bring Your Own Model (BYOM)</h2>

        <h3>4.1 AI Provider Responsibility</h3>
        <p>During the beta period, the App operates on a <strong>BYOM (Bring Your Own Model)</strong> basis:</p>
        <ul>
          <li>You must provide your own AI API keys (OpenAI, Azure, Anthropic, Google, Ollama, etc.)</li>
          <li>You are responsible for all costs associated with your AI provider</li>
          <li>You must comply with your AI provider&apos;s terms of service and usage policies</li>
        </ul>

        <h3>4.2 Commercial Version</h3>
        <p>Upon release of the commercial version:</p>
        <ul>
          <li>A custom, database-specialized AI model will be available (subscription required)</li>
          <li>BYOM functionality will remain available as an option</li>
          <li>Pricing and licensing terms will be announced before commercial launch</li>
        </ul>

        <h2>5. Database Operations</h2>

        <h3>5.1 User Control and Responsibility</h3>
        <p>The App allows you to execute <strong>read and write operations</strong> on your databases, including:</p>
        <ul>
          <li>SELECT queries (read operations)</li>
          <li>INSERT, UPDATE, DELETE (data modification)</li>
          <li>CREATE, ALTER, DROP (schema changes/DDL)</li>
        </ul>

        <p><strong>You acknowledge and agree that</strong>:</p>
        <ul>
          <li>The AI proposes SQL queries, but <strong>you control execution</strong></li>
          <li>All operations require your explicit confirmation</li>
          <li>All operations execute with <strong>your configured database permissions</strong></li>
          <li><strong>You are solely responsible for any data modifications or deletions</strong></li>
          <li>We are <strong>not liable</strong> for any data loss, corruption, or unintended changes</li>
        </ul>

        <h3>5.2 Database Credentials</h3>
        <ul>
          <li>All database credentials are stored <strong>locally on your device</strong></li>
          <li>We do <strong>not</strong> have access to your database connections or credentials</li>
          <li>You are responsible for securing your device and credentials</li>
        </ul>

        <h2>6. Data and Privacy</h2>

        <h3>6.1 Local Data Storage</h3>
        <ul>
          <li>Database credentials, API keys, and queries are stored <strong>locally</strong> on your device</li>
          <li>We do not access, store, or transmit your sensitive data to our servers</li>
        </ul>

        <h3>6.2 Registration Data</h3>
        <ul>
          <li>We collect registration information (name, email, use case) as described in our Privacy Policy</li>
          <li>You consent to our collection and use of this information</li>
        </ul>

        <h3>6.3 Third-Party Services</h3>
        <ul>
          <li>When using third-party AI providers, your data may be transmitted to those providers</li>
          <li>You are responsible for reviewing and complying with third-party privacy policies</li>
        </ul>

        <h2>7. Disclaimers and Limitations of Liability</h2>

        <h3>7.1 &quot;AS IS&quot; and &quot;AS AVAILABLE&quot;</h3>
        <p>THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:</p>
        <ul>
          <li>Merchantability</li>
          <li>Fitness for a particular purpose</li>
          <li>Non-infringement</li>
          <li>Accuracy or reliability</li>
          <li>Uninterrupted or error-free operation</li>
        </ul>

        <h3>7.2 Beta Disclaimer</h3>
        <p>AS A BETA PRODUCT:</p>
        <ul>
          <li>The App may contain bugs, errors, and defects</li>
          <li>Features may be incomplete or subject to change</li>
          <li>Data loss or corruption may occur</li>
          <li>Service interruptions are possible</li>
        </ul>

        <h3>7.3 Limitation of Liability</h3>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
        <ul>
          <li>We are <strong>not liable</strong> for any direct, indirect, incidental, consequential, or punitive damages</li>
          <li>This includes damages for data loss, lost profits, business interruption, or system failure</li>
          <li>Our total liability shall not exceed $100 USD or the amount paid by you (if any)</li>
        </ul>

        <h3>7.4 Database Operations</h3>
        <p>WE ARE NOT RESPONSIBLE FOR:</p>
        <ul>
          <li>Data loss or corruption resulting from executed queries</li>
          <li>Unintended schema changes or deletions</li>
          <li>Performance issues or downtime in your databases</li>
          <li>Costs incurred from database or AI provider usage</li>
        </ul>

        <h2>8. Indemnification</h2>
        <p>You agree to indemnify, defend, and hold us harmless from any claims, liabilities, damages, losses, costs, or expenses (including legal fees) arising from:</p>
        <ul>
          <li>Your use or misuse of the App</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights</li>
          <li>Any database operations you perform using the App</li>
        </ul>

        <h2>9. Updates and Changes</h2>

        <h3>9.1 App Updates</h3>
        <ul>
          <li>We may release updates, patches, and new versions</li>
          <li>Updates may be automatic or require manual installation</li>
          <li>Continued use after updates constitutes acceptance of changes</li>
        </ul>

        <h3>9.2 Terms Updates</h3>
        <ul>
          <li>We may modify these Terms at any time</li>
          <li>Material changes will be communicated via email or in-app notice</li>
          <li>Continued use after changes constitutes acceptance</li>
        </ul>

        <h2>10. Termination</h2>

        <h3>10.1 By You</h3>
        <p>You may stop using the App at any time by uninstalling it from your devices.</p>

        <h3>10.2 By Us</h3>
        <p>We may suspend or terminate your access:</p>
        <ul>
          <li>For violation of these Terms</li>
          <li>For abusive, fraudulent, or illegal conduct</li>
          <li>At the end of the beta period</li>
          <li>At our discretion with or without cause</li>
        </ul>

        <h3>10.3 Effect of Termination</h3>
        <p>Upon termination:</p>
        <ul>
          <li>Your license to use the App immediately ends</li>
          <li>You must uninstall the App and cease all use</li>
          <li>Locally stored data remains on your device until you delete it</li>
        </ul>

        <h2>11. Commercial Release</h2>

        <h3>11.1 Transition from Beta</h3>
        <ul>
          <li>The beta period will end upon commercial release</li>
          <li>We will notify beta users before transitioning to commercial licensing</li>
          <li>Separate commercial terms and pricing will apply</li>
          <li>Beta users may receive preferential pricing or features (at our discretion)</li>
        </ul>

        <h3>11.2 No Obligation</h3>
        <p>Participation in the beta does <strong>not</strong> obligate you to purchase the commercial version.</p>

        <h2>12. Intellectual Property</h2>

        <h3>12.1 Ownership</h3>
        <p>The App and all related intellectual property are owned by LuceData and its licensors.</p>

        <h3>12.2 Trademarks</h3>
        <p>All trademarks, service marks, and trade names are proprietary to LuceData.</p>

        <h2>13. General Provisions</h2>

        <h3>13.1 Governing Law</h3>
        <p>These Terms are governed by the laws of the United States, without regard to conflict of law principles.</p>

        <h3>13.2 Severability</h3>
        <p>If any provision is found unenforceable, the remaining provisions remain in full effect.</p>

        <h3>13.3 Entire Agreement</h3>
        <p>These Terms constitute the entire agreement between you and LuceData regarding the App.</p>

        <h2>14. Contact Information</h2>
        <p>For questions about these Terms, contact us:</p>
        <p><strong>Email</strong>: legal@lucedata.com<br />
        <strong>Website</strong>: https://lucedata.com</p>

        <hr />

        <p>By using LuceData, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.</p>

        <p className="text-center text-sm text-muted-foreground">© 2025 LuceData. All rights reserved.</p>
      </div>
    </div>
  )
}
