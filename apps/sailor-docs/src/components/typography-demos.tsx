"use client";

export function FontFaceDemo({
  fontName,
  fontClass,
  letters,
  sampleText,
  usage,
}: {
  fontName: string;
  fontClass: string;
  letters: string;
  sampleText: string;
  usage: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--neutral-6)] bg-card shadow-sm ${fontClass}`}
    >
      <div className="flex flex-col md:flex-row">
        <div className="flex items-center justify-center border-b border-[var(--neutral-6)] bg-[var(--neutral-2)] p-12 md:w-1/3 md:border-b-0 md:border-r">
          <span className="text-7xl font-semibold tracking-tighter text-foreground">{letters}</span>
        </div>
        <div className="flex flex-1 flex-col justify-center p-8">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-2xl font-bold">{fontName}</h3>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground font-sans">
              {usage}
            </span>
          </div>
          <p className="mt-4 text-xl leading-relaxed text-muted-foreground md:text-2xl">
            {sampleText}
          </p>
          <div className="mt-8 flex gap-4 text-sm text-muted-foreground font-mono">
            <span>Regular</span>
            <span>Medium</span>
            <span>SemiBold</span>
            <span>Bold</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Code, Info } from "lucide-react";
import type React from "react";

const headingItems = [
  {
    name: "Heading 72",
    token: "text-heading-72",
    usage: "Hero display",
    style: { fontSize: "72px", lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: 700 },
    fontClass: "font-display",
  },
  {
    name: "Heading 60",
    token: "text-heading-60",
    usage: "Large display",
    style: { fontSize: "60px", lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: 700 },
    fontClass: "font-display",
  },
  {
    name: "Heading 48",
    token: "text-heading-48",
    usage: "H1",
    style: { fontSize: "48px", lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: 700 },
    fontClass: "font-display",
  },
  {
    name: "Heading 36",
    token: "text-heading-36",
    usage: "H2",
    style: { fontSize: "36px", lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: 700 },
    fontClass: "font-display",
  },
  {
    name: "Heading 30",
    token: "text-heading-30",
    usage: "H3",
    style: { fontSize: "30px", lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: 600 },
    fontClass: "font-display",
  },
  {
    name: "Heading 24",
    token: "text-heading-24",
    usage: "H4",
    style: { fontSize: "24px", lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: 600 },
    fontClass: "font-display",
  },
  {
    name: "Heading 20",
    token: "text-heading-20",
    usage: "H5",
    style: { fontSize: "20px", lineHeight: "1.4", letterSpacing: "0", fontWeight: 600 },
    fontClass: "font-display",
  },
  {
    name: "Heading 18",
    token: "text-heading-18",
    usage: "H6",
    style: { fontSize: "18px", lineHeight: "1.4", letterSpacing: "0", fontWeight: 600 },
    fontClass: "font-display",
  },
  {
    name: "Heading 16",
    token: "text-heading-16",
    usage: "Subheading",
    style: { fontSize: "16px", lineHeight: "1.5", letterSpacing: "0", fontWeight: 600 },
    fontClass: "font-display",
  },
  {
    name: "Heading 14",
    token: "text-heading-14",
    usage: "Small subheading",
    style: { fontSize: "14px", lineHeight: "1.5", letterSpacing: "0.01em", fontWeight: 600 },
    fontClass: "font-display",
  },
];

const copyItems = [
  {
    name: "Copy 24",
    token: "text-copy-24",
    usage: "Lead paragraph",
    style: { fontSize: "24px", lineHeight: "1.6", letterSpacing: "0", fontWeight: 400 },
    fontClass: "font-sans",
  },
  {
    name: "Copy 20",
    token: "text-copy-20",
    usage: "Large body",
    style: { fontSize: "20px", lineHeight: "1.6", letterSpacing: "0", fontWeight: 400 },
    fontClass: "font-sans",
  },
  {
    name: "Copy 18",
    token: "text-copy-18",
    usage: "Featured body",
    style: { fontSize: "18px", lineHeight: "1.6", letterSpacing: "0", fontWeight: 400 },
    fontClass: "font-sans",
  },
  {
    name: "Copy 16",
    token: "text-copy-16",
    usage: "Default body",
    style: { fontSize: "16px", lineHeight: "1.6", letterSpacing: "0", fontWeight: 400 },
    fontClass: "font-sans",
  },
  {
    name: "Copy 14",
    token: "text-copy-14",
    usage: "Small body, UI labels",
    style: { fontSize: "14px", lineHeight: "1.5", letterSpacing: "0", fontWeight: 400 },
    fontClass: "font-sans",
  },
  {
    name: "Copy 13",
    token: "text-copy-13",
    usage: "Captions, metadata",
    style: { fontSize: "13px", lineHeight: "1.5", letterSpacing: "0.005em", fontWeight: 400 },
    fontClass: "font-sans",
  },
];

const uiItems = [
  {
    name: "Button text",
    token: "text-ui-button",
    usage: "Button labels",
    style: { fontSize: "14px", fontWeight: 500 },
    fontClass: "font-sans",
  },
  {
    name: "Label text",
    token: "text-ui-label",
    usage: "Form labels",
    style: { fontSize: "13px", fontWeight: 500 },
    fontClass: "font-sans",
  },
  {
    name: "Caption text",
    token: "text-ui-caption",
    usage: "Captions, timestamps",
    style: { fontSize: "12px", fontWeight: 400 },
    fontClass: "font-sans",
  },
  {
    name: "OVERLINE TEXT",
    token: "text-ui-overline",
    usage: "Overline text",
    style: {
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    },
    fontClass: "font-sans",
  },
  {
    name: "Badge text",
    token: "text-ui-badge",
    usage: "Badge text",
    style: { fontSize: "11px", fontWeight: 500 },
    fontClass: "font-sans",
  },
];

export function TypeScaleDemo({ scaleType }: { scaleType: "heading" | "copy" | "ui" }) {
  const items = scaleType === "heading" ? headingItems : scaleType === "copy" ? copyItems : uiItems;

  return (
    <div className="w-full overflow-x-auto my-6">
      <div className="min-w-[700px] flex flex-col">
        {/* Header */}
        <div className="grid grid-cols-[8fr_3fr_4fr] gap-6 text-[12px] font-semibold text-muted-foreground pb-3 border-b border-[var(--neutral-6)]">
          <div className="flex items-center gap-1.5 pl-2">
            <span className="font-serif italic font-bold text-[13px] text-foreground">Aa</span>
            <span className="tracking-wide uppercase">Example</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Code className="w-4 h-4 text-blue-500" />
            <span className="tracking-wide uppercase">Class name</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-neutral-400" />
            <span className="tracking-wide uppercase">Usage</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col">
          {items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[8fr_3fr_4fr] gap-6 items-center py-6 border-b border-[var(--neutral-6)] last:border-0 hover:bg-[var(--neutral-2)] transition-colors px-2"
            >
              <div
                className={`${item.fontClass} text-foreground truncate w-full flex items-center h-full`}
                style={item.style as React.CSSProperties}
              >
                {item.name}
              </div>
              <div className="flex items-center h-full">
                <code className="text-[13px] bg-muted px-2 py-0.5 rounded border border-[var(--neutral-6)] font-mono text-muted-foreground truncate max-w-full">
                  {item.token}
                </code>
              </div>
              <div className="flex items-center h-full text-[13px] text-muted-foreground leading-relaxed pr-4">
                {item.usage}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TypographyHierarchyDemos() {
  return (
    <div className="mt-8 flex flex-col gap-8">
      <FontFaceDemo
        fontName="Inter"
        fontClass="font-sans"
        letters="Aa"
        sampleText="Enterprise SaaS Platform for AI-Native Products"
        usage="English · UI & Body"
      />
      <FontFaceDemo
        fontName="Noto Sans SC"
        fontClass="font-cn"
        letters="啊"
        sampleText="云端聚合 · 引领未来"
        usage="Chinese · UI & Body"
      />
      <FontFaceDemo
        fontName="JetBrains Mono"
        fontClass="font-mono"
        letters="</>"
        sampleText="npm install @nebutra/ui"
        usage="Code & Data"
      />
    </div>
  );
}

export function CJKWeightDemo() {
  const weights = [
    { label: "Light · 300", weight: 300, sample: "云端聚合，引领未来" },
    { label: "Regular · 400", weight: 400, sample: "云端聚合，引领未来" },
    { label: "Medium · 500", weight: 500, sample: "云端聚合，引领未来" },
    { label: "SemiBold · 600", weight: 600, sample: "云端聚合，引领未来" },
    { label: "Bold · 700", weight: 700, sample: "云端聚合，引领未来" },
  ];
  return (
    <div className="mt-6 flex flex-col divide-y divide-[var(--neutral-6)] rounded-xl border border-[var(--neutral-6)] overflow-hidden">
      {weights.map(({ label, weight, sample }) => (
        <div
          key={weight}
          className="flex items-center justify-between px-6 py-4 hover:bg-[var(--neutral-2)] transition-colors"
        >
          <span className="font-cn text-xl text-foreground" style={{ fontWeight: weight }}>
            {sample}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{label}</span>
        </div>
      ))}
    </div>
  );
}
