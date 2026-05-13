/**
 * Navbar - Marketing Navigation Component
 *
 * Top navigation bar with logo, main nav links, locale switcher, and CTAs.
 * Includes optional announcement bar for promotions/notifications.
 */

"use client";

import { Bell, ChevronDown, Menu, Cross as X } from "@nebutra/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "../utils";
import type { NavbarProps } from "./types";

export function Navbar({
  locale = "en",
  links = [],
  showAnnouncement = false,
  announcement,
  showLocaleSwitcher = true,
  cta,
  className,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(true); // Default to true before mount
  const [mounted, setMounted] = useState(false);

  // Hydration safety & initialization
  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem("nebutra-announcement-dismissed");
    if (dismissed !== "true") {
      setIsAnnouncementDismissed(false);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    // Check initial scroll
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    setIsAnnouncementDismissed(true);
    localStorage.setItem("nebutra-announcement-dismissed", "true");
  };

  const showActiveAnnouncement =
    mounted && showAnnouncement && announcement && !isAnnouncementDismissed;

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 flex flex-col transition-all duration-300",
        className,
      )}
    >
      {/* Announcement Bar */}
      <AnimatePresence>
        {showActiveAnnouncement && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, overflow: "hidden" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative flex items-center justify-center bg-[var(--brand-9)] px-4 py-2.5 text-sm font-medium text-white sm:px-6 lg:px-8"
          >
            <div className="flex items-center gap-2 text-center">
              <Bell className="h-4 w-4 shrink-0" />
              <p>
                {announcement.text}{" "}
                {announcement.href && (
                  <a
                    href={announcement.href}
                    className="inline-block underline underline-offset-2 font-semibold hover:text-[var(--brand-3)] transition-colors"
                  >
                    Learn more &rarr;
                  </a>
                )}
              </p>
            </div>
            {announcement.dismissible !== false && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                onClick={dismissAnnouncement}
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navbar */}
      <nav
        className={cn(
          "relative flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 w-full backdrop-blur-md transition-all duration-300 ease-out border-b border-transparent",
          isScrolled
            ? "bg-white/80 dark:bg-black/80 shadow-sm border-[var(--neutral-4)] dark:border-[var(--neutral-3)] py-3"
            : "bg-transparent py-5",
        )}
      >
        <div className="flex items-center gap-8">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)] rounded-md"
          >
            {/* Simple logo placeholder - swap with actual Logo module */}
            <div className="size-8 rounded-lg bg-gradient-to-tr from-[var(--brand-9)] to-[var(--brand-5)] shadow-sm flex items-center justify-center group-hover:shadow-md transition-all">
              <span className="text-white font-bold text-lg leading-none">N</span>
            </div>
            <span className="font-semibold text-lg tracking-tight text-[var(--neutral-12)]">
              Nebutra
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <div key={link.href} className="relative group">
                <a
                  href={link.href}
                  className="flex items-center gap-1 text-[var(--neutral-11)] hover:text-[var(--neutral-12)] text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)] rounded-md px-2 py-1"
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
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-10)] hover:text-[var(--neutral-12)] uppercase tracking-wider transition-colors px-2 py-1 rounded-md hover:bg-[var(--neutral-3)]"
            >
              {locale} <ChevronDown className="h-3 w-3" />
            </button>
          )}

          {/* CTA Button */}
          {cta && (
            <a
              href={cta.href}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-9)] focus:ring-offset-2",
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
            className="inline-flex items-center justify-center rounded-md p-2 text-[var(--neutral-11)] hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-9)] transition-colors"
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
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-[var(--neutral-1)] shadow-2xl ring-1 ring-black/10 overflow-y-auto px-6 py-6 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <a
                  href="/"
                  className="flex items-center gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="size-8 rounded-lg bg-gradient-to-tr from-[var(--brand-9)] to-[var(--brand-5)] shadow-sm flex items-center justify-center">
                    <span className="text-white font-bold text-lg leading-none">N</span>
                  </div>
                  <span className="font-semibold text-xl tracking-tight text-[var(--neutral-12)]">
                    Nebutra
                  </span>
                </a>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-[var(--neutral-11)] hover:bg-[var(--neutral-3)]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-col gap-6 flex-1">
                <div className="space-y-1">
                  {links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="block rounded-lg px-3 py-3 font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] transition-colors text-base"
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
                      <span className="text-sm font-medium text-[var(--neutral-11)]">Language</span>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm font-medium uppercase text-[var(--neutral-12)] bg-[var(--neutral-3)] px-3 py-1.5 rounded-md"
                      >
                        {locale} <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {cta && (
                    <a
                      href={cta.href}
                      className={cn(
                        "flex w-full items-center justify-center rounded-md px-4 py-3 text-base font-medium shadow-sm transition-colors",
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

Navbar.displayName = "Navbar";
