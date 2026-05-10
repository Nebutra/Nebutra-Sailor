/**
 * WeChat Open Platform "网页授权" (web OAuth) URL builder.
 *
 * This is intentionally a pure URL helper — token exchange and userinfo
 * lookup require `WECHAT_APP_SECRET` and live in a server route, not here.
 *
 * Spec reference:
 * https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
 */

export type WeChatScope = "snsapi_login" | "snsapi_base" | "snsapi_userinfo";

export interface BuildWeChatAuthUrlOptions {
  /** WeChat Open Platform AppID (`NEXT_PUBLIC_WECHAT_APP_ID`). */
  appId: string;
  /** Absolute callback URL — must match the domain registered with WeChat. */
  redirectUri: string;
  /** CSRF state token; mandatory in spec. */
  state: string;
  /**
   * OAuth scope. Defaults to `snsapi_login` (QR-code, web-app flow).
   * Use `snsapi_userinfo` only inside an in-WeChat-browser context.
   */
  scope?: WeChatScope;
}

const WECHAT_AUTHORIZE_BASE = "https://open.weixin.qq.com/connect/qrconnect";
const WECHAT_AUTHORIZE_BASE_INAPP = "https://open.weixin.qq.com/connect/oauth2/authorize";

/**
 * Build the OAuth redirect URL the browser should be sent to.
 *
 * Throws if any required field is missing — fail-fast beats silent redirect
 * to a broken endpoint.
 */
export function buildWeChatAuthUrl(opts: BuildWeChatAuthUrlOptions): string {
  const { appId, redirectUri, state, scope = "snsapi_login" } = opts;

  if (!appId) {
    throw new Error("buildWeChatAuthUrl: appId is required");
  }
  if (!redirectUri) {
    throw new Error("buildWeChatAuthUrl: redirectUri is required");
  }
  if (!state) {
    throw new Error("buildWeChatAuthUrl: state is required (CSRF token)");
  }

  // `snsapi_login` is for the QR-code desktop flow; the others are for
  // "open inside WeChat browser" flows. Endpoint differs accordingly.
  const base = scope === "snsapi_login" ? WECHAT_AUTHORIZE_BASE : WECHAT_AUTHORIZE_BASE_INAPP;

  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
  });

  // WeChat requires `#wechat_redirect` as a literal hash suffix on the
  // in-app variant. Adding it on the QR variant is harmless.
  return `${base}?${params.toString()}#wechat_redirect`;
}
