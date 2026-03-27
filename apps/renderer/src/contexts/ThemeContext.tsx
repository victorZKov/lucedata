import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextValue {
  theme: "light" | "dark";
  mode: "system" | "light" | "dark";
  toggleTheme: () => void;
  setMode: (mode: "system" | "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const prefersDarkQuery = "(prefers-color-scheme: dark)";
  const getSystemTheme = () =>
    window.matchMedia(prefersDarkQuery).matches ? "dark" : "light";

  const [mode, setModeState] = useState<"system" | "light" | "dark">(() => {
    // Prefer persisted app setting from Electron store via preload if available
    // Note: electronAPI.store.get is async; we fall back to localStorage here
    const stored = localStorage.getItem("themeMode");
    return stored === "light" || stored === "dark" || stored === "system"
      ? (stored as any)
      : "system";
  });

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const storedMode = localStorage.getItem("themeMode") as "system" | "light" | "dark" | null;
    const effectiveMode = storedMode || "system";
    const initialTheme = effectiveMode === "system" ? getSystemTheme() : effectiveMode;
    
    // Apply theme immediately to prevent flash
    const root = document.documentElement;
    const body = document.body;
    if (initialTheme === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }
    
    return initialTheme;
  });

  const applyDomClass = (t: "light" | "dark") => {
    const root = document.documentElement;
    const body = document.body;
    if (t === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }
  };

  const setMode = (m: "system" | "light" | "dark") => {
    setModeState(m);
    localStorage.setItem("themeMode", m);
    const effective = m === "system" ? getSystemTheme() : m;
    setTheme(effective);
    applyDomClass(effective);
  };

  const toggleTheme = () => {
    // Toggle between explicit light/dark override. If currently system, use system's opposite.
    const next = theme === "light" ? "dark" : "light";
    setMode(next);
  };

  useEffect(() => {
    applyDomClass(theme);
  }, [theme]);

  // Listen to system changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia(prefersDarkQuery);
    const onChange = () => {
      if (mode === "system") {
        const t = mq.matches ? "dark" : "light";
        setTheme(t);
        applyDomClass(t);
      }
    };
    mq.addEventListener?.("change", onChange);
    // Safari fallback
    mq.addListener?.(onChange as any);
    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange as any);
    };
  }, [mode]);

  // Listen for menu-triggered theme mode changes from main process
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<{ mode: "system" | "light" | "dark" }>;
      if (!detail) return;
      setMode(detail.mode);
    };
    document.addEventListener("set-theme-mode", handler as EventListener);
    return () =>
      document.removeEventListener("set-theme-mode", handler as EventListener);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
