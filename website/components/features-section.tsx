import { Bot, Database, GitBranch, Grid3x3, Lock, Monitor, PenTool, TreePine } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Bot,
    title: "BYOM — Bring Your Own Model",
    description: "In beta, connect your own AI model — OpenAI, Azure OpenAI, Anthropic Claude, Google Gemini, or even local Ollama. Commercial version will include a custom, database-specialized model updated weekly.",
  },
  {
    icon: Database,
    title: "Multiple Databases",
    description: "SQL Server, PostgreSQL, and SQLite supported today. Oracle and MySQL are on the way.",
  },
  {
    icon: TreePine,
    title: "Visual Explorer",
    description: "Servers, schemas, tables, columns, keys, triggers, and indexes presented in a modern tree view.",
  },
  {
    icon: PenTool,
    title: "Smart SQL Editor",
    description: "Monaco-based editor with formatting, linting, autocomplete, and split views.",
  },
  {
    icon: Grid3x3,
    title: "Results Grid",
    description: "Resizable, filterable results with one-click CSV export.",
  },
  {
    icon: GitBranch,
    title: "AI Assistant — You're in Control",
    description: "AI proposes SQL queries; you approve and execute them. Every query runs with the permissions you've configured for each connection.",
  },
  {
    icon: Lock,
    title: "Full Power, with Safeguards",
    description: "Execute DDL (CREATE, ALTER, DROP) and DML (INSERT, UPDATE, DELETE) operations — all under your control. Every write operation requires confirmation.",
  },
  {
    icon: Monitor,
    title: "Cross-Platform",
    description: "Native installers for macOS and Windows with automatic updates. Linux support coming soon.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything you need to manage databases
          </h2>
          <p className="text-lg text-muted-foreground">
            Built for developers, DBAs, and data engineers who demand power and simplicity.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-muted hover:border-foreground/20 transition-all">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
