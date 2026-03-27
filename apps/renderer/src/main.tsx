import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

// Initialize theme immediately to prevent flash of unstyled content
const initializeTheme = () => {
  const stored = localStorage.getItem("themeMode") as
    | "system"
    | "light"
    | "dark"
    | null;
  const mode = stored || "system";

  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const theme = mode === "system" ? getSystemTheme() : mode;

  const root = document.documentElement;
  const body = document.body;

  if (theme === "dark") {
    root.classList.add("dark");
    body.classList.add("dark");
  } else {
    root.classList.remove("dark");
    body.classList.remove("dark");
  }
};

// Apply theme before React renders
initializeTheme();

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Error rendering React:", error);
  const container = document.createElement("div");
  container.style.cssText = "color: red; padding: 20px; font-size: 18px;";
  const heading = document.createElement("h1");
  heading.textContent = "Error Loading App";
  const pre = document.createElement("pre");
  pre.textContent = error instanceof Error ? error.message : String(error);
  container.appendChild(heading);
  container.appendChild(pre);
  document.body.appendChild(container);
}
