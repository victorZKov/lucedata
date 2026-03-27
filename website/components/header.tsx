"use client";

import { Database, Github, Coffee } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

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
          <a
            href="/#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="/#demo"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Demo
          </a>
          <a
            href="/#downloads"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Downloads
          </a>
          <a
            href="/#roadmap"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Roadmap
          </a>
          <a
            href="/docs"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/victorZKov/lucedata"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="https://buymeacoffee.com/victorxata"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-500/20"
          >
            <Coffee className="h-4 w-4" />
            Buy me a coffee
          </a>
          <ThemeToggle />
          <a href="/#downloads" className="hidden sm:inline-flex">
            <Button>Get Started</Button>
          </a>
        </div>
      </div>
    </header>
  );
}
