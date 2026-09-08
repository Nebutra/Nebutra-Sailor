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
import { UserRepository } from "@nebutra/repositories";
import type { Session } from "./types";

type HookUser = { id?: unknown; email?: unknown; name?: unknown; image?: unknown };

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

export function buildIdentityMirrorDatabaseHooks(
  prisma: PrismaClient,
  options: { onError?: (error: unknown, userId: string) => void } = {},
): unknown {
  const users = new UserRepository(prisma);
  return {
    user: {
      create: {
        // A failed mirror must not fail the sign-up: the person can still sign
        // in, and the lazy path repairs the row the first time it is needed.
        after: async (user: HookUser) => {
          const id = str(user.id);
          if (!id) return;
          try {
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
  await new UserRepository(prisma).ensureFromIdentity({
    id: session.userId,
    email: str(session.email),
  });
}
