import { describe, expect, it, vi } from "vitest";

/**
 * Guards the two wiring mistakes that a passing typecheck does NOT catch, both
 * of which were live in the first cut of this app.
 *
 * 1. `database` is optional in better-auth's types. Omit it and 1.6 imports
 *    @better-auth/memory-adapter instead of failing (dist/db/adapter-base.mjs).
 *    The control plane then boots, completes the SSO round-trip, and mints a
 *    session keyed to an id that exists only in that process's heap — so no
 *    PlatformStaff row can ever match, and a PM2 restart drops every session.
 *    It looks like it works right up until it denies you.
 *
 * 2. Without the modelName mapping the adapter queries Better Auth's default
 *    `user` model. That is a REAL model in this schema — the platform user table
 *    — with a different id space and different columns. Nothing errors; the
 *    wrong table is simply used.
 *
 * These are asserted against the constructed options rather than by reaching
 * for the database, so the test needs no connection.
 */

// The module builds a Prisma client at import time. The identity of the client
// is irrelevant here — only whether it was handed to the adapter at all.
vi.mock("@nebutra/db", () => ({ getSystemDb: () => ({ $connect: () => {} }) }));

describe("admin auth wiring", () => {
  it("configures a real database adapter rather than falling back to memory", async () => {
    const { auth } = await import("../auth");
    expect(auth.options.database).toBeDefined();
  });

  it("maps every Better Auth model onto the Auth* models, not the platform ones", async () => {
    const { auth } = await import("../auth");
    // `user` is the trap: unmapped, the adapter would read the platform user
    // table, which exists and would not error.
    expect(auth.options.user?.modelName).toBe("AuthUser");
    expect(auth.options.session?.modelName).toBe("AuthSession");
    expect(auth.options.account?.modelName).toBe("AuthAccount");
    expect(auth.options.verification?.modelName).toBe("AuthVerification");
  });

  it("keeps the session cookie host-only so tenant subdomains cannot carry one in", async () => {
    const { auth } = await import("../auth");
    // Production sets AUTH_COOKIE_DOMAIN=.nebutra.com for the tenant apps. A
    // cookie scoped there is sent to this host too; if the control plane ever
    // opted into cross-subdomain cookies it would start trusting it.
    //
    // Read through a Record view on purpose: the key is absent from the inferred
    // type today, so a direct property access does not compile — which would
    // make this assertion vanish the moment someone adds the key and gives the
    // literal a wider type. Going through the index signature keeps the check
    // alive across that change, which is the only version of it worth having.
    const advanced = auth.options.advanced as Record<string, unknown> | undefined;
    expect(advanced?.crossSubDomainCookies).toBeUndefined();
    expect(advanced?.cookiePrefix).toBe("nebutra-admin");
  });

  it("offers no password path — SSO is the only way in", async () => {
    const { auth } = await import("../auth");
    expect(auth.options.emailAndPassword?.enabled).toBe(false);
  });
});
