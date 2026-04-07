"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "twone-theme";
const THEMES = [
  { value: "default", label: "Default" },
  { value: "cyber", label: "Cyber" },
  { value: "pixel", label: "Pixel Cyber" },
] as const;

type ThemeMode = (typeof THEMES)[number]["value"];

function normalizeTheme(value: string | null | undefined): ThemeMode {
  return value === "cyber" || value === "pixel" ? value : "default";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `twone-theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("default");

  useEffect(() => {
    const saved = normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function handleChange(next: ThemeMode) {
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <label className="theme-select" aria-label="主题切换">
      <span className="theme-select__label">Theme</span>
      <select value={theme} onChange={(event) => handleChange(normalizeTheme(event.target.value))}>
        {THEMES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
