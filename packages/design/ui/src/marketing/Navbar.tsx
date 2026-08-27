/**
 * Navbar - Marketing Navigation Component
 *
 * Top navigation bar with logo, main nav links, locale switcher, and CTAs.
 * Includes optional announcement bar for promotions/notifications.
 */

"use client";

import { brand } from "@nebutra/brand/metadata";
import { Bell, ChevronDown, Menu, Cross as X } from "@nebutra/icons";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimateIn } from "../primitives/animate-in";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "../shared/animation/motion";
import { motionDurations } from "../tokens/motion";
import { cn } from "../utils";
import type { NavbarProps, NavLink } from "./types";

const EMPTY_NAV_LINKS: NavLink[] = [];
const ANNOUNCEMENT_STORAGE_KEY = "nebutra-announcement-dismissed";
const ANNOUNCEMENT_STORAGE_EVENT = "nebutra-announcement-dismissed-change";

function getScrollSnapshot() {
  return typeof window !== "undefined" && window.scrollY > 10;
}

function subscribeScroll(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("scroll", onStoreChange, { passive: true });
  return () => window.removeEventListener("scroll", onStoreChange);
}

function getAnnouncementDismissedSnapshot() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

function subscribeAnnouncementDismissed(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === ANNOUNCEMENT_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ANNOUNCEMENT_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ANNOUNCEMENT_STORAGE_EVENT, onStoreChange);
  };
}

export function Navbar({
  locale = "en",
  links = EMPTY_NAV_LINKS,
  showAnnouncement = false,
  announcement,
  showLocaleSwitcher = true,
  cta,
  className,
}: NavbarProps) {
  const isScrolled = useSyncExternalStore(subscribeScroll, getScrollSnapshot, () => false);
  const isAnnouncementDismissed = useSyncExternalStore(
    subscribeAnnouncementDismissed,
    getAnnouncementDismissedSnapshot,
    () => true,
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Prevent background scrolling when mobile menu opens
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Escape closes the drawer. NOTE: this drawer is still hand-rolled and has no
  // focus trap — see docs/design-system/ui-compliance-audit.md §2.4. Escape is
  // added here because it is purely additive; `role="dialog" aria-modal` is
  // deliberately NOT added, because claiming a modal without trapping focus lies
  // to assistive tech. The real fix is composing Sheet, which changes the slide
  // motion and needs a visual review.
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen]);

  const dismissAnnouncement = () => {
    try {
      window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, "true");
    } catch {
      // Storage can be unavailable in constrained browser contexts.
    }

    window.dispatchEvent(new Event(ANNOUNCEMENT_STORAGE_EVENT));
  };

  const activeAnnouncement =
    showAnnouncement && !isAnnouncementDismissed ? announcement : undefined;

  return (
    <LazyMotion features={domAnimation}>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 flex flex-col transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
          className,
        )}
      >
        {/* Announcement Bar */}
        <AnimatePresence initial={!shouldReduceMotion}>
          {activeAnnouncement && (
            <m.div
              initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
              exit={
                shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0, overflow: "hidden" }
              }
              transition={
                shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }
              }
              className="relative flex items-center justify-center bg-primary px-4 py-2.5 text-sm font-medium text-white sm:px-6 lg:px-8"
            >
              <div className="flex items-center gap-2 text-center">
                <Bell className="h-4 w-4 shrink-0" />
                <p>
                  {activeAnnouncement.text}{" "}
                  {activeAnnouncement.href && (
                    <a
                      href={activeAnnouncement.href}
                      className="inline-block underline underline-offset-2 font-semibold hover:text-[var(--blue-3)] transition-colors"
                    >
                      Learn more &rarr;
                    </a>
                  )}
                </p>
              </div>
              {activeAnnouncement.dismissible !== false && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-md)] p-1.5 hover:bg-white/20 transition-colors"
                  onClick={dismissAnnouncement}
                  aria-label="Dismiss announcement"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* Main Navbar */}
        <nav
          className={cn(
            "relative flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 w-full backdrop-blur-md transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out border-b border-transparent",
            isScrolled
              ? "bg-white/80 dark:bg-background/90 shadow-sm border-[var(--neutral-4)] dark:border-[var(--neutral-3)] py-3"
              : "bg-transparent py-5",
          )}
        >
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group rounded-[var(--radius-md)]">
              {/* Simple logo placeholder - swap with actual Logo module */}
              <div className="size-8 rounded-[var(--radius-lg)] bg-gradient-to-tr from-primary to-[var(--blue-5)] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                <span className="text-white font-bold text-lg leading-none">
                  {brand.name.charAt(0)}
                </span>
              </div>
              <span className="font-semibold text-lg tracking-tight text-foreground">
                {brand.name}
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              {links.map((link) => (
                <div key={link.href} className="relative group">
                  <a
                    href={link.href}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors rounded-[var(--radius-md)] px-2 py-1"
                  >
                    {link.label}
                    {link.children && (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                    )}
                    {link.badge && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-[var(--blue-3)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--blue-11)] border border-[var(--blue-5)] uppercase">
                        {link.badge}
                      </span>
                    )}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Locale Switcher (Simplified placeholder) */}
            {showLocaleSwitcher && (
              <button
                type="button"
                aria-label={`Change language, currently ${locale}`}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors px-2 py-1 rounded-[var(--radius-md)] hover:bg-muted"
              >
                {locale} <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </button>
            )}

            {/* CTA Button */}
            {cta && (
              <a
                href={cta.href}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-medium shadow-sm transition-colors",
                  cta.variant === "outline"
                    ? "border border-[var(--neutral-5)] bg-transparent text-foreground hover:bg-muted"
                    : "bg-primary text-white hover:bg-primary/90",
                )}
              >
                {cta.text}
              </a>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-[var(--radius-md)] p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="block h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu Slide-out Drawer */}
        <AnimatePresence initial={!shouldReduceMotion}>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <AnimateIn
                preset="fade"
                duration={motionDurations.flow / 1000}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 z-40 bg-[var(--neutral-12)]/40 backdrop-blur-sm dark:bg-background/60 md:hidden"
              />

              {/* Drawer — reduced-motion fallback lives inside AnimateIn */}
              <AnimateIn
                preset="slideFromRight"
                role="dialog"
                aria-label="Main menu"
                className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-background shadow-2xl ring-1 ring-black/10 overflow-y-auto p-6 md:hidden flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="size-8 rounded-[var(--radius-lg)] bg-gradient-to-tr from-primary to-[var(--blue-5)] shadow-sm flex items-center justify-center">
                      <span className="text-white font-bold text-lg leading-none">
                        {brand.name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-semibold text-xl tracking-tight text-foreground">
                      {brand.name}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="-m-2.5 rounded-[var(--radius-md)] p-2.5 text-muted-foreground hover:bg-muted"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="sr-only">Close menu</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-col gap-6 flex-1">
                  <div className="flex flex-col gap-1">
                    {links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="block rounded-[var(--radius-lg)] p-3 font-medium text-foreground hover:bg-muted transition-colors text-base"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {link.label}
                        {link.badge && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-[var(--blue-3)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue-11)]">
                            {link.badge}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-col gap-4 border-t border-[var(--neutral-4)] pt-6">
                    {showLocaleSwitcher && (
                      <div className="flex items-center justify-between px-3">
                        <span className="text-sm font-medium text-muted-foreground">Language</span>
                        <button
                          type="button"
                          aria-label={`Change language, currently ${locale}`}
                          className="flex items-center gap-1.5 text-sm font-medium uppercase text-foreground bg-muted px-3 py-1.5 rounded-[var(--radius-md)]"
                        >
                          {locale} <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}

                    {cta && (
                      <a
                        href={cta.href}
                        className={cn(
                          "flex w-full items-center justify-center rounded-[var(--radius-md)] px-4 py-3 text-base font-medium shadow-sm transition-colors",
                          cta.variant === "outline"
                            ? "border border-[var(--neutral-5)] bg-transparent text-foreground"
                            : "bg-primary text-white",
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {cta.text}
                      </a>
                    )}
                  </div>
                </div>
              </AnimateIn>
            </>
          )}
        </AnimatePresence>
      </header>
    </LazyMotion>
  );
}

Navbar.displayName = "Navbar";
