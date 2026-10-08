import { afterEach, expect, it, vi } from "vitest";
import { createAuthCenterBrowserClient } from "./browser-client";

afterEach(() => vi.unstubAllGlobals());
it("keeps signed-out sessions empty and never requests their memberships", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response("null", { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetch);
  const client = createAuthCenterBrowserClient("https://auth.nebutra.com");
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
  const client = createAuthCenterBrowserClient("https://auth.nebutra.com");
  await expect(client.selectWorkspace("foreign")).rejects.toThrow("Not a member");
});
