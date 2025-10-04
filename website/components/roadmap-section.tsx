import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rocket, Database, FileSpreadsheet, Users } from "lucide-react"

const roadmapItems = [
  {
    icon: Database,
    title: "Oracle & MySQL Support",
    description: "Expand database compatibility to include Oracle and MySQL connections.",
    status: "In Progress",
  },
  {
    icon: Rocket,
    title: "Advanced Migrations",
    description: "Schema versioning, migration tracking, and automated deployment tools.",
    status: "Planned",
  },
  {
    icon: FileSpreadsheet,
    title: "More Export Formats",
    description: "Export results to Excel, JSON, Parquet, and other popular formats.",
    status: "Planned",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Shared snippets, team workspaces, and collaborative query development.",
    status: "Research",
  },
]

export function RoadmapSection() {
  return (
    <section className="border-t bg-muted/30 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Coming soon
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            We're constantly improving and adding new features based on your feedback.
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
          {roadmapItems.map((item, index) => (
            <Card key={index} className="border-muted">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <Badge
                    variant={item.status === "In Progress" ? "default" : "secondary"}
                    className={item.status === "In Progress" ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    {item.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground">
                  {item.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Have a feature request?{" "}
            <a href="#" className="text-primary hover:underline font-medium">
              Let us know
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
