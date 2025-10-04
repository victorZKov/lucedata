export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground"><strong>Effective Date:</strong> October 4, 2025<br />
        <strong>Last Updated:</strong> October 4, 2025</p>

        <h2>Introduction</h2>
        <p>Welcome to LuceData (the &quot;App&quot;). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you register for and use our desktop application.</p>

        <h2>Information We Collect</h2>

        <h3>1. Registration Information</h3>
        <p>When you register for beta access, we collect:</p>
        <ul>
          <li><strong>Name</strong>: Your full name</li>
          <li><strong>Email Address</strong>: To send you download links and product updates</li>
          <li><strong>Intended Use Case</strong>: To understand how you plan to use the application</li>
        </ul>

        <h3>2. Information Stored Locally</h3>
        <p>The App stores the following data <strong>locally on your device only</strong>:</p>
        <ul>
          <li><strong>Database Connection Credentials</strong>: Server addresses, usernames, passwords, and connection strings</li>
          <li><strong>AI Engine API Keys</strong>: Your API keys for OpenAI, Azure OpenAI, Anthropic Claude, Google Gemini, Ollama, and other AI providers</li>
          <li><strong>Application Settings</strong>: Your preferences, theme choices, and configuration</li>
          <li><strong>Query History</strong>: SQL queries you&apos;ve written and executed</li>
          <li><strong>Conversation History</strong>: Your interactions with the AI assistant</li>
        </ul>
        <p><strong>Important</strong>: All database credentials and AI API keys are stored <strong>securely on your local device</strong> using industry-standard encryption. We do <strong>not</strong> have access to your database connections, credentials, or AI API keys.</p>

        <h3>3. Automatically Collected Information</h3>
        <p>We may collect:</p>
        <ul>
          <li><strong>Usage Data</strong>: How you interact with the App (anonymized and aggregated)</li>
          <li><strong>Error Reports</strong>: Crash logs and diagnostic information to improve stability (optional and user-controlled)</li>
          <li><strong>Update Information</strong>: Version checks to provide automatic updates</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li><strong>Provide Access</strong>: Send you download links and installation instructions</li>
          <li><strong>Product Updates</strong>: Notify you about new features, updates, and important announcements</li>
          <li><strong>Customer Support</strong>: Respond to your questions and provide technical assistance</li>
          <li><strong>Improve the App</strong>: Analyze usage patterns (anonymized) to enhance functionality</li>
          <li><strong>Security</strong>: Detect and prevent security issues and abuse</li>
        </ul>

        <h2>Data Storage and Security</h2>

        <h3>Local Storage</h3>
        <ul>
          <li>All sensitive data (credentials, API keys, queries) is stored <strong>locally on your device</strong></li>
          <li>Data is encrypted using industry-standard encryption algorithms</li>
          <li>We do <strong>not</strong> sync your credentials or queries to any cloud service</li>
        </ul>

        <h3>Registration Data</h3>
        <ul>
          <li>Your registration information (name, email, use case) is stored securely on our servers</li>
          <li>We use industry-standard security measures to protect your data</li>
          <li>Access is restricted to authorized personnel only</li>
        </ul>

        <h2>Data Sharing and Disclosure</h2>
        <p>We do <strong>not</strong> sell, rent, or trade your personal information. We may share your data only in the following circumstances:</p>
        <ul>
          <li><strong>Service Providers</strong>: With trusted third-party service providers who help us operate our business (e.g., email service providers, hosting services)</li>
          <li><strong>Legal Compliance</strong>: When required by law, subpoena, or other legal process</li>
          <li><strong>Business Transfers</strong>: In connection with a merger, acquisition, or sale of assets</li>
          <li><strong>With Your Consent</strong>: When you explicitly authorize us to share your information</li>
        </ul>

        <h2>Third-Party AI Services</h2>
        <p>When you use the App with third-party AI providers (OpenAI, Azure, Anthropic, Google, etc.):</p>
        <ul>
          <li>Your queries and database schema information may be sent to the AI provider you&apos;ve configured</li>
          <li>Each provider has its own privacy policy and terms of service</li>
          <li>We recommend reviewing each provider&apos;s policies</li>
        </ul>
        <p><strong>You are responsible for ensuring compliance with your AI provider&apos;s terms of service.</strong></p>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access</strong>: Request a copy of the personal data we hold about you</li>
          <li><strong>Correction</strong>: Request correction of inaccurate or incomplete data</li>
          <li><strong>Deletion</strong>: Request deletion of your personal data</li>
          <li><strong>Opt-Out</strong>: Unsubscribe from marketing communications at any time</li>
          <li><strong>Data Portability</strong>: Request your data in a portable format</li>
        </ul>
        <p>To exercise these rights, contact us at: <strong>privacy@lucedata.com</strong></p>

        <h2>Data Retention</h2>
        <ul>
          <li><strong>Registration Data</strong>: We retain your registration information while you use the App and for a reasonable period afterward</li>
          <li><strong>Local Data</strong>: You control all locally stored data and can delete it at any time by uninstalling the App or clearing application data</li>
        </ul>

        <h2>Children&apos;s Privacy</h2>
        <p>The App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>

        <h2>International Users</h2>
        <p>The App is operated from the United States. If you are located outside the U.S., your information will be transferred to and processed in the United States.</p>

        <h2>Updates to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by:</p>
        <ul>
          <li>Posting the updated policy on our website</li>
          <li>Sending an email to your registered email address</li>
          <li>Displaying a notice in the App</li>
        </ul>

        <h2>Contact Us</h2>
        <p>If you have questions or concerns about this Privacy Policy, please contact us:</p>
        <p><strong>Email</strong>: privacy@lucedata.com<br />
        <strong>Website</strong>: https://lucedata.com</p>

        <hr />

        <p className="text-center text-sm text-muted-foreground">© 2025 LuceData. All rights reserved.</p>
      </div>
    </div>
  )
}
