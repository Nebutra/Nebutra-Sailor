import type { AuthConfig } from "../../types";

// ─── Prisma Client Resolution ───

/**
 * Resolve a PrismaClient instance for the Better Auth adapter.
 *
 * Priority:
 * 1. `config.options.prisma` — explicitly passed PrismaClient
 * 2. Dynamic import from `@nebutra/db` — monorepo default
 */
export async function resolveBetterAuthPrismaClient(config: AuthConfig): Promise<unknown> {
  const options = config.options as Record<string, unknown> | undefined;
  if (options?.prisma) {
    return options.prisma;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dbModule = (await import("@nebutra/db")) as Record<string, unknown>;
    const getSystemDb = dbModule.getSystemDb;
    if (typeof getSystemDb === "function") {
      return getSystemDb();
    }

    const prismaClient = dbModule.prisma ?? dbModule.default;
    if (prismaClient) {
      return prismaClient;
    }
  } catch {
    throw new Error(
      "Better Auth requires a PrismaClient instance. " +
        "Either pass it via config.options.prisma or ensure @nebutra/db is available.",
    );
  }

  throw new Error(
    "Better Auth requires a PrismaClient instance. " +
      "Either pass it via config.options.prisma or ensure @nebutra/db exports getSystemDb().",
  );
}
