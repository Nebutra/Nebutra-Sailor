"use client";

import { Logo } from "@nebutra/brand";
import { useTheme } from "next-themes";
import { useMount } from "@/hooks/useMount";

export function LegalLogo() {
  const { resolvedTheme } = useTheme();
  const isMounted = useMount();
  const isDark = !isMounted || resolvedTheme !== "light";

  return <Logo variant="en" size={100} inverted={isDark} />;
}
