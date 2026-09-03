import { describe, expect, it } from "vitest";
import {
  type ConsentRecord,
  consentGap,
  FACE_NOTICE,
  FACE_NOTICE_SLUG,
  FACE_NOTICE_VERSION,
  isConsentCurrent,
} from "./consent";

function record(over: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    documentSlug: FACE_NOTICE_SLUG,
    documentVersion: FACE_NOTICE_VERSION,
    consentType: "EXPLICIT",
    consentGiven: true,
    consentedAt: "2026-09-03T00:00:00.000Z",
    consentContext: "shoot",
    ...over,
  };
}

describe("face consent", () => {
  it("clears someone who accepted the current notice", () => {
    expect(isConsentCurrent(record())).toBe(true);
    expect(consentGap(record())).toBeNull();
  });

  it("tells the three failures apart, because they need different sentences", () => {
    expect(consentGap(null)).toBe("never");
    expect(consentGap(record({ consentGiven: false }))).toBe("never");
    expect(consentGap(record({ withdrawnAt: "2026-09-04T00:00:00.000Z" }))).toBe("withdrawn");
    expect(consentGap(record({ documentVersion: "2026-01-01" }))).toBe("outdated");
  });

  it("stops clearing someone once the notice is rewritten", () => {
    // The point of versioning it: a person who agreed to different words has
    // not agreed to these.
    expect(isConsentCurrent(record({ documentVersion: "2020-01-01" }))).toBe(false);
  });

  it("does not accept a record written against another document", () => {
    expect(isConsentCurrent(record({ documentSlug: "terms-of-service" }))).toBe(false);
  });

  it("keeps a withdrawn record refused even if it still says given", () => {
    // withdrawnAt wins. The record is stamped rather than deleted, so both
    // fields coexist and only one of them may decide.
    expect(
      isConsentCurrent(record({ consentGiven: true, withdrawnAt: "2026-09-04T00:00:00.000Z" })),
    ).toBe(false);
  });

  it("says what it actually does, in the notice itself", () => {
    const text = FACE_NOTICE.points.join("");
    expect(text).toContain("第三方模型");
    expect(text).toContain("原图不会被保存");
    expect(text).toContain("撤回");
  });
});
