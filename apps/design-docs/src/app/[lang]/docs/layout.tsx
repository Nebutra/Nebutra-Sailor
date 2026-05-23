import { Banner } from "fumadocs-ui/components/banner";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { source } from "@/lib/source";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const tree = source.pageTree[lang as keyof typeof source.pageTree];

  if (!tree) {
    notFound();
  }

  return (
    <DocsLayout
      tree={tree}
      nav={{
        title: (
          <div className="flex items-center gap-2">
            <Image
              src="/logo/logo-horizontal-en.svg"
              alt="Nebutra Design System Logo"
              width={140}
              height={24}
              className="h-6 w-auto"
              style={{ width: "auto" }}
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
      githubUrl="https://github.com/Nebutra/Nebutra-Sailor"
    >
      {children}
    </DocsLayout>
  );
}
