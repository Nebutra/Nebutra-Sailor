import type { AuthProvider, Session } from "@nebutra/auth";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { Hono } from "hono";

type AuthFactory = () => Promise<AuthProvider>;

export interface AuthRoutesOptions {
  authFactory?: AuthFactory;
}

function createDefaultAuthFactory(): AuthFactory {
  return () => createAuth({ provider: getConfiguredAuthProvider() });
}

async function resolveSessionPayload(auth: AuthProvider, request: Request) {
  const session = await auth.getSession(request);
  if (!session?.userId) return null;

  const [user, organization] = await Promise.all([
    auth.getUser(session.userId).catch(() => null),
    session.organizationId
      ? auth.getOrganization(session.organizationId, request).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    user: {
      id: session.userId,
      ...((user?.email ?? session.email) ? { email: user?.email ?? session.email } : {}),
      ...(user?.name ? { name: user.name } : {}),
      ...(user?.imageUrl ? { imageUrl: user.imageUrl } : {}),
    },
    session: {
      userId: session.userId,
      ...(session.organizationId ? { organizationId: session.organizationId } : {}),
      ...(session.role ? { role: session.role } : {}),
    } satisfies Partial<Session>,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        }
      : null,
    membership: session.role ? { role: session.role } : null,
  };
}

export function createAuthRoutes(options: AuthRoutesOptions = {}) {
  const app = new Hono();
  const authFactory = options.authFactory ?? createDefaultAuthFactory();

  app.get("/auth/session", async (c) => {
    try {
      const auth = await authFactory();
      const payload = await resolveSessionPayload(auth, c.req.raw);
      return c.json(payload, 200);
    } catch (error) {
      logger.warn("Gateway auth session probe failed", { error });
      return c.json(null, 200);
    }
  });

  app.post("/auth/sign-out", async (c) => {
    const auth = await authFactory();
    await auth.signOut(c.req.raw);
    return c.body(null, 204);
  });

  app.post("/organizations/active", async (c) => {
    const auth = await authFactory();
    const body = (await c.req.json().catch(() => null)) as { organizationId?: unknown } | null;
    const organizationId =
      typeof body?.organizationId === "string" ? body.organizationId.trim() : "";

    if (!organizationId) {
      return c.json({ error: "organizationId is required" }, 400);
    }

    if (!auth.capabilities.organizations || !auth.organizations) {
      return c.json({ error: "Active organization switching is not supported" }, 501);
    }

    const result = await auth.organizations.setActive(c.req.raw, organizationId);
    result.headers.forEach((value, key) => {
      c.header(key, value);
    });
    return c.json({ ok: true }, 200);
  });

  app.all("/auth/*", async (c) => {
    try {
      const auth = await authFactory();
      const response = await auth.middleware()(c.req.raw);
      return response ?? c.json({ error: "Auth route not found" }, 404);
    } catch (error) {
      logger.error("Gateway auth handler failed", { error });
      return c.json({ error: "Auth provider unavailable" }, 503);
    }
  });

  return app;
}

export const authRoutes = createAuthRoutes();
