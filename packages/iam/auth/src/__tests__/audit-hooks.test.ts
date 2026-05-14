import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock @nebutra/audit so we can capture provider.log() calls ───
const logMock = vi.fn();
const getAuditProviderMock = vi.fn(async () => ({ log: logMock }));

vi.mock("@nebutra/audit", () => {
  // Re-implement the bits the audit-events module uses. The schema parser
  // simply returns its input — schema fidelity is exercised by @nebutra/audit's
  // own tests, here we only care that the right shape is forwarded.
  return {
    getAuditProvider: getAuditProviderMock,
    AuditEventInputSchema: {
      parse: (input: unknown) => input,
    },
  };
});

vi.mock("@nebutra/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

interface FakeCtx {
  path?: string;
  headers?: Headers;
  context?: {
    session?: {
      session?: Record<string, unknown>;
      user?: Record<string, unknown>;
    } | null;
    adapter?: {
      findOne?: (args: unknown) => Promise<Record<string, unknown> | null>;
    };
  };
}

function buildHeaders(): Headers {
  return new Headers({
    "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    "user-agent": "vitest-agent",
    "x-request-id": "req_abc",
  });
}

function buildSessionCtx(opts?: {
  activeOrganizationId?: string;
  sessionId?: string;
  email?: string;
}): FakeCtx {
  return {
    headers: buildHeaders(),
    context: {
      session: {
        session: {
          id: opts?.sessionId ?? "sess_123",
          ...(opts?.activeOrganizationId
            ? { activeOrganizationId: opts.activeOrganizationId }
            : {}),
        },
        user: {
          id: "user_1",
          email: opts?.email ?? "alice@example.com",
          name: "Alice",
        },
      },
    },
  };
}

describe("buildAuditDatabaseHooks", () => {
  beforeEach(() => {
    vi.resetModules();
    logMock.mockReset();
    getAuditProviderMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits auth.password.changed when an account.update writes a password", async () => {
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const hooks = buildAuditDatabaseHooks() as {
      account: { update: { after: (a: unknown, c: unknown) => Promise<void> } };
    };

    const ctx: FakeCtx = {
      ...buildSessionCtx({ activeOrganizationId: "org_42" }),
      path: "/change-password",
    };

    await hooks.account.update.after(
      {
        id: "acc_1",
        userId: "user_1",
        providerId: "credential",
        password: "new-hash-xxxxxxx",
      },
      ctx,
    );

    expect(logMock).toHaveBeenCalledTimes(1);
    const event = logMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(event.action).toBe("auth.password.changed");
    expect(event.severity).toBe("warning");
    expect(event.outcome).toBe("success");
    expect((event.actor as { id: string }).id).toBe("user_1");
    expect(event.tenantId).toBe("org_42");
    expect(event.resource as { type: string; id: string }).toEqual({
      type: "user",
      id: "user_1",
    });
    expect((event.context as { ip?: string }).ip).toBe("1.2.3.4");
  });

  it("ignores account.update for non-credential providers", async () => {
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const hooks = buildAuditDatabaseHooks() as {
      account: { update: { after: (a: unknown, c: unknown) => Promise<void> } };
    };

    await hooks.account.update.after(
      {
        id: "acc_2",
        userId: "user_1",
        providerId: "google",
        accessToken: "refreshed-token",
      },
      { ...buildSessionCtx(), path: "/callback/google" },
    );

    expect(logMock).not.toHaveBeenCalled();
  });

  it("emits auth.2fa.enabled on user.update flip false→true", async () => {
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const hooks = buildAuditDatabaseHooks() as {
      user: {
        update: {
          before: (u: unknown, c: unknown) => Promise<void>;
          after: (u: unknown, c: unknown) => Promise<void>;
        };
      };
    };

    const ctx: FakeCtx = {
      ...buildSessionCtx(),
      path: "/two-factor/enable",
      context: {
        ...buildSessionCtx().context,
        adapter: {
          findOne: async () => ({ id: "user_1", twoFactorEnabled: false }),
        },
      },
    };

    await hooks.user.update.before({ id: "user_1", twoFactorEnabled: true }, ctx);
    await hooks.user.update.after(
      { id: "user_1", email: "alice@example.com", twoFactorEnabled: true },
      ctx,
    );

    expect(logMock).toHaveBeenCalledTimes(1);
    const event = logMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(event.action).toBe("auth.2fa.enabled");
    expect(event.severity).toBe("info");
    expect(event.outcome).toBe("success");
  });

  it("emits auth.2fa.disabled on user.update flip true→false", async () => {
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const hooks = buildAuditDatabaseHooks() as {
      user: {
        update: {
          before: (u: unknown, c: unknown) => Promise<void>;
          after: (u: unknown, c: unknown) => Promise<void>;
        };
      };
    };

    const ctx: FakeCtx = {
      ...buildSessionCtx(),
      path: "/two-factor/disable",
      context: {
        ...buildSessionCtx().context,
        adapter: {
          findOne: async () => ({ id: "user_1", twoFactorEnabled: true }),
        },
      },
    };

    await hooks.user.update.before({ id: "user_1", twoFactorEnabled: false }, ctx);
    await hooks.user.update.after({ id: "user_1", twoFactorEnabled: false }, ctx);

    expect(logMock).toHaveBeenCalledTimes(1);
    const event = logMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(event.action).toBe("auth.2fa.disabled");
    expect(event.severity).toBe("warning");
  });

  it("does not emit when user.update touches unrelated fields", async () => {
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const hooks = buildAuditDatabaseHooks() as {
      user: {
        update: {
          before: (u: unknown, c: unknown) => Promise<void>;
          after: (u: unknown, c: unknown) => Promise<void>;
        };
      };
    };

    const ctx: FakeCtx = {
      ...buildSessionCtx(),
      path: "/update-user",
      context: {
        ...buildSessionCtx().context,
        adapter: {
          findOne: async () => ({ id: "user_1", twoFactorEnabled: false }),
        },
      },
    };

    await hooks.user.update.before({ id: "user_1", name: "Alice 2" }, ctx);
    await hooks.user.update.after({ id: "user_1", name: "Alice 2", twoFactorEnabled: false }, ctx);

    expect(logMock).not.toHaveBeenCalled();
  });

  it("falls back to userId as tenantId when no active org is on the session", async () => {
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const hooks = buildAuditDatabaseHooks() as {
      account: { update: { after: (a: unknown, c: unknown) => Promise<void> } };
    };

    await hooks.account.update.after(
      {
        id: "acc_1",
        userId: "user_lonely",
        providerId: "credential",
        password: "hash",
      },
      { ...buildSessionCtx(), path: "/change-password" },
    );

    const event = logMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(event.tenantId).toBe("user_lonely");
  });

  it("never throws when the audit provider fails", async () => {
    logMock.mockRejectedValueOnce(new Error("clickhouse down"));
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const hooks = buildAuditDatabaseHooks() as {
      account: { update: { after: (a: unknown, c: unknown) => Promise<void> } };
    };

    await expect(
      hooks.account.update.after(
        {
          id: "acc_1",
          userId: "user_1",
          providerId: "credential",
          password: "hash",
        },
        { ...buildSessionCtx(), path: "/change-password" },
      ),
    ).resolves.toBeUndefined();
  });

  it("ignores hooks when no userId can be resolved", async () => {
    const { buildAuditDatabaseHooks } = await import("../audit-events");
    const hooks = buildAuditDatabaseHooks() as {
      user: { update: { after: (u: unknown, c: unknown) => Promise<void> } };
      account: { update: { after: (a: unknown, c: unknown) => Promise<void> } };
    };

    await hooks.user.update.after(
      { twoFactorEnabled: true },
      {
        path: "/two-factor/enable",
        context: { session: null },
      },
    );
    await hooks.account.update.after(
      { id: "acc_1", providerId: "credential", password: "hash" },
      { path: "/change-password", context: { session: null } },
    );

    expect(logMock).not.toHaveBeenCalled();
  });
});
