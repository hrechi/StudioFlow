"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type PortfolioThemeMode = "dark" | "light";

type PortfolioThemeContextType = {
  mode: PortfolioThemeMode;
  toggleMode: () => void;
  setMode: (mode: PortfolioThemeMode) => void;
};

const PortfolioThemeContext = createContext<PortfolioThemeContextType>({
  mode: "dark",
  toggleMode: () => {},
  setMode: () => {},
});

export const usePortfolioTheme = () => useContext(PortfolioThemeContext);

type PortfolioThemeWrapperProps = {
  initialTheme?: string;
  accentColor?: string;
  isEditorial?: boolean;
  children: React.ReactNode;
};

export function PortfolioThemeWrapper({
  initialTheme = "SOMBRE",
  accentColor = "#e0563b",
  isEditorial = false,
  children,
}: PortfolioThemeWrapperProps) {
  const defaultMode: PortfolioThemeMode =
    initialTheme === "SOMBRE" || initialTheme === "MINIMAL" || !initialTheme
      ? "dark"
      : "light";

  const [mode, setModeState] = useState<PortfolioThemeMode>(defaultMode);

  // Sync with localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("studioflow_portfolio_theme");
      if (stored === "dark" || stored === "light") {
        queueMicrotask(() => setModeState(stored));
      }
    } catch {
      // localStorage may be disabled
    }
  }, []);

  const setMode = (newMode: PortfolioThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem("studioflow_portfolio_theme", newMode);
    } catch {
      // ignore
    }
  };

  const toggleMode = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  const isDark = mode === "dark";

  const themeVars = useMemo(() => {
    if (isDark) {
      return {
        "--portfolio-bg": "#140706",
        "--portfolio-surface": "#241412",
        "--portfolio-text": "#f4e4de",
        "--portfolio-muted": "#b78d82",
        "--portfolio-border": "rgba(244, 228, 222, 0.12)",
        "--portfolio-accent": accentColor,
      };
    }

    if (isEditorial) {
      return {
        "--portfolio-bg": "#faf6ee",
        "--portfolio-surface": "#ffffff",
        "--portfolio-text": "#1a1612",
        "--portfolio-muted": "#706659",
        "--portfolio-border": "#e2d9cb",
        "--portfolio-accent": accentColor,
      };
    }

    return {
      "--portfolio-bg": "#fdfaf5",
      "--portfolio-surface": "#ffffff",
      "--portfolio-text": "#191e24",
      "--portfolio-muted": "#6b7280",
      "--portfolio-border": "rgba(0, 0, 0, 0.08)",
      "--portfolio-accent": accentColor,
    };
  }, [isDark, isEditorial, accentColor]);

  return (
    <PortfolioThemeContext.Provider value={{ mode, toggleMode, setMode }}>
      <div
        className={`darkroom-portfolio min-h-screen transition-colors duration-500 ${
          isDark ? "dark film-grain" : "light"
        } ${isEditorial ? "font-serif" : "font-sans"}`}
        data-portfolio-theme={initialTheme}
        data-theme-mode={mode}
        style={
          {
            ...themeVars,
            backgroundColor: "var(--portfolio-bg)",
            color: "var(--portfolio-text)",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </PortfolioThemeContext.Provider>
  );
}
