"use client";

/**
 * useConfirm / usePrompt — promise-returning, in-app replacements for
 * `window.confirm` and `window.prompt`.
 *
 * The native dialogs block the main thread, cannot be themed or translated,
 * ignore reduced motion and dark mode, and (in Chrome) can be suppressed by the
 * user — after which `confirm()` silently returns `false`. These hooks keep the
 * one-line call shape and render an AlertDialog / Dialog instead:
 *
 * ```tsx
 * const [confirm, confirmDialog] = useConfirm();
 *
 * async function onRemove() {
 *   const ok = await confirm({
 *     title: "Remove member",
 *     description: `${name} loses access to this workspace.`,
 *     confirmLabel: "Remove",
 *     tone: "destructive",
 *   });
 *   if (ok) await removeMember(id);
 * }
 *
 * return <>{button}{confirmDialog}</>;
 * ```
 *
 * Pass `action` to run the work inside the dialog: the confirm button shows
 * the pending state, a thrown error is shown inline and the dialog stays open
 * so the user can retry or cancel, and the promise resolves `true` only after
 * the action succeeded.
 *
 * ```tsx
 * const [prompt, promptDialog] = usePrompt();
 * const name = await prompt({ title: "New project", label: "Project name" });
 * if (name) createProject(name);
 * ```
 *
 * Each hook returns its dialog element; render it once anywhere in the
 * component. No provider is needed. Calling again while a dialog is open
 * settles the earlier call as cancelled.
 */

import * as React from "react";
import { cn } from "../utils/cn";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Input } from "./input";
import { Label } from "./label";

// ─── Shared ─────────────────────────────────────────────────────────────────

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "Something went wrong. Try again.";
}

interface Pending<TResult, TOptions> {
  /** Distinct per request, so a fresh request starts from fresh state. */
  id: number;
  options: TOptions;
  resolve: (result: TResult) => void;
}

/**
 * Holds one open request at a time. A new request settles the previous one
 * with `cancelled`, so no caller is ever left awaiting forever.
 */
function useRequest<TResult, TOptions>(cancelled: TResult) {
  const [pending, setPending] = React.useState<Pending<TResult, TOptions> | null>(null);
  const pendingRef = React.useRef<Pending<TResult, TOptions> | null>(null);
  const counter = React.useRef(0);

  const open = React.useCallback(
    (options: TOptions) =>
      new Promise<TResult>((resolve) => {
        pendingRef.current?.resolve(cancelled);
        counter.current += 1;
        const next = { id: counter.current, options, resolve };
        pendingRef.current = next;
        setPending(next);
      }),
    [cancelled],
  );

  const settle = React.useCallback((result: TResult) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(result);
  }, []);

  // An unmounting component must not strand its caller.
  React.useEffect(() => () => pendingRef.current?.resolve(cancelled), [cancelled]);

  return { pending, open, settle };
}

// ─── useConfirm ─────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  /** Title Case verb + noun, e.g. "Delete Project". */
  title: React.ReactNode;
  /** The consequence, naming the specific resource when possible. */
  description?: React.ReactNode;
  /** Primary action label. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Cancel label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** `destructive` paints the confirm button as a destructive action. */
  tone?: "default" | "destructive";
  /**
   * Work to run when the user confirms. While it runs the confirm button is
   * pending; if it throws, the message is shown inline and the dialog stays
   * open. The promise resolves `true` only after it succeeds.
   */
  action?: () => unknown | Promise<unknown>;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export function useConfirm(): [ConfirmFn, React.ReactElement] {
  const { pending, open, settle } = useRequest<boolean, ConfirmOptions>(false);
  const dialog = (
    <ConfirmRequestDialog
      key={pending?.id ?? "closed"}
      options={pending?.options ?? null}
      onSettle={settle}
    />
  );
  return [open, dialog];
}

function ConfirmRequestDialog({
  options,
  onSettle,
}: {
  options: ConfirmOptions | null;
  onSettle: (result: boolean) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const errorId = React.useId();

  async function handleConfirm() {
    if (!options?.action) {
      onSettle(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await options.action();
      onSettle(true);
    } catch (caught) {
      setError(errorText(caught));
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={options !== null}
      onOpenChange={(next) => {
        if (!next && !busy) onSettle(false);
      }}
    >
      {options ? (
        <AlertDialogContent aria-busy={busy || undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description ? (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          {error ? (
            <p id={errorId} role="alert" className="mt-3 text-sm text-destructive-strong">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onSettle(false)}>
              {options.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              variant={options.tone === "destructive" ? "destructive" : "default"}
              loading={busy}
              aria-describedby={error ? errorId : undefined}
              onClick={() => void handleConfirm()}
            >
              {options.confirmLabel ?? "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}

// ─── usePrompt ──────────────────────────────────────────────────────────────

export interface PromptOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Visible field label. Never rely on the placeholder alone. */
  label: string;
  defaultValue?: string;
  placeholder?: string;
  /** Submit label. Defaults to "Save". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Return an error message to block submit, or nothing to accept. */
  validate?: (value: string) => string | null | undefined;
  /** Allow submitting an empty (whitespace-only) value. Defaults to false. */
  allowEmpty?: boolean;
  /** Input type hint for keyboards and autofill. */
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  maxLength?: number;
}

/** Resolves the trimmed value, or `null` when cancelled. */
export type PromptFn = (options: PromptOptions) => Promise<string | null>;

export function usePrompt(): [PromptFn, React.ReactElement] {
  const { pending, open, settle } = useRequest<string | null, PromptOptions>(null);
  const dialog = (
    <PromptRequestDialog
      key={pending?.id ?? "closed"}
      options={pending?.options ?? null}
      onSettle={settle}
    />
  );
  return [open, dialog];
}

function PromptRequestDialog({
  options,
  onSettle,
}: {
  options: PromptOptions | null;
  onSettle: (result: string | null) => void;
}) {
  const [value, setValue] = React.useState(options?.defaultValue ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();
  const errorId = React.useId();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!options) return;
    const trimmed = value.trim();
    // Validation runs on submit and the button stays enabled: a disabled
    // submit with no stated reason is the anti-pattern this replaces.
    if (!trimmed && !options.allowEmpty) {
      setError(`${options.label} is required.`);
      return;
    }
    const message = options.validate?.(trimmed);
    if (message) {
      setError(message);
      return;
    }
    onSettle(trimmed);
  }

  return (
    <Dialog
      open={options !== null}
      onOpenChange={(next) => {
        if (!next) onSettle(null);
      }}
    >
      {options ? (
        <DialogContent className="sm:max-w-md">
          <form noValidate onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{options.title}</DialogTitle>
              {options.description ? (
                <DialogDescription>{options.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <Label htmlFor={inputId}>{options.label}</Label>
              <Input
                id={inputId}
                // biome-ignore lint/a11y/noAutofocus: the dialog exists to collect this one value; focusing it is the expected first step.
                autoFocus
                value={value}
                placeholder={options.placeholder}
                inputMode={options.inputMode}
                autoComplete={options.autoComplete ?? "off"}
                maxLength={options.maxLength}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (error) setError(null);
                }}
              />
              <p
                id={errorId}
                role={error ? "alert" : undefined}
                className={cn("min-h-5 text-sm text-destructive-strong", !error && "sr-only")}
              >
                {error ?? ""}
              </p>
            </div>
            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onSettle(null)}>
                {options.cancelLabel ?? "Cancel"}
              </Button>
              <Button type="submit">{options.confirmLabel ?? "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
