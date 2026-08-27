import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/**
 * Better Auth's catch-all. Serves the SSO sign-in redirect and the
 * /api/auth/oauth2/callback/nebutra-sso return leg — the exact path registered
 * as this client's redirect URI.
 *
 * NOT THE AUTHORIZATION PATH. A session minted here grants nothing: getStaffContext
 * reads the verified Cloudflare Access assertion instead (see ../../../lib/staff),
 * because sso.nebutra.com's login interaction is unimplemented and this flow can
 * never complete today. Kept, not deleted, because the OIDC relying-party design
 * is Phase 2 and the `nebutra-admin` client is already registered against the
 * issuer — when the interaction lands, this is the leg that receives the code.
 */
export const { GET, POST } = toNextJsHandler(auth);
