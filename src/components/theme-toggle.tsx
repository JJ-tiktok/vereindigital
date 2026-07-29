"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const stored = localStorage.getItem("theme");

    if (stored === "dark") {
      return true;
    }

    if (stored === "light") {
      return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  function toggle() {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
      onClick={toggle}
      title={isDark ? "Zu hellem Design wechseln" : "Zu dunklem Design wechseln"}
      type="button"
    >
      {isDark ? <Sun className="size-5 shrink-0" aria-hidden="true" /> : <Moon className="size-5 shrink-0" aria-hidden="true" />}
      {collapsed ? null : <span>{isDark ? "Helles Design" : "Dunkles Design"}</span>}
    </button>
  );
}
