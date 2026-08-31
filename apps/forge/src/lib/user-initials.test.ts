import { describe, expect, it } from "vitest";
import { userInitials } from "./user-initials";

describe("userInitials", () => {
  it("uses the first letters of a display name", () => {
    expect(userInitials("Ada Lovelace", "ada@example.com")).toBe("AL");
  });

  it("falls back to the email local-part", () => {
    expect(userInitials(undefined, "ada@example.com")).toBe("A");
  });

  it("returns a placeholder when nothing is known", () => {
    expect(userInitials()).toBe("?");
  });
});
