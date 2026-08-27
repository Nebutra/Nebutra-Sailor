// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureFlagProvider, useFeatureFlags } from "../react";

function Probe() {
  const { flags, isLoading } = useFeatureFlags();
  return (
    <output aria-label="flags">
      {isLoading ? "loading" : flags["beta-dashboard"] ? "enabled" : "disabled"}
    </output>
  );
}

describe("FeatureFlagProvider React adapter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ flags: { "beta-dashboard": true } }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses fetched flags when the same endpoint remounts", async () => {
    const endpoint = "/api/test-flags-remount";
    const first = render(
      <FeatureFlagProvider endpoint={endpoint}>
        <Probe />
      </FeatureFlagProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("flags").textContent).toBe("enabled"));
    expect(fetch).toHaveBeenCalledTimes(1);

    first.unmount();
    render(
      <FeatureFlagProvider endpoint={endpoint}>
        <Probe />
      </FeatureFlagProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("flags").textContent).toBe("enabled"));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
