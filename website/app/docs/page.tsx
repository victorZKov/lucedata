import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Rocket, Settings, Database, Bot, Shield } from "lucide-react"

const docSections = [
  {
    title: "Getting Started",
    icon: Rocket,
    description: "Learn how to install and set up LuceData",
    links: [
      { name: "Installation Guide", href: "/docs/installation" },
      { name: "First Steps", href: "/docs/installation#first-launch" },
      { name: "System Requirements", href: "/docs/installation#system-requirements" },
    ],
  },
  {
    title: "Configuration",
    icon: Settings,
    description: "Configure AI engines and database connections",
    links: [
      { name: "Add AI Engine", href: "/docs/ai-engine" },
      { name: "Add Database Connection", href: "/docs/connection" },
      { name: "BYOM Setup", href: "/docs/ai-engine#byom" },
    ],
  },
  {
    title: "Using LuceData",
    icon: Database,
    description: "Master the interface and core features",
    links: [
      { name: "Connections Tree", href: "/docs/connections-tree" },
      { name: "Query Editor", href: "/docs/work-area" },
      { name: "Keyboard Shortcuts", href: "/docs/work-area#keyboard-shortcuts" },
    ],
  },
  {
    title: "AI Features",
    icon: Bot,
    description: "Leverage AI for intelligent SQL generation",
    links: [
      { name: "Natural Language to SQL", href: "/docs/ai-engine#nl-to-sql" },
      { name: "Query Optimization", href: "/docs/ai-engine#optimization" },
      { name: "Best Practices", href: "/docs/ai-engine#best-practices" },
    ],
  },
  {
    title: "Security & Legal",
    icon: Shield,
    description: "Privacy, terms, and security information",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Use", href: "/terms" },
      { name: "License Agreement", href: "/license" },
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Documentation
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know to get started with LuceData and master its features
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {docSections.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className="text-sm text-primary hover:underline"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="bg-muted/50 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold mb-4">Quick Start Guide</h2>
          <ol className="space-y-4 text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </span>
              <div>
                <strong className="text-foreground">Install LuceData</strong> — Download and install the app for macOS or Windows
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </span>
              <div>
                <strong className="text-foreground">Configure AI Engine</strong> — Add your AI provider API keys (OpenAI, Claude, etc.)
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </span>
              <div>
                <strong className="text-foreground">Add Database Connection</strong> — Connect to SQL Server, PostgreSQL, or SQLite
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                4
              </span>
              <div>
                <strong className="text-foreground">Start Querying</strong> — Write SQL or use natural language with AI assistance
              </div>
            </li>
          </ol>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Beta Features</CardTitle>
              <CardDescription>What's available in the current beta version</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✅ SQL Server, PostgreSQL, and SQLite support</li>
                <li>✅ BYOM — Bring Your Own AI Model</li>
                <li>✅ Monaco-based SQL editor with IntelliSense</li>
                <li>✅ Visual Connections Tree</li>
                <li>✅ Multiple query tabs</li>
                <li>✅ Results export to CSV</li>
                <li>✅ AI natural language to SQL</li>
                <li>✅ Write/DDL operation confirmations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>Features planned for future releases</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>🚧 Oracle and MySQL support</li>
                <li>🚧 Linux installer</li>
                <li>🚧 Custom AI model (commercial version)</li>
                <li>🚧 Advanced export formats</li>
                <li>🚧 Query execution plans</li>
                <li>🚧 Schema migrations</li>
                <li>🚧 Team collaboration</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? We're here to help!
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:support@lucedata.com"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </a>
            <a
              href="mailto:beta@lucedata.com"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Send Beta Feedback
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
