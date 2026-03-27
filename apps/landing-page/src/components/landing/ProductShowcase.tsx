"use client";

import { CreditCard, Layout, Message } from "@nebutra/icons";
import { AnimatedGradientText } from "@nebutra/ui/primitives";
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
    <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-neutral-2 to-neutral-3">
      <span className="text-lg text-neutral-8">Screenshot coming soon</span>
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
      screenshot: "/screenshots/dashboard.webp",
    },
    {
      id: "billing",
      labelKey: "tabs.billing",
      icon: <CreditCard className="size-4" />,
      screenshot: "/screenshots/billing.webp",
    },
    {
      id: "ai-chat",
      labelKey: "tabs.ai-chat",
      icon: <Message className="size-4" />,
      screenshot: "/screenshots/ai-chat.webp",
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
            <span className="mb-4 inline-flex items-center rounded-full border border-neutral-7 bg-neutral-2 px-4 py-1.5 text-sm font-medium">
              <AnimatedGradientText>{t("badge")}</AnimatedGradientText>
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
