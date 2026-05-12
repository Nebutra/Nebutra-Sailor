/**
 * Browser-side passkey (WebAuthn) helpers.
 *
 * Wraps `@simplewebauthn/browser` ceremonies and our Better Auth plugin
 * endpoints (`/api/auth/passkey/*`). Three call sites consume this:
 *
 *  1. `signInWithPasskey()` — explicit modal flow (user clicks "Use passkey")
 *  2. `enablePasskeyConditionalUI()` — WebAuthn Conditional UI on form mount
 *     (browser autofills passkeys in the email field's autocomplete)
 *  3. `registerPasskey()` — account-settings flow to enroll a new credential
 *
 * Plus management helpers (`listPasskeys`, `revokePasskey`) for account
 * settings.
 */

import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

const BASE_PATH = "/api/auth/passkey";

export interface PasskeyDescriptor {
  id: string;
  name: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
}

interface PasskeyAuthResult {
  verified: true;
  token: string;
  user: { id: string; email: string | null; name: string | null };
}

export class PasskeyError extends Error {
  constructor(
    public readonly code:
      | "unsupported"
      | "cancelled"
      | "missing_challenge"
      | "verification_failed"
      | "unknown_credential"
      | "session_failed"
      | "network_error"
      | "unauthorized",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "PasskeyError";
  }
}

async function postJson(path: string, body?: unknown): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function isCancelError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "NotAllowedError" ||
    error.name === "AbortError" ||
    /timed out|cancel/i.test(error.message)
  );
}

/* ─── capability checks ──────────────────────────────────────────────── */

export function isPasskeySupported(): boolean {
  return browserSupportsWebAuthn();
}

export async function isConditionalUISupported(): Promise<boolean> {
  try {
    return await browserSupportsWebAuthnAutofill();
  } catch {
    return false;
  }
}

/* ─── authentication ─────────────────────────────────────────────────── */

/**
 * Run an explicit passkey sign-in (user clicked the button).
 * Returns the verified result on success; throws `PasskeyError` otherwise.
 */
export async function signInWithPasskey(options?: { email?: string }): Promise<PasskeyAuthResult> {
  if (!isPasskeySupported()) {
    throw new PasskeyError("unsupported", "WebAuthn not supported in this browser");
  }

  const optsRes = await postJson("/authenticate/options", options ?? {});
  if (!optsRes.ok) throw new PasskeyError("network_error", "Failed to fetch options");
  const optionsJSON = await optsRes.json();

  let authResponse;
  try {
    authResponse = await startAuthentication({ optionsJSON });
  } catch (error) {
    if (isCancelError(error)) throw new PasskeyError("cancelled");
    throw error;
  }

  const verifyRes = await postJson("/authenticate/verify", { response: authResponse });
  if (!verifyRes.ok) {
    const body = (await verifyRes.json().catch(() => ({}))) as { error?: string };
    throw new PasskeyError(
      (body.error as PasskeyError["code"]) || "verification_failed",
      body.error,
    );
  }
  return (await verifyRes.json()) as PasskeyAuthResult;
}

/**
 * Enable WebAuthn Conditional UI for a passkey-aware email/username field.
 *
 * Pass an `AbortSignal` (e.g. from `useEffect`) so we can stop listening
 * when the component unmounts. On a successful passkey selection the
 * `onSuccess` callback fires with the verified session result.
 *
 * The browser surfaces the available passkeys (for this origin) in the
 * email input's autocomplete dropdown — the user picks one and the
 * ceremony runs without an explicit button press. Standard 2026 pattern.
 */
export async function enablePasskeyConditionalUI(opts: {
  signal: AbortSignal;
  onSuccess: (result: PasskeyAuthResult) => void;
  onError?: (error: unknown) => void;
}): Promise<void> {
  if (!isPasskeySupported() || !(await isConditionalUISupported())) return;

  try {
    const optsRes = await postJson("/authenticate/options");
    if (!optsRes.ok) return;
    const optionsJSON = await optsRes.json();

    if (opts.signal.aborted) return;

    let authResponse;
    try {
      authResponse = await startAuthentication({
        optionsJSON,
        useBrowserAutofill: true,
      });
    } catch (error) {
      if (isCancelError(error) || opts.signal.aborted) return;
      throw error;
    }

    if (opts.signal.aborted) return;

    const verifyRes = await postJson("/authenticate/verify", { response: authResponse });
    if (!verifyRes.ok) {
      const body = (await verifyRes.json().catch(() => ({}))) as { error?: string };
      opts.onError?.(new PasskeyError("verification_failed", body.error));
      return;
    }
    const result = (await verifyRes.json()) as PasskeyAuthResult;
    if (!opts.signal.aborted) opts.onSuccess(result);
  } catch (error) {
    if (!opts.signal.aborted) opts.onError?.(error);
  }
}

/* ─── registration (account settings) ────────────────────────────────── */

export async function registerPasskey(opts: { name?: string }): Promise<{ verified: true }> {
  if (!isPasskeySupported()) {
    throw new PasskeyError("unsupported", "WebAuthn not supported in this browser");
  }

  const optsRes = await postJson("/register/options", opts.name ? { name: opts.name } : {});
  if (optsRes.status === 401) throw new PasskeyError("unauthorized");
  if (!optsRes.ok) throw new PasskeyError("network_error");
  const optionsJSON = await optsRes.json();

  let regResponse;
  try {
    regResponse = await startRegistration({ optionsJSON });
  } catch (error) {
    if (isCancelError(error)) throw new PasskeyError("cancelled");
    throw error;
  }

  const verifyRes = await postJson("/register/verify", {
    response: regResponse,
    ...(opts.name ? { name: opts.name } : {}),
  });
  if (!verifyRes.ok) {
    const body = (await verifyRes.json().catch(() => ({}))) as { error?: string };
    throw new PasskeyError(
      (body.error as PasskeyError["code"]) || "verification_failed",
      body.error,
    );
  }
  return (await verifyRes.json()) as { verified: true };
}

/* ─── management ─────────────────────────────────────────────────────── */

export async function listPasskeys(): Promise<PasskeyDescriptor[]> {
  const res = await fetch(`${BASE_PATH}/list`, { credentials: "include" });
  if (!res.ok) throw new PasskeyError("network_error");
  const body = (await res.json()) as { passkeys: PasskeyDescriptor[] };
  return body.passkeys;
}

export async function revokePasskey(id: string): Promise<void> {
  const res = await postJson("/revoke", { id });
  if (!res.ok) throw new PasskeyError("network_error");
}
