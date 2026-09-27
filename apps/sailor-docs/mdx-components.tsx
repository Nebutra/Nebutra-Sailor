import { Callout } from "fumadocs-ui/components/callout";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { GithubInfo } from "fumadocs-ui/components/github-info";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FeedbackBlock } from "@/components/feedback/client";
import {
  AccordionGroup,
  Check,
  Accordion as FumadocsAccordion,
  Accordions as FumadocsAccordions,
  Card as FumadocsCard,
  CardGroup as FumadocsCardGroup,
  Info,
  Note,
  Step,
  Steps,
  Tip,
  Warning,
} from "@/components/mdx-compat";
import { Mermaid } from "@/components/mdx-lazy";
import {
  Tabs as FumadocsTabs,
  TabsContent as FumadocsTabsContent,
  TabsList as FumadocsTabsList,
  TabsTrigger as FumadocsTabsTrigger,
  Tab,
} from "@/components/mdx-tabs";
import { onBlockFeedbackAction } from "@/lib/github";

// Code-split from the server side: APIPage is a server component built from the
// OpenAPI instance, so it must not cross a client boundary. See mdx-lazy.tsx.
const APIPage = dynamic(() => import("@/components/api-page").then((m) => m.APIPage));

/**
 * What the docs content renders. Component demos are not here: they live in
 * @nebutra/ui's catalog and render in Sailor Studio (ADR 2026-09-27 UI catalog).
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    // fumadocs-obsidian / fumadocs-python intentionally omitted from the static
    // MDX component map — they bloat the OpenNext Worker past CF size limits.

    // ─── Fumadocs Built-ins ────────────────────────────────────────────────────
    Callout,
    Files,
    Folder,
    File,
    TypeTable,
    ImageZoom,
    InlineTOC,
    Mermaid,
    GithubInfo,
    APIPage,
    FeedbackBlock: (props: React.ComponentPropsWithoutRef<typeof FeedbackBlock>) => (
      <FeedbackBlock {...props} onSendAction={onBlockFeedbackAction} />
    ),
    Tab,
    Tabs: FumadocsTabs,
    TabsList: FumadocsTabsList,
    TabsTrigger: FumadocsTabsTrigger,
    TabsContent: FumadocsTabsContent,
    Step,
    Steps,
    Accordion: FumadocsAccordion,
    Accordions: FumadocsAccordions,

    // ─── MDX Compat Layer (Mintlify/Fumadocs) ─────────────────────────────────
    Tip,
    Warning,
    Info,
    Note,
    Check,
    AccordionGroup,
    Card: FumadocsCard,
    CardGroup: FumadocsCardGroup,
    // Mintlify-compat: CodeGroup renders children stacked (use <Tabs> for a tabbed view)
    CodeGroup: ({ children }: { children?: React.ReactNode }) => (
      <div className="flex flex-col gap-2">{children}</div>
    ),
    Link,

    ...components,
  };
}

// Export a direct getter so MDX remote compiler can inject it without React hooks rules
export function getMDXComponents(): MDXComponents {
  // biome-ignore lint/correctness/useHookAtTopLevel: Next MDX names this component factory useMDXComponents, but it is not a React hook.
  return useMDXComponents({});
}
