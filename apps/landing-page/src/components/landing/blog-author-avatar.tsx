"use client";

import {
  LogoCloudflare,
  LogoGithub,
  LogoLinear,
  LogoSanity,
  LogoVercel,
  LogoYCombinator,
  User,
} from "@nebutra/icons";
import { Anthropic, Claude, OpenAI } from "@nebutra/ui/icons";
import Image from "next/image";
import { type ComponentType, type CSSProperties, useState } from "react";

type BlogAuthorAvatarProps = {
  name: string | null;
  src: string | null;
  size?: "sm" | "md";
};

type LogoComponent = ComponentType<{
  "aria-label"?: string;
  className?: string;
  role?: string;
  size?: number | string;
  title?: string;
}>;
type ProviderAvatarIcon = LogoComponent & { Avatar?: LogoComponent; Color?: LogoComponent };

type PublisherLogo = {
  avatar?: boolean;
  Icon: LogoComponent;
  match: RegExp;
  style?: CSSProperties;
  tone: string;
};

const PUBLISHER_LOGOS: PublisherLogo[] = [
  {
    avatar: true,
    Icon: (Claude as ProviderAvatarIcon).Avatar ?? (Claude as LogoComponent),
    match: /\bclaude(\s+(blog|code|ai))?\b/i,
    tone: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)]",
  },
  {
    avatar: true,
    Icon: (Anthropic as ProviderAvatarIcon).Avatar ?? (Anthropic as LogoComponent),
    match: /\banthropic\b/i,
    tone: "",
  },
  {
    avatar: true,
    Icon: (OpenAI as ProviderAvatarIcon).Avatar ?? (OpenAI as LogoComponent),
    match: /\b(openai|open ai|chatgpt)\b/i,
    tone: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)]",
  },
  {
    Icon: LogoYCombinator,
    match: /\b(y combinator|yc)\b/i,
    tone: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)]",
  },
  {
    Icon: LogoVercel,
    match: /\bvercel\b/i,
    tone: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)]",
  },
  {
    Icon: LogoLinear,
    match: /\blinear\b/i,
    tone: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)]",
  },
  {
    Icon: LogoSanity,
    match: /\bsanity\b/i,
    tone: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)]",
  },
  {
    Icon: LogoCloudflare,
    match: /\bcloudflare\b/i,
    tone: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)]",
  },
  {
    Icon: LogoGithub,
    match: /\b(github|git hub)\b/i,
    tone: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)]",
  },
];

function getInitials(name: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function getPublisherLogo(name: string | null): PublisherLogo | null {
  if (!name) return null;
  return PUBLISHER_LOGOS.find((publisher) => publisher.match.test(name)) ?? null;
}

export function BlogAuthorAvatar({ name, src, size = "sm" }: BlogAuthorAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = size === "md" ? "size-8" : "size-6";
  const iconClass = size === "md" ? "size-4" : "size-3.5";
  const iconSize = size === "md" ? 16 : 14;
  const avatarSize = size === "md" ? 32 : 24;
  const className = `${sizeClass} shrink-0 rounded-full border`;
  const publisher = getPublisherLogo(name);

  if (publisher) {
    const Icon = publisher.Icon;

    if (publisher.avatar) {
      return (
        <Icon
          role="img"
          aria-label={name ? `${name} logo` : undefined}
          title={name ?? undefined}
          size={avatarSize}
          className={`${sizeClass} shrink-0`}
        />
      );
    }

    return (
      <span
        role="img"
        aria-label={name ? `${name} logo` : undefined}
        title={name ?? undefined}
        className={`${className} inline-flex items-center justify-center ${publisher.tone}`}
        style={publisher.style}
      >
        <Icon className={iconClass} size={iconSize} aria-hidden />
      </span>
    );
  }

  if (src && !imageFailed) {
    return (
      <Image
        src={src}
        alt={name ? `${name} avatar` : ""}
        width={size === "md" ? 32 : 24}
        height={size === "md" ? 32 : 24}
        className={`${className} bg-[var(--neutral-2)] object-cover`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${className} inline-flex items-center justify-center bg-[var(--neutral-2)] text-[10px] font-semibold text-[var(--neutral-11)]`}
      aria-hidden
    >
      {name ? getInitials(name) : <User className="size-3.5" />}
    </span>
  );
}
