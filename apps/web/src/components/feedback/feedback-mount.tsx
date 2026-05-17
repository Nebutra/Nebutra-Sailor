"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { FeedbackDialogProvider, useFeedbackDialog } from "./feedback-dialog-provider";

const FeedbackDialog = dynamic(
  () => import("./feedback-dialog").then((module) => module.FeedbackDialog),
  {
    loading: () => null,
    ssr: false,
  },
);

function FeedbackDialogSlot() {
  const { open } = useFeedbackDialog();
  return open ? <FeedbackDialog /> : null;
}

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
      <FeedbackDialogSlot />
    </FeedbackDialogProvider>
  );
}
