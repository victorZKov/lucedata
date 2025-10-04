import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AppleLogo } from "@/components/icons/apple-logo"
import { WindowsLogo } from "@/components/icons/windows-logo"
import { Mail, CheckCircle2 } from "lucide-react"

export function DownloadsSection() {
  return (
    <section id="downloads" className="py-20 sm:py-32 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Join the Beta</h2>
          <p className="text-lg text-muted-foreground">
            Register your interest to get early access. We'll send you a download link for macOS or Windows.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="p-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">What's Included in Beta</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Bring Your Own AI Model — connect OpenAI, Claude, Gemini, Azure OpenAI, or Ollama</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Full SQL support — read and write operations with your approval</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>SQL Server, PostgreSQL, and SQLite support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Free access — no credit card required</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2 text-sm">Available For:</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 text-muted-foreground">
                        <AppleLogo />
                      </div>
                      <span className="text-sm">macOS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 text-muted-foreground">
                        <WindowsLogo />
                      </div>
                      <span className="text-sm">Windows</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Linux support coming soon</p>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <form className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="platform" className="block text-sm font-medium mb-2">
                      Platform
                    </label>
                    <select
                      id="platform"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      required
                    >
                      <option value="">Select your platform</option>
                      <option value="macos">macOS</option>
                      <option value="windows">Windows</option>
                      <option value="linux">Linux (notify when available)</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Request Beta Access
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    We'll send you a download link within 24 hours
                  </p>
                </form>
              </div>
            </div>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Free during beta • Auto-updates enabled • No telemetry
        </p>
      </div>
    </section>
  )
}
