"use client";

import { User } from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { AuthActions, type ShellAccount } from "./auth-actions";

/**
 * The avatar at the end of a top bar: the account's first letter, and a menu of places.
 *
 * The shell passes the server-read account. The workspace bar renders it bare; without an account
 * it shows a neutral glyph and leaves the account section out rather than guessing.
 */
export function ProfileButton({
  account,
  switchUrl = null,
  className,
}: {
  account?: ShellAccount;
  switchUrl?: string | null;
  /** Replaces the default avatar box, e.g. to sit inside the canvas top-bar island. */
  className?: string;
} = {}) {
  const initial = account?.label.trim()[0]?.toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="账户"
          className={
            className ??
            "ml-1 flex size-8 items-center justify-center rounded-full bg-neutral-4 font-medium text-foreground text-label hover:bg-neutral-5"
          }
        >
          {initial ?? <User className="size-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem render={<Link href="/" />}>首页</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/projects" />}>项目</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/assets" />}>资产</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/pro" />}>会员与积分</DropdownMenuItem>
        {account ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-1 py-0.5">
              <AuthActions account={account} switchUrl={switchUrl} />
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
