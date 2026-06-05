import {
  ArrowUpRight,
  Email,
  LogoLinkedinSmall as Linkedin,
  LockClosed,
  LogoGithub,
  Rss,
} from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type React from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.links" });
  return {
    title: t("metadata_title"),
    description: t("metadata_desc"),
    openGraph: {
      images: [
        `/og?title=${encodeURIComponent(t("metadata_title"))}&subtitle=${encodeURIComponent(t("metadata_desc"))}`,
      ],
    },
    alternates: {
      canonical: `https://tsekaluk.dev/${locale}/links`,
      languages: {
        en: "https://tsekaluk.dev/en/links",
        zh: "https://tsekaluk.dev/zh/links",
        ja: "https://tsekaluk.dev/ja/links",
      },
    },
  };
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const INTERNATIONAL_LINKS = [
  {
    name: "GitHub",
    url: "https://github.com/TsekaLuk",
    icon: <LogoGithub className="h-5 w-5" />,
    description: "Open source projects & contributions",
  },
  {
    name: "X / Twitter",
    url: "https://x.com/tseka_luk",
    icon: <XIcon className="h-5 w-5" />,
    description: "Building in public, daily updates",
  },
  {
    name: "LinkedIn",
    url: "https://linkedin.com/in/tsekaluk",
    icon: <Linkedin className="h-5 w-5" />,
    description: "Professional network & career",
  },
  {
    name: "Product Hunt",
    url: "https://producthunt.com/@tsekaluk",
    icon: <ArrowUpRight className="h-5 w-5" />,
    description: "Product launches",
  },
  {
    name: "RSS Feed",
    url: "/rss.xml",
    icon: <Rss className="h-5 w-5" />,
    description: "Subscribe to updates",
  },
];

const CHINA_LINKS = [
  { name: "微信公众号", description: "超对称轻子", hasQr: true, qrImage: "/images/wx-gzh.jpg" },
  {
    name: "企业微信",
    description: "扫码添加，商务合作优先",
    hasQr: true,
    qrImage: "/images/wx-work.jpg",
  },
  { name: "小红书", description: "产品洞察 & 教程", comingSoon: true },
  { name: "即刻", description: "技术思考 & 日常", comingSoon: true },
  { name: "知识星球", description: "深度内容 & 社区", hasQr: true, qrImage: "/images/zsxq.jpg" },
];

export default async function LinksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.links" });

  return (
    <section className="mx-auto max-w-4xl px-4 py-24 md:py-32 relative min-h-screen">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex h-full w-full items-center justify-center opacity-30 dark:opacity-10">
        <div className="absolute top-[-10%] h-[50rem] w-[50rem] rounded-full bg-[radial-gradient(circle,var(--color-accent-muted)_0%,transparent_70%)] blur-3xl mix-blend-multiply flex-none" />
      </div>

      {/* Profile header */}
      <div className="mb-20 text-center">
        <AnimateIn preset="fadeUp" duration={800}>
          <div className="mx-auto mb-8 h-24 w-24 overflow-hidden rounded-full border border-gray-200/50 dark:border-gray-800/50 p-1 shadow-2xl backdrop-blur-md transition-transform duration-500 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100">
            <Image
              src="/images/black.jpeg"
              alt="Tseka Luk"
              width={96}
              height={96}
              className="h-full w-full rounded-full object-cover"
              priority
            />
          </div>
        </AnimateIn>

        <AnimateIn preset="fadeUp" delay={0.1} duration={800}>
          <h1 className="text-5xl md:text-6xl font-serif italic tracking-tight text-gray-900 dark:text-white mb-3">
            Tseka Luk
          </h1>
        </AnimateIn>

        <AnimateIn preset="fade" delay={0.2} duration={800}>
          <p className="mx-auto mt-2 max-w-md text-[15px] font-medium text-gray-500 dark:text-gray-400">
            AI-Native Builder &middot; CEO @ Nebutra Intelligence
          </p>
        </AnimateIn>
      </div>

      {/* International links - Grid Layout */}
      <div className="mb-20">
        <AnimateIn preset="fadeUp" delay={0.3}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              {t("international")}
            </h2>
            <div className="h-px flex-1 ml-4 bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-800"></div>
          </div>
        </AnimateIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTERNATIONAL_LINKS.map((link, index) => (
            <AnimateIn key={link.name} preset="scale" delay={0.4 + index * 0.05}>
              <a
                href={link.url}
                target={link.url.startsWith("/") ? undefined : "_blank"}
                rel={link.url.startsWith("/") ? undefined : "noopener noreferrer"}
                className="group relative flex items-center gap-5 rounded-3xl border border-gray-100 bg-white/60 p-5 shadow-sm backdrop-blur-md transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[var(--color-accent-muted)] hover:shadow-xl dark:border-gray-800/60 dark:bg-gray-900/40 dark:hover:border-gray-700 motion-reduce:transition-colors motion-reduce:hover:translate-y-0"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-600 transition-colors group-hover:bg-[var(--color-accent-light)] group-hover:text-[var(--color-accent-dark)] dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700 dark:group-hover:text-white">
                  {link.icon}
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {link.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    {link.description}
                  </p>
                </div>
                <div className="absolute right-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hidden sm:block">
                  <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                </div>
              </a>
            </AnimateIn>
          ))}
        </div>
      </div>

      {/* China links */}
      <div className="mb-20">
        <AnimateIn preset="fadeUp" delay={0.6}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              {t("china")}
            </h2>
            <div className="h-px flex-1 ml-4 bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-800"></div>
          </div>
        </AnimateIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHINA_LINKS.map((link, index) => {
            const isComingSoon = "comingSoon" in link && link.comingSoon;
            const hasQr = "hasQr" in link && link.hasQr;
            const hasUrl = "url" in link && link.url;

            const InnerContent = (
              <div
                className={`group relative flex h-full items-center gap-5 rounded-3xl border p-5 transition-[border-color,box-shadow,transform] duration-300 motion-reduce:transition-colors motion-reduce:hover:translate-y-0 ${
                  isComingSoon
                    ? "border-dashed border-gray-200/60 bg-transparent opacity-60 dark:border-gray-800/60 cursor-not-allowed"
                    : "border-gray-100 bg-white/60 shadow-sm backdrop-blur-md hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl dark:border-gray-800/60 dark:bg-gray-900/40 dark:hover:border-gray-700 cursor-pointer"
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isComingSoon ? "bg-gray-100/50 text-gray-400 dark:bg-gray-800/30" : "bg-gray-50 text-gray-600 transition-colors group-hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700"}`}
                >
                  {isComingSoon ? (
                    <LockClosed className="w-5 h-5" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-current opacity-20" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p
                      className={`text-base font-semibold ${isComingSoon ? "text-gray-500 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}
                    >
                      {link.name as React.ReactNode}
                    </p>
                    {isComingSoon && (
                      <span className="rounded-full bg-gray-100/80 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        SOON
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    {link.description as React.ReactNode}
                  </p>
                </div>

                {!isComingSoon && Boolean(hasQr) && (
                  <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300">
                    QR Code →
                  </div>
                )}
                {!isComingSoon && Boolean(hasUrl) && (
                  <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300">
                    Visit →
                  </div>
                )}
              </div>
            );

            return (
              <AnimateIn key={link.name} preset="scale" delay={0.7 + index * 0.05}>
                {isComingSoon ? (
                  InnerContent
                ) : hasUrl ? (
                  <a
                    href={(link as { url: string }).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full"
                  >
                    {InnerContent}
                  </a>
                ) : hasQr ? (
                  <Dialog>
                    <DialogTrigger asChild>{InnerContent}</DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{link.name}</DialogTitle>
                        <DialogDescription>
                          Scan the QR code below using WeChat to connect.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 p-8">
                        {"qrImage" in link && link.qrImage ? (
                          <div className="h-full w-full max-w-[240px] bg-white rounded-lg shadow-sm border p-2 flex items-center justify-center">
                            <Image
                              src={(link as { qrImage: string }).qrImage}
                              alt={link.name}
                              width={240}
                              height={240}
                              sizes="240px"
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-600">{link.name}</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  InnerContent
                )}
              </AnimateIn>
            );
          })}
        </div>
      </div>

      {/* Email CTA */}
      <AnimateIn preset="fadeUp" delay={1.0}>
        <div className="mt-12 text-center pb-24">
          <a
            href="mailto:contact@tsekaluk.dev"
            className="group inline-flex items-center gap-3 rounded-full bg-gray-900 px-8 py-4 text-sm font-semibold text-white shadow-xl transition-[background-color,transform] duration-300 hover:scale-105 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 motion-reduce:transition-colors motion-reduce:hover:scale-100"
          >
            <Email className="h-4 w-4 transition-transform group-hover:-rotate-12 motion-reduce:transition-none motion-reduce:group-hover:rotate-0" />
            <span>contact@tsekaluk.dev</span>
          </a>
        </div>
      </AnimateIn>
    </section>
  );
}
