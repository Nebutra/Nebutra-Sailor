"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  AvatarWithIcon,
  BitbucketAvatar,
  DiceBearAvatar,
  GitHubAvatar,
  GitLabAvatar,
} from "@nebutra/ui/primitives";

const va = (seed: string) => `https://avatar.vercel.sh/${seed}`;

// ─── Size scale ───────────────────────────────────────────────────────────────

/** xs → xl with gradient avatars + size label */
export function AvatarSizeDemo() {
  return (
    <div className="gap-6 flex flex-wrap items-end">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <div key={size} className="gap-2 flex flex-col items-center">
          <Avatar size={size}>
            <AvatarImage src={va(`nebutra-${size}`)} alt={size} />
            <AvatarFallback size={size}>{size.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground">{size}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

/** Initials fallback when no image is available */
export function AvatarFallbackDemo() {
  return (
    <div className="gap-3 flex">
      {["AC", "BK", "CL"].map((init) => (
        <Avatar key={init} size="md">
          <AvatarFallback size="md">{init}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

// ─── Group ────────────────────────────────────────────────────────────────────

const gh = (u: string) => `https://avatars.githubusercontent.com/${u}?s=64`;

const GROUP_SM = [
  { src: gh("evilrabbit"), alt: "evilrabbit", fallback: "ER" },
  { src: gh("leerob"), alt: "leerob", fallback: "LR" },
  { src: gh("rauchg"), alt: "rauchg", fallback: "RG" },
];

const GROUP_LG = [
  { src: gh("sambecker"), alt: "sambecker", fallback: "SB" },
  { src: gh("rauno"), alt: "rauno", fallback: "RA" },
  { src: gh("shuding"), alt: "shuding", fallback: "SH" },
  { src: gh("skllcrn"), alt: "skllcrn", fallback: "SK" },
  { src: gh("almonk"), alt: "almonk", fallback: "AL" },
];

/** Two rows: default limit and with overflow +N */
export function AvatarGroupDemo() {
  return (
    <div className="gap-4 flex flex-col">
      {/* 3 members, all visible */}
      <AvatarGroup items={GROUP_SM} max={4} size="sm" />
      {/* 5 members, max=4 → shows +2 */}
      <AvatarGroup items={GROUP_LG} max={4} size="sm" />
    </div>
  );
}

// ─── Git Platform Avatars ─────────────────────────────────────────────────────

/** GitHub, GitLab, Bitbucket avatars with platform logo badges */
export function AvatarGitPlatformDemo() {
  return (
    <div className="gap-6 flex flex-wrap">
      <div className="gap-2 flex flex-col items-center">
        <GitHubAvatar username="rauchg" size="md" />
        <span className="text-[11px] text-muted-foreground">GitHub</span>
      </div>
      <div className="gap-2 flex flex-col items-center">
        <GitLabAvatar username="leerob" size="md" />
        <span className="text-[11px] text-muted-foreground">GitLab</span>
      </div>
      <div className="gap-2 flex flex-col items-center">
        <BitbucketAvatar username="evilrabbit" size="md" />
        <span className="text-[11px] text-muted-foreground">Bitbucket</span>
      </div>
    </div>
  );
}

// ─── AvatarWithIcon ───────────────────────────────────────────────────────────

/** Status / role badges anchored to the bottom-right corner */
export function AvatarWithIconDemo() {
  return (
    <div className="gap-6 flex flex-wrap">
      {/* online */}
      <div className="gap-2 flex flex-col items-center">
        <AvatarWithIcon
          src={gh("rauchg")}
          alt="rauchg"
          icon={<span className="h-2 w-2 bg-green-500 block rounded-full" />}
          iconBackground="bg-background"
          size="md"
        />
        <span className="text-[11px] text-muted-foreground">Online</span>
      </div>
      {/* busy */}
      <div className="gap-2 flex flex-col items-center">
        <AvatarWithIcon
          src={gh("shuding")}
          alt="shuding"
          icon={<span className="h-2 w-2 bg-yellow-500 block rounded-full" />}
          iconBackground="bg-background"
          size="md"
        />
        <span className="text-[11px] text-muted-foreground">Busy</span>
      </div>
      {/* offline */}
      <div className="gap-2 flex flex-col items-center">
        <AvatarWithIcon
          src={gh("paco")}
          alt="paco"
          icon={<span className="h-2 w-2 block rounded-full bg-muted-foreground" />}
          iconBackground="bg-background"
          size="md"
        />
        <span className="text-[11px] text-muted-foreground">Offline</span>
      </div>
    </div>
  );
}

// ─── DiceBearAvatar ───────────────────────────────────────────────────────────

/** Deterministic generated avatars — same seed always yields same avatar */
export function DiceBearAvatarDemo() {
  return (
    <div className="gap-6 flex flex-wrap">
      <div className="gap-2 flex flex-col items-center">
        <DiceBearAvatar seed="rauchg" avatarStyle="bottts-neutral" size="md" />
        <span className="text-[11px] text-muted-foreground">bottts-neutral</span>
      </div>
      <div className="gap-2 flex flex-col items-center">
        <DiceBearAvatar seed="leerob" avatarStyle="pixel-art" options={{ radius: 50 }} size="md" />
        <span className="text-[11px] text-muted-foreground">pixel-art</span>
      </div>
      <div className="gap-2 flex flex-col items-center">
        <DiceBearAvatar seed="guest-123" avatarStyle="fun-emoji" size="md" />
        <span className="text-[11px] text-muted-foreground">fun-emoji</span>
      </div>
      <div className="gap-2 flex flex-col items-center">
        <DiceBearAvatar seed="my-bot" avatarStyle="bottts" size="md" />
        <span className="text-[11px] text-muted-foreground">bottts</span>
      </div>
    </div>
  );
}
