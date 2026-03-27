import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://lucedata.com"),
  title: "LuceData - The AI-Powered SQL Desktop App",
  description:
    "A cross-platform SQL desktop client with AI built in. Connect to SQL Server, PostgreSQL, or SQLite. Use OpenAI, Azure, Gemini, Claude, or local Ollama to generate queries and explore your schema.",
  keywords: [
    "SQL",
    "database",
    "AI",
    "desktop app",
    "SQL Server",
    "PostgreSQL",
    "SQLite",
    "query editor",
    "database management",
  ],
  authors: [{ name: "LuceData Team" }],
  openGraph: {
    title: "LuceData - The AI-Powered SQL Desktop App",
    description:
      "Manage SQL databases with integrated AI assistance. Cross-platform support for Windows, macOS, and Linux.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LuceData - The AI-Powered SQL Desktop App",
    description:
      "Manage SQL databases with integrated AI assistance. Cross-platform support for Windows, macOS, and Linux.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
