import { afterEach, describe, expect, it, vi } from "vitest";
import { buildStatusSnapshot, classifyHttpStatus, type ServiceTarget } from "./probe";
import { getStatusKv } from "./store";

const targets: ServiceTarget[] = [
  { id: "site", name: "Site", description: "", url: "https://example.test/" },
];

describe("classifyHttpStatus", () => {
  it("treats a server error as an outage and a refused request as degraded", () => {
    expect(classifyHttpStatus(200)).toBe("operational");
    expect(classifyHttpStatus(301)).toBe("operational");
    expect(classifyHttpStatus(404)).toBe("degraded");
    expect(classifyHttpStatus(429)).toBe("degraded");
    expect(classifyHttpStatus(500)).toBe("outage");
    expect(classifyHttpStatus(503)).toBe("outage");
  });
});

describe("buildStatusSnapshot probe reuse", () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await getStatusKv().clear?.();
  });

  it("serves readings inside maxAgeMs without probing again", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await buildStatusSnapshot(targets, { maxAgeMs: 60_000 });
    await buildStatusSnapshot(targets, { maxAgeMs: 60_000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await buildStatusSnapshot(targets, { maxAgeMs: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares one probe run between concurrent viewers", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all(
      Array.from({ length: 5 }, () => buildStatusSnapshot(targets, { maxAgeMs: 60_000 })),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("probes again when the target list changes", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await buildStatusSnapshot(targets, { maxAgeMs: 60_000 });
    const more = [
      ...targets,
      { id: "api", name: "API", description: "", url: "https://api.test/" },
    ];
    const snapshot = await buildStatusSnapshot(more, { maxAgeMs: 60_000 });
    expect(snapshot.services.map((s) => s.id)).toEqual(["site", "api"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
