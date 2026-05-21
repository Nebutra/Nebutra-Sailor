import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetch = vi.fn();
const create = vi.fn();
const createIfNotExists = vi.fn();
const deleteDoc = vi.fn();
const getAuth = vi.fn();
const getUser = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: (req: Request) => getAuth(req),
}));

vi.mock("@nebutra/auth", () => ({
  getConfiguredAuthProvider: () => "better-auth",
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: async () => ({
    getUser,
  }),
}));

vi.mock("@nebutra/sanity", () => ({
  getServerClient: () => ({
    fetch,
    create,
    createIfNotExists,
    delete: deleteDoc,
  }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function request(path = "/api/blog/comments", init?: RequestInit): Request {
  return new Request(`https://app.nebutra.com${path}`, init);
}

describe("/api/blog/comments", () => {
  beforeEach(() => {
    fetch.mockReset();
    create.mockReset();
    createIfNotExists.mockReset();
    deleteDoc.mockReset();
    getAuth.mockReset();
    getUser.mockReset();
    vi.stubEnv("NEBUTRA_LANDING_ORIGIN", "https://nebutra.com");
    vi.stubEnv("SANITY_API_TOKEN", "sanity-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("lists only approved comments and returns viewer state", async () => {
    getAuth.mockResolvedValue({ userId: "user_1" });
    getUser.mockResolvedValue({
      name: "Tseka Luk",
      email: "tseka@nebutra.com",
      imageUrl: "https://example.com/avatar.png",
    });
    fetch
      .mockResolvedValueOnce([
        {
          _id: "comment_1",
          body: "Good essay.",
          authorName: "Reader",
          authorImageUrl: null,
          createdAt: "2026-05-21T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce({ likeCount: 7, viewerLiked: true });

    const { GET } = await import("../route");
    const res = await GET(
      request(
        "/api/blog/comments?translationKey=think-different-ai-homogenization&slug=think-different-ai-homogenization&language=en",
        { headers: { origin: "https://nebutra.com" } },
      ),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://nebutra.com");
    expect(await res.json()).toEqual({
      comments: [
        {
          id: "comment_1",
          body: "Good essay.",
          authorName: "Reader",
          authorImageUrl: null,
          createdAt: "2026-05-21T00:00:00.000Z",
        },
      ],
      viewer: {
        isSignedIn: true,
        name: "Tseka Luk",
        email: "tseka@nebutra.com",
        avatarUrl: "https://example.com/avatar.png",
      },
      reactions: {
        likeCount: 7,
        viewerLiked: true,
      },
    });
  });

  it("requires login before posting", async () => {
    getAuth.mockResolvedValue({ userId: null });

    const { POST } = await import("../route");
    const res = await POST(
      request("/api/blog/comments", {
        method: "POST",
        body: JSON.stringify({
          translationKey: "think-different-ai-homogenization",
          slug: "think-different-ai-homogenization",
          language: "en",
          body: "I agree.",
        }),
      }),
    );

    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("requires login before toggling a blog reaction", async () => {
    getAuth.mockResolvedValue({ userId: null });

    const { POST } = await import("../../reactions/route");
    const res = await POST(
      request("/api/blog/reactions", {
        method: "POST",
        body: JSON.stringify({
          translationKey: "think-different-ai-homogenization",
          slug: "think-different-ai-homogenization",
          language: "en",
          kind: "like",
        }),
      }),
    );

    expect(res.status).toBe(401);
    expect(createIfNotExists).not.toHaveBeenCalled();
  });

  it("creates a first-party like when the viewer has not liked the post", async () => {
    getAuth.mockResolvedValue({ userId: "user_1" });
    getUser.mockResolvedValue({
      name: "Tseka Luk",
      email: "tseka@nebutra.com",
      imageUrl: "https://example.com/avatar.png",
    });
    fetch.mockResolvedValueOnce(null).mockResolvedValueOnce(8);
    createIfNotExists.mockResolvedValue({ _id: "blogReaction_hash" });

    const { POST } = await import("../../reactions/route");
    const res = await POST(
      request("/api/blog/reactions", {
        method: "POST",
        headers: { origin: "https://nebutra.com" },
        body: JSON.stringify({
          translationKey: "think-different-ai-homogenization",
          slug: "think-different-ai-homogenization",
          language: "en",
          kind: "like",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(createIfNotExists).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "blogReaction",
        translationKey: "think-different-ai-homogenization",
        postSlug: "think-different-ai-homogenization",
        language: "en",
        kind: "like",
        authorId: "user_1",
        authorName: "Tseka Luk",
      }),
    );
    expect(await res.json()).toEqual({ liked: true, likeCount: 8 });
  });

  it("removes a first-party like when the viewer already liked the post", async () => {
    getAuth.mockResolvedValue({ userId: "user_1" });
    getUser.mockResolvedValue({
      name: "Tseka Luk",
      email: "tseka@nebutra.com",
      imageUrl: "https://example.com/avatar.png",
    });
    fetch.mockResolvedValueOnce({ _id: "blogReaction_hash" }).mockResolvedValueOnce(7);

    const { POST } = await import("../../reactions/route");
    const res = await POST(
      request("/api/blog/reactions", {
        method: "POST",
        headers: { origin: "https://nebutra.com" },
        body: JSON.stringify({
          translationKey: "think-different-ai-homogenization",
          slug: "think-different-ai-homogenization",
          language: "en",
          kind: "like",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(deleteDoc).toHaveBeenCalledWith("blogReaction_hash");
    expect(await res.json()).toEqual({ liked: false, likeCount: 7 });
  });

  it("creates a pending first-party comment with authenticated author metadata", async () => {
    getAuth.mockResolvedValue({ userId: "user_1" });
    getUser.mockResolvedValue({
      name: "Tseka Luk",
      email: "tseka@nebutra.com",
      imageUrl: "https://example.com/avatar.png",
    });
    create.mockResolvedValue({
      _id: "comment_pending",
      body: "Insightful.",
      status: "pending",
      createdAt: "2026-05-21T00:00:00.000Z",
    });

    const { POST } = await import("../route");
    const res = await POST(
      request("/api/blog/comments", {
        method: "POST",
        headers: { origin: "https://nebutra.com" },
        body: JSON.stringify({
          translationKey: "think-different-ai-homogenization",
          slug: "think-different-ai-homogenization",
          language: "en",
          body: "  Insightful.  ",
        }),
      }),
    );

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "blogComment",
        translationKey: "think-different-ai-homogenization",
        postSlug: "think-different-ai-homogenization",
        language: "en",
        body: "Insightful.",
        status: "pending",
        authorId: "user_1",
        authorName: "Tseka Luk",
        authorEmail: "tseka@nebutra.com",
        authorImageUrl: "https://example.com/avatar.png",
      }),
    );
    expect(await res.json()).toEqual({
      comment: expect.objectContaining({
        id: "comment_pending",
        body: "Insightful.",
        status: "pending",
      }),
    });
  });

  it("rejects writes when the Sanity write token is missing", async () => {
    vi.stubEnv("SANITY_API_TOKEN", "");
    getAuth.mockResolvedValue({ userId: "user_1" });

    const { POST } = await import("../route");
    const res = await POST(
      request("/api/blog/comments", {
        method: "POST",
        body: JSON.stringify({
          translationKey: "think-different-ai-homogenization",
          slug: "think-different-ai-homogenization",
          language: "en",
          body: "I agree.",
        }),
      }),
    );

    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });
});
