/**
 * Safe Google OAuth client/secret pairing probe.
 *
 * POSTs a deliberately invalid authorization code to Google's token endpoint
 * using this process's env. Interprets only Google's `error` code — never
 * returns secrets or tokens.
 *
 * | Google error        | Meaning                                      |
 * |---------------------|----------------------------------------------|
 * | invalid_grant       | client_id + secret accepted (pair is OK)     |
 * | invalid_client      | secret missing/wrong for this client_id      |
 * | invalid_request     | env incomplete (missing id/secret)           |
 */

export type GoogleOAuthPairingStatus =
  | "pair_ok"
  | "invalid_client"
  | "incomplete_env"
  | "redirect_or_other"
  | "network_error"
  | "skipped";

export type GoogleOAuthPairingProbe = {
  status: GoogleOAuthPairingStatus;
  /** Public client id suffix for operators (never the secret). */
  clientIdSuffix: string | null;
  redirectUri: string;
  googleError: string | null;
  googleErrorDescription: string | null;
};

function clientIdSuffix(clientId: string | undefined): string | null {
  const id = clientId?.trim();
  if (!id) return null;
  // e.g. …o4vq0962.apps.googleusercontent.com
  return id.length > 28 ? `…${id.slice(-28)}` : id;
}

/**
 * Probe whether GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are a valid pair for
 * the auth-center redirect URI. Safe to expose on /health?probe=google.
 */
export async function probeGoogleOAuthPairing(
  origin: string,
  env: Record<string, string | undefined> = process.env,
): Promise<GoogleOAuthPairingProbe> {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = `${origin.replace(/\/$/, "")}/api/auth/callback/google`;
  const base: Omit<GoogleOAuthPairingProbe, "status" | "googleError" | "googleErrorDescription"> = {
    clientIdSuffix: clientIdSuffix(clientId),
    redirectUri,
  };

  if (!clientId || !clientSecret) {
    return {
      ...base,
      status: "incomplete_env",
      googleError: null,
      googleErrorDescription: null,
    };
  }

  const body = new URLSearchParams({
    code: "nebutra-health-probe-not-a-real-code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // Health must stay snappy; Google is usually <300ms.
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      error_description?: string;
    } | null;
    const googleError = data?.error ?? (res.ok ? null : `http_${res.status}`);
    const googleErrorDescription = data?.error_description ?? null;

    let status: GoogleOAuthPairingStatus;
    if (googleError === "invalid_grant") {
      // Garbage code + valid pair → Google rejects the code, not the client.
      status = "pair_ok";
    } else if (googleError === "invalid_client") {
      status = "invalid_client";
    } else if (googleError === "invalid_request") {
      status = "incomplete_env";
    } else {
      status = "redirect_or_other";
    }

    return {
      ...base,
      status,
      googleError,
      googleErrorDescription,
    };
  } catch {
    return {
      ...base,
      status: "network_error",
      googleError: null,
      googleErrorDescription: null,
    };
  }
}
