import {
  Code as Code2,
  Database,
  MessageSquare,
  FolderTree,
} from "lucide-react";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DemoSection() {
  return (
    <section className="border-y bg-muted/30 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            See it in action
          </h2>
          <p className="text-lg text-muted-foreground">
            A powerful interface designed for productivity and clarity.
          </p>
        </div>

        <Tabs defaultValue="editor" className="mx-auto max-w-6xl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">SQL Editor</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="explorer" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              <span className="hidden sm:inline">Schema Explorer</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Results Grid</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-8">
            <Card className="overflow-hidden border-2">
              <div className="relative aspect-video bg-slate-900">
                {/* @ts-expect-error - React 18/19 type compatibility */}
                <Image
                  src="/assets/monaco-editor.png"
                  alt="Monaco-based SQL Editor with syntax highlighting, autocomplete, and formatting"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="p-6 bg-slate-50 border-t">
                <p className="text-lg font-medium text-slate-900 mb-2">
                  Monaco-based SQL Editor
                </p>
                <p className="text-slate-600 text-sm">
                  Syntax highlighting, autocomplete, formatting, linting, and
                  split views for efficient query development.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="assistant" className="mt-8">
            <Card className="overflow-hidden border-2">
              <div className="relative aspect-video bg-slate-900">
                {/* @ts-expect-error - React 18/19 type compatibility */}
                <Image
                  src="/assets/aichat-assistant.png"
                  alt="AI Chat Assistant for SQL queries with natural language understanding"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="p-6 bg-emerald-50 border-t">
                <p className="text-lg font-medium text-emerald-900 mb-2">
                  AI Chat Assistant
                </p>
                <p className="text-emerald-700 text-sm">
                  Ask questions in plain English and get SQL queries back,
                  grounded in your schema with built-in safety guardrails.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="explorer" className="mt-8">
            <Card className="overflow-hidden border-2">
              <div className="relative aspect-video bg-slate-900">
                {/* @ts-expect-error - React 18/19 type compatibility */}
                <Image
                  src="/assets/schema-explorer.png"
                  alt="Visual Schema Explorer with tree view of databases, tables, and columns"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="p-6 bg-amber-50 border-t">
                <p className="text-lg font-medium text-amber-900 mb-2">
                  Visual Schema Explorer
                </p>
                <p className="text-amber-700 text-sm">
                  Navigate servers, databases, schemas, tables, columns, keys,
                  indexes, and constraints in an intuitive tree view.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="mt-8">
            <Card className="overflow-hidden border-2">
              <div className="relative aspect-video bg-slate-900">
                {/* @ts-expect-error - React 18/19 type compatibility */}
                <Image
                  src="/assets/results-grid.png"
                  alt="Results Grid with resizable columns, filtering, and sorting"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="p-6 bg-cyan-50 border-t">
                <p className="text-lg font-medium text-cyan-900 mb-2">
                  Results Grid
                </p>
                <p className="text-cyan-700 text-sm">
                  Resizable columns, filtering, sorting, and one-click export to
                  CSV for easy data analysis.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
