import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type MockAuthServer, startMockAuthServer } from "./device-auth-mock-server";
import { runCliInDir } from "./helpers";

/**
 * Exercises the real, built CLI (`dist/index.js`, per `npx tsup` in
 * package.json's `test` script) against a local mock of the auth center's
 * device-authorization endpoints. NEBUTRA_NO_KEYCHAIN=1 keeps the test off
 * the real OS keychain; XDG_CONFIG_HOME is a fresh temp dir per test.
 */
describe("nebutra login", () => {
  let server: MockAuthServer;
  let configHome: string;
  let cwd: string;

  function env(overrides: Record<string, string | undefined> = {}) {
    const merged: Record<string, string | undefined> = {
      ...process.env,
      XDG_CONFIG_HOME: configHome,
      NEBUTRA_NO_KEYCHAIN: "1",
      NEBUTRA_AUTH_URL: server.url,
      CI: "true",
    };
    if (!("NEBUTRA_TOKEN" in overrides)) delete merged.NEBUTRA_TOKEN;
    Object.assign(merged, overrides);
    return merged;
  }

  beforeEach(async () => {
    server = await startMockAuthServer({ pendingPolls: 0, email: "agent@example.com" });
    configHome = mkdtempSync(join(tmpdir(), "nebutra-login-xdg-"));
    cwd = mkdtempSync(join(tmpdir(), "nebutra-login-cwd-"));
  });

  afterEach(async () => {
    await server.close();
    rmSync(configHome, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  it("--json exits 0 immediately without polling and persists no credential yet", async () => {
    const result = await runCliInDir(["login", "--json", "--no-browser"], cwd, env());

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      success: boolean;
      pending: boolean;
      user_code: string;
      verification_uri: string;
      verification_uri_complete: string;
      expires_in: number;
      interval: number;
    };
    expect(payload.success).toBe(true);
    expect(payload.pending).toBe(true);
    expect(payload.user_code).toBeTruthy();
    expect(payload.verification_uri_complete).toContain(payload.user_code);

    // Did not block on the poll — no /device/token requests recorded, and
    // no credential written yet.
    expect(server.requests.some((r) => r.path === "/api/auth/device/token")).toBe(false);
    expect(existsSync(join(configHome, "nebutra", "credentials.json"))).toBe(false);
    expect(existsSync(join(configHome, "nebutra", "device-pending.json"))).toBe(true);
  });

  it("--poll resumes the pending code from --json and persists credentials on approval", async () => {
    const first = await runCliInDir(["login", "--json", "--no-browser"], cwd, env());
    expect(first.exitCode).toBe(0);

    const second = await runCliInDir(["login", "--poll", "--json", "--no-browser"], cwd, env());
    expect(second.exitCode).toBe(0);
    const payload = JSON.parse(second.stdout) as {
      success: boolean;
      userId?: string;
      email?: string;
    };
    expect(payload.success).toBe(true);
    expect(payload.email).toBe("agent@example.com");

    const credPath = join(configHome, "nebutra", "credentials.json");
    expect(existsSync(credPath)).toBe(true);
    const mode = statSync(credPath).mode & 0o777;
    expect(mode).toBe(0o600);
    const stored = JSON.parse(readFileSync(credPath, "utf-8")) as { accessToken: string };
    expect(stored.accessToken).toBeTruthy();

    // Pending state is cleared once the flow completes.
    expect(existsSync(join(configHome, "nebutra", "device-pending.json"))).toBe(false);
  });

  it("plain `login --no-browser` blocks until approval and prints the user code", async () => {
    const result = await runCliInDir(["login", "--no-browser"], cwd, env());
    expect(result.exitCode).toBe(0);
    expect(result.stderr + result.stdout).toMatch(/Logged in/i);
    expect(existsSync(join(configHome, "nebutra", "credentials.json"))).toBe(true);
  });

  it("surfaces access_denied with a non-zero exit code", async () => {
    await server.close();
    server = await startMockAuthServer({ pendingPolls: 0, denyAfterPending: true });

    const result = await runCliInDir(["login", "--no-browser", "--json"], cwd, env({}));
    // --json without --poll never blocks, so denial only surfaces on --poll.
    expect(result.exitCode).toBe(0);

    const pollResult = await runCliInDir(["login", "--poll", "--json", "--no-browser"], cwd, env());
    expect(pollResult.exitCode).not.toBe(0);
    const payload = JSON.parse(pollResult.stdout) as { success: boolean; error: string };
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("access_denied");
  });

  it("does not persist credentials when NEBUTRA_AUTH_URL is unreachable", async () => {
    const result = await runCliInDir(
      ["login", "--json", "--no-browser"],
      cwd,
      env({ NEBUTRA_AUTH_URL: "http://127.0.0.1:1" }),
    );
    expect(result.exitCode).not.toBe(0);
    expect(existsSync(join(configHome, "nebutra", "credentials.json"))).toBe(false);
  });
});
