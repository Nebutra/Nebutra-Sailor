import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const loggerErrorMock = vi.fn();
const deleteFileMock = vi.fn();

const dbMock = {
  organization: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  organizationMember: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

vi.mock("@nebutra/uploads", () => ({
  getUploadProvider: () =>
    Promise.resolve({
      createPresignedUpload: ({ key, contentType }: { key: string; contentType: string }) =>
        Promise.resolve({
          method: "PUT",
          url: `https://uploads.example.com/${key}`,
          key,
          headers: { "content-type": contentType },
          expiresIn: 3600,
        }),
      deleteFile: deleteFileMock,
    }),
}));

const params = (orgId = "org_alpha") => Promise.resolve({ orgId });

async function loadOrgRoute() {
  return import("@/app/api/organizations/[orgId]/route");
}
async function loadLogoUrlRoute() {
  return import("@/app/api/organizations/[orgId]/logo-upload-url/route");
}
async function loadLogoFinalizeRoute() {
  return import("@/app/api/organizations/[orgId]/logo/route");
}

beforeEach(() => {
  getAuthMock.mockReset();
  loggerErrorMock.mockReset();
  dbMock.organization.findUnique.mockReset();
  dbMock.organization.update.mockReset();
  dbMock.organization.delete.mockReset();
  dbMock.organizationMember.findUnique.mockReset();
  deleteFileMock.mockReset();
});

describe("PATCH /api/organizations/[orgId] (rename)", () => {
  it("returns 401 when unauthenticated", async () => {
    getAuthMock.mockResolvedValue({ userId: null, orgId: null });
    const { PATCH } = await loadOrgRoute();
    const response = await PATCH(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "PATCH",
        body: JSON.stringify({ name: "Acme Inc" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 when caller is not admin/owner", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "m1",
      role: "MEMBER",
    });

    const { PATCH } = await loadOrgRoute();
    const response = await PATCH(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "PATCH",
        body: JSON.stringify({ name: "Acme Inc" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(403);
    expect(dbMock.organization.update).not.toHaveBeenCalled();
  });

  it("returns 400 when name is too short", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "m1",
      role: "ADMIN",
    });

    const { PATCH } = await loadOrgRoute();
    const response = await PATCH(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "PATCH",
        body: JSON.stringify({ name: "A" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when organization does not exist", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "m1",
      role: "ADMIN",
    });
    dbMock.organization.findUnique.mockResolvedValue(null);

    const { PATCH } = await loadOrgRoute();
    const response = await PATCH(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "PATCH",
        body: JSON.stringify({ name: "Acme Inc" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(404);
  });

  it("renames organization on success", async () => {
    getAuthMock.mockResolvedValue({ userId: "owner_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "m1",
      role: "OWNER",
    });
    dbMock.organization.findUnique.mockResolvedValue({ id: "org_alpha" });
    dbMock.organization.update.mockResolvedValue({
      id: "org_alpha",
      name: "Acme Inc",
      slug: "acme",
      plan: "FREE",
      updatedAt: new Date("2026-05-09T00:00:00.000Z"),
    });

    const { PATCH } = await loadOrgRoute();
    const response = await PATCH(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "PATCH",
        body: JSON.stringify({ name: "Acme Inc" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      organization: {
        id: "org_alpha",
        name: "Acme Inc",
        slug: "acme",
        plan: "FREE",
        updatedAt: "2026-05-09T00:00:00.000Z",
      },
    });
    expect(dbMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org_alpha" },
      data: { name: "Acme Inc" },
      select: { id: true, name: true, slug: true, plan: true, updatedAt: true },
    });
  });
});

describe("DELETE /api/organizations/[orgId]", () => {
  it("returns 401 when unauthenticated", async () => {
    getAuthMock.mockResolvedValue({ userId: null, orgId: null });
    const { DELETE } = await loadOrgRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "Acme" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(401);
  });

  it("blocks non-owner admins", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "m1",
      role: "ADMIN",
    });

    const { DELETE } = await loadOrgRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "Acme" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(403);
    expect(dbMock.organization.delete).not.toHaveBeenCalled();
  });

  it("returns 400 when confirmation is missing", async () => {
    getAuthMock.mockResolvedValue({ userId: "owner_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "m1",
      role: "OWNER",
    });

    const { DELETE } = await loadOrgRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "DELETE",
        body: "{}",
      }),
      { params: params() },
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when confirmation does not match name", async () => {
    getAuthMock.mockResolvedValue({ userId: "owner_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "m1",
      role: "OWNER",
    });
    dbMock.organization.findUnique.mockResolvedValue({
      id: "org_alpha",
      name: "Acme Inc",
    });

    const { DELETE } = await loadOrgRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "wrong" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(400);
    expect(dbMock.organization.delete).not.toHaveBeenCalled();
  });

  it("deletes organization on success", async () => {
    getAuthMock.mockResolvedValue({ userId: "owner_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "m1",
      role: "OWNER",
    });
    dbMock.organization.findUnique.mockResolvedValue({
      id: "org_alpha",
      name: "Acme Inc",
    });
    dbMock.organization.delete.mockResolvedValue({ id: "org_alpha" });

    const { DELETE } = await loadOrgRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "Acme Inc" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(dbMock.organization.delete).toHaveBeenCalledWith({ where: { id: "org_alpha" } });
  });
});

describe("POST /api/organizations/[orgId]/logo-upload-url", () => {
  it("returns 401 when unauthenticated", async () => {
    getAuthMock.mockResolvedValue({ userId: null, orgId: null });
    const { POST } = await loadLogoUrlRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo-upload-url", {
        method: "POST",
        body: JSON.stringify({ contentType: "image/png" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admins", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });

    const { POST } = await loadLogoUrlRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo-upload-url", {
        method: "POST",
        body: JSON.stringify({ contentType: "image/png" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(403);
  });

  it("rejects unsupported content types", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });

    const { POST } = await loadLogoUrlRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo-upload-url", {
        method: "POST",
        body: JSON.stringify({ contentType: "image/gif" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(400);
  });

  it("returns presigned upload URL on success", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });

    const { POST } = await loadLogoUrlRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo-upload-url", {
        method: "POST",
        body: JSON.stringify({ contentType: "image/png" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.method).toBe("PUT");
    expect(body.headers["content-type"]).toBe("image/png");
    expect(body.key).toMatch(/^org-logos\/org_alpha\/\d+\.png$/);
    expect(typeof body.url).toBe("string");
  });
});

describe("POST /api/organizations/[orgId]/logo (finalize)", () => {
  it("returns 401 when unauthenticated", async () => {
    getAuthMock.mockResolvedValue({ userId: null, orgId: null });
    const { POST } = await loadLogoFinalizeRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo", {
        method: "POST",
        body: JSON.stringify({ key: "org-logos/org_alpha/123.png" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admins", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });
    const { POST } = await loadLogoFinalizeRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo", {
        method: "POST",
        body: JSON.stringify({ key: "org-logos/org_alpha/123.png" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(403);
  });

  it("rejects keys that target a different organization", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    const { POST } = await loadLogoFinalizeRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo", {
        method: "POST",
        body: JSON.stringify({ key: "org-logos/other_org/123.png" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(400);
    expect(dbMock.organization.update).not.toHaveBeenCalled();
  });

  it("persists the logo key on success", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    dbMock.organization.findUnique.mockResolvedValue({
      logo: null,
    });
    dbMock.organization.update.mockResolvedValue({
      id: "org_alpha",
      name: "Acme",
      slug: "acme",
    });

    const { POST } = await loadLogoFinalizeRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo", {
        method: "POST",
        body: JSON.stringify({ key: "org-logos/org_alpha/12345.png" }),
      }),
      { params: params() },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.organization.id).toBe("org_alpha");
    expect(body.organization.logo).toBe("org-logos/org_alpha/12345.png");
    expect(typeof body.organization.logoUrl).toBe("string");
    expect(dbMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org_alpha" },
      data: { logo: "org-logos/org_alpha/12345.png" },
      select: { id: true, name: true, slug: true },
    });
  });

  it("deletes the previous managed logo key when replacing it", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    dbMock.organization.findUnique.mockResolvedValue({
      logo: "org-logos/org_alpha/old.png",
    });
    dbMock.organization.update.mockResolvedValue({
      id: "org_alpha",
      name: "Acme",
      slug: "acme",
    });

    const { POST } = await loadLogoFinalizeRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo", {
        method: "POST",
        body: JSON.stringify({ key: "org-logos/org_alpha/new.png" }),
      }),
      { params: params() },
    );

    expect(response.status).toBe(200);
    expect(deleteFileMock).toHaveBeenCalledWith("org-logos", "org-logos/org_alpha/old.png");
  });

  it("does not delete external logo URLs when replacing them", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    dbMock.organization.findUnique.mockResolvedValue({
      logo: "https://images.example.com/logo.png",
    });
    dbMock.organization.update.mockResolvedValue({
      id: "org_alpha",
      name: "Acme",
      slug: "acme",
    });

    const { POST } = await loadLogoFinalizeRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/org_alpha/logo", {
        method: "POST",
        body: JSON.stringify({ key: "org-logos/org_alpha/new.png" }),
      }),
      { params: params() },
    );

    expect(response.status).toBe(200);
    expect(deleteFileMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/organizations/[orgId]/logo", () => {
  it("returns 401 when unauthenticated", async () => {
    getAuthMock.mockResolvedValue({ userId: null, orgId: null });
    const { DELETE } = await loadLogoFinalizeRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha/logo"),
      {
        params: params(),
      },
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admins", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });

    const { DELETE } = await loadLogoFinalizeRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha/logo"),
      {
        params: params(),
      },
    );

    expect(response.status).toBe(403);
    expect(dbMock.organization.update).not.toHaveBeenCalled();
  });

  it("clears logo and deletes managed storage key", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    dbMock.organization.findUnique.mockResolvedValue({
      logo: "org-logos/org_alpha/current.png",
    });
    dbMock.organization.update.mockResolvedValue({
      id: "org_alpha",
      name: "Acme",
      slug: "acme",
    });

    const { DELETE } = await loadLogoFinalizeRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha/logo"),
      {
        params: params(),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      organization: {
        id: "org_alpha",
        name: "Acme",
        slug: "acme",
        logo: null,
        logoUrl: null,
      },
    });
    expect(dbMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org_alpha" },
      data: { logo: null },
      select: { id: true, name: true, slug: true },
    });
    expect(deleteFileMock).toHaveBeenCalledWith("org-logos", "org-logos/org_alpha/current.png");
  });

  it("clears logo without deleting external URLs", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    dbMock.organization.findUnique.mockResolvedValue({
      logo: "https://images.example.com/logo.png",
    });
    dbMock.organization.update.mockResolvedValue({
      id: "org_alpha",
      name: "Acme",
      slug: "acme",
    });

    const { DELETE } = await loadLogoFinalizeRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha/logo"),
      {
        params: params(),
      },
    );

    expect(response.status).toBe(200);
    expect(deleteFileMock).not.toHaveBeenCalled();
  });
});
