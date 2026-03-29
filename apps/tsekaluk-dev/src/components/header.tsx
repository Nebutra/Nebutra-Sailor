"use client";

import { TextShimmer } from "@nebutra/ui/primitives";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useCommandPalette } from "@/components/providers/command-palette-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { signIn, signOut, useSession } from "@/lib/auth-client";

function AuthIndicator() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return null;
  }

  if (session?.user) {
    const initial = session.user.name?.charAt(0).toUpperCase() ?? "?";
    return (
      <button
        type="button"
        onClick={() => signOut()}
        className="gap-1.5 text-sm flex items-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Sign out"
        title={`Signed in as ${session.user.name ?? session.user.email}`}
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt=""
            width={24}
            height={24}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <span className="h-6 w-6 text-xs font-medium flex items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {initial}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn.social({ provider: "github", callbackURL: "/" })}
      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      Sign in
    </button>
  );
}

function DesktopNavItem({ href, label }: { href: string; label: string }) {
  const isThinking = href === "/thinking";

  return (
    <Link
      href={href}
      className="group text-sm relative text-muted-foreground transition-colors hover:text-foreground"
    >
      {isThinking ? (
        <TextShimmer as="span" duration={2}>
          {label}
        </TextShimmer>
      ) : (
        label
      )}
      <span className="-bottom-0.5 left-0 w-0 absolute h-px bg-foreground transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

export function Header() {
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { setOpen: openCommandPalette } = useCommandPalette();

  const NAV_ITEMS = [
    { label: t("work"), href: "/work" },
    { label: t("thinking"), href: "/thinking" },
    { label: t("now"), href: "/now" },
    { label: t("about"), href: "/about" },
    { label: t("links"), href: "/links" },
    { label: t("soul"), href: "/soul" },
    { label: t("uses"), href: "/uses" },
    { label: t("guestbook"), href: "/guestbook" },
  ] as const;

  return (
    <header className="relative z-40">
      <a
        href="#main-content"
        className="left-4 top-4 -translate-y-20 bg-gray-900 px-4 py-2 text-sm font-medium text-white focus:translate-y-0 dark:bg-white dark:text-gray-900 absolute z-50 rounded-md transition-transform"
      >
        Skip to content
      </a>
      <div className="max-w-7xl px-6 py-8 mx-auto">
        <nav aria-label="Main navigation" className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="gap-2 font-serif text-2xl tracking-tight flex items-center text-foreground italic"
          >
            <Image
              src="/images/logo-mono.svg"
              alt=""
              width={24}
              height={24}
              className="dark:invert"
            />
            Tseka Luk
          </Link>

          {/* Desktop nav */}
          <div className="gap-6 md:flex hidden items-center">
            {NAV_ITEMS.map((item) => (
              <DesktopNavItem key={item.href} href={item.href} label={item.label} />
            ))}
            <div className="gap-2 ml-2 flex items-center">
              <button
                type="button"
                aria-label="Open command palette"
                onClick={() => openCommandPalette(true)}
                className="gap-1.5 flex items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search className="h-[18px] w-[18px] stroke-[1.5]" />
                <span className="font-medium text-[11px] opacity-60">⌘K</span>
              </button>
              <LanguageSwitcher />
              <ThemeToggle />
              <AuthIndicator />
            </div>
            <Link
              href="/about#contact"
              className="bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] dark:hover:bg-gray-200"
            >
              {t("contact")}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="p-2 md:hidden rounded-md text-muted-foreground transition-colors hover:text-foreground focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 focus:outline-none"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="md:hidden overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="gap-4 pt-6 pb-4 flex flex-col">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-base text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="gap-3 mt-2 flex items-center">
                  <LanguageSwitcher />
                  <ThemeToggle />
                  <AuthIndicator />
                  <Link
                    href="/about#contact"
                    className="bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 w-fit rounded-full transition-colors dark:hover:bg-gray-200"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("contact")}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
