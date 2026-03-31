"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the `dark` class is present on <html>.
 * Stays in sync with changes made by ThemeToggle.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read initial value
    setIsDark(document.documentElement.classList.contains("dark"));

    // Watch for class mutations
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
