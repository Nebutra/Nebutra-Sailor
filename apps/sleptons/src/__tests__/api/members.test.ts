import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMembers = [
  {
    id: "m1",
    member_number: 1,
    slug: "alice-1",
    display_name: "Alice",
    bio: "Building fintech",
    avatar_url: null,
    product_name: "FinFlow",
    product_tagline: "Finance for freelancers",
    tech_stack: ["Next.js", "PostgreSQL"],
    looking_for: ["early-users"],
    tier: "V1",
    is_public: true,
    created_at: new Date("2026-01-01"),
    github_handle: "alice",
    twitter_handle: null,
    products: [],
  },
];

const mockPrisma = {
  sleptonsaMemberProfile: {
    findMany: vi.fn().mockResolvedValue(mockMembers),
    count: vi.fn().mockResolvedValue(1),
    findUnique: vi.fn().mockResolvedValue(mockMembers[0]),
  },
};

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => mockPrisma,
  prisma: mockPrisma,
}));

describe("GET /api/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated list of public members", async () => {
    const { GET } = await import("../../app/api/members/route");
    const req = new Request("http://localhost/api/members");
    const res = await GET(req as unknown as Request);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.members).toHaveLength(1);
    expect(data.members[0]?.slug).toBe("alice-1");
    expect(data.total).toBe(1);
  });

  it("only returns is_public members", async () => {
    const { getSystemDb } = await import("@nebutra/db");
    const { GET } = await import("../../app/api/members/route");
    await GET(new Request("http://localhost/api/members") as unknown as Request);

    const prisma = getSystemDb();
    const findManyCall = (prisma.sleptonsaMemberProfile.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(findManyCall.where).toMatchObject({ is_public: true });
  });
});
