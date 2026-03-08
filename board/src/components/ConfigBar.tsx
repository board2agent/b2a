"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ConfigBarProps {
  owner: string;
  repo: string;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onOnboard: () => void;
}

// Cycle order: system -> light -> dark -> system
const THEME_CYCLE = ["system", "light", "dark"] as const;
type ThemeValue = (typeof THEME_CYCLE)[number];

function nextTheme(current: string | undefined): ThemeValue {
  const idx = THEME_CYCLE.indexOf((current ?? "system") as ThemeValue);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}

function ThemeIcon({ theme }: { theme: string }) {
  if (theme === "light") {
    // Sun icon
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    );
  }
  if (theme === "dark") {
    // Moon icon
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  // Monitor icon (system)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export default function ConfigBar({
  owner,
  repo,
  lastUpdated,
  onRefresh,
  onOnboard,
}: ConfigBarProps) {
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch — only render theme-dependent UI after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-gray-900 dark:text-white">b2a</span>
        <span className="text-gray-500 dark:text-gray-400">
          {owner}/{repo}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-gray-400 dark:text-gray-500 text-xs">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        {/* Theme toggle — only rendered after mount to avoid SSR mismatch */}
        {mounted && (
          <button
            onClick={() => setTheme(nextTheme(theme))}
            title={`Theme: ${theme ?? "system"}`}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors flex items-center gap-1"
          >
            <ThemeIcon theme={theme ?? "system"} />
          </button>
        )}
        <button
          onClick={onRefresh}
          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
        >
          Refresh
        </button>
        <button
          onClick={onOnboard}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          Onboard Repo
        </button>
      </div>
    </div>
  );
}
