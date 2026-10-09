import { readFileSync } from "node:fs";
import path from "node:path";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query-keys";
import { revalidateQueryCache } from "../use-revalidate";

function seededClient() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.session.current(), { user: { id: "u_1" } });
  queryClient.setQueryData(queryKeys.organizations.list(), [{ id: "org_a", name: "Acme" }]);
  queryClient.setQueryData(queryKeys.apiKeys.list("org_a"), [{ id: "key_1" }]);
  return queryClient;
}

describe("revalidateQueryCache", () => {
  it("data: keeps every cached read on screen, marked stale", async () => {
    const queryClient = seededClient();
    await revalidateQueryCache(queryClient, "data");
    expect(queryClient.getQueryData(queryKeys.apiKeys.list("org_a"))).toEqual([{ id: "key_1" }]);
    expect(queryClient.getQueryState(queryKeys.apiKeys.list("org_a"))?.isInvalidated).toBe(true);
  });

  it("tenant: drops tenant reads, keeps the session and the user's org list", async () => {
    const queryClient = seededClient();
    await revalidateQueryCache(queryClient, "tenant");
    expect(queryClient.getQueryData(queryKeys.apiKeys.list("org_a"))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.session.current())).toEqual({ user: { id: "u_1" } });
    expect(queryClient.getQueryData(queryKeys.organizations.list())).toHaveLength(1);
    expect(queryClient.getQueryState(queryKeys.session.current())?.isInvalidated).toBe(true);
  });

  it("identity: drops everything but the session", async () => {
    const queryClient = seededClient();
    await revalidateQueryCache(queryClient, "identity");
    expect(queryClient.getQueryData(queryKeys.organizations.list())).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.session.current())).toBeDefined();
  });
});

describe("Vite next-compat router.refresh", () => {
  it("revalidates in place instead of reloading the page", () => {
    const shim = readFileSync(
      path.resolve(__dirname, "../../../vite-app/next-compat/navigation.tsx"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(shim).toContain("router.invalidate()");
    expect(shim).not.toMatch(/location\.reload/);
  });
});
