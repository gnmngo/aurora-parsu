"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { useTheme as useNextTheme } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  
  return {
    theme: theme as "light" | "dark" | "system",
    resolvedTheme: resolvedTheme as "light" | "dark",
    setTheme: (t: "light" | "dark" | "system") => setTheme(t),
    toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark")
  };
}
