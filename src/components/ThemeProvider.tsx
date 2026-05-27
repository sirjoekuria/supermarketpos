"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store";

export function ThemeProvider() {
  const { themeColor, darkMode } = useUIStore();

  useEffect(() => {
    // Apply data-theme attribute for CSS variables
    document.documentElement.setAttribute("data-theme", themeColor || "blue");
    
    // Apply dark mode class
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeColor, darkMode]);

  return null;
}
