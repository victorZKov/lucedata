import {
  Database,
  Twitter,
  Linkedin,
  Youtube,
  Github,
  Coffee,
} from "lucide-react";

const footerLinks = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "Downloads", href: "#downloads" },
    { name: "Roadmap", href: "#roadmap" },
  ],
  Resources: [
    { name: "Documentation", href: "/docs" },
    { name: "GitHub", href: "https://github.com/victorZKov/lucedata" },
    { name: "Support", href: "mailto:support@lucedata.com" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Use", href: "/terms" },
    { name: "License", href: "/license" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">LuceData</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              The AI-powered SQL desktop app for modern developers. Bring your
              own AI model and manage any database with intelligent assistance.
            </p>
            <div className="flex gap-4">
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
                href="https://twitter.com/lucedata"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter/X"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/company/lucedata"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com/@lucedata"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col items-center gap-4">
          <a
            href="https://buymeacoffee.com/victorxata"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-500/20"
          >
            <Coffee className="h-4 w-4" />
            Support this project — Buy me a coffee
          </a>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} LuceData. Open-source under the MIT
            License.
          </p>
        </div>
      </div>
    </footer>
  );
}
