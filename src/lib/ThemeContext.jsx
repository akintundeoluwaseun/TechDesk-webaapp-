import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("techdesk_theme");
    return saved ? saved === "dark" : false;
  });

  useEffect(() => {
    localStorage.setItem("techdesk_theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggleDark: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Shared token map so every page reads colors the same way — iOS-style liquid glass.
export function useThemeTokens() {
  const { dark } = useTheme();
  return {
    dark,
    // a gradient (not a flat color) so the translucent glass panels below
    // actually have something to blur into a frosted look
    bg: dark
      ? "bg-[#181b22] md:bg-gradient-to-br md:from-[#0a0d16] md:via-[#121a2e] md:to-[#0d1220]"
      : "bg-[#f4f5f7] md:bg-gradient-to-br md:from-blue-50 md:via-slate-100 md:to-indigo-100",
    // Phones get flat surfaces and the glass only switches on from `md`.
    // backdrop-filter is expensive to composite and, with a dozen blurred
    // elements on screen, noticeably slows a mid-range Android; it also just
    // reads as muddy at 390px. The desktop keeps the frosted look.
    sidebarBg: dark
      ? "bg-[#1f232b] md:bg-white/5 md:backdrop-blur-lg md:border-r md:border-white/10"
      : "bg-white md:bg-white/25 md:backdrop-blur-lg md:border-r md:border-white/40 md:backdrop-brightness-95",
    cardBg: dark
      ? "bg-[#252932] border border-white/10 md:bg-white/[0.07] md:backdrop-blur-md md:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      : "bg-white border border-black/[0.07] md:bg-white/30 md:backdrop-blur-md md:backdrop-brightness-90 md:border-white/50 md:shadow-[0_8px_32px_rgba(31,38,135,0.15)]",
    insetBg: dark
      ? "bg-[#1e222a] border border-white/10 md:bg-white/[0.04] md:backdrop-blur-sm"
      : "bg-[#f4f5f7] border border-black/[0.06] md:bg-white/20 md:backdrop-blur-sm md:border-white/40",
    inputBg: dark
      ? "bg-[#252932] border border-white/10 text-white placeholder:text-slate-500 md:bg-white/[0.06] md:backdrop-blur-sm"
      : "bg-white border border-black/[0.08] text-slate-900 placeholder:text-slate-500 md:bg-white/30 md:backdrop-blur-sm md:backdrop-brightness-90 md:border-white/50",
    pillBg: dark
      ? "bg-[#252932] border border-white/10 text-slate-200 md:border-0 md:bg-white/10 md:backdrop-blur-sm"
      : "bg-white border border-black/[0.07] text-slate-700 md:border-0 md:bg-white/30 md:backdrop-blur-sm md:backdrop-brightness-90",
    // faint hairline, for rows and section dividers
    divider: dark ? "border-white/10" : "border-black/10",
    textPrimary: dark ? "text-white" : "text-black",
    textSecondary: dark ? "text-slate-300" : "text-slate-800",
    textMuted: dark ? "text-slate-400" : "text-slate-700",
  };
}

