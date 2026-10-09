import { describe, expect, it, vi } from "vitest";
import { createContextServerHandlers } from "../server/contextServer";
import { callStaffTool, STAFF_TOOLS } from "../server/staffTools";

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const deps = (fetchMock: ReturnType<typeof vi.fn>, token: string | undefined = "tok") => ({
  fetch: fetchMock as unknown as typeof fetch,
  token: () => token,
  baseUrl: () => "https://api.test",
});

const grantArgs = { email: "a@example.com", role: "platform_operator", note: "on-call rota" };

describe("staff MCP tools", () => {
  it("are listed by the server, with agent-facing descriptions", async () => {
    const { tools } = await createContextServerHandlers(process.cwd()).listTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["staff_list", "staff_grant", "staff_revoke"]));
    for (const tool of STAFF_TOOLS.filter((t) => t.name !== "staff_list")) {
      expect(tool.inputSchema.required).toContain("confirm");
      expect(tool.description).toMatch(/confirm=true/);
    }
  });

  it.each([
    ["staff_grant", grantArgs],
    ["staff_revoke", { email: "a@example.com", note: "left" }],
  ])("%s without confirm: true makes NO request and says so", async (name, args) => {
    const fetchMock = vi.fn();
    for (const confirm of [undefined, false, "true", 1]) {
      const result = await callStaffTool(name, { ...args, confirm }, deps(fetchMock));
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toMatch(/confirm must be true/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("staff_grant with confirm posts the grant and returns the audit id", async () => {
    const fetchMock = vi.fn(async () =>
      ok({ userId: "u", role: "platform_operator", auditId: "aud-1" }, 201),
    );
    const result = await callStaffTool(
      "staff_grant",
      { ...grantArgs, confirm: true },
      deps(fetchMock),
    );
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0]?.text as string).auditId).toBe("aud-1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/api/v1/platform/staff");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "a@example.com",
      role: "platform_operator",
      note: "on-call rota",
    });
  });

  it("staff_revoke with confirm posts to the revoke path", async () => {
    const fetchMock = vi.fn(async () => ok({ active: false, auditId: "aud-2" }));
    await callStaffTool(
      "staff_revoke",
      { email: "a@example.com", note: "left", confirm: true },
      deps(fetchMock),
    );
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      "https://api.test/api/v1/platform/staff/a%40example.com/revoke",
    );
  });

  it("staff_list is a read and needs no confirm", async () => {
    const fetchMock = vi.fn(async () => ok({ staff: [] }));
    const result = await callStaffTool("staff_list", {}, deps(fetchMock));
    expect(result.isError).toBeUndefined();
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe("GET");
  });

  it("validates input before confirm and before the network", async () => {
    const fetchMock = vi.fn();
    expect(
      (
        await callStaffTool(
          "staff_grant",
          { ...grantArgs, role: "root", confirm: true },
          deps(fetchMock),
        )
      ).isError,
    ).toBe(true);
    expect(
      (
        await callStaffTool(
          "staff_grant",
          { ...grantArgs, note: "", confirm: true },
          deps(fetchMock),
        )
      ).isError,
    ).toBe(true);
    expect(
      (await callStaffTool("staff_revoke", { note: "x yz", confirm: true }, deps(fetchMock)))
        .isError,
    ).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the gateway's refusal with its code, and a missing session", async () => {
    const refused = vi.fn(async () =>
      ok({ error: "This is the last active platform owner.", code: "last_owner" }, 409),
    );
    const r = await callStaffTool(
      "staff_revoke",
      { email: "o@example.com", note: "step down", confirm: true },
      deps(refused),
    );
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toContain("last_owner");

    const none = vi.fn();
    const noSession = await callStaffTool("staff_list", {}, deps(none, ""));
    expect(noSession.isError).toBe(true);
    expect(none).not.toHaveBeenCalled();
  });

  it("dispatches through the context server", async () => {
    const result = await createContextServerHandlers(process.cwd()).callTool({
      name: "staff_grant",
      arguments: { ...grantArgs },
    });
    expect((result as { isError?: boolean }).isError).toBe(true);
  });
});
