"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * Light / dark mode. Dark is the default; the visitor's choice is kept in
 * localStorage and applied as the `dark` class on <html> before the first paint
 * (see ThemeScript), so there is no flash. Tokens live in globals.css.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "reframe-theme";
const THEME_COLORS: Record<Theme, string> = { light: "#f7f5f1", dark: "#0a0a0a" };

/** Inline, blocking script for <head>: applies the saved theme before paint. */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t!=="light";var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",d?"${THEME_COLORS.dark}":"${THEME_COLORS.light}");}catch(_){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getTheme = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
  return [theme, setTheme];
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode / blocked storage: the choice just won't be remembered.
  }
}

/** Icon button that switches between light and dark mode. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme] = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md opacity-80 transition-[opacity,background-color] hover:bg-current/10 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-[1.05rem]" aria-hidden />
      ) : (
        <Moon className="size-[1.05rem]" aria-hidden />
      )}
    </button>
  );
}
