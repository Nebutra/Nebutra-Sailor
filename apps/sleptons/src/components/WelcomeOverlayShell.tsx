"use client";

import { useEffect, useState } from "react";
import { WelcomeOverlay } from "./WelcomeOverlay";

export function WelcomeOverlayShell() {
  const [memberNumber, setMemberNumber] = useState<number | null>(null);

  useEffect(() => {
    // Read ?member=<number> from the URL — works cross-origin unlike localStorage.
    // localStorage fallback is kept for backward compatibility with any existing sessions.
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("member");
    if (fromUrl) {
      setMemberNumber(Number(fromUrl));
      return;
    }
    const fromStorage = localStorage.getItem("sleptons_member_number");
    if (fromStorage) setMemberNumber(Number(fromStorage));
  }, []);

  if (!memberNumber) return null;
  return (
    <WelcomeOverlay
      memberNumber={memberNumber}
      onClose={() => {
        localStorage.removeItem("sleptons_member_number");
        // ?member and ?welcome are cleaned up by WelcomeOverlay.handleClose via history.replaceState
      }}
    />
  );
}
