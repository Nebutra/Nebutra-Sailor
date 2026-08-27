import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End-to-end lifecycle of an email change: issue → confirm → reuse rejected.
 *
 * Unlike the per-route unit tests, this suite backs `authVerification` with an
 * in-memory store so the token minted by the issue route is the same token the
 * confirm route consumes. That is what makes the single-use property testable
 * rather than assumed.
 */

const state = vi.hoisted(() => {
  interface VerificationRow {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Date;
  }
  interface UserRow {
    id: string;
    email: string;
    name: string | null;
  }

  const store = {
    verifications: [] as VerificationRow[],
    users: [] as UserRow[],
    nextId: 1,
    sentMail: [] as { to: string; confirmUrl: string }[],
  };

  return { store };
});

const { store } = state;

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
  resolveServerRequestOrigin: () => "https://app.example",
}));

vi.mock("@nebutra/audit", () => ({
  auditLogger: () => ({ log: vi.fn(async () => undefined) }),
}));

vi.mock("@nebutra/email", () => ({
  sendEmailChangeEmail: vi.fn(async (opts: { to: string; confirmUrl: string }) => {
    store.sentMail = [...store.sentMail, { to: opts.to, confirmUrl: opts.confirmUrl }];
    return { id: `msg_${store.sentMail.length}` };
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(
        async ({ where }: { where: { id?: string; email?: string } }) =>
          store.users.find(
            (row) =>
              (where.id !== undefined && row.id === where.id) ||
              (where.email !== undefined && row.email === where.email),
          ) ?? null,
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { email: string } }) => {
        const existing = store.users.find((row) => row.id === where.id);
        if (!existing) throw new Error("User not found");
        const next = { ...existing, ...data };
        store.users = store.users.map((row) => (row.id === where.id ? next : row));
        return next;
      }),
    },
    authUser: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    authVerification: {
      create: vi.fn(
        async ({ data }: { data: { identifier: string; value: string; expiresAt: Date } }) => {
          const row = { id: `v_${store.nextId}`, ...data };
          store.nextId += 1;
          store.verifications = [...store.verifications, row];
          return row;
        },
      ),
      deleteMany: vi.fn(async ({ where }: { where: { identifier: string } }) => {
        const before = store.verifications.length;
        store.verifications = store.verifications.filter(
          (row) => row.identifier !== where.identifier,
        );
        return { count: before - store.verifications.length };
      }),
      findMany: vi.fn(async ({ where }: { where: { identifier: { startsWith: string } } }) =>
        store.verifications.filter((row) => row.identifier.startsWith(where.identifier.startsWith)),
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const existing = store.verifications.find((row) => row.id === where.id);
        if (!existing) throw new Error("Record to delete does not exist.");
        store.verifications = store.verifications.filter((row) => row.id !== where.id);
        return existing;
      }),
    },
  },
}));

import { getAuth } from "@/lib/auth";

const mockedGetAuth = vi.mocked(getAuth);

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "user_1",
    orgId: "org_1",
    sessionClaims: {} as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

async function issue(newEmail: string) {
  const { POST } = await import("@/app/api/account/email-change/route");
  return POST(
    new Request("https://app.example/api/account/email-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    }),
  );
}

async function confirm(token: string) {
  const { POST } = await import("@/app/api/account/email-change/[token]/route");
  return POST(
    new Request(`https://app.example/api/account/email-change/${token}`, { method: "POST" }),
    { params: Promise.resolve({ token }) },
  );
}

function lastMintedToken(): string {
  const mail = store.sentMail.at(-1);
  if (!mail) throw new Error("No verification mail was dispatched");
  return mail.confirmUrl.split("/").pop() as string;
}

describe("email change lifecycle", () => {
  beforeEach(() => {
    mockedGetAuth.mockReset();
    store.verifications = [];
    store.sentMail = [];
    store.nextId = 1;
    store.users = [{ id: "user_1", email: "alice@example.com", name: "Alice" }];
  });

  it("issues a token, confirms it once, and rejects the reuse", async () => {
    // ── issue ──
    mockedGetAuth.mockResolvedValue(buildAuth());
    const issued = await issue("alice2@example.com");
    expect(issued.status).toBe(202);
    expect(store.verifications).toHaveLength(1);
    expect(store.sentMail).toHaveLength(1);
    expect(store.sentMail[0]?.to).toBe("alice2@example.com");

    const token = lastMintedToken();
    expect(token.length).toBeGreaterThanOrEqual(32);

    // ── confirm ──
    const confirmed = await confirm(token);
    expect(confirmed.status).toBe(200);
    const body = (await confirmed.json()) as { ok: boolean; newEmail: string };
    expect(body.ok).toBe(true);
    expect(body.newEmail).toBe("alice2@example.com");
    expect(store.users[0]?.email).toBe("alice2@example.com");

    // The token row is consumed, not merely marked.
    expect(store.verifications).toHaveLength(0);

    // ── reuse rejected ──
    const replay = await confirm(token);
    expect(replay.status).toBe(404);
    const replayBody = (await replay.json()) as { code: string };
    expect(replayBody.code).toBe("TOKEN_NOT_FOUND");
    // The address is unchanged by the replay.
    expect(store.users[0]?.email).toBe("alice2@example.com");
  });

  it("expires a token instead of honouring it", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    await issue("alice3@example.com");
    const token = lastMintedToken();

    // Wind the stored expiry into the past.
    store.verifications = store.verifications.map((row) => ({
      ...row,
      expiresAt: new Date(Date.now() - 1_000),
    }));

    const response = await confirm(token);
    expect(response.status).toBe(410);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("TOKEN_EXPIRED");
    expect(store.users[0]?.email).toBe("alice@example.com");
    // Expired rows are cleared so they cannot be replayed either.
    expect(store.verifications).toHaveLength(0);
  });

  it("refuses to burn another user's token when a foreign session is present", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    await issue("alice4@example.com");
    const token = lastMintedToken();

    // A signed-in attacker who somehow obtained the link cannot spend it.
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: "user_attacker" }));
    const response = await confirm(token);
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("SESSION_MISMATCH");
    expect(store.users[0]?.email).toBe("alice@example.com");
    // The row survives, so the legitimate owner can still confirm.
    expect(store.verifications).toHaveLength(1);

    mockedGetAuth.mockResolvedValue(buildAuth());
    const owner = await confirm(token);
    expect(owner.status).toBe(200);
    expect(store.users[0]?.email).toBe("alice4@example.com");
  });

  it("replaces a superseded pending change so only the newest token works", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    await issue("first@example.com");
    const firstToken = lastMintedToken();

    await issue("second@example.com");
    const secondToken = lastMintedToken();
    expect(secondToken).not.toBe(firstToken);
    expect(store.verifications).toHaveLength(1);

    const stale = await confirm(firstToken);
    expect(stale.status).toBe(404);
    expect(store.users[0]?.email).toBe("alice@example.com");

    const fresh = await confirm(secondToken);
    expect(fresh.status).toBe(200);
    expect(store.users[0]?.email).toBe("second@example.com");
  });

  it("reports a delivery failure instead of claiming the mail was sent", async () => {
    // The link only reaches the user by mail. A swallowed send error used to
    // return 202 {verificationSent:true} and leave a live token behind — the
    // user waits on an inbox nothing was sent to, and a valid token sits in the
    // table with no owner.
    const { sendEmailChangeEmail } = await import("@nebutra/email");
    vi.mocked(sendEmailChangeEmail).mockRejectedValueOnce(new Error("SMTP refused connection"));

    mockedGetAuth.mockResolvedValue(buildAuth());
    const issued = await issue("alice5@example.com");

    expect(issued.status).toBe(502);
    const body = (await issued.json()) as { code: string; error: string };
    expect(body.code).toBe("EMAIL_SEND_FAILED");
    expect(store.sentMail).toHaveLength(0);
    // No unreachable token is left behind.
    expect(store.verifications).toHaveLength(0);
    expect(store.users[0]?.email).toBe("alice@example.com");
  });
});
