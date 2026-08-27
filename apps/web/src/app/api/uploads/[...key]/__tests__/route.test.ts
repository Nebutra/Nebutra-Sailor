import { beforeEach, describe, expect, it, vi } from "vitest";

const getDownloadUrlMock = vi.fn();

vi.mock("@nebutra/uploads", () => ({
  getUploadProvider: () =>
    Promise.resolve({
      getDownloadUrl: getDownloadUrlMock,
    }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn() },
}));

async function loadRoute() {
  return import("../route");
}

describe("GET /api/uploads/[...key]", () => {
  beforeEach(() => {
    getDownloadUrlMock.mockReset();
  });

  it("redirects managed avatar keys to a short-lived signed download URL", async () => {
    getDownloadUrlMock.mockResolvedValue("https://signed.example/user-avatar.png");
    const { GET } = await loadRoute();

    const response = await GET(
      new Request("https://app.example/api/uploads/user-avatars/u/a.png"),
      {
        params: Promise.resolve({ key: ["user-avatars", "u", "a.png"] }),
      },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://signed.example/user-avatar.png");
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    expect(getDownloadUrlMock).toHaveBeenCalledWith("user-avatars", "user-avatars/u/a.png", 60);
  });

  it("rejects unapproved upload key prefixes", async () => {
    const { GET } = await loadRoute();

    const response = await GET(new Request("https://app.example/api/uploads/secrets/a.txt"), {
      params: Promise.resolve({ key: ["secrets", "a.txt"] }),
    });

    expect(response.status).toBe(404);
    expect(getDownloadUrlMock).not.toHaveBeenCalled();
  });
});
