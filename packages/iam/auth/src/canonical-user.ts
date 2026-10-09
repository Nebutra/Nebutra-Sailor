/**
 * One canonical user identity, resolved server-side.
 *
 * The auth center mints a subject id per person (`auth_users.id`); the
 * platform's own tables are keyed by `users.id`. They are the same string for
 * everyone who first signed up through the auth center and differ for people
 * who predate it, so a session's raw id must never be joined to an app table
 * directly: it silently misses (a staff grant, a tenant, a wallet) for exactly
 * the oldest accounts. `Session.userId` is therefore the CANONICAL id, produced
 * here from the `user_identity_links` table (see UserIdentityRepository);
 * `Session.authUserId` stays the raw subject for the few readers of the auth
 * center's own tables (`auth_sessions`, `auth_accounts`, Better Auth members).
 *
 * A failed lookup is an error, never "use the raw id": falling back would put
 * a linked person into a second, empty identity (a stray personal tenant, a
 * billed wallet). Callers treat the error as "no session".
 */
import { logger } from "@nebutra/logger";

export interface CanonicalUserResolver {
  /** auth-center subject -> canonical `users.id` */
  canonical(subject: string): Promise<string>;
  /** canonical `users.id` -> auth-center subject (for reads of Better Auth's own tables) */
  subject(userId: string): Promise<string>;
}

interface LinkLookup {
  canonicalUserId(subject: string): Promise<string>;
  authSubject(userId: string): Promise<string>;
}

const TTL_MS = 30_000;
const MAX_ENTRIES = 5_000;

class TtlCache {
  private readonly map = new Map<string, { value: string; at: number }>();
  constructor(private readonly now: () => number) {}
  get(key: string): string | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (this.now() - hit.at > TTL_MS) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: string): void {
    if (this.map.size >= MAX_ENTRIES) this.map.clear();
    this.map.set(key, { value, at: this.now() });
  }
}

export function createCanonicalUserResolver(
  options: { lookup?: () => Promise<LinkLookup>; now?: () => number } = {},
): CanonicalUserResolver {
  const now = options.now ?? Date.now;
  const forward = new TtlCache(now);
  const backward = new TtlCache(now);

  const lookup = async (): Promise<LinkLookup | null> => {
    if (options.lookup) return options.lookup();
    // A deployment with no database has no `users` table to disagree with.
    if (!process.env.DATABASE_URL?.trim()) return null;
    const { getUserIdentityRepository } = await import("@nebutra/repositories");
    return getUserIdentityRepository();
  };

  return {
    async canonical(subject) {
      const cached = forward.get(subject);
      if (cached !== undefined) return cached;
      const repo = await lookup();
      const id = repo ? await repo.canonicalUserId(subject) : subject;
      forward.set(subject, id);
      return id;
    },
    async subject(userId) {
      const cached = backward.get(userId);
      if (cached !== undefined) return cached;
      const repo = await lookup();
      const subject = repo ? await repo.authSubject(userId) : userId;
      backward.set(userId, subject);
      return subject;
    },
  };
}

let shared: CanonicalUserResolver | undefined;

/** The process-wide resolver (shared cache). */
export function getCanonicalUserResolver(): CanonicalUserResolver {
  shared ??= createCanonicalUserResolver();
  return shared;
}

/** Canonical `users.id` for a raw auth-center subject. Throws if the link store is unreachable. */
export function canonicalUserId(subject: string): Promise<string> {
  return getCanonicalUserResolver().canonical(subject);
}

/** Like `canonicalUserId` but null on failure, for request paths that treat failure as "no session". */
export async function canonicalUserIdOrNull(subject: string): Promise<string | null> {
  try {
    return await canonicalUserId(subject);
  } catch (error) {
    logger.error("canonical user lookup failed", { error: String(error) });
    return null;
  }
}
