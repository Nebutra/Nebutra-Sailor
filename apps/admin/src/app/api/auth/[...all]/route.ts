import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/**
 * Better Auth's catch-all. Serves the SSO sign-in redirect and the
 * /api/auth/oauth2/callback/nebutra-sso return leg — the exact path registered
 * as this client's redirect URI.
 */
export const { GET, POST } = toNextJsHandler(auth);
