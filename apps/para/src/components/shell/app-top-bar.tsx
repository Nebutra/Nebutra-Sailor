"use client";

import { StarFill } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import type { ShellAccount } from "./auth-actions";
import { CreditsChip } from "./credits-chip";
import { ProfileButton } from "./profile-button";
import { Wordmark } from "./wordmark";

/**
 * The bar over the main column, LibTV's right-aligned account cluster: ⚡ credits (only when the
 * payment API answers), 开通会员, then the avatar — or 登录 when there is no session. No fill and
 * no border: it floats on the page ground. The wordmark shows here only below `md`, where the
 * sidebar that normally carries it is hidden.
 */
export function AppTopBar({
  account,
  signInUrl,
}: {
  /** Null when there is no session: 注册 / 登录 shows in the avatar's place. */
  account: ShellAccount | null;
  signInUrl: string | null;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-6 lg:px-10">
      <Wordmark className="md:invisible" />
      <div className="flex items-center gap-2">
        <CreditsChip />
        <Button asChild variant="outline" size="sm">
          <Link href="/pro" className="gap-1.5">
            <StarFill className="size-3.5 text-brand-accent" />
            开通会员
          </Link>
        </Button>
        {account ? (
          <ProfileButton account={account} switchUrl={signInUrl} />
        ) : signInUrl ? (
          <Button asChild variant="ink" size="sm">
            <a href={signInUrl}>注册 / 登录</a>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
