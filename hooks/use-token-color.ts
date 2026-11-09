"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Resolves design tokens (e.g. "--primary") to concrete colors for libraries
 * like Recharts that write SVG attributes, where CSS var() doesn't resolve.
 * Re-reads when the theme changes.
 */
export function useTokenColors<T extends string>(tokens: readonly T[], fallback = "#6366f1"): Record<T, string> {
  const { resolvedTheme } = useTheme();
  const read = () =>
    Object.fromEntries(
      tokens.map((t) => {
        if (typeof window === "undefined") return [t, fallback];
        const v = getComputedStyle(document.documentElement).getPropertyValue(t).trim();
        return [t, v ? `hsl(${v})` : fallback];
      })
    ) as Record<T, string>;

  const [colors, setColors] = useState<Record<T, string>>(() =>
    Object.fromEntries(tokens.map((t) => [t, fallback])) as Record<T, string>
  );

  useEffect(() => {
    setColors(read());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]);

  return colors;
}
