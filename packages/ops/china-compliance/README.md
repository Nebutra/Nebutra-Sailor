# @nebutra/china-compliance

China-market compliance utilities for Nebutra SaaS products.

Status: Foundation — pure helpers, no production wire-up yet.

## Scope

This package keeps "going-to-market in China" concerns isolated from the rest of the codebase:

- **ICP filing** — format and validate 工信部 ICP record numbers (e.g. `京ICP备12345678号-1`)
- **Region detection** — pure function reading env vars to decide between `cn-mainland`, `cn-hk-mo-tw`, `overseas`, or `unknown`
- **CDN / payment hints** — region-aware booleans the host app uses to decide whether to skip Google Fonts, prefer Aliyun SMS, etc.
- **WeChat OAuth** — URL builder for the standard 网页授权 flow (`https://open.weixin.qq.com/connect/oauth2/authorize`)

## Environment variables

| Variable | Purpose |
|---|---|
| `NEBUTRA_REGION` / `NEXT_PUBLIC_REGION` | Force region: `cn-mainland`, `cn-hk-mo-tw`, `overseas` |
| `NEXT_PUBLIC_ICP_NUMBER` | ICP record number rendered in landing-page footer |
| `NEXT_PUBLIC_PUBLIC_SECURITY_RECORD` | Optional 公安备案 number |
| `NEXT_PUBLIC_WECHAT_APP_ID` | WeChat Open Platform AppID |
| `WECHAT_APP_SECRET` | (Server-only) AppSecret for token exchange — not used yet |

## Usage

```ts
import {
  formatICPNumber,
  validateICPNumber,
  detectChinaRegion,
  isChinaRegion,
  getCDNHints,
  buildWeChatAuthUrl,
} from "@nebutra/china-compliance";

if (isChinaRegion()) {
  const hints = getCDNHints();
  // hints.shouldAvoidGoogleFonts === true
}

const url = buildWeChatAuthUrl({
  appId: process.env.NEXT_PUBLIC_WECHAT_APP_ID!,
  redirectUri: "https://app.nebutra.com/api/auth/wechat/callback",
  state: "csrf-token-here",
});
```

## What is intentionally NOT here

- Real ICP lookup against MIIT (`https://beian.miit.gov.cn`) — out of scope
- WeChat token exchange / userinfo — needs a server route + `WECHAT_APP_SECRET`
- Aliyun SMS, Alipay, WeChat Pay adapters — separate packages own those

These are gaps tracked in `package.json#nebutra.gaps`.
