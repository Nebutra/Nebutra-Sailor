import { getConfiguredAuthProvider } from "@nebutra/auth";
import { handleGoogleOneTapSignIn } from "@/lib/auth/google-one-tap";

function jsonError(status: number, code: string, error: string): Response {
  return Response.json({ code, error }, { status });
}

export async function POST(request: Request): Promise<Response> {
  if (getConfiguredAuthProvider() !== "nextauth") {
    return jsonError(
      404,
      "GOOGLE_ONE_TAP_DISABLED",
      "Google One Tap is only enabled for NextAuth.",
    );
  }

  if (process.env.ACCESS_GATE_MODE === "invite") {
    return jsonError(
      403,
      "ACCESS_GATE_OAUTH_DISABLED",
      "Google One Tap is disabled while invite-only access is enabled.",
    );
  }

  try {
    return await handleGoogleOneTapSignIn(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google One Tap sign-in failed.";
    return jsonError(400, "GOOGLE_ONE_TAP_FAILED", message);
  }
}
