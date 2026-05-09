// =============================================================================
// /api/cron/session-cleanup — auth & dispatch tests
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockHandler = vi.fn();
vi.mock("@nebutra/queue", () => ({
  getScheduledJob: vi.fn((name: string) => {
    if (name === "session-cleanup") {
      return {
        name: "session-cleanup",
        cron: "0 0 * * *",
        handler: mockHandler,
      };
    }
    return undefined;
  }),
  registerDefaultScheduledJobs: vi.fn(),
}));

import { GET } from "../session-cleanup/route";

const ORIGINAL_SECRET = process.env.CRON_SECRET;

const makeRequest = (auth?: string): Request => {
  const headers = new Headers();
  if (auth !== undefined) headers.set("Authorization", auth);
  return new Request("https://app.nebutra.com/api/cron/session-cleanup", {
    method: "GET",
    headers,
  });
};

describe("/api/cron/session-cleanup", () => {
  beforeEach(() => {
    mockHandler.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIGINAL_SECRET;
  });

  it("rejects requests with no Authorization header (401)", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("rejects requests with the wrong bearer token (401)", async () => {
    const res = await GET(makeRequest("Bearer nope"));
    expect(res.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("rejects when CRON_SECRET env var is missing (500 — fails closed)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("invokes the scheduled handler and returns its JSON result on success", async () => {
    mockHandler.mockResolvedValue({ ok: true, details: { deleted: 12 } });

    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; details?: { deleted: number } };
    expect(body.ok).toBe(true);
    expect(body.details).toEqual({ deleted: 12 });
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the handler throws", async () => {
    mockHandler.mockRejectedValue(new Error("connection refused"));

    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; error?: string };
    expect(body.ok).toBe(false);
  });
});
