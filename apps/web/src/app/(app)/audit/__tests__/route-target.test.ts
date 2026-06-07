import { describe, expect, it } from "vitest";
import { resolveAuditRouteTarget } from "../route-target";

describe("resolveAuditRouteTarget", () => {
  it("routes the legacy audit entry to the real audit log surface", () => {
    expect(resolveAuditRouteTarget()).toBe("/settings/audit-log");
  });
});
