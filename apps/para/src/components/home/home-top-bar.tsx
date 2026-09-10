"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { CreateMenu } from "@/components/shell/create-menu";
import { ProfileButton } from "@/components/shell/profile-button";
import { useUiStore } from "@/stores/ui-store";

/** One visual level: brand, search, create, profile. Nothing else lives up here. */
export function HomeTopBar() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  return (
    <header className="flex h-[var(--para-topbar-h)] shrink-0 items-center justify-between px-5">
      <Link href="/" className="font-medium text-foreground text-sm tracking-[0.18em]">
        PARA
      </Link>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Search"
          onClick={() => setCommandOpen(true)}
          className="text-muted-foreground"
          prefix={<MagnifyingGlass className="size-4" />}
        >
          Search
        </Button>
        <CreateMenu />
        <ProfileButton />
      </div>
    </header>
  );
}
