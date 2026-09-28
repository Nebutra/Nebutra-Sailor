import { describe, expect, it } from "vitest";
import { PREVIEW_DB_DEFAULT_PORT, previewDatabase } from "./preview-mode";
import { previewDatabase as workerdPreviewDatabase } from "./preview-mode.workerd";

describe("previewDatabase", () => {
  it("is off for any real DATABASE_URL, in every environment", () => {
    for (const NODE_ENV of ["development", "test", "production", undefined]) {
      expect(
        previewDatabase({ DATABASE_URL: "postgresql://u:p@db.example.com:5432/app", NODE_ENV }),
      ).toBeNull();
      expect(previewDatabase({ DATABASE_URL: "postgres://localhost/dev", NODE_ENV })).toBeNull();
    }
  });

  it("is on when DATABASE_URL is unset outside production", () => {
    expect(previewDatabase({ NODE_ENV: "development" })).toEqual({
      url: `postgresql://postgres:postgres@127.0.0.1:${PREVIEW_DB_DEFAULT_PORT}/postgres?sslmode=disable`,
      port: PREVIEW_DB_DEFAULT_PORT,
      role: "app_user",
    });
    expect(previewDatabase({ DATABASE_URL: "  " })?.port).toBe(PREVIEW_DB_DEFAULT_PORT);
  });

  it("never switches on implicitly in production — a missing DATABASE_URL stays an error there", () => {
    expect(previewDatabase({ NODE_ENV: "production" })).toBeNull();
  });

  it("honours an explicit pglite:/file: URL and its data directory", () => {
    expect(previewDatabase({ DATABASE_URL: "pglite:./.data/db" })?.dataDir).toBe("./.data/db");
    expect(
      previewDatabase({ DATABASE_URL: "file:///tmp/x", NODE_ENV: "production" })?.dataDir,
    ).toBe("/tmp/x");
    expect(previewDatabase({ DATABASE_URL: "pglite:" })?.dataDir).toBeUndefined();
  });

  it("takes the port from NEBUTRA_PREVIEW_DB_PORT", () => {
    expect(previewDatabase({ NEBUTRA_PREVIEW_DB_PORT: "6000" })?.url).toContain("127.0.0.1:6000/");
  });

  it("is always off in Workers", () => {
    expect(workerdPreviewDatabase({})).toBeNull();
    expect(workerdPreviewDatabase({ DATABASE_URL: "pglite:" })).toBeNull();
  });
});
