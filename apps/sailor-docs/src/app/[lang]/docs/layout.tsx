import type * as PageTree from "fumadocs-core/page-tree";
import { Banner } from "fumadocs-ui/components/banner";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { source } from "@/lib/source";

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

export default async function Layout({
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
    <DocsLayout
      tree={dynamicTree}
      nav={{
        title: (
          <div className="flex items-center gap-2">
            <Image
              src="/logo/logo-horizontal-en.svg"
              alt="Nebutra Design System Logo"
              width={140}
              height={24}
              className="h-6 w-auto"
            />
          </div>
        ),
        url: `/${lang}/docs`,
        transparentMode: "top",
      }}
      sidebar={{
        tabs: {
          transform: (option) => {
            // Apply localized titles to automatically generated tabs, and add icons if needed
            if (option.url.includes("/foundations")) {
              return { ...option, title: lang === "zh" ? "设计基础" : "Foundations" };
            }
            if (option.url.includes("/components")) {
              return { ...option, title: lang === "zh" ? "组件" : "Components" };
            }
            if (option.url.endsWith("/docs")) {
              return { ...option, title: lang === "zh" ? "概览" : "Overview" };
            }
            return option;
          },
        },
        banner: (
          <Banner variant="rainbow">
            {lang === "zh"
              ? "欢迎使用 Nebutra Design System 2.0 (Next-Gen)! 🎉"
              : "Welcome to Nebutra Design System 2.0 (Next-Gen)! 🎉"}
          </Banner>
        ),
      }}
      i18n={true}
      githubUrl="https://github.com/TsekaLuk/Nebutra-Sailor"
    >
      {children}
    </DocsLayout>
  );
}
