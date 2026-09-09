import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = { userId: "user_1" as string | null };

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: authState.userId })),
}));

const storedResume = {
  id: "r1",
  member_id: "m1",
  content: { version: 1, basic: { name: "Alice" }, objective: {}, preferences: {} },
  schema_version: 1,
  headline: null,
  skills_flat: [],
  highlights: [],
  years_active: null,
  completeness: 9,
  is_public: false,
  language: "MIX",
};

const mockPrisma = {
  sleptonsaMemberProfile: {
    findUnique: vi.fn(async ({ where }: { where: { user_id: string } }) =>
      where.user_id === "user_1" ? { id: "m1" } : null,
    ),
  },
  sleptonsResume: {
    findUnique: vi.fn(async () => storedResume),
    upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({
      ...storedResume,
      ...create,
    })),
  },
};

vi.mock("@nebutra/db", () => ({ getSystemDb: () => mockPrisma }));

const put = (body: unknown) =>
  new Request("http://localhost/api/resume", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("/api/resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.userId = "user_1";
  });

  it("GET returns 401 without a session", async () => {
    authState.userId = null;
    const { GET } = await import("../../app/api/resume/route");
    expect((await GET()).status).toBe(401);
  });

  it("GET returns 403 for a user without a member profile", async () => {
    authState.userId = "user_nobody";
    const { GET } = await import("../../app/api/resume/route");
    expect((await GET()).status).toBe(403);
  });

  it("GET returns the owner's résumé", async () => {
    const { GET } = await import("../../app/api/resume/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).resume.member_id).toBe("m1");
  });

  it("PUT validates, derives, and upserts", async () => {
    const { PUT } = await import("../../app/api/resume/route");
    const res = await PUT(
      put({
        content: {
          basic: { name: "Alice", email: "a@example.com" },
          objective: { summary: "Building FinFlow. More." },
          ventures: [{ name: "FinFlow", period: "2024", outcome: "500 users in 3 months" }],
          skills: { programming: ["python"] },
        },
        is_public: true,
      }),
    );
    expect(res.status).toBe(200);
    const { resume } = await res.json();
    expect(resume.headline).toBe("Building FinFlow.");
    expect(resume.skills_flat).toEqual(["Python"]);
    expect(resume.highlights[0]).toBe("500 users in 3 months");
    expect(resume.is_public).toBe(true);
    const call = mockPrisma.sleptonsResume.upsert.mock.calls[0]?.[0] as unknown as {
      where: { member_id: string };
    };
    expect(call.where.member_id).toBe("m1");
  });

  it("PUT returns 422 with issues on invalid content", async () => {
    const { PUT } = await import("../../app/api/resume/route");
    const res = await PUT(put({ content: { basic: { name: "" } } }));
    expect(res.status).toBe(422);
    expect((await res.json()).issues.length).toBeGreaterThan(0);
  });

  it("PUT returns 400 on malformed JSON", async () => {
    const { PUT } = await import("../../app/api/resume/route");
    expect((await PUT(put("{nope"))).status).toBe(400);
  });
});
