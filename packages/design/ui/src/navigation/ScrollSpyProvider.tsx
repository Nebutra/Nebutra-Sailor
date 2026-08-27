"use client";

import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface SectionInfo {
  id: string;
  label: string;
  element?: HTMLElement;
}

export interface ScrollSpyContextValue {
  /** Currently active section ID */
  activeSection: string | null;
  /** All registered sections */
  sections: SectionInfo[];
  /** Register a new section */
  registerSection: (section: SectionInfo) => void;
  /** Unregister a section */
  unregisterSection: (id: string) => void;
  /** Scroll to a specific section */
  scrollToSection: (id: string) => void;
  /** Progress through the page (0-1) */
  scrollProgress: number;
}

const ScrollSpyContext = createContext<ScrollSpyContextValue | null>(null);

export interface ScrollSpyProviderProps {
  children: React.ReactNode;
  /** Offset from top of viewport for determining active section (default: 100) */
  offset?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

/**
 * ScrollSpyProvider - Context provider for tracking scroll position and active sections.
 *
 * Use this to enable narrative navigation features like progress indicators
 * and section-to-section connectors.
 *
 * @example
 * <ScrollSpyProvider>
 *   <LandingPage />
 *   <StoryProgress />
 * </ScrollSpyProvider>
 */
export function ScrollSpyProvider({
  children,
  offset = 100,
  rootMargin = "-20% 0px -60% 0px",
}: ScrollSpyProviderProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);

  const registerSection = useCallback((section: SectionInfo) => {
    setSections((prev) => {
      // Avoid duplicates
      if (prev.some((s) => s.id === section.id)) {
        return prev.map((s) => (s.id === section.id ? { ...s, ...section } : s));
      }
      return [...prev, section];
    });
  }, []);

  const unregisterSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const scrollToSection = useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (element) {
        const top = element.offsetTop - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    },
    [offset],
  );

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const maxScroll = documentHeight - windowHeight;
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
      setScrollProgress(Math.min(Math.max(progress, 0), 1));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer for active section detection
  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sections, rootMargin]);

  const value = useMemo<ScrollSpyContextValue>(
    () => ({
      activeSection,
      sections,
      registerSection,
      unregisterSection,
      scrollToSection,
      scrollProgress,
    }),
    [activeSection, sections, registerSection, unregisterSection, scrollToSection, scrollProgress],
  );

  return <ScrollSpyContext.Provider value={value}>{children}</ScrollSpyContext.Provider>;
}

/**
 * Hook to access scroll spy context
 */
export function useScrollSpy() {
  const context = useContext(ScrollSpyContext);
  if (!context) {
    throw new Error("useScrollSpy must be used within a ScrollSpyProvider");
  }
  return context;
}

/**
 * Hook to register a section with the scroll spy
 */
export function useRegisterSection(section: SectionInfo) {
  const { registerSection, unregisterSection } = useScrollSpy();

  useEffect(() => {
    registerSection(section);
    return () => unregisterSection(section.id);
  }, [section, registerSection, unregisterSection]);
}

export default ScrollSpyProvider;
