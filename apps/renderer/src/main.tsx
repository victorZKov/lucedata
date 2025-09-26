import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

// Initialize theme immediately to prevent flash of unstyled content
const initializeTheme = () => {
  const stored = localStorage.getItem("themeMode") as "system" | "light" | "dark" | null;
  const mode = stored || "system";
  
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);