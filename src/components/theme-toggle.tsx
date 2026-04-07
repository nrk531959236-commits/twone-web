"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "twone-theme";

type ThemeMode = "default" | "cyber";

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `twone-theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("default");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const next = saved === "cyber" ? "cyber" : "default";
    setTheme(next);
    applyTheme(next);
  }, []);

  function handleChange(next: ThemeMode) {
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <div className="theme-toggle" aria-label="主题切换">
      <button
        type="button"
        className={`theme-toggle__button ${theme === "default" ? "theme-toggle__button--active" : ""}`}
        onClick={() => handleChange("default")}
      >
        默认
      </button>
      <button
        type="button"
        className={`theme-toggle__button ${theme === "cyber" ? "theme-toggle__button--active" : ""}`}
        onClick={() => handleChange("cyber")}
      >
        Cyber
      </button>
    </div>
  );
}
