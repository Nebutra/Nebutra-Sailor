import { afterEach, expect, it, vi } from "vitest";
import { createAuthCenterBrowserClient } from "./browser-client";

afterEach(() => vi.unstubAllGlobals());
it("keeps signed-out sessions empty and never requests their memberships", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response("null", { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetch);
  const client = createAuthCenterBrowserClient("https://auth.example.test");
  expect(await client.getContext()).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("surfaces rejected organization activation instead of pretending the switch succeeded", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION",
          message: "Not a member",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
  const client = createAuthCenterBrowserClient("https://auth.example.test");
  await expect(client.selectWorkspace("foreign")).rejects.toThrow("Not a member");
});

it("rejects empty and overlong profile names before contacting auth", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const client = createAuthCenterBrowserClient("https://auth.example.test");
  await expect(client.updateProfile("   ")).rejects.toThrow();
  await expect(client.updateProfile("x".repeat(65))).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

it("updates the shared identity using the official auth endpoint and cookies", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: true }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  await createAuthCenterBrowserClient("https://auth.example.test").updateProfile(" Alex ");
  const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
  expect(String(url)).toBe("https://auth.example.test/api/auth/update-user");
  expect(init.method).toBe("POST");
  expect(init.credentials).toBe("include");
  expect(JSON.parse(String(init.body))).toEqual({ name: "Alex" });
});

it("shows the provider's rejected profile update instead of reporting success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "Session expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  await expect(
    createAuthCenterBrowserClient("https://auth.example.test").updateProfile("Alex"),
  ).rejects.toThrow("Session expired");
});
