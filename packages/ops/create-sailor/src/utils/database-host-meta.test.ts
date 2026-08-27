import { describe, expect, it } from "vitest";
import { getDatabaseHost } from "./database-host-meta";

describe("database host metadata", () => {
  it("models PlanetScale as the Postgres-compatible Sailor path", () => {
    const host = getDatabaseHost("planetscale");

    expect(host).toMatchObject({
      id: "planetscale",
      forcedEngine: "postgresql",
      keepDirectUrl: true,
      supportedEngines: ["postgresql"],
    });
    expect(host?.prismaDatasourceExtras ?? []).not.toContain('relationMode = "prisma"');
    expect(host?.envVars.map((env) => env.name)).toEqual(["DATABASE_URL", "DIRECT_URL"]);
  });
});
