"use client"

import { Database } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Database className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">LuceData</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Demo
          </a>
          <a href="#downloads" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Downloads
          </a>
          <a href="#roadmap" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Roadmap
          </a>
          <a href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Docs
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button className="hidden sm:inline-flex">
            Get Started
          </Button>
        </div>
      </div>
    </header>
  )
}
