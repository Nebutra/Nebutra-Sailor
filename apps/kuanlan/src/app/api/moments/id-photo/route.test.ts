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

// The route's imports reach Prisma, the billing ledger, the S3 client and the
// image pipeline. None of that is under test here, and loading it made a test
// of one 401 take seconds — past CI's budget on a slow runner. Errors stay
// real classes so `instanceof` in the route keeps meaning something.
vi.mock("@/lib/db", () => ({
  DbUnavailableError: class DbUnavailableError extends Error {},
  tenantDbFor: vi.fn(),
}));

vi.mock("@/lib/credits", () => ({
  creditBalance: vi.fn(),
  ensureWelcomeCredits: vi.fn(),
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
  refundShootCredits: vi.fn(),
  reserveShootCredits: vi.fn(),
  shootPriceCredits: vi.fn(),
}));

vi.mock("@/lib/consent.server", () => ({
  readFaceConsent: vi.fn(),
}));

vi.mock("@/lib/shoot-runner", () => ({
  runShoot: vi.fn(),
}));

vi.mock("@/lib/shoot-limit", () => ({
  spendShootAllowance: vi.fn(),
}));

vi.mock("@/lib/image2", () => ({
  Image2UnavailableError: class Image2UnavailableError extends Error {},
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
