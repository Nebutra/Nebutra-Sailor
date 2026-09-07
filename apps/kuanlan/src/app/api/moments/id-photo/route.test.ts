import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionFromRequest } from "@/lib/auth";
// Static import: vi.mock is hoisted above it, and the route module's cold load
// (well over 1 s, regularly past 5 s on a loaded CI runner) then happens at
// collection time instead of inside the first test's 5 s budget.
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/resources.server", () => ({
  persistIdPhotoMoment: vi.fn(),
  listIdPhotoMoments: vi.fn(),
}));

describe("id-photo moment routes", () => {
  beforeEach(() => {
    vi.mocked(getSessionFromRequest).mockReset();
  });

  it("refuses to shoot or list without a session", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);

    const list = await GET(new Request("http://localhost/api/moments/id-photo"));
    const shoot = await POST(
      new Request("http://localhost/api/moments/id-photo", {
        method: "POST",
        body: new FormData(),
      }),
    );

    expect(list.status).toBe(401);
    expect(shoot.status).toBe(401);
    await expect(list.json()).resolves.toEqual({ error: "sign_in_required" });
    await expect(shoot.json()).resolves.toEqual({ error: "sign_in_required" });
  });
});
