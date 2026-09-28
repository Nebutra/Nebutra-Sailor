"use client";

import { ArrowRight, CrossSmall, StarFill } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Bump when the message changes, so a new message is shown once even to people who closed the old one. */
const DISMISS_KEY = "para.promo.pro-v1";

/**
 * LibTV's top strip, with PARA's own and only true offer in it: the Pro membership, which grants
 * credits every month. No countdown and no discount — there is neither. Closing it is remembered in
 * this browser; with storage blocked it simply shows again next visit.
 *
 * Hidden until mounted, so a returning viewer who closed it never sees it flash in.
 */
export function PromoStrip() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage blocked: closed for this visit only.
    }
  };

  return (
    <div className="px-2 pt-2">
      <div className="relative flex min-h-11 items-center justify-center gap-3 rounded-lg bg-[linear-gradient(90deg,var(--blue-3),var(--blue-5)_55%,var(--cyan-4))] px-12 py-1.5 text-center">
        <StarFill className="hidden size-3.5 shrink-0 text-brand-accent sm:block" />
        <p className="text-body text-foreground">
          PARA Pro 会员：每月发放积分，整个组织共用，视频、图片、脚本生成都从这里扣
        </p>
        <Link
          href="/pro"
          className="hidden shrink-0 items-center gap-1 rounded-full border border-foreground/30 px-3 py-0.5 text-label text-foreground transition-colors hover:bg-foreground/10 sm:flex"
        >
          查看会员
          <ArrowRight className="size-3" />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="square"
          aria-label="关闭"
          onClick={dismiss}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-foreground"
        >
          <CrossSmall className="size-4" />
        </Button>
      </div>
    </div>
  );
}
