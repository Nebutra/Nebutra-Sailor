"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface FeedbackDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Idempotent — calling open() while already open is a no-op. */
  openDialog: () => void;
  closeDialog: () => void;
}

const FeedbackDialogContext = createContext<FeedbackDialogContextValue | null>(null);

export function FeedbackDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
  }, []);

  const openDialog = useCallback(() => {
    setOpenState(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpenState(false);
  }, []);

  const value = useMemo<FeedbackDialogContextValue>(
    () => ({ open, setOpen, openDialog, closeDialog }),
    [open, setOpen, openDialog, closeDialog],
  );

  return <FeedbackDialogContext.Provider value={value}>{children}</FeedbackDialogContext.Provider>;
}

export function useFeedbackDialog(): FeedbackDialogContextValue {
  const ctx = useContext(FeedbackDialogContext);
  if (!ctx) {
    throw new Error("useFeedbackDialog must be used within a FeedbackDialogProvider");
  }
  return ctx;
}
