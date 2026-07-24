import type { Session } from "@nebutra/auth";

/** Tenant id for wallet / metering (pure). */
export function resolveTenantId(opts: {
  explicit?: string | null;
  session?: Session | null;
}): string {
  if (opts.explicit?.trim()) return opts.explicit.trim();
  if (opts.session?.organizationId) return opts.session.organizationId;
  if (opts.session?.userId) return `user:${opts.session.userId}`;
  return "anonymous";
}
