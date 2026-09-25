import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type MockAuthServer, startMockAuthServer } from "./device-auth-mock-server";
import { runCliInDir } from "./helpers";

describe("nebutra whoami / logout", () => {
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
    server = await startMockAuthServer({
      pendingPolls: 0,
      email: "whoami@example.com",
      name: "Whoami Tester",
    });
    configHome = mkdtempSync(join(tmpdir(), "nebutra-whoami-xdg-"));
    cwd = mkdtempSync(join(tmpdir(), "nebutra-whoami-cwd-"));
  });

  afterEach(async () => {
    await server.close();
    rmSync(configHome, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  it("reports not logged in before any login", async () => {
    const result = await runCliInDir(["whoami", "--json"], cwd, env());
    expect(result.exitCode).not.toBe(0);
    const payload = JSON.parse(result.stdout) as { success: boolean; error: string };
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("missing");
  });

  it("reports the signed-in identity after login", async () => {
    const login = await runCliInDir(["login", "--no-browser"], cwd, env());
    expect(login.exitCode).toBe(0);

    const who = await runCliInDir(["whoami", "--json"], cwd, env());
    expect(who.exitCode).toBe(0);
    const payload = JSON.parse(who.stdout) as {
      success: boolean;
      email: string;
      tokenSource: string;
    };
    expect(payload.success).toBe(true);
    expect(payload.email).toBe("whoami@example.com");
    expect(payload.tokenSource).toBe("file");
  });

  it("NEBUTRA_TOKEN overrides stored credentials", async () => {
    const login = await runCliInDir(["login", "--no-browser"], cwd, env());
    expect(login.exitCode).toBe(0);

    // A bearer token the mock server has never issued — if NEBUTRA_TOKEN
    // wins over the stored (valid) credential, whoami must fail against it.
    const who = await runCliInDir(
      ["whoami", "--json"],
      cwd,
      env({ NEBUTRA_TOKEN: "totally-bogus-token" }),
    );
    expect(who.exitCode).not.toBe(0);
    const payload = JSON.parse(who.stdout) as { success: boolean; error: string };
    expect(payload.success).toBe(false);
    // fetchWhoami returns null for an unrecognised token → same "expired"
    // (re-auth) path as a stale stored session.
    expect(payload.error).toBe("expired");
  });

  it("logout clears the stored credential so whoami fails again", async () => {
    const login = await runCliInDir(["login", "--no-browser"], cwd, env());
    expect(login.exitCode).toBe(0);
    expect(existsSync(join(configHome, "nebutra", "credentials.json"))).toBe(true);

    const logout = await runCliInDir(["logout", "--format", "json"], cwd, env());
    expect(logout.exitCode).toBe(0);
    expect(existsSync(join(configHome, "nebutra", "credentials.json"))).toBe(false);

    const who = await runCliInDir(["whoami", "--json"], cwd, env());
    expect(who.exitCode).not.toBe(0);
  });
});
