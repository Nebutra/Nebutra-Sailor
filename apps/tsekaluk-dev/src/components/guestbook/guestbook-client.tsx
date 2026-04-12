"use client";

import { brandSpring } from "@nebutra/brand";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLocale } from "next-intl";
import * as React from "react";
import { EndorsementDialog } from "./endorsement-dialog";

export interface Endorsement {
  id: string;
  authorName: string;
  authorImage: string | null;
  nickname: string;
  relationship: string;
  company?: string | null;
  title?: string | null;
  message: string;
  createdAt: string;
}

const RELATIONSHIP_LABELS: Record<string, { en: string; zh: string }> = {
  friend: { en: "Friend", zh: "朋友" },
  colleague: { en: "Colleague", zh: "同事" },
  client: { en: "Client", zh: "客户" },
  partner: { en: "Partner", zh: "合作伙伴" },
  classmate: { en: "Classmate", zh: "同学" },
  mentor: { en: "Mentor", zh: "导师" },
  fan: { en: "Fan", zh: "粉丝" },
  other: { en: "Other", zh: "其他" },
};

function formatRelativeTime(dateStr: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMs = new Date(dateStr).getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  if (Math.abs(diffSeconds) < 60) return rtf.format(diffSeconds, "second");
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, "day");
  if (Math.abs(diffWeeks) < 5) return rtf.format(diffWeeks, "week");
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");
  return rtf.format(diffYears, "year");
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c1 = `hsl(${Math.abs(hash % 360)}, 70%, 65%)`;
  const c2 = `hsl(${Math.abs((hash + 40) % 360)}, 80%, 75%)`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

function EndorsementCard({ entry, locale }: { entry: Endorsement; locale: string }) {
  const initial = entry.nickname.charAt(0).toUpperCase();
  const rel = RELATIONSHIP_LABELS[entry.relationship];
  const gradient = stringToColor(entry.nickname + entry.id);

  return (
    <AnimateIn preset="fadeUp" inView>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={brandSpring}
        className="group relative rounded-3xl border border-black/5 dark:border-white/5 bg-white/70 dark:bg-black/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-colors hover:bg-white/90 dark:hover:bg-black/60 overflow-hidden break-inside-avoid"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

        <p className="relative z-10 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300 break-words mix-blend-normal">
          &ldquo;{entry.message}&rdquo;
        </p>

        <div className="mt-8 flex items-center gap-4 relative z-10">
          {entry.authorImage ? (
            <Image
              src={entry.authorImage}
              alt={entry.nickname}
              width={44}
              height={44}
              sizes="44px"
              className="h-11 w-11 rounded-full shrink-0 object-cover ring-2 ring-white/50 dark:ring-white/10 shadow-sm"
              loading="lazy"
              unoptimized
            />
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-2 ring-white/50 dark:ring-white/10 shadow-inner"
              style={{ background: gradient }}
            >
              <span className="text-sm font-medium text-white mix-blend-overlay drop-shadow-md">
                {initial}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
              <span>{entry.nickname}</span>
              {(entry.title || entry.company) && (
                <span className="inline-flex items-center rounded-full bg-gray-100/80 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400 backdrop-blur-sm">
                  {[entry.title, entry.company].filter(Boolean).join(" @ ")}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
              <span className="capitalize">
                {rel ? (locale === "zh" ? rel.zh : rel.en) : entry.relationship}
              </span>
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700" />
              <span>{formatRelativeTime(entry.createdAt, locale)}</span>
            </p>
          </div>
        </div>
      </motion.div>
    </AnimateIn>
  );
}

export function GuestbookClient({ initialEntries }: { initialEntries: Endorsement[] }) {
  const locale = useLocale();
  const [entries] = React.useState<Endorsement[]>(initialEntries);
  const [submitted, setSubmitted] = React.useState(false);

  function handleSubmitted() {
    setSubmitted(true);
  }

  return (
    <div className="space-y-16">
      {/* CTA */}
      <AnimateIn preset="fade">
        <div className="flex flex-col items-center gap-4 text-center">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full border border-green-500/20 bg-green-50/50 dark:bg-green-500/10 px-6 py-3 backdrop-blur-md"
            >
              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Thanks! Your endorsement is under review and will appear soon.
              </p>
            </motion.div>
          ) : (
            <EndorsementDialog onSubmitted={handleSubmitted} />
          )}
        </div>
      </AnimateIn>

      {/* Endorsement wall */}
      {entries.length === 0 ? (
        <AnimateIn preset="fade">
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">
            No endorsements yet. Be the first to leave one!
          </p>
        </AnimateIn>
      ) : (
        <AnimateInGroup stagger="fast" className="columns-1 gap-6 sm:columns-2">
          {entries.map((entry) => (
            <div key={entry.id} className="mb-6 break-inside-avoid">
              <EndorsementCard entry={entry} locale={locale} />
            </div>
          ))}
        </AnimateInGroup>
      )}
    </div>
  );
}
