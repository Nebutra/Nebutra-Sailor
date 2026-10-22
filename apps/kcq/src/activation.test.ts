// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActivationAnalytics } from "./activation";

const entries = new Map<string, string>();
const localStorage = {
  get length() {
    return entries.size;
  },
  clear: () => entries.clear(),
  getItem: (key: string) => entries.get(key) ?? null,
  setItem: (key: string, value: string) => {
    entries.set(key, value);
  },
};
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 200 })));
});
afterEach(() => vi.unstubAllGlobals());

function analytics() {
  return createActivationAnalytics({
    storage: localStorage,
    doNotTrack: () => false,
    config: { posthog: { apiKey: "public-project-key", host: "https://analytics.example" } },
  });
}
describe("consented activation analytics", () => {
  it("emits nothing and creates no identifier before explicit consent", async () => {
    const client = analytics();
    await client.track({ action: "workbench_opened" });
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });
  it("sends only allowlisted steps with an anonymous in-memory identifier", async () => {
    const client = analytics();
    client.setConsent(true);
    await client.track({ action: "preset_selected", preset: "cn" });
    await client.track({ action: "chart_loaded" });
    const calls = vi.mocked(fetch).mock.calls;
    const first = JSON.parse(calls[0][1]?.body as string);
    const second = JSON.parse(calls[1][1]?.body as string);
    expect(first.event).toBe("kcq.activation");
    expect(first.distinct_id).toMatch(/^kcq-anon-/);
    expect(second.distinct_id).toBe(first.distinct_id);
    expect(first.properties).toEqual({ action: "preset_selected", preset: "cn" });
    expect(localStorage.getItem("nebutra_consent_v1")).not.toContain("kcq-anon");
    client.setConsent(false);
    await client.track({ action: "feedback_opened" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("fails closed for invalid/denied storage and honors Do Not Track", async () => {
    localStorage.setItem("nebutra_consent_v1", "{broken");
    await analytics().track({ action: "workbench_opened" });
    expect(fetch).not.toHaveBeenCalled();
    const client = createActivationAnalytics({
      storage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
      doNotTrack: () => false,
      config: { posthog: { apiKey: "public-key" } },
    });
    expect(client.setConsent(true)).toBe(false);
    await client.track({ action: "workbench_opened" });
    const dnt = createActivationAnalytics({
      storage: localStorage,
      doNotTrack: () => true,
      config: { posthog: { apiKey: "public-key" } },
    });
    dnt.setConsent(true);
    await dnt.track({ action: "workbench_opened" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not track invalid or personal properties", async () => {
    const client = analytics();
    client.setConsent(true);
    // @ts-expect-error Deliberate privacy regression payload.
    await client.track({ action: "chart_loaded", userId: "person", prompt: "private research" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("revokes consent immediately even if storage becomes unwritable", async () => {
    localStorage.setItem("nebutra_consent_v1", JSON.stringify({ analytics: true }));
    const client = createActivationAnalytics({
      storage: {
        getItem: localStorage.getItem,
        setItem: () => {
          throw new Error("quota");
        },
      },
      doNotTrack: () => false,
      config: { posthog: { apiKey: "public-key" } },
    });
    expect(client.setConsent(false)).toBe(false);
    expect(client.getConsent()).toBe(false);
    await client.track({ action: "chart_loaded" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
