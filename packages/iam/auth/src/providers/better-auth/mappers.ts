import type { Organization, Session, User } from "../../types";

// ─── Helpers ───

/** Map a Better Auth session+user response to our canonical Session type. */
export function mapSession(
  raw: { session: Record<string, unknown>; user: Record<string, unknown> } | null,
): Session | null {
  if (!raw) return null;
  const { session, user } = raw;
  return {
    userId: String(session.userId ?? user.id ?? ""),
    email: (user.email as string) ?? undefined,
    expiresAt: session.expiresAt
      ? new Date(session.expiresAt as string | number)
      : new Date(Date.now() + 3_600_000),
  };
}

/** Map a Better Auth user record to our canonical User type. */
export function mapUser(raw: Record<string, unknown> | null): User | null {
  if (!raw) return null;
  return {
    id: String(raw.id),
    email: (raw.email as string) ?? undefined,
    phone: (raw.phone as string) ?? undefined,
    name: (raw.name as string) ?? undefined,
    imageUrl: (raw.image as string) ?? undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt as string | number) : new Date(),
  };
}

/**
 * Normalize a Better Auth organization record to our canonical Organization.
 *
 * Better Auth's org plugin returns records with optional `metadata` blobs
 * that some installs use to carry plan info. We treat that as a string when
 * present, falling back to "FREE".
 */
export function normalizeOrganization(raw: Record<string, unknown>): Organization {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    plan:
      typeof raw.metadata === "string"
        ? raw.metadata
        : typeof raw.plan === "string"
          ? raw.plan
          : "FREE",
    createdAt: raw.createdAt ? new Date(raw.createdAt as string | number) : new Date(),
  };
}
