"use client";

import { AnimateIn } from "@nebutra/ui/components";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { EndorsementDialog } from "@/components/guestbook/endorsement-dialog";

interface GuestbookEntry {
  id: string;
  authorName: string;
  authorImage: string | null;
  nickname: string;
  relationship: string;
  message: string;
  createdAt: string;
}

function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
      {initials}
    </div>
  );
}

export function ConstellationSection() {
  const t = useTranslations("constellation");
  const [entries, setEntries] = React.useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/guestbook", { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setEntries(json.data);
        else setFetchError(true);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setFetchError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 border-t border-gray-100 dark:border-gray-800">
      {/* Header */}
      <div className="text-center mb-16">
        <AnimateIn preset="fade" inView>
          <p className="font-serif italic text-2xl text-gray-400 dark:text-gray-500 mb-4 tracking-tight">
            {t("label")}
          </p>
        </AnimateIn>

        <AnimateIn preset="fadeUp" delay={0.1} inView>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            {t("headline")}
          </h2>
        </AnimateIn>

        <AnimateIn preset="fade" delay={0.2} inView>
          <p className="text-base text-gray-500 dark:text-gray-400">{t("description")}</p>
        </AnimateIn>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="mb-5 break-inside-avoid rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded mb-3 w-3/4" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded mb-3 w-full" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded mb-6 w-2/3" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && fetchError && (
        <AnimateIn preset="fade" inView>
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <p className="font-serif italic text-xl">{t("empty")}</p>
          </div>
        </AnimateIn>
      )}

      {/* Empty state */}
      {!loading && !fetchError && entries.length === 0 && (
        <AnimateIn preset="fade" inView>
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <p className="font-serif italic text-xl">{t("empty")}</p>
          </div>
        </AnimateIn>
      )}

      {/* Fragment wall — Organic Grid */}
      {!loading && !fetchError && entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {entries.map((entry, i) => {
            // Create a pseudo-random, organic stagger effect based on index
            const isOffset = i % 2 !== 0;
            const marginTop = isOffset ? "lg:mt-12" : "lg:mt-0";

            return (
              <AnimateIn key={entry.id} preset="fadeUp" delay={i * 0.05} inView>
                <div
                  className={`h-full flex flex-col justify-between rounded-none border-b border-gray-200 dark:border-gray-800 pb-8 pt-4 transition-colors hover:border-gray-900 dark:hover:border-white ${marginTop}`}
                >
                  <p className="font-serif italic text-xl leading-relaxed text-gray-900 dark:text-gray-100 flex-1">
                    &ldquo;{entry.message}&rdquo;
                  </p>

                  <div className="mt-8 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-base font-medium text-gray-900 dark:text-white uppercase tracking-tight">
                        {entry.nickname}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {entry.relationship}
                      </span>
                    </div>
                    {entry.authorImage ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-100 dark:border-gray-800 filter grayscale transition-[filter] hover:grayscale-0">
                        <Image
                          src={entry.authorImage}
                          alt={entry.nickname}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <AvatarFallback name={entry.nickname} />
                    )}
                  </div>
                </div>
              </AnimateIn>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <AnimateIn preset="fade" delay={0.5} inView>
        <div className="mt-16 text-center">
          <EndorsementDialog />
          <p className="mt-3 text-xs text-gray-300 dark:text-gray-600">{t("cta_hint")}</p>
        </div>
      </AnimateIn>
    </section>
  );
}
