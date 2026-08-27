import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailProvider } from "../provider";
import { ConsoleEmailProvider } from "../providers/console";

describe("EmailProvider interface", () => {
  it("defines the correct shape", () => {
    const provider: EmailProvider = {
      send: async () => ({ id: "test" }),
      name: "test",
    };

    expect(provider.name).toBe("test");
    expect(typeof provider.send).toBe("function");
  });
});

describe("ConsoleEmailProvider", () => {
  let provider: ConsoleEmailProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutSpy: any;

  beforeEach(() => {
    provider = new ConsoleEmailProvider();
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("has the correct name", () => {
    expect(provider.name).toBe("console");
  });

  it("returns a generated id on send", async () => {
    const result = await provider.send({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      from: "noreply@nebutra.com",
    });

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);
  });

  it("writes email details to stdout", async () => {
    await provider.send({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      from: "Nebutra <noreply@nebutra.com>",
    });

    const output = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join("");
    expect(output).toContain("user@example.com");
    expect(output).toContain("Test Subject");
    expect(output).toContain("noreply@nebutra.com");
  });

  it("handles array recipients", async () => {
    await provider.send({
      to: ["a@test.com", "b@test.com"],
      subject: "Multi",
      html: "<p>Hi</p>",
      from: "noreply@nebutra.com",
    });

    const output = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join("");
    expect(output).toContain("a@test.com");
    expect(output).toContain("b@test.com");
  });

  it("includes tags when provided", async () => {
    await provider.send({
      to: "user@example.com",
      subject: "Tagged",
      html: "<p>Hi</p>",
      from: "noreply@nebutra.com",
      tags: [{ name: "type", value: "welcome" }],
    });

    const output = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join("");
    expect(output).toContain("welcome");
  });
});

describe("getEmailProvider (factory)", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    // Reset cached provider between tests
    const { resetEmailProvider } = await import("../provider");
    resetEmailProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns console provider when no credentials are set", async () => {
    const { getEmailProvider } = await import("../provider");
    const provider = getEmailProvider();
    expect(provider.name).toBe("console");
  });

  it("returns console provider when EMAIL_PROVIDER=console", async () => {
    process.env.EMAIL_PROVIDER = "console";
    process.env.RESEND_API_KEY = "re_test_123"; // should be ignored
    const { resetEmailProvider, getEmailProvider } = await import("../provider");
    resetEmailProvider();
    const provider = getEmailProvider();
    expect(provider.name).toBe("console");
  });

  it("returns resend provider when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const { resetEmailProvider, getEmailProvider } = await import("../provider");
    resetEmailProvider();
    const provider = getEmailProvider();
    expect(provider.name).toBe("resend");
  });

  it("returns nodemailer provider when SMTP_HOST is set", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    const { resetEmailProvider, getEmailProvider } = await import("../provider");
    resetEmailProvider();
    const provider = getEmailProvider();
    expect(provider.name).toBe("nodemailer");
  });
});
