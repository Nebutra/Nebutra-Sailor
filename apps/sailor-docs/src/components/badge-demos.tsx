"use client";

import { Badge, type BadgeProps } from "@nebutra/ui/primitives";
import { Bell, Shield, Slack } from "lucide-react";
import { usePathname } from "next/navigation";

// --- Variants Demo ---
const CONCOLORS = [
  "gray",
  "blue",
  "purple",
  "amber",
  "red",
  "pink",
  "green",
  "teal",
  "inverted",
  "trial",
  "turbo",
] as const;

// Colors that have a -subtle variant
const SUBTLE_COLORS = CONCOLORS.filter((c) => !["inverted", "trial", "turbo"].includes(c));

export function BadgeVariantsDemo() {
  return (
    <div className="flex flex-col gap-3">
      {CONCOLORS.map((color) => (
        <div key={color} className="flex flex-wrap items-center gap-2">
          <Badge variant={color as BadgeProps["variant"]} className="capitalize">
            {color}
          </Badge>
          {!["inverted", "trial", "turbo"].includes(color) && (
            <Badge variant={`${color}-subtle` as BadgeProps["variant"]} className="capitalize">
              {color}-Subtle
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Sizes Demo ---
export function BadgeSizesDemo() {
  return (
    <div className="flex items-center gap-3">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  );
}

// --- With Icons Demo (Geist-style grid) ---
const SIZES: BadgeProps["size"][] = ["lg", "md", "sm"];

export function BadgeIconDemo() {
  const Icon = <Shield />;

  return (
    <div className="flex flex-col gap-2 w-full">
      {SUBTLE_COLORS.map((color) => (
        <div key={color} className="flex flex-wrap items-center gap-1">
          {/* Solid: lg → md → sm */}
          {SIZES.map((size) => (
            <Badge
              key={`s-${size}`}
              variant={color as BadgeProps["variant"]}
              icon={Icon}
              size={size}
            >
              {color}
            </Badge>
          ))}
          {/* Subtle: sm → md → lg */}
          {[...SIZES].reverse().map((size) => (
            <Badge
              key={`sub-${size}`}
              variant={`${color}-subtle` as BadgeProps["variant"]}
              icon={Icon}
              size={size}
            >
              {color}
            </Badge>
          ))}
          {/* Text-only (no icon) */}
          <Badge variant={`${color}-subtle` as BadgeProps["variant"]} size="lg">
            {color}
          </Badge>
        </div>
      ))}
      {/* Inverted row */}
      <div className="flex flex-wrap items-center gap-1">
        {SIZES.map((size) => (
          <Badge key={`inv-${size}`} variant="inverted" icon={Icon} size={size}>
            Inverted
          </Badge>
        ))}
      </div>
    </div>
  );
}

// --- Pill Demo ---
export function BadgePillDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          className="rounded-full font-normal hover:bg-muted/50 transition-colors"
        >
          label
        </Badge>
        <Badge
          variant="outline"
          className="rounded-full font-normal hover:bg-muted/50 transition-colors"
        >
          label
        </Badge>
        <Badge
          variant="outline"
          className="rounded-full font-normal hover:bg-muted/50 transition-colors text-foreground"
        >
          label
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          icon={<Slack className="text-blue-500" fill="currentColor" />}
          className="rounded-full font-normal hover:bg-muted/50 transition-colors pr-3 pl-2 py-1"
        >
          label
        </Badge>
        <Badge
          variant="outline"
          icon={<Slack className="text-red-500" fill="currentColor" />}
          className="rounded-full font-normal hover:bg-muted/50 transition-colors pr-3 pl-2 py-1"
        >
          label
        </Badge>
        <Badge
          variant="outline"
          icon={<Slack className="text-green-500" fill="currentColor" />}
          className="rounded-full font-normal hover:bg-muted/50 transition-colors pr-3 pl-2 py-1"
        >
          label
        </Badge>
      </div>
    </div>
  );
}

// --- In Context Demos ---

export function BadgeTableDemo() {
  const pathname = usePathname() || "";
  const isZh = pathname.startsWith("/zh");

  return (
    <div className="w-full max-w-sm border rounded-lg overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 font-medium text-muted-foreground">
              {isZh ? "部署 (Deployment)" : "Deploy"}
            </th>
            <th className="px-4 py-3 font-medium text-muted-foreground">
              {isZh ? "状态 (Status)" : "Status"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr className="bg-background">
            <td className="px-4 py-3">{isZh ? "部署 #1024" : "Deploy #1024"}</td>
            <td className="px-4 py-3">
              <Badge variant="green-subtle" dot>
                {isZh ? "成功" : "Ready"}
              </Badge>
            </td>
          </tr>
          <tr className="bg-background">
            <td className="px-4 py-3">{isZh ? "部署 #1023" : "Deploy #1023"}</td>
            <td className="px-4 py-3">
              <Badge variant="gray-subtle" dot>
                {isZh ? "排队中" : "Queued"}
              </Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function BadgeNotificationDemo() {
  return (
    <div className="relative inline-flex items-center justify-center p-3 border rounded-lg bg-background">
      <Bell className="h-5 w-5 text-muted-foreground" />
      <Badge
        variant="red"
        size="sm"
        className="absolute top-1 right-1 h-4 min-w-4 px-1 justify-center p-0 text-[10px]"
      >
        3
      </Badge>
    </div>
  );
}

export function BadgeFeatureTagDemo() {
  const pathname = usePathname() || "";
  const isZh = pathname.startsWith("/zh");

  return (
    <div className="border rounded-lg p-6 bg-background">
      <h2 className="flex items-center gap-2 text-lg font-semibold m-0">
        {isZh ? "AI 助手" : "AI Assistant"}
        <Badge variant="purple" size="sm">
          {isZh ? "Beta版" : "Beta"}
        </Badge>
      </h2>
      <p className="text-sm text-muted-foreground mt-2 mb-0">
        {isZh
          ? "尝试我们全新的实验性 AI 功能，为您的工作流程增添动力。"
          : "Try out our new experimental AI features to supercharge your workflow."}
      </p>
    </div>
  );
}
