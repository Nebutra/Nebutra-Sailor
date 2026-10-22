// @brand-exempt: design-system documentation copy; it names the product in prose and carries no brand colour or domain literal.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { BlockEntry } from "@/components/showcase-block";
import { ShowcaseBrowser } from "@/components/showcase-browser";
import { blockStatus, entryHref, showcaseItems } from "@/lib/showcase";
import { BLOCKS } from "@/lib/showcase-blocks";
import { readBlockSource } from "@/lib/showcase-source";
import { SITE_NAME } from "@/lib/site";
import { CommandPaletteBlock } from "./_blocks/command-palette";
import { ForgeDeployList } from "./_blocks/forge-deploy-list";
import { KcqMarketToolbar } from "./_blocks/kcq-market-toolbar";
import { ResultStates } from "./_blocks/result-states";
import { RouterRevokeKey } from "./_blocks/router-revoke-key";
import { SettingsForm } from "./_blocks/settings-form";
import { TableToolbar } from "./_blocks/table-toolbar";
import { ToastStack } from "./_blocks/toast-stack";

export const metadata: Metadata = {
  title: `Showcase — ${SITE_NAME}`,
  description:
    "Every Nebutra UI component at its real size, in four tiers: Core, Patterns, Blocks and Expressive, plus a Lab for effects that have not graduated.",
};

const PREVIEWS: Record<string, ReactNode> = {
  "router-revoke-key": <RouterRevokeKey />,
  "forge-deploy-list": <ForgeDeployList />,
  "kcq-market-toolbar": <KcqMarketToolbar />,
  "settings-form": <SettingsForm />,
  "result-states": <ResultStates />,
  "command-palette": <CommandPaletteBlock />,
  "toast-stack": <ToastStack />,
  "table-toolbar": <TableToolbar />,
};

/**
 * The library the way you would use it: every component at the size it really
 * is, sorted into the four tiers a product is built from, with the effects that
 * have not earned a place kept apart and labelled as such.
 *
 * Cards used to be scaled to fit a thumbnail, which left some components too
 * small to read and others blown up. They are not scaled now. A card holds its
 * demo at 1:1; one that does not fit shows its entry and links to a page where
 * it does.
 */
export default function ShowcasePage() {
  const items = showcaseItems();

  const blocks: BlockEntry[] = BLOCKS.map((block) => ({
    id: block.id,
    title: block.title,
    product: block.product,
    blurb: block.blurb,
    file: block.file,
    status: blockStatus(block.uses.map((use) => use.id)),
    uses: block.uses.map((use) => ({ id: use.id, name: use.name, href: entryHref(use.id) })),
    code: readBlockSource(block.file),
    preview: PREVIEWS[block.id] ?? null,
  }));

  return (
    <div className="flex flex-col">
      <header className="flex max-w-3xl flex-col gap-4 py-12">
        <h1 className="text-4xl text-foreground tracking-display [font-weight:var(--font-weight-heading,600)]">
          Showcase
        </h1>
        <p className="text-lg text-neutral-11">
          Every component at its real size. Start with Core, compose it into Patterns, copy a Block
          when your screen looks like one. Expressive is motion that has earned its place; the Lab
          is motion that has not, labelled so.
        </p>
      </header>
      <ShowcaseBrowser blocks={blocks} items={items} />
    </div>
  );
}
