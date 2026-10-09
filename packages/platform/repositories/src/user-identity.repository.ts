import { getSystemDb, type PrismaClient } from "@nebutra/db";

/**
 * Who a signed-in identity is, as far as the platform's own tables are
 * concerned.
 *
 * The auth center (Better Auth) mints one id per person (`auth_users.id`, the
 * "subject"). Everything else — `users`, tenants, platform staff, wallets — is
 * keyed by `users.id`. For anyone who first signed up through the auth center
 * the two are the same string, so no link is stored and the subject IS the
 * canonical id. For a person who predates it (a Clerk-era `users` row) they
 * differ, and `user_identity_links` says which `users` row the subject stands
 * for. This repository is the only place that answers the question; every
 * session-to-app-table join goes through `canonicalUserId`.
 *
 * Links are made from a verified email on a legacy row, at sign-in
 * (`linkLegacyByVerifiedEmail`) or by the explicit backfill, and never inferred
 * at read time. An unverified email links nothing.
 */

export const AUTH_CENTER_PROVIDER = "better-auth";

export type LinkSource = "sign-in" | "backfill" | "manual";

export interface LinkOutcome {
  /** The canonical `users.id` for the subject after the call. */
  userId: string;
  /** What happened: a link already existed, was just made, or no link applies. */
  result: "existing" | "linked" | "none";
}

export class UserIdentityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** The canonical `users.id` for an auth-center subject. Pure read. */
  async canonicalUserId(subject: string, provider = AUTH_CENTER_PROVIDER): Promise<string> {
    const link = await this.prisma.userIdentityLink.findUnique({
      where: { provider_subject: { provider, subject } },
      select: { userId: true },
    });
    return link?.userId ?? subject;
  }

  /** The auth-center subject behind a canonical id: the inverse of `canonicalUserId`. */
  async authSubject(userId: string, provider = AUTH_CENTER_PROVIDER): Promise<string> {
    const link = await this.prisma.userIdentityLink.findFirst({
      where: { provider, userId },
      orderBy: { createdAt: "asc" },
      select: { subject: true },
    });
    return link?.subject ?? userId;
  }

  /**
   * Link `subject` to a Clerk-era `users` row that owns the same VERIFIED email.
   *
   * Refuses (result "none") unless every condition holds:
   *   - the email is verified by the auth center (never a bare claim);
   *   - the subject has no `users` row of its own — a row that already exists
   *     may hold data, and silently redirecting away from it is a merge, which
   *     is the backfill's explicit job, not a sign-in side effect;
   *   - exactly one legacy row (`clerk_id` set, different id) owns that email;
   *   - that row is not already linked to another subject of this provider.
   */
  async linkLegacyByVerifiedEmail(input: {
    subject: string;
    email: string | null | undefined;
    emailVerified: boolean;
    provider?: string;
    source?: LinkSource;
  }): Promise<LinkOutcome> {
    const provider = input.provider ?? AUTH_CENTER_PROVIDER;
    const subject = input.subject;
    const existing = await this.prisma.userIdentityLink.findUnique({
      where: { provider_subject: { provider, subject } },
      select: { userId: true },
    });
    if (existing) return { userId: existing.userId, result: "existing" };

    const email = input.email?.trim();
    if (!input.emailVerified || !email) return { userId: subject, result: "none" };

    const own = await this.prisma.user.findUnique({ where: { id: subject }, select: { id: true } });
    if (own) return { userId: subject, result: "none" };

    const legacy = await this.prisma.user.findMany({
      where: { email: { equals: email, mode: "insensitive" }, clerkId: { not: null } },
      select: { id: true, identityLinks: { where: { provider }, select: { subject: true } } },
      take: 2,
    });
    const target = legacy.length === 1 ? legacy[0] : undefined;
    if (!target || target.id === subject || target.identityLinks.length > 0) {
      return { userId: subject, result: "none" };
    }
    return this.createLink({
      provider,
      subject,
      userId: target.id,
      source: input.source ?? "sign-in",
    });
  }

  /** Make (or read back) one link. Idempotent; a subject is never re-pointed. */
  async createLink(input: {
    subject: string;
    userId: string;
    source: LinkSource;
    provider?: string;
  }): Promise<LinkOutcome> {
    const provider = input.provider ?? AUTH_CENTER_PROVIDER;
    try {
      await this.prisma.userIdentityLink.create({
        data: { provider, subject: input.subject, userId: input.userId, source: input.source },
      });
      return { userId: input.userId, result: "linked" };
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "P2002") throw error;
      // Raced with another sign-in: the winner's link stands.
      const winner = await this.canonicalUserId(input.subject, provider);
      return { userId: winner, result: "existing" };
    }
  }
}

/**
 * Factory for server callers. Uses `getSystemDb()`: identity links are
 * platform-scope (`@rls deny`), so there is no tenant to scope them to.
 */
export function getUserIdentityRepository(): UserIdentityRepository {
  return new UserIdentityRepository(getSystemDb());
}
