import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("credentials-store", () => {
  let tempDir: string;
  const originalXdg = process.env.XDG_CONFIG_HOME;
  const originalNoKeychain = process.env.NEBUTRA_NO_KEYCHAIN;
  const originalToken = process.env.NEBUTRA_TOKEN;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "nebutra-credentials-test-"));
    process.env.XDG_CONFIG_HOME = tempDir;
    // Never touch the real OS keychain from a test run.
    process.env.NEBUTRA_NO_KEYCHAIN = "1";
    delete process.env.NEBUTRA_TOKEN;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalXdg;
    if (originalNoKeychain === undefined) delete process.env.NEBUTRA_NO_KEYCHAIN;
    else process.env.NEBUTRA_NO_KEYCHAIN = originalNoKeychain;
    if (originalToken === undefined) delete process.env.NEBUTRA_TOKEN;
    else process.env.NEBUTRA_TOKEN = originalToken;
  });

  it("saves credentials to a 0600 file when the keychain is disabled", async () => {
    const { saveCredentials } = await import("./credentials-store");
    const result = await saveCredentials({
      accessToken: "tok_abc",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      obtainedAt: new Date().toISOString(),
    });

    expect(result.storedIn).toBe("file");
    const filePath = join(tempDir, "nebutra", "credentials.json");
    expect(existsSync(filePath)).toBe(true);
    const mode = statSync(filePath).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("round-trips saved credentials through loadCredentials", async () => {
    const { saveCredentials, loadCredentials } = await import("./credentials-store");
    await saveCredentials({
      accessToken: "tok_roundtrip",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      obtainedAt: new Date().toISOString(),
    });

    const loaded = await loadCredentials();
    expect(loaded?.accessToken).toBe("tok_roundtrip");
  });

  it("deleteStoredCredentials removes the credentials file and pending state", async () => {
    const {
      saveCredentials,
      deleteStoredCredentials,
      loadCredentials,
      savePendingDeviceAuth,
      loadPendingDeviceAuth,
    } = await import("./credentials-store");
    await saveCredentials({
      accessToken: "tok_to_delete",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      obtainedAt: new Date().toISOString(),
    });
    await savePendingDeviceAuth({
      deviceCode: "dc",
      userCode: "uc",
      verificationUri: "http://x/device",
      verificationUriComplete: "http://x/device?user_code=uc",
      interval: 5,
      expiresAt: Date.now() + 60_000,
      baseUrl: "http://x",
    });

    const removed = await deleteStoredCredentials();
    expect(removed.length).toBeGreaterThan(0);
    expect(await loadCredentials()).toBeNull();
    expect(loadPendingDeviceAuth()).toBeNull();
  });

  it("resolveAccessToken prefers NEBUTRA_TOKEN over stored credentials", async () => {
    const { saveCredentials, resolveAccessToken } = await import("./credentials-store");
    await saveCredentials({
      accessToken: "tok_stored",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      obtainedAt: new Date().toISOString(),
    });
    process.env.NEBUTRA_TOKEN = "tok_from_env";

    const resolved = await resolveAccessToken();
    expect(resolved).toEqual({ token: "tok_from_env", source: "env", expired: false });
  });

  it("resolveAccessToken reports expiry from the stored credential", async () => {
    const { saveCredentials, resolveAccessToken } = await import("./credentials-store");
    await saveCredentials({
      accessToken: "tok_expired",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      obtainedAt: new Date(Date.now() - 3600_000).toISOString(),
    });

    const resolved = await resolveAccessToken();
    expect(resolved?.expired).toBe(true);
    expect(resolved?.source).toBe("file");
  });

  it("resolveAccessToken returns null when nothing is stored", async () => {
    const { resolveAccessToken } = await import("./credentials-store");
    expect(await resolveAccessToken()).toBeNull();
  });
});
