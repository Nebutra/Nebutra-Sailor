/**
 * OpenNext / Cloudflare Worker stub for `streamdown`.
 *
 * `@nebutra/ui/primitives` statically imports streamdown (MessageContent), which
 * pulls the full Shiki language pack (~8 MiB) into handler.mjs. Sailor Docs
 * never renders chat message streaming on the MDX surface, so we replace the
 * package with a no-op client component during OPEN_NEXT_BUILD.
 */
"use client";

import type { ReactNode } from "react";

export function Streamdown({ children }: { children?: ReactNode }) {
  return children ?? null;
}

export default Streamdown;
