import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only to allow importing in tests
vi.mock("server-only", () => ({}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock logo-url helper
vi.mock("@/lib/logo-url", () => ({
  resolveLogoUrl: (key: string) => `https://cdn.example.com/${key}`,
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET } from "../route";

function makeRequest(orgId: string) {
  return new Request(`http://localhost/api/organizations/${orgId}/logo-url`);
}

const makeContext = (orgId: string) => ({
  params: Promise.resolve({ orgId }),
});

describe("GET /api/organizations/[orgId]/logo-url", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce({ userId: null, orgId: null } as never);

    const response = await GET(makeRequest("org_1"), makeContext("org_1"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 403 when orgId does not match authenticated org", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce({
      userId: "user_1",
      orgId: "org_other",
    } as never);

    const response = await GET(makeRequest("org_1"), makeContext("org_1"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns logoUrl null when organization has no logo", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce({
      userId: "user_1",
      orgId: "org_1",
    } as never);
    vi.mocked(db.organization.findUnique).mockResolvedValueOnce({
      logo: null,
    } as never);

    const response = await GET(makeRequest("org_1"), makeContext("org_1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.logoUrl).toBeNull();
  });

  it("returns resolved CDN URL when organization has a logo key", async () => {
    vi.mocked(getAuth).mockResolvedValueOnce({
      userId: "user_1",
      orgId: "org_1",
    } as never);
    vi.mocked(db.organization.findUnique).mockResolvedValueOnce({
      logo: "org-logos/org_1/logo.png",
    } as never);

    const response = await GET(makeRequest("org_1"), makeContext("org_1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.logoUrl).toBe("https://cdn.example.com/org-logos/org_1/logo.png");
  });
});
