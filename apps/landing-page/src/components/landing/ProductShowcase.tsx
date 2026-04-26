"use client";

import { CreditCard, Layout, Message } from "@nebutra/icons";

import { cn } from "@nebutra/ui/utils";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useState } from "react";
import { AnimateIn } from "./AnimateIn";

interface Tab {
  id: string;
  labelKey: "tabs.dashboard" | "tabs.billing" | "tabs.ai-chat";
  icon: ReactNode;
  screenshot: string;
}

function ScreenshotPlaceholder() {
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-neutral-1 dark:bg-zinc-950">
      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:2rem_2rem]" />
      {/* Brand glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full bg-primary/10 blur-[80px]" />
      {/* Faux dashboard wireframe */}
      <div className="relative flex flex-col items-center gap-4 text-center px-8">
        <div className="flex gap-3">
          <div className="h-16 w-24 rounded-xl border border-border/30 bg-background/50 backdrop-blur-sm" />
          <div className="h-16 w-24 rounded-xl border border-border/30 bg-background/50 backdrop-blur-sm" />
          <div className="h-16 w-24 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm" />
        </div>
        <div className="h-24 w-72 rounded-xl border border-border/30 bg-background/50 backdrop-blur-sm" />
        <p className="text-xs font-medium text-muted-foreground/60 tracking-wide uppercase">
          Dashboard preview
        </p>
      </div>
    </div>
  );
}

export function ProductShowcase() {
  const t = useTranslations("showcase");
  const [activeTab, setActiveTab] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const tabs: Tab[] = [
    {
      id: "dashboard",
      labelKey: "tabs.dashboard",
      icon: <Layout className="size-4" />,
      screenshot: "/dashboard/demo-analytics.svg",
    },
    {
      id: "billing",
      labelKey: "tabs.billing",
      icon: <CreditCard className="size-4" />,
      screenshot: "/dashboard/demo-billing.svg",
    },
    {
      id: "ai-chat",
      labelKey: "tabs.ai-chat",
      icon: <Message className="size-4" />,
      screenshot: "/dashboard/demo-tenants.svg",
    },
  ];

  const handleImageError = useCallback((index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  }, []);

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-6">
        <AnimateIn preset="emerge" inView>
          <div className="mb-12 flex flex-col items-center text-center">
            <span className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-bold tracking-wide uppercase text-primary">
              {t("badge")}
            </span>

            <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-neutral-12 sm:text-4xl lg:text-5xl">
              {t("headline")}
            </h2>
          </div>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView>
          <div className="mx-auto max-w-5xl">
            {/* Tab buttons */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1",
                    activeTab === index
                      ? "bg-primary/10 text-neutral-12 shadow-sm"
                      : "text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12",
                  )}
                  aria-label={t(tab.labelKey)}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Browser mockup frame */}
            <div className="overflow-hidden rounded-xl border border-neutral-7 bg-card shadow-lg">
              {/* Browser chrome */}
              <div className="flex items-center gap-3 border-b border-neutral-7 bg-neutral-2 px-4 py-2.5">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="size-3 rounded-full bg-border/80" />
                  <span className="size-3 rounded-full bg-border/80" />
                  <span className="size-3 rounded-full bg-border/80" />
                </div>
                <div className="flex flex-1 items-center justify-center rounded-md bg-neutral-1 px-3 py-1">
                  <span className="truncate text-xs text-neutral-8">
                    app.nebutra.com/{tabs[activeTab].id}
                  </span>
                </div>
              </div>

              {/* Screenshot content */}
              <div className="bg-neutral-1">
                {imageErrors[activeTab] ? (
                  <ScreenshotPlaceholder />
                ) : (
                  <div className="relative aspect-video">
                    <Image
                      src={tabs[activeTab].screenshot}
                      alt={t(tabs[activeTab].labelKey)}
                      fill
                      className="object-cover object-top"
                      onError={() => handleImageError(activeTab)}
                      unoptimized
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1024px"
                      priority={activeTab === 0}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
