/**
 * Captcha provider registry for create-sailor. L2 depth:
 * env-var injection + `packages/captcha` prune. Includes a CN-specific
 * provider (阿里云验证码 2.0) alongside global options.
 */

export type CaptchaProviderId = "turnstile" | "hcaptcha" | "aliyun-slide" | "none";

export type CaptchaRegion = "global" | "cn" | "both";

export interface CaptchaProviderMeta {
  id: CaptchaProviderId;
  name: string;
  region: CaptchaRegion;
  envVars: string[];
  docs: string;
  description: string;
}

export const CAPTCHA_PROVIDERS: CaptchaProviderMeta[] = [
  {
    id: "turnstile",
    name: "Cloudflare Turnstile",
    region: "global",
    envVars: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
    docs: "https://developers.cloudflare.com/turnstile/",
    description: "Free, privacy-focused captcha alternative",
  },
  {
    id: "hcaptcha",
    name: "hCaptcha",
    region: "global",
    envVars: ["NEXT_PUBLIC_HCAPTCHA_SITE_KEY", "HCAPTCHA_SECRET_KEY"],
    docs: "https://docs.hcaptcha.com/",
    description: "Privacy-respecting captcha",
  },
  {
    id: "aliyun-slide",
    name: "阿里云验证码 2.0",
    region: "cn",
    envVars: [
      "ALIYUN_CAPTCHA_ACCESS_KEY_ID",
      "ALIYUN_CAPTCHA_ACCESS_KEY_SECRET",
      "ALIYUN_CAPTCHA_APP_KEY",
      "NEXT_PUBLIC_ALIYUN_CAPTCHA_APP_KEY",
    ],
    docs: "https://help.aliyun.com/product/28308.html",
    description: "阿里云智能验证 (滑块/无痕)",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
    description: "",
  },
];

export function getCaptchaProvider(id: string): CaptchaProviderMeta | undefined {
  return CAPTCHA_PROVIDERS.find((p) => p.id === id);
}

export const CAPTCHA_BY_REGION = CAPTCHA_PROVIDERS.reduce<
  Record<CaptchaRegion, CaptchaProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<CaptchaRegion, CaptchaProviderMeta[]>,
);
