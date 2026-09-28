"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useUiStore } from "@/stores/ui-store";
import { CreditsChip } from "./credits-chip";
import { ProfileButton } from "./profile-button";
import { Wordmark } from "./wordmark";

/**
 * The bar over the main column: account things only, right-aligned — credits, membership, profile.
 * No fill and no border (visual-language.md §2): it floats on the page ground. The wordmark shows
 * here only below `md`, where the sidebar that normally carries it is hidden.
 */
export function AppTopBar() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  return (
    <header className="flex h-[var(--para-topbar-h)] shrink-0 items-center justify-between gap-2 px-6">
      <Wordmark className="md:invisible" />
      <div className="flex items-center gap-1.5">
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
        <CreditsChip />
        <Button asChild variant="outline" size="sm">
          <Link href="/pro">Upgrade</Link>
        </Button>
        <ProfileButton />
      </div>
    </header>
  );
}
