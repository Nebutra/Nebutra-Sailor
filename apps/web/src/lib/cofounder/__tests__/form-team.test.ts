import { describe, expect, it } from "vitest";
import {
  assertFormTeamEligible,
  buildTransferJournalEntries,
  FormTeamError,
} from "../form-team";

describe("assertFormTeamEligible", () => {
  const ok = { isMatch: true, initiatorPaid: true, isInitiatorOwnerOfProject: true };

  it("passes when match + paid + owner", () => {
    expect(() => assertFormTeamEligible(ok)).not.toThrow();
  });

  it("rejects a non-match with code not-a-match", () => {
    expect(() => assertFormTeamEligible({ ...ok, isMatch: false })).toThrow(FormTeamError);
    try {
      assertFormTeamEligible({ ...ok, isMatch: false });
    } catch (e) {
      expect((e as FormTeamError).code).toBe("not-a-match");
    }
  });

  it("rejects an unpaid initiator with code unpaid", () => {
    try {
      assertFormTeamEligible({ ...ok, initiatorPaid: false });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as FormTeamError).code).toBe("unpaid");
    }
  });

  it("rejects a non-owner with code not-owner", () => {
    try {
      assertFormTeamEligible({ ...ok, isInitiatorOwnerOfProject: false });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as FormTeamError).code).toBe("not-owner");
    }
  });

  it("checks match before paywall (non-match unpaid -> not-a-match)", () => {
    try {
      assertFormTeamEligible({ isMatch: false, initiatorPaid: false, isInitiatorOwnerOfProject: false });
    } catch (e) {
      expect((e as FormTeamError).code).toBe("not-a-match");
    }
  });
});

describe("buildTransferJournalEntries", () => {
  const input = {
    fromTenantId: "tenant_indiv",
    toOrganizationId: "org_new",
    projectId: "startup_abc",
    cofounderProfileId: "prof_them",
    userId: "user_me",
  };

  it("emits a whole-project entry and a license entry, both pending", () => {
    const entries = buildTransferJournalEntries(input);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.status === "pending")).toBe(true);
    expect(entries.every((e) => e.fromTenantId === "tenant_indiv")).toBe(true);
    expect(entries.every((e) => e.toOrganizationId === "org_new")).toBe(true);
  });

  it("carries the project id on the startup_project entry, null on license", () => {
    const entries = buildTransferJournalEntries(input);
    const project = entries.find((e) => e.kind === "startup_project");
    const license = entries.find((e) => e.kind === "license");
    expect(project?.subjectId).toBe("startup_abc");
    expect(license?.subjectId).toBeNull();
  });

  it("attributes the initiator and cofounder", () => {
    const [entry] = buildTransferJournalEntries(input);
    expect(entry.initiatedByUserId).toBe("user_me");
    expect(entry.cofounderProfileId).toBe("prof_them");
  });
});
