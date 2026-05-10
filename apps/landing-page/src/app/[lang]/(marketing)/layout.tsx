"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Marketing route group provides a single LazyMotion provider for the entire
 * subtree. Children remain RSC — Next.js renders them server-side and threads
 * them through this client wrapper. AnimateIn uses bare `<m.div>` and relies
 * on this provider for feature registration, so framer's `domAnimation`
 * features module is loaded exactly once per session.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
