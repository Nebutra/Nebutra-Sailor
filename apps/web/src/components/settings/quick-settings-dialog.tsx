"use client";

import { useTheme } from "@nebutra/tokens";
import { AnimateIn } from "@nebutra/ui/components";
import {
  ArrowRight,
  Keyboard,
  LifeBuoy,
  type LucideIcon,
  Monitor,
  Moon,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFeedbackDialog } from "@/components/feedback/feedback-dialog-provider";

/**
 * TEMPLATE — Quick Settings dialog.
 *
 * A non-replacing companion to the full `/settings/*` page tree. Triggered
 * by ⌘, (or from the command palette in a future patch). Surfaces the most
 * common preferences without forcing a navigation:
 *   - Theme (light / dark / system)
 *   - Help → keyboard shortcuts
 *   - Help → report an issue
 *   - Jump to full settings
 *
 * NOT MOUNTED YET — wrap your app with <QuickSettingsMount> when product
 * decides to activate it. Deep-link to /settings/* is preserved either way.
 */

interface QuickSettingsContextValue {
  open: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const QuickSettingsContext = createContext<QuickSettingsContextValue | null>(null);

export function QuickSettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);

  // ⌘, shortcut.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isModKey = event.metaKey || event.ctrlKey;
      if (isModKey && event.key === ",") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const value = useMemo(() => ({ open, openDialog, closeDialog }), [open, openDialog, closeDialog]);

  return <QuickSettingsContext.Provider value={value}>{children}</QuickSettingsContext.Provider>;
}

export function useQuickSettings(): QuickSettingsContextValue {
  const ctx = useContext(QuickSettingsContext);
  if (!ctx) {
    throw new Error("useQuickSettings must be used within a QuickSettingsProvider");
  }
  return ctx;
}

interface RowProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  active?: boolean;
  onClick: () => void;
}

function Row({ icon: Icon, label, hint, active, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-blue-2 text-blue-11 dark:bg-blue-2/20 dark:text-blue-9"
          : "text-neutral-12 hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon
          className={`h-4 w-4 ${
            active
              ? "text-blue-11 dark:text-blue-9"
              : "text-neutral-10 group-hover:text-neutral-12 dark:text-white/50 dark:group-hover:text-white"
          }`}
        />
        {label}
      </span>
      {hint && <span className="text-xs text-neutral-10 dark:text-white/40">{hint}</span>}
    </button>
  );
}

export function QuickSettingsDialog() {
  const { open, closeDialog } = useQuickSettings();
  const { openDialog: openFeedback } = useFeedbackDialog();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeDialog]);

  if (!open) return null;

  const go = (href: string) => {
    closeDialog();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[14vh] backdrop-blur-sm"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog();
        }
      }}
    >
      <AnimateIn preset="fadeUp">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick settings"
          className="w-[min(92vw,440px)] overflow-hidden rounded-2xl border border-neutral-7 bg-neutral-1 shadow-2xl dark:border-white/10 dark:bg-neutral-2"
        >
          <div className="flex items-center justify-between border-b border-neutral-7 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-neutral-11 dark:text-white/70" />
              <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
                Quick settings
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={closeDialog}
              className="rounded-md p-1.5 text-neutral-10 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-2 py-2">
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-10 dark:text-white/40">
              Theme
            </p>
            <Row
              icon={Sun}
              label="Light"
              active={theme === "light"}
              onClick={() => setTheme("light")}
            />
            <Row
              icon={Moon}
              label="Dark"
              active={theme === "dark"}
              onClick={() => setTheme("dark")}
            />
            <Row
              icon={Monitor}
              label="System"
              active={theme === "system"}
              onClick={() => setTheme("system")}
            />
          </div>

          <div className="border-t border-neutral-7 px-2 py-2 dark:border-white/10">
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-10 dark:text-white/40">
              Help
            </p>
            <Row
              icon={LifeBuoy}
              label="Report an issue"
              onClick={() => {
                closeDialog();
                openFeedback();
              }}
            />
            <Row
              icon={Keyboard}
              label="Keyboard shortcuts"
              onClick={() => go("/settings/shortcuts")}
            />
          </div>

          <div className="border-t border-neutral-7 px-2 py-2 dark:border-white/10">
            <button
              type="button"
              onClick={() => go("/settings")}
              className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-blue-11 transition-colors hover:bg-blue-2 dark:text-blue-9 dark:hover:bg-blue-2/20"
            >
              <span>Open all settings</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <p className="border-t border-neutral-7 px-4 py-2 text-[10px] text-neutral-10 dark:border-white/10 dark:text-white/40">
            Tip: press{" "}
            <kbd className="rounded border border-neutral-6 bg-neutral-2 px-1 py-0.5 font-mono dark:border-white/10 dark:bg-white/5">
              ⌘,
            </kbd>{" "}
            anywhere to reopen.
          </p>
        </div>
      </AnimateIn>
    </div>
  );
}

/**
 * Single mount-point for quick settings. NOT WIRED in the layout yet — when
 * activating, drop this between FeedbackMount and CommandPaletteMount:
 *
 *   <FeedbackMount>
 *     <QuickSettingsMount>
 *       <CommandPaletteMount>...
 */
export function QuickSettingsMount({ children }: { children: ReactNode }) {
  return (
    <QuickSettingsProvider>
      {children}
      <QuickSettingsDialog />
    </QuickSettingsProvider>
  );
}
