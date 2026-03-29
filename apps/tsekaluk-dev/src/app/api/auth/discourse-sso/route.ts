import crypto from "node:crypto";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// 这里的 Secret 必须和 Discourse 后台设置的 "discourse connect secret" 保持严格一致
const DISCOURSE_SSO_SECRET = process.env.DISCOURSE_SSO_SECRET || "your_super_secret_key";
const DISCOURSE_URL = process.env.DISCOURSE_URL || "https://forum.yourdomain.com";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const ssoPayload = searchParams.get("sso");
  const signature = searchParams.get("sig");

  // 1. 基本参数校验
  if (!ssoPayload || !signature) {
    return new NextResponse("Missing SSO payload or signature", { status: 400 });
  }

  // 2. 校验签名（HMAC-SHA256），确保请求确实是官方论坛发来的
  const expectedSignature = crypto
    .createHmac("sha256", DISCOURSE_SSO_SECRET)
    .update(ssoPayload)
    .digest("hex");

  if (expectedSignature !== signature) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  // 3. 获取当前用户会话（基于 Better Auth）
  const session = await auth.api.getSession({ headers: await headers() });

  // 4. 如果没登录，重定向到咱们的主站登录页，并把 sso payload 带上以便登完跳回来
  if (!session?.user) {
    const loginUrl = new URL("/auth/signin", req.nextUrl.origin); // Path from auth.ts
    // 把原始请求完整存下来作为 callbackUrl
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  // 5. 解码 Discourse 传过来的 nonce（用于防重放攻击）
  const decodedPayload = Buffer.from(ssoPayload, "base64").toString("utf-8");
  const parsedPayload = new URLSearchParams(decodedPayload);
  const nonce = parsedPayload.get("nonce");

  if (!nonce) {
    return new NextResponse("Missing nonce in payload", { status: 400 });
  }

  // 6. 构造我们要发回给 Discourse 的用户数据 Payload
  const returnPayloadData = new URLSearchParams({
    nonce: nonce,
    external_id: session.user.id || "",
    email: session.user.email || "",
    username: session.user.name?.replace(/\s+/g, "_") || `user_${session.user.id}`,
    name: session.user.name || "",
    avatar_url: session.user.image || "",
    // 如果想要高级一点，甚至可以传群组：
    // add_groups: session.user.plan === 'pro' ? 'Pro Members' : '',
  });

  const returnPayload = Buffer.from(returnPayloadData.toString()).toString("base64");

  // 7. 使用同样的 Secret 对返回的 payload 再次签名
  const returnSignature = crypto
    .createHmac("sha256", DISCOURSE_SSO_SECRET)
    .update(returnPayload)
    .digest("hex");

  // 8. 重定向回 Discourse 完成无缝登录
  const redirectUrl = new URL("/session/sso_login", DISCOURSE_URL);
  redirectUrl.searchParams.set("sso", returnPayload);
  redirectUrl.searchParams.set("sig", returnSignature);

  return NextResponse.redirect(redirectUrl);
}
