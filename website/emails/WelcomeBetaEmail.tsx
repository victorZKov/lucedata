import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

export type WelcomeBetaEmailProps = {
  name?: string;
  platform: "mac-arm64" | "mac-x64" | "windows" | string;
  downloadUrl: string;
  siteUrl: string; // e.g., https://lucedata.com
  fromName?: string; // e.g., LuceData Beta
};

export function welcomeBetaEmailText({
  name,
  platform,
  downloadUrl,
  siteUrl,
}: WelcomeBetaEmailProps) {
  const install = `${siteUrl.replace(/\/$/, "")}/docs/installation`;
  const addConn = `${siteUrl.replace(/\/$/, "")}/docs/add-connection`;
  const addAi = `${siteUrl.replace(/\/$/, "")}/docs/add-ai-engine`;
  const greeting = name ? `Hi ${name},` : "Hi,";
  return (
    `${greeting}\n\n` +
    `Welcome to the LuceData Beta!\n\n` +
    `Platform: ${platform}\n` +
    `Download: ${downloadUrl}\n\n` +
    `Getting started:\n` +
    `1) Install the app\n` +
    `2) Add a database connection: ${addConn}\n` +
    `3) Configure AI provider (optional): ${addAi}\n` +
    `4) Installation tips: ${install}\n\n` +
    `If you didn't request this, you can ignore this email.`
  );
}

export function welcomeBetaEmailHtml(props: WelcomeBetaEmailProps) {
  const html = renderToStaticMarkup(<EmailMarkup {...props} />);
  return `<!doctype html>${html}`;
}

function escapeHtml(input?: string) {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function EmailMarkup({
  name,
  platform,
  downloadUrl,
  siteUrl,
  fromName,
}: WelcomeBetaEmailProps) {
  const base = siteUrl.replace(/\/$/, "");
  const docsInstall = `${base}/docs/installation`;
  const docsAddConn = `${base}/docs/add-connection`;
  const docsAi = `${base}/docs/add-ai-engine`;
  const brand = fromName || "LuceData Beta";
  return (
    <html>
      <body>
        <div
          style={{
            fontFamily:
              "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji",
            lineHeight: 1.6,
            color: "#0f172a",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
            }}
          >
            <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: 12 }}>
              {brand}
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: 20 }}>
              Welcome to the LuceData Beta 🎉
            </h1>
            <p style={{ margin: "0 0 8px" }}>
              {`Hi${name ? ` ${escapeHtml(name)}` : ""}, thanks for joining the beta! `}
              You can download the app for <strong>{platform}</strong> using the
              button below.
            </p>
            <p style={{ margin: "12px 0" }}>
              <a
                href={downloadUrl}
                style={{
                  display: "inline-block",
                  background: "#2563eb",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  textDecoration: "none",
                }}
              >
                Download LuceData
              </a>
            </p>
            <p style={{ margin: "16px 0 8px", fontWeight: 600 }}>
              Getting started
            </p>
            <ol style={{ margin: "8px 0 16px 20px" }}>
              <li>Install the app and open it</li>
              <li>
                Add a database connection:{" "}
                <a href={docsAddConn}>{docsAddConn}</a>
              </li>
              <li>
                Optionally configure your AI provider:{" "}
                <a href={docsAi}>{docsAi}</a>
              </li>
              <li>
                See installation tips: <a href={docsInstall}>{docsInstall}</a>
              </li>
            </ol>
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "#475569" }}>
              If you didn't request this, you can ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
