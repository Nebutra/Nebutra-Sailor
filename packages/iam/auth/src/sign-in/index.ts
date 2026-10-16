/**
 * Sign-in building blocks shared by the auth center (apps/auth, which owns
 * sign-in in production — ADR 2026-07-22 auth-center-multi-app) and the
 * template's in-app sign-in (apps/web; the template ships without apps/auth).
 * One implementation; both apps import it.
 */

export { AuthBrandPanel, type AuthBrandPanelProps } from "./auth-brand-panel";
// The archive story lives at `@nebutra/auth/sign-in/boot-log` (structure and
// rotation, server-safe) and `@nebutra/auth/sign-in/boot-log-card` (the client
// card), kept off this barrel so client imports of OAuthButtons stay small.
export { AuthSplitShell, type AuthSplitShellProps } from "./auth-split-shell";
export {
  OAuthButtons,
  type OAuthButtonsLabels,
  type OAuthButtonsProps,
  oauthButtonsLabels,
} from "./oauth-buttons";
// Server-safe provider detection lives at `@nebutra/auth/sign-in/providers`.
export type { OAuthProvider } from "./oauth-providers";
