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

console.log("🔧 main.tsx: About to render React app");
console.log("🔧 root element:", document.getElementById("root"));

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("❌ Root element not found!");
    document.body.innerHTML =
      '<div style="color: red; padding: 20px; font-size: 24px;">ERROR: Root element not found!</div>';
  } else {
    console.log("✅ Root element found, creating React root");
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("✅ React render called");
  }
} catch (error) {
  console.error("❌ Error rendering React:", error);
  document.body.innerHTML = `<div style="color: red; padding: 20px; font-size: 18px;">
    <h1>Error Loading App</h1>
    <pre>${error}</pre>
  </div>`;
}
