/**
 * Keep `public.users` in step with Better Auth's `auth_users`.
 *
 * Better Auth owns sign-up and writes its own tables; the rest of the platform
 * — tenants, consents, skills, thirteen foreign keys in all — references
 * `public.users`, which only the Clerk webhook ever wrote. This is the bridge
 * between the two, in both directions of time:
 *
 *   - `buildIdentityMirrorDatabaseHooks` mirrors each *new* sign-up as it
 *     happens, from the `user.create.after` hook.
 *   - `ensureUserRecordForSession` is the lazy path for anyone who signed up
 *     before the hook existed: call it before writing a row that references
 *     `users`, and the row is there.
 *
 * Both go through `UserRepository.ensureFromIdentity` — `users` is a core
 * domain and the repository is its seam — so the mapping from an auth identity
 * to a `users` row is written exactly once.
 */
import type { PrismaClient } from "@nebutra/db";
import { UserIdentityRepository, UserRepository } from "@nebutra/repositories";
import type { Session } from "./types";

type HookUser = {
  id?: unknown;
  email?: unknown;
  emailVerified?: unknown;
  name?: unknown;
  image?: unknown;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

export function buildIdentityMirrorDatabaseHooks(
  prisma: PrismaClient,
  options: { onError?: (error: unknown, userId: string) => void } = {},
): unknown {
  const users = new UserRepository(prisma);
  const identities = new UserIdentityRepository(prisma);
  return {
    user: {
      create: {
        // A failed mirror must not fail the sign-up: the person can still sign
        // in, and the lazy path repairs the row the first time it is needed.
        after: async (user: HookUser) => {
          const id = str(user.id);
          if (!id) return;
          try {
            // A person who already has a Clerk-era row and proves the same
            // email is that person: link, do not mint a second, empty row.
            const linked = await identities.linkLegacyByVerifiedEmail({
              subject: id,
              email: str(user.email),
              emailVerified: user.emailVerified === true,
            });
            if (linked.result !== "none") return;
            await users.ensureFromIdentity({
              id,
              email: str(user.email),
              name: str(user.name),
              avatarUrl: str(user.image),
            });
          } catch (error) {
            options.onError?.(error, id);
          }
        },
      },
    },
    session: {
      create: {
        // Verification often comes after sign-up (email link, then sign-in), so
        // the link is also attempted at sign-in. Cheap and idempotent: it
        // returns at once for anyone who is linked or already has their own row.
        after: async (session: { userId?: unknown }) => {
          const id = str(session.userId);
          if (!id) return;
          try {
            const authUser = await prisma.authUser.findUnique({
              where: { id },
              select: { email: true, emailVerified: true },
            });
            if (!authUser) return;
            await identities.linkLegacyByVerifiedEmail({
              subject: id,
              email: authUser.email,
              emailVerified: authUser.emailVerified === true,
            });
          } catch (error) {
            options.onError?.(error, id);
          }
        },
      },
    },
  };
}

/**
 * The lazy half of the mirror. Idempotent; one upsert. Call it from any code
 * path about to reference `users` for the signed-in person.
 */
export async function ensureUserRecordForSession(
  prisma: PrismaClient,
  session: Pick<Session, "userId" | "email">,
): Promise<void> {
  // `session.userId` is already canonical (see canonical-user.ts): for a linked
  // person it is their existing `users` row, which this upserts in place.
  await new UserRepository(prisma).ensureFromIdentity({
    id: session.userId,
    email: str(session.email),
  });
}
