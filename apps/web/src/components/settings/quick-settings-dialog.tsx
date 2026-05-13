"use client";

import { useTheme } from "@nebutra/tokens";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@nebutra/ui/primitives";
import { ArrowRight, Keyboard, LifeBuoy, type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
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
 * Built on `@nebutra/ui/primitives` Dialog → focus trap, ESC handling, focus
 * restoration are all handled by the primitive. We only own the body content.
 *
 * NOT MOUNTED in main layout yet — wrap your app with <QuickSettingsMount>
 * when product decides to activate. Deep-link to /settings/* preserved.
 */

interface QuickSettingsContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
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

  const value = useMemo(
    () => ({ open, setOpen, openDialog, closeDialog }),
    [open, openDialog, closeDialog],
  );

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
  const { open, setOpen, closeDialog } = useQuickSettings();
  const { openDialog: openFeedback } = useFeedbackDialog();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const go = (href: string) => {
    closeDialog();
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[440px] gap-0 p-0">
        <DialogHeader className="border-b border-neutral-7 px-4 py-3 text-left dark:border-white/10">
          <DialogTitle className="text-sm">Quick settings</DialogTitle>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
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
