import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code as Code2, Database, MessageSquare, FolderTree } from "lucide-react"

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
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Code2 className="h-16 w-16 mx-auto text-blue-400" />
                  <p className="text-white text-lg font-medium">Monaco-based SQL Editor</p>
                  <p className="text-slate-300 text-sm max-w-md">
                    Syntax highlighting, autocomplete, formatting, linting, and split views for efficient query development.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="assistant" className="mt-8">
            <Card className="overflow-hidden border-2">
              <div className="aspect-video bg-gradient-to-br from-emerald-900 to-emerald-800 p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <MessageSquare className="h-16 w-16 mx-auto text-emerald-400" />
                  <p className="text-white text-lg font-medium">AI Chat Assistant</p>
                  <p className="text-emerald-100 text-sm max-w-md">
                    Ask questions in plain English and get SQL queries back, grounded in your schema with built-in safety guardrails.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="explorer" className="mt-8">
            <Card className="overflow-hidden border-2">
              <div className="aspect-video bg-gradient-to-br from-amber-900 to-amber-800 p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <FolderTree className="h-16 w-16 mx-auto text-amber-400" />
                  <p className="text-white text-lg font-medium">Visual Schema Explorer</p>
                  <p className="text-amber-100 text-sm max-w-md">
                    Navigate servers, databases, schemas, tables, columns, keys, indexes, and constraints in an intuitive tree view.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="mt-8">
            <Card className="overflow-hidden border-2">
              <div className="aspect-video bg-gradient-to-br from-cyan-900 to-cyan-800 p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Database className="h-16 w-16 mx-auto text-cyan-400" />
                  <p className="text-white text-lg font-medium">Results Grid</p>
                  <p className="text-cyan-100 text-sm max-w-md">
                    Resizable columns, filtering, sorting, and one-click export to CSV for easy data analysis.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
