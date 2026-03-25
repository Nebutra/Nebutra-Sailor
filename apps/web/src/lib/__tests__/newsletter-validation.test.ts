import { describe, expect, it } from "vitest";
import { z } from "zod";

// Reproduce the same schema used in apps/landing-page/src/app/api/newsletter/route.ts
const schema = z.object({
  email: z.string().email(),
});

describe("newsletter email validation schema", () => {
  describe("valid emails", () => {
    it("accepts a standard email address", () => {
      const result = schema.safeParse({ email: "user@example.com" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
      }
    });

    it("accepts an email with subdomain", () => {
      const result = schema.safeParse({ email: "user@mail.example.com" });
      expect(result.success).toBe(true);
    });

    it("accepts an email with plus addressing", () => {
      const result = schema.safeParse({ email: "user+tag@example.com" });
      expect(result.success).toBe(true);
    });

    it("accepts an email with dots in local part", () => {
      const result = schema.safeParse({ email: "first.last@example.com" });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid emails", () => {
    it("rejects an email without @", () => {
      const result = schema.safeParse({ email: "userexample.com" });
      expect(result.success).toBe(false);
    });

    it("rejects an empty string", () => {
      const result = schema.safeParse({ email: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a string with only @", () => {
      const result = schema.safeParse({ email: "@" });
      expect(result.success).toBe(false);
    });

    it("rejects an email without domain", () => {
      const result = schema.safeParse({ email: "user@" });
      expect(result.success).toBe(false);
    });

    it("rejects an email without local part", () => {
      const result = schema.safeParse({ email: "@example.com" });
      expect(result.success).toBe(false);
    });

    it("rejects a plain string that is not an email", () => {
      const result = schema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
    });
  });

  describe("missing or wrong type", () => {
    it("rejects missing email field", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects null email", () => {
      const result = schema.safeParse({ email: null });
      expect(result.success).toBe(false);
    });

    it("rejects numeric email", () => {
      const result = schema.safeParse({ email: 12345 });
      expect(result.success).toBe(false);
    });

    it("rejects an entirely empty body", () => {
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });
});
