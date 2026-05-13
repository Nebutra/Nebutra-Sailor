"use client";

import type { ReactNode } from "react";
import { FeedbackDialog } from "./feedback-dialog";
import { FeedbackDialogProvider } from "./feedback-dialog-provider";

/**
 * Single mount-point that wires the global feedback dialog into the app.
 *
 * Mount this ABOVE the command-palette so its commands can call
 * `useFeedbackDialog().openDialog()` via the shared context.
 */
export function FeedbackMount({ children }: { children: ReactNode }) {
  return (
    <FeedbackDialogProvider>
      {children}
      <FeedbackDialog />
    </FeedbackDialogProvider>
  );
}
