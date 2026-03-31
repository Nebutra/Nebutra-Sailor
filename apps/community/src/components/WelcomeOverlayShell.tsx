"use client";

import { useEffect, useState } from "react";
import { WelcomeOverlay } from "./WelcomeOverlay";

export function WelcomeOverlayShell() {
  const [memberNumber, setMemberNumber] = useState<number | null>(null);

  useEffect(() => {
    const num = localStorage.getItem("sleptons_member_number");
    if (num) setMemberNumber(Number(num));
  }, []);

  if (!memberNumber) return null;
  return (
    <WelcomeOverlay
      memberNumber={memberNumber}
      onClose={() => localStorage.removeItem("sleptons_member_number")}
    />
  );
}
