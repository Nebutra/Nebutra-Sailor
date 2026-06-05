/**
 * Navbar - Marketing Navigation Component
 *
 * Top navigation bar with logo, main nav links, locale switcher, and CTAs.
 * Includes optional announcement bar for promotions/notifications.
 */

"use client";

import { Bell, ChevronDown, Menu, Cross as X } from "@nebutra/icons";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "../shared/animation/motion";
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
              className="relative flex items-center justify-center bg-[var(--brand-9)] px-4 py-2.5 text-sm font-medium text-white sm:px-6 lg:px-8"
            >
              <div className="flex items-center gap-2 text-center">
                <Bell className="h-4 w-4 shrink-0" />
                <p>
                  {activeAnnouncement.text}{" "}
                  {activeAnnouncement.href && (
                    <a
                      href={activeAnnouncement.href}
                      className="inline-block underline underline-offset-2 font-semibold hover:text-[var(--brand-3)] transition-colors"
                    >
                      Learn more &rarr;
                    </a>
                  )}
                </p>
              </div>
              {activeAnnouncement.dismissible !== false && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-md)] p-1.5 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
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
              ? "bg-white/80 dark:bg-[var(--neutral-1)]/90 shadow-sm border-[var(--neutral-4)] dark:border-[var(--neutral-3)] py-3"
              : "bg-transparent py-5",
          )}
        >
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)] rounded-[var(--radius-md)]"
            >
              {/* Simple logo placeholder - swap with actual Logo module */}
              <div className="size-8 rounded-[var(--radius-lg)] bg-gradient-to-tr from-[var(--brand-9)] to-[var(--brand-5)] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                <span className="text-white font-bold text-lg leading-none">N</span>
              </div>
              <span className="font-semibold text-lg tracking-tight text-[var(--neutral-12)]">
                Nebutra
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              {links.map((link) => (
                <div key={link.href} className="relative group">
                  <a
                    href={link.href}
                    className="flex items-center gap-1 text-[var(--neutral-11)] hover:text-[var(--neutral-12)] text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)] rounded-[var(--radius-md)] px-2 py-1"
                  >
                    {link.label}
                    {link.children && (
                      <ChevronDown className="h-3.5 w-3.5 text-[var(--neutral-9)] group-hover:text-[var(--neutral-11)] transition-colors" />
                    )}
                    {link.badge && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-[var(--brand-3)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--brand-11)] border border-[var(--brand-5)] uppercase">
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
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-10)] hover:text-[var(--neutral-12)] uppercase tracking-wider transition-colors px-2 py-1 rounded-[var(--radius-md)] hover:bg-[var(--neutral-3)]"
              >
                {locale} <ChevronDown className="h-3 w-3" />
              </button>
            )}

            {/* CTA Button */}
            {cta && (
              <a
                href={cta.href}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-9)] focus:ring-offset-2",
                  cta.variant === "outline"
                    ? "border border-[var(--neutral-5)] bg-transparent text-[var(--neutral-12)] hover:bg-[var(--neutral-3)]"
                    : "bg-[var(--brand-9)] text-white hover:bg-[var(--brand-10)]",
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
              className="inline-flex items-center justify-center rounded-[var(--radius-md)] p-2 text-[var(--neutral-11)] hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-9)] transition-colors"
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
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 z-40 bg-[var(--neutral-12)]/40 backdrop-blur-sm dark:bg-[var(--neutral-1)]/60 md:hidden"
              />

              {/* Drawer */}
              <m.div
                initial={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
                animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", damping: 25, stiffness: 200 }
                }
                className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-[var(--neutral-1)] shadow-2xl ring-1 ring-black/10 overflow-y-auto p-6 md:hidden flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="size-8 rounded-[var(--radius-lg)] bg-gradient-to-tr from-[var(--brand-9)] to-[var(--brand-5)] shadow-sm flex items-center justify-center">
                      <span className="text-white font-bold text-lg leading-none">N</span>
                    </div>
                    <span className="font-semibold text-xl tracking-tight text-[var(--neutral-12)]">
                      Nebutra
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="-m-2.5 rounded-[var(--radius-md)] p-2.5 text-[var(--neutral-11)] hover:bg-[var(--neutral-3)]"
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
                        className="block rounded-[var(--radius-lg)] p-3 font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] transition-colors text-base"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {link.label}
                        {link.badge && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-[var(--brand-3)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-11)]">
                            {link.badge}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-col gap-4 border-t border-[var(--neutral-4)] pt-6">
                    {showLocaleSwitcher && (
                      <div className="flex items-center justify-between px-3">
                        <span className="text-sm font-medium text-[var(--neutral-11)]">
                          Language
                        </span>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-sm font-medium uppercase text-[var(--neutral-12)] bg-[var(--neutral-3)] px-3 py-1.5 rounded-[var(--radius-md)]"
                        >
                          {locale} <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {cta && (
                      <a
                        href={cta.href}
                        className={cn(
                          "flex w-full items-center justify-center rounded-[var(--radius-md)] px-4 py-3 text-base font-medium shadow-sm transition-colors",
                          cta.variant === "outline"
                            ? "border border-[var(--neutral-5)] bg-transparent text-[var(--neutral-12)]"
                            : "bg-[var(--brand-9)] text-white",
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {cta.text}
                      </a>
                    )}
                  </div>
                </div>
              </m.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </LazyMotion>
  );
}

Navbar.displayName = "Navbar";
