"use client";

import { Cross as X } from "@nebutra/icons";
import { useState } from "react";

interface WelcomeOverlayProps {
  memberNumber: number;
  onClose?: () => void;
}

export function WelcomeOverlay({ memberNumber, onClose }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    onClose?.();
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    url.searchParams.delete("member");
    window.history.replaceState({}, "", url.toString());
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-8 text-center shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close welcome"
          className="absolute right-4 top-4 rounded-md p-1 text-[var(--neutral-11)] hover:bg-[var(--neutral-3)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 text-4xl">🎉</div>

        <h2 className="mb-2 text-2xl font-bold text-[var(--neutral-12)]">Welcome to Sleptons!</h2>

        <p className="mb-1 text-[var(--neutral-11)]">You are</p>
        <p
          className="mb-6 text-3xl font-bold"
          style={{
            background: "var(--brand-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Sleptons Member #{memberNumber}
        </p>

        <p className="mb-6 text-sm text-[var(--neutral-11)]">
          Your profile is now live. AI-native founders around the world can discover you.
        </p>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Explore the community"
          className="rounded-lg px-6 py-3 font-semibold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          Explore the Community →
        </button>
      </div>
    </div>
  );
}
