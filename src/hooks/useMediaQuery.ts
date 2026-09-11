import { useEffect, useState } from "react";

function getMatch(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMatch(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

export const BREAKPOINTS = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
} as const;

export function useBreakpoint(breakpoint: keyof typeof BREAKPOINTS): boolean {
  return useMediaQuery(BREAKPOINTS[breakpoint]);
}

export type BreakpointFlags = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

export function useBreakpoints(): BreakpointFlags {
  const [flags, setFlags] = useState<BreakpointFlags>(() => {
    const isMd = getMatch(BREAKPOINTS.md);
    const isLg = getMatch(BREAKPOINTS.lg);
    return {
      isMobile: !isMd,
      isTablet: isMd && !isLg,
      isDesktop: isLg,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mdQuery = window.matchMedia(BREAKPOINTS.md);
    const lgQuery = window.matchMedia(BREAKPOINTS.lg);

    const sync = (): void => {
      const isMd = mdQuery.matches;
      const isLg = lgQuery.matches;
      setFlags({
        isMobile: !isMd,
        isTablet: isMd && !isLg,
        isDesktop: isLg,
      });
    };

    sync();
    mdQuery.addEventListener("change", sync);
    lgQuery.addEventListener("change", sync);

    return () => {
      mdQuery.removeEventListener("change", sync);
      lgQuery.removeEventListener("change", sync);
    };
  }, []);

  return flags;
}
