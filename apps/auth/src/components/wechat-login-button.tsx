"use client";

import { buildWeChatAuthUrl, isChinaRegion } from "@nebutra/china-compliance";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface WeChatLoginButtonProps {
  appId?: string | undefined;
  redirectUri?: string | undefined;
  forceVisible?: boolean | undefined;
  className?: string;
}

/**
 * WeChat sign-in. Hidden outside China unless `forceVisible`.
 * Official WeChat green is a third-party brand lock, not a Nebutra token.
 */
export function WeChatLoginButton({
  appId,
  redirectUri,
  forceVisible,
  className,
}: WeChatLoginButtonProps) {
  const t = useTranslations("compliance.wechat");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const visible = forceVisible ?? isChinaRegion();
  if (!visible) return null;

  const isConfigured = typeof appId === "string" && appId.length > 0;

  function handleClick() {
    if (!isConfigured) return;
    setIsRedirecting(true);

    const finalRedirect =
      redirectUri ??
      (typeof window !== "undefined" ? `${window.location.origin}/api/auth/wechat/callback` : "");

    const state =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `state-${Date.now()}`;

    try {
      const url = buildWeChatAuthUrl({
        appId: appId as string,
        redirectUri: finalRedirect,
        state,
      });
      window.location.assign(url);
    } catch {
      setIsRedirecting(false);
    }
  }

  return (
    <button
      type="button"
      data-testid="wechat-login-button"
      onClick={handleClick}
      disabled={!isConfigured || isRedirecting}
      aria-label={t("signIn")}
      className={cn(
        "flex h-10 w-full items-center justify-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-background px-3 text-sm font-medium text-foreground shadow-none transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <WeChatIcon />
      <span>{isConfigured ? t("signIn") : t("notConfigured")}</span>
    </button>
  );
}

function WeChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#07C160" aria-hidden focusable="false">
      <title>WeChat</title>
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.328.328 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .55-.012.821-.035-.17-.575-.262-1.175-.262-1.793 0-3.745 3.622-6.78 8.087-6.78.276 0 .549.012.818.035C17.245 4.41 13.354 2.188 8.69 2.188zm-2.93 3.49a1.022 1.022 0 1 1 0 2.044 1.022 1.022 0 0 1 0-2.044zm5.85 0a1.022 1.022 0 1 1 0 2.044 1.022 1.022 0 0 1 0-2.044z" />
      <path d="M24 14.534c0-3.376-3.276-6.119-7.319-6.119-4.043 0-7.319 2.743-7.319 6.119s3.276 6.119 7.319 6.119c.84 0 1.65-.117 2.402-.336a.72.72 0 0 1 .597.082l1.585.927a.273.273 0 0 0 .14.045.245.245 0 0 0 .242-.246c0-.06-.024-.119-.04-.178l-.326-1.232a.493.493 0 0 1 .178-.555C23.025 18.038 24 16.379 24 14.534zm-9.683-1.064a.852.852 0 1 1 0-1.704.852.852 0 0 1 0 1.704zm4.876 0a.852.852 0 1 1 0-1.704.852.852 0 0 1 0 1.704z" />
    </svg>
  );
}
