"use client";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/10 py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border bg-muted/60 px-4 py-2 text-sm">
            <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-muted-foreground">
              • Now supporting SQL Server, PostgreSQL, and SQLite
            </span>
          </div>

          <h1 className="text-balance tracking-tight font-extrabold text-5xl sm:text-6xl lg:text-7xl">
            <span className="block">One App. Any Database.</span>
            <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-300">
              Any AI Engine.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            A cross-platform SQL desktop client with{" "}
            <strong>AI built in</strong>. Connect to SQL Server, PostgreSQL, or
            SQLite. Use OpenAI, Azure, Gemini, Claude, or local Ollama to
            generate SQL, optimize execution plans, and explore your schema.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#downloads" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base px-6 py-5"
              >
                ⬇️ Download for macOS
              </Button>
            </a>
            <a href="#downloads" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-base px-6 py-5"
              >
                ⬇️ Download for Windows
              </Button>
            </a>
            <a href="#downloads" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-base px-6 py-5"
              >
                ⬇️ Download for Linux
              </Button>
            </a>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Free and secure. No credit card required.
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[800px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-3xl"></div>
      </div>
    </section>
  );
}
