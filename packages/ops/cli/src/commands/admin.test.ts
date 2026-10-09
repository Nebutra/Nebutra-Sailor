import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExitCode } from "../utils/exit-codes";
import {
  createStaffClient,
  parseStaffRole,
  StaffApiError,
  type StaffClient,
  type StaffGrant,
} from "../utils/staff-client";
import { formatStaffTable, registerAdminCommand } from "./admin";

const row: StaffGrant = {
  userId: "u_1",
  email: "ab***@example.com",
  name: null,
  role: "platform_operator",
  active: true,
  grantedAt: "2026-10-01T00:00:00.000Z",
  grantedBy: { userId: "u_o", email: "ow***@example.com" },
  revokedAt: null,
  note: "on-call",
  auditId: "audit-1",
};

function fakeClient(overrides: Partial<StaffClient> = {}) {
  const client = {
    list: vi.fn(async () => [row]),
    me: vi.fn(async () => ({ ...row, canGrant: true, canRevoke: true })),
    grant: vi.fn(async () => row),
    revoke: vi.fn(async () => ({ ...row, active: false, revokedAt: "2026-10-09T00:00:00.000Z" })),
    ...overrides,
  } as unknown as StaffClient;
  return client;
}

async function run(
  args: string[],
  opts: { client?: StaffClient; interactive?: boolean; confirm?: boolean } = {},
) {
  const lines: string[] = [];
  const confirm = vi.fn(async () => opts.confirm ?? true);
  const program = new Command().exitOverride();
  registerAdminCommand(program, {
    client: opts.client ?? fakeClient(),
    confirm,
    isInteractive: () => opts.interactive ?? false,
    out: (l) => lines.push(l),
  });
  await program.parseAsync(["admin", "staff", ...args], { from: "user" });
  return { lines, confirm };
}

afterEach(() => {
  process.exitCode = undefined;
});

describe("nebutra admin staff", () => {
  it("lists as JSON for agents", async () => {
    const { lines } = await run(["list", "--json"]);
    expect(JSON.parse(lines[0] as string)).toEqual({ staff: [row] });
    expect(process.exitCode).toBeUndefined();
  });

  it("lists as a table for people", async () => {
    const { lines } = await run(["list"]);
    expect(lines[0]).toContain("platform_operator");
    expect(lines[0]).toContain("on-call");
    expect(formatStaffTable([])).toBe("No staff grants.");
  });

  it("whoami prints the standing", async () => {
    const { lines } = await run(["whoami", "--json"]);
    expect(JSON.parse(lines[0] as string)).toMatchObject({
      role: "platform_operator",
      canGrant: true,
    });
  });

  it("grant parses short role names and sends the note", async () => {
    const client = fakeClient();
    const { lines } = await run(
      ["grant", "a@example.com", "--role", "operator", "--note", "rota", "--yes", "--json"],
      { client },
    );
    expect(client.grant).toHaveBeenCalledWith({
      email: "a@example.com",
      role: "platform_operator",
      note: "rota",
    });
    expect(JSON.parse(lines[0] as string).auditId).toBe("audit-1");
  });

  it("non-interactive grant WITHOUT --yes refuses and never calls the gateway", async () => {
    const client = fakeClient();
    await run(["grant", "a@example.com", "--role", "owner", "--note", "rota"], {
      client,
      interactive: false,
    });
    expect(client.grant).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(ExitCode.INVALID_ARGS);
  });

  it("interactive grant asks, and a no changes nothing", async () => {
    const client = fakeClient();
    const { confirm } = await run(
      ["grant", "a@example.com", "--role", "support", "--note", "rota"],
      {
        client,
        interactive: true,
        confirm: false,
      },
    );
    expect(confirm).toHaveBeenCalledOnce();
    expect(client.grant).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(ExitCode.CANCELLED);
  });

  it("interactive grant proceeds on yes without --yes", async () => {
    const client = fakeClient();
    await run(["grant", "a@example.com", "--role", "support", "--note", "rota"], {
      client,
      interactive: true,
      confirm: true,
    });
    expect(client.grant).toHaveBeenCalledOnce();
  });

  it("--yes skips the prompt", async () => {
    const { confirm } = await run(["revoke", "a@example.com", "--note", "left", "--yes"], {
      interactive: true,
    });
    expect(confirm).not.toHaveBeenCalled();
  });

  it("rejects an unknown role and a missing note before any request", async () => {
    const client = fakeClient();
    await run(["grant", "a@example.com", "--role", "god", "--note", "x yz", "--yes"], { client });
    expect(process.exitCode).toBe(ExitCode.INVALID_ARGS);
    process.exitCode = undefined;
    await run(["revoke", "a@example.com", "--note", " ", "--yes"], { client });
    expect(process.exitCode).toBe(ExitCode.INVALID_ARGS);
    expect(client.grant).not.toHaveBeenCalled();
    expect(client.revoke).not.toHaveBeenCalled();
  });

  it("maps gateway refusals to exit codes", async () => {
    const lastOwner = fakeClient({
      revoke: vi.fn(async () => {
        throw new StaffApiError(409, "last_owner", "This is the last active platform owner.");
      }),
    });
    await run(["revoke", "o@example.com", "--note", "step down", "--yes"], { client: lastOwner });
    expect(process.exitCode).toBe(ExitCode.CONFLICT);

    process.exitCode = undefined;
    const forbidden = fakeClient({
      list: vi.fn(async () => {
        throw new StaffApiError(403, "http_403", "Not a platform staff member.");
      }),
    });
    await run(["list"], { client: forbidden });
    expect(process.exitCode).toBe(ExitCode.PERMISSION_DENIED);
  });
});

describe("staff client", () => {
  const ok = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("sends the bearer token and never echoes it", async () => {
    const fetchMock = vi.fn(async () => ok({ staff: [row] }));
    const client = createStaffClient({
      fetch: fetchMock as never,
      token: async () => "secret-token",
      baseUrl: "https://api.test",
    });
    await client.list();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/api/v1/platform/staff");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret-token");
  });

  it("puts the email in the revoke path, encoded", async () => {
    const fetchMock = vi.fn(async () => ok(row));
    const client = createStaffClient({
      fetch: fetchMock as never,
      token: async () => "t",
      baseUrl: "https://api.test",
    });
    await client.revoke("a+b@example.com", "rotation");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      "https://api.test/api/v1/platform/staff/a%2Bb%40example.com/revoke",
    );
  });

  it("fails with not_logged_in when there is no session", async () => {
    const client = createStaffClient({ token: async () => null, fetch: vi.fn() as never });
    await expect(client.list()).rejects.toMatchObject({ code: "not_logged_in", status: 401 });
  });

  it("carries the gateway's code and message", async () => {
    const client = createStaffClient({
      fetch: (async () => ok({ error: "No.", code: "self_grant" }, 403)) as never,
      token: async () => "t",
      baseUrl: "https://api.test",
    });
    await expect(client.list()).rejects.toMatchObject({
      status: 403,
      code: "self_grant",
      message: "No.",
    });
  });

  it("parses roles", () => {
    expect(parseStaffRole("OWNER")).toBe("platform_owner");
    expect(parseStaffRole("PLATFORM_READONLY")).toBe("platform_readonly");
    expect(parseStaffRole("root")).toBeNull();
  });
});
