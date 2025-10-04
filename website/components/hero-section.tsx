"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/20 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center rounded-full border bg-muted px-4 py-2 text-sm">
            <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-muted-foreground">🎉 Free Beta — Register Now</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            One App. Any Database.{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
              Bring Your Own AI.
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A cross-platform SQL desktop client with <strong>AI built in</strong>. Connect to SQL Server, PostgreSQL, or SQLite today. Bring your own model (BYOM) — OpenAI, Azure, Gemini, Claude, or even local Ollama — to generate SQL queries, optimize execution plans, and explore your schema.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6">
              Register for Beta Access
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Free download for macOS and Windows • Linux coming soon
          </p>
        </div>
      </div>

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-3xl"></div>
      </div>
    </section>
  )
}
