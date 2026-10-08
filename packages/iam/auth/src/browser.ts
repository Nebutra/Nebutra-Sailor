/** Browser-safe auth surface without React or server-only dependencies. */
export {
  type BrowserAuthContext,
  type BrowserWorkspace,
  createAuthCenterBrowserClient,
} from "./providers/better-auth/browser-client";
export {
  buildAuthCenterSignInUrl,
  buildAuthCenterSignUpUrl,
  getAuthCenterOrigin,
} from "./utils/auth-center";
