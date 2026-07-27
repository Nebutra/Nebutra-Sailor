// Decoupled nav logo: VI color mark (light) / mono mark (dark) + independent wordmark.
import { LogomarkSVG, WordmarkEnSVG } from "@nebutra/brand";
import logoColorMark from "@nebutra/brand/assets/logo/logo-color.svg";
import { brand } from "@nebutra/brand/metadata";
import type * as PageTree from "fumadocs-core/page-tree";
import { Banner } from "fumadocs-ui/components/banner";
import { I18nProvider } from "fumadocs-ui/contexts/i18n";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { htmlLangForLanguage, i18n } from "@/lib/i18n";
import { source } from "@/lib/source";
import "../globals.css";

const logoColorMarkSrc =
  typeof logoColorMark === "string" ? logoColorMark : (logoColorMark as { src: string }).src;

// GeistSans → --font-geist-sans | GeistMono → --font-geist-mono
// Matches the Precision Stack used across apps/web and apps/landing
// CJK fallback is provided by @nebutra/tokens --font-cn to avoid build-time font fetches.

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_DOCS_ORIGIN_URL || "https://docs.nebutra.com"),
  title: {
    default: "Nebutra Sailor Docs",
    template: "%s | Nebutra Sailor Docs",
  },
  description:
    "Product documentation for Nebutra Sailor, the governed AI-native SaaS platform baseline.",
};

// ----------------------------------------------------------------------
// HYBRID ARCHITECTURE EXAMPLE:
// Using Low-Level API to dynamically filter/extend the static Page Tree
// ----------------------------------------------------------------------
function filterSidebarTree(
  tree: PageTree.Root,
  userRole: "guest" | "admin" | "pro" = "guest",
): PageTree.Root {
  // 1. Shallow clone the children to avoid mutating the global static tree
  const modifiedTree = { ...tree, children: [...tree.children] };

  // 2. Example: Dynamically inject an external Support/Community link for SaaS
  const supportLink: PageTree.Item = {
    type: "page",
    name: "Help Center (External) ↗",
    url: "https://support.nebutra.com",
    external: true,
  };
  modifiedTree.children.push(supportLink);

  // 3. Example: Filter out Admin/Pro folders if user doesn't have the role
  // In a real app, `userRole` would come from `await currentUser()` etc.
  if (userRole !== "admin") {
    modifiedTree.children = modifiedTree.children.filter(
      (node) => !(node.type === "folder" && node.name === "Admin Guides"),
    );
  }

  return modifiedTree;
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  // Simulated dynamic user role fetching in a SaaS environment
  // const session = await getSession();
  const userRole = "pro"; // Hardcoded for demo

  // Apply our custom Low-Level tree modification
  const originalTree = source.pageTree[lang as keyof typeof source.pageTree] as PageTree.Root;

  if (!originalTree) {
    notFound();
  }

  const dynamicTree = filterSidebarTree(originalTree, userRole);

  return (
    <html
      lang={htmlLangForLanguage(lang)}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <RootProvider
          search={{
            options: {
              api: "/api/search",
            },
          }}
        >
          <I18nProvider
            locale={lang}
            translations={i18n.translations[lang as keyof typeof i18n.translations]}
            locales={[
              {
                name: "English",
                locale: "en",
              },
              {
                name: "中文",
                locale: "zh",
              },
            ]}
          >
            <DocsLayout
              tree={dynamicTree}
              nav={{
                title: (
                  <div className="flex items-center gap-2">
                    {/*
                      图形 / 文字解耦 (VI):
                      - Mark: logo-color.svg multi-path VI color (light) | LogomarkSVG mono white (dark)
                      - Wordmark: WordmarkEnSVG currentColor — independent of mark fills
                      Never one baked horizontal SVG that locks mark+wordmark together.
                    */}
                    <span className="inline-flex h-6 items-center gap-2">
                      <Image
                        src={logoColorMarkSrc}
                        alt=""
                        width={26}
                        height={24}
                        className="h-6 w-auto dark:hidden"
                        priority
                        unoptimized
                        aria-hidden
                      />
                      <LogomarkSVG
                        width={24}
                        height={24}
                        className="hidden h-6 w-6 shrink-0 !text-white dark:block"
                      />
                      <WordmarkEnSVG
                        width={100}
                        className="h-[1.125rem] w-auto !text-[var(--neutral-12)] dark:!text-white"
                        aria-label={`${brand.name} Sailor Docs`}
                      />
                    </span>
                  </div>
                ),
                url: `/${lang}`,
                transparentMode: "top",
              }}
              sidebar={{
                tabs: {
                  transform: (option) => {
                    // Apply localized titles to automatically generated tabs.
                    // URLs lost their /docs prefix (clean-subdomain pattern), so
                    // the Overview tab now matches `/<lang>` exactly.
                    if (option.url.includes("/foundations")) {
                      return { ...option, title: lang === "zh" ? "设计基础" : "Foundations" };
                    }
                    if (option.url.includes("/components")) {
                      return { ...option, title: lang === "zh" ? "组件" : "Components" };
                    }
                    if (option.url === `/${lang}` || option.url === `/${lang}/`) {
                      return { ...option, title: lang === "zh" ? "概览" : "Overview" };
                    }
                    return option;
                  },
                },
                banner: (
                  // changeLayout=false: Banner default injects --fd-banner-height
                  // for a full-page top bar; we only want the rainbow notice in
                  // the sidebar, otherwise the whole docs shell gets a blank gap.
                  <Banner variant="rainbow" changeLayout={false}>
                    {lang === "zh"
                      ? "欢迎使用 Nebutra Sailor Docs 🎉"
                      : "Welcome to Nebutra Sailor Docs 🎉"}
                  </Banner>
                ),
              }}
              i18n={true}
              githubUrl="https://github.com/Nebutra/Nebutra-Sailor"
            >
              {children}
            </DocsLayout>
          </I18nProvider>
        </RootProvider>
      </body>
    </html>
  );
}
