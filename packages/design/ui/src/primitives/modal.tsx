"use client";

import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useMemo,
} from "react";
import { cn } from "../utils/cn";
import { Button, type ButtonProps } from "./button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

/* -------------------------------------------------------------------------- *\
 *  Modal — Geist-flat API on top of Dialog (Base UI).
 *
 *  Use cases (per Geist guidance):
 *    Use a Modal when a decision must block the rest of the page. For
 *    persistent associated context where the underlying page stays readable,
 *    use Sheet on desktop or Drawer on mobile. Skip Modal for routine create
 *    flows that have a dedicated page; route to the page instead.
 *
 *  Compound surface:
 *    <Modal.Modal>          — root (controlled via `active`/`onClickOutside`)
 *      <Modal.Body>         — scrollable body
 *        <Modal.Header>     — header block
 *          <Modal.Title>    — Title Case statement, never a question
 *          <Modal.Subtitle> — sentence case, 1–3 sentences
 *        </Modal.Header>
 *        <Modal.Inset>      — bg-muted recessed panel
 *      </Modal.Body>
 *      <Modal.Actions>      — footer action row
 *        <Modal.Action>     — Button wrapper (type=primary|secondary)
 *      </Modal.Actions>
 *    </Modal.Modal>
 *
 *  Accessibility — encoded once, not at every call site:
 *    - `aria-labelledby` is auto-wired to <Modal.Title> via context so screen
 *      readers announce the title on open. No manual wiring required.
 *    - Focus trap, Escape-to-close, return-focus-to-trigger are inherited
 *      from Base UI's Dialog.
 *
 *  Destructive flows (caller responsibility):
 *    Default focus to Cancel on destructive modals. The pattern doesn't
 *    enforce this — pass `initialFocusRef` to the Cancel action. For
 *    high-stakes destructive (delete prod, rotate signing key, downgrade
 *    plan), gate the primary on a typed-match input — see DestructiveActionModal.
 *
 *  Sticky mode:
 *    When `sticky={true}`, the body region scrolls within a max-height while
 *    the actions row stays pinned at the bottom — useful for long forms or
 *    legal copy. The default lets the popup size to its content.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Context — share titleId so Modal.Title auto-links via aria-labelledby
// ---------------------------------------------------------------------------

type ModalContextValue = {
  titleId: string;
  sticky: boolean;
};

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("Modal.* must be used inside <Modal.Modal>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Modal.Modal (root)
// ---------------------------------------------------------------------------

export interface ModalRootProps {
  /** Open state — controlled. */
  active: boolean;
  /** Called when the user clicks the backdrop (or presses Escape). */
  onClickOutside?: () => void;
  /**
   * Sticky mode: body scrolls within a max-height; actions stay pinned at
   * the bottom. @default false
   */
  sticky?: boolean;
  /**
   * Focus this element after the modal opens. Default focus is the first
   * focusable element. For destructive modals, point this at Cancel.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}

function ModalRoot({
  active,
  onClickOutside,
  sticky = false,
  initialFocusRef,
  children,
  className,
}: ModalRootProps) {
  const titleId = useId();
  const value = useMemo<ModalContextValue>(() => ({ titleId, sticky }), [titleId, sticky]);

  // Drive initialFocusRef once the modal opens. Base UI's Dialog has its own
  // focus-trap; we override the landing target after a tick so the trap finds
  // a target that's actually mounted.
  useEffect(() => {
    if (!active) return;
    const el = initialFocusRef?.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [active, initialFocusRef]);

  return (
    <ModalContext.Provider value={value}>
      <Dialog
        open={active}
        onOpenChange={(open) => {
          if (!open) onClickOutside?.();
        }}
      >
        <DialogContent
          aria-labelledby={titleId}
          className={cn(
            "max-w-md gap-0 p-0",
            sticky && "max-h-[85vh] grid grid-rows-[1fr_auto]",
            className,
          )}
        >
          {children}
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Modal.Body
// ---------------------------------------------------------------------------

export type ModalBodyProps = HTMLAttributes<HTMLDivElement>;

const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(function ModalBody(
  { className, ...rest },
  ref,
) {
  const { sticky } = useModalContext();
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-4 px-6 pt-6 pb-4",
        sticky && "min-h-0 overflow-y-auto",
        className,
      )}
      {...rest}
    />
  );
});

// ---------------------------------------------------------------------------
// Modal.Header / Modal.Title / Modal.Subtitle
// ---------------------------------------------------------------------------

export type ModalHeaderProps = HTMLAttributes<HTMLDivElement>;

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(function ModalHeader(
  { className, children, ...rest },
  ref,
) {
  return (
    <DialogHeader ref={ref} className={cn("space-y-2 text-left", className)} {...rest}>
      {children}
    </DialogHeader>
  );
});

export type ModalTitleProps = HTMLAttributes<HTMLHeadingElement>;

const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(function ModalTitle(
  { className, ...rest },
  ref,
) {
  const { titleId } = useModalContext();
  // DialogTitle (Base UI) already renders <h2> with the right sizing. The
  // context-provided id wires aria-labelledby on the popup automatically.
  return (
    <DialogTitle
      ref={ref}
      id={titleId}
      className={cn("font-semibold text-foreground text-lg leading-tight", className)}
      {...rest}
    />
  );
});

export type ModalSubtitleProps = HTMLAttributes<HTMLParagraphElement>;

const ModalSubtitle = forwardRef<HTMLParagraphElement, ModalSubtitleProps>(function ModalSubtitle(
  { className, ...rest },
  ref,
) {
  return (
    <p
      ref={ref}
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...rest}
    />
  );
});

// ---------------------------------------------------------------------------
// Modal.Inset
// ---------------------------------------------------------------------------

export type ModalInsetProps = HTMLAttributes<HTMLDivElement>;

const ModalInset = forwardRef<HTMLDivElement, ModalInsetProps>(function ModalInset(
  { className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("-mx-6 my-2 border-border border-y bg-muted/40 px-6 py-4", className)}
      {...rest}
    />
  );
});

// ---------------------------------------------------------------------------
// Modal.Actions / Modal.Action
// ---------------------------------------------------------------------------

export type ModalActionsProps = HTMLAttributes<HTMLDivElement>;

const ModalActions = forwardRef<HTMLDivElement, ModalActionsProps>(function ModalActions(
  { className, children, ...rest },
  ref,
) {
  const { sticky } = useModalContext();
  return (
    <DialogFooter
      ref={ref}
      className={cn(
        "flex-row items-center justify-end gap-2 border-border border-t px-6 py-4",
        sticky && "bg-background/95 backdrop-blur-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </DialogFooter>
  );
});

export interface ModalActionProps extends Omit<ButtonProps, "variant" | "size" | "type"> {
  /** Geist Modal.Action "type" — primary or secondary. @default "primary" */
  type?: "primary" | "secondary";
  /** Stretch to fill the actions row (used in single-button modals). */
  fullWidth?: boolean;
  /** Optional leading glyph. */
  prefix?: ReactNode;
  /** HTML button type override (for forms). */
  buttonType?: "button" | "submit" | "reset";
  ref?: Ref<HTMLButtonElement>;
}

const ModalAction = forwardRef<HTMLButtonElement, ModalActionProps>(function ModalAction(
  { type = "primary", fullWidth, prefix, buttonType = "button", className, children, ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      type={buttonType}
      variant={type === "secondary" ? "secondary" : "default"}
      size="default"
      className={cn(fullWidth && "w-full", className)}
      {...rest}
    >
      {prefix && (
        <span aria-hidden="true" className="inline-flex shrink-0 [&_svg]:size-4">
          {prefix}
        </span>
      )}
      {children}
    </Button>
  );
});

// ---------------------------------------------------------------------------
// Compound export — Modal.Modal / Modal.Body / Modal.Header / Modal.Title /
// Modal.Subtitle / Modal.Inset / Modal.Actions / Modal.Action
// ---------------------------------------------------------------------------

/**
 * @example Basic create-resource modal
 * ```tsx
 * <Modal.Modal active={open} onClickOutside={() => setOpen(false)}>
 *   <Modal.Body>
 *     <Modal.Header>
 *       <Modal.Title>Create Token</Modal.Title>
 *       <Modal.Subtitle>Enter a unique name for your token.</Modal.Subtitle>
 *     </Modal.Header>
 *   </Modal.Body>
 *   <Modal.Actions>
 *     <Modal.Action type="secondary" onClick={() => setOpen(false)}>Cancel</Modal.Action>
 *     <Modal.Action onClick={() => handleCreate()}>Create Token</Modal.Action>
 *   </Modal.Actions>
 * </Modal.Modal>
 * ```
 *
 * @example Destructive modal — default focus on Cancel
 * ```tsx
 * const cancelRef = useRef<HTMLButtonElement>(null);
 * <Modal.Modal active={open} onClickOutside={() => setOpen(false)} initialFocusRef={cancelRef}>
 *   <Modal.Body>
 *     <Modal.Header>
 *       <Modal.Title>Delete Project</Modal.Title>
 *       <Modal.Subtitle>This cannot be undone.</Modal.Subtitle>
 *     </Modal.Header>
 *   </Modal.Body>
 *   <Modal.Actions>
 *     <Modal.Action ref={cancelRef} type="secondary" onClick={() => setOpen(false)}>Cancel</Modal.Action>
 *     <Modal.Action onClick={() => handleDelete()}>Delete Project</Modal.Action>
 *   </Modal.Actions>
 * </Modal.Modal>
 * ```
 */
export const Modal = {
  Modal: ModalRoot,
  Body: ModalBody,
  Header: ModalHeader,
  Title: ModalTitle,
  Subtitle: ModalSubtitle,
  Inset: ModalInset,
  Actions: ModalActions,
  Action: ModalAction,
} as const;
