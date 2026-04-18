/**
 * Social login provider registry — China-region OAuth providers that
 * complement the primary auth stack (Clerk / Better Auth).
 *
 * These providers plug into the primary auth provider as additional federated
 * identity sources. The scaffold generates a callback route stub per provider
 * and a shared `SocialLoginButtons` component that renders the selected ones.
 */

export type SocialLoginId = "wechat" | "qq" | "dingtalk" | "workweixin" | "feishu" | "weibo";

export type SocialLoginRegion = "cn";

export interface SocialLoginMeta {
  id: SocialLoginId;
  name: string;
  region: SocialLoginRegion;
  envVars: string[];
  docs: string;
  callbackUrl: string;
  /** OAuth token exchange endpoint — used by the generated callback stub. */
  tokenEndpoint: string;
}

export const SOCIAL_LOGIN_PROVIDERS: SocialLoginMeta[] = [
  {
    id: "wechat",
    name: "微信开放平台",
    region: "cn",
    envVars: ["WECHAT_APP_ID", "WECHAT_APP_SECRET"],
    docs: "https://open.weixin.qq.com/cgi-bin/showdocument",
    callbackUrl: "/api/auth/callback/wechat",
    tokenEndpoint: "https://api.weixin.qq.com/sns/oauth2/access_token",
  },
  {
    id: "qq",
    name: "QQ 登录",
    region: "cn",
    envVars: ["QQ_APP_ID", "QQ_APP_KEY"],
    docs: "https://wiki.connect.qq.com",
    callbackUrl: "/api/auth/callback/qq",
    tokenEndpoint: "https://graph.qq.com/oauth2.0/token",
  },
  {
    id: "dingtalk",
    name: "钉钉",
    region: "cn",
    envVars: ["DINGTALK_APP_ID", "DINGTALK_APP_SECRET"],
    docs: "https://open.dingtalk.com/document/",
    callbackUrl: "/api/auth/callback/dingtalk",
    tokenEndpoint: "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
  },
  {
    id: "workweixin",
    name: "企业微信",
    region: "cn",
    envVars: ["WORKWEIXIN_CORP_ID", "WORKWEIXIN_AGENT_ID", "WORKWEIXIN_SECRET"],
    docs: "https://developer.work.weixin.qq.com",
    callbackUrl: "/api/auth/callback/workweixin",
    tokenEndpoint: "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
  },
  {
    id: "feishu",
    name: "飞书 / Lark",
    region: "cn",
    envVars: ["FEISHU_APP_ID", "FEISHU_APP_SECRET"],
    docs: "https://open.feishu.cn/document/",
    callbackUrl: "/api/auth/callback/feishu",
    tokenEndpoint: "https://open.feishu.cn/open-apis/authen/v1/access_token",
  },
  {
    id: "weibo",
    name: "微博",
    region: "cn",
    envVars: ["WEIBO_APP_KEY", "WEIBO_APP_SECRET"],
    docs: "https://open.weibo.com/wiki/",
    callbackUrl: "/api/auth/callback/weibo",
    tokenEndpoint: "https://api.weibo.com/oauth2/access_token",
  },
];

const VALID_IDS = new Set<string>(SOCIAL_LOGIN_PROVIDERS.map((p) => p.id));

export function getSocialLoginProvider(id: string): SocialLoginMeta | undefined {
  return SOCIAL_LOGIN_PROVIDERS.find((p) => p.id === id);
}

/**
 * Parse a `--social-login=wechat,dingtalk` comma-separated flag into a
 * deduplicated, validated array of `SocialLoginId`s.
 *
 * Unknown ids are dropped silently — the caller can emit a notice if desired.
 */
export function parseSocialLoginFlag(raw: string | undefined): SocialLoginId[] {
  if (!raw) return [];
  const tokens = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.includes("none")) return [];
  const valid: SocialLoginId[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    if (VALID_IDS.has(t) && !seen.has(t)) {
      valid.push(t as SocialLoginId);
      seen.add(t);
    }
  }
  return valid;
}
