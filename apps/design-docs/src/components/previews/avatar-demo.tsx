"use client";

import { ArrowCircleDown, CheckCircleFill, ClockDashed } from "@nebutra/icons";
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

const gh = (username: string) => `https://avatars.githubusercontent.com/${username}?s=96`;

const GROUP_DEFAULT = [{ username: "leerob" }, { username: "rauchg" }, { username: "shuding" }];

const GROUP_OVERFLOW = [
  { username: "sambecker" },
  { username: "rauno" },
  { username: "skllcrn" },
  { username: "almonk" },
  { username: "rauchg" },
];

export function AvatarSizeDemo() {
  return (
    <div className="flex flex-wrap items-end gap-6">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Avatar size={size} title={`Nebutra ${size}`} src={gh("necolas")} />
          <span className="text-[11px] text-muted-foreground">{size}</span>
        </div>
      ))}
      <div className="flex flex-col items-center gap-2">
        <Avatar size={90} placeholder />
        <span className="text-[11px] text-muted-foreground">90px</span>
      </div>
    </div>
  );
}

export function AvatarFallbackDemo() {
  return (
    <div className="flex gap-3">
      <Avatar size={32} title="Ada Lovelace" letter="AL" />
      <Avatar size={32} title="Grace Hopper" />
      <Avatar size={32} title="Acme Inc." letter="AI" />
    </div>
  );
}

export function AvatarGroupDemo() {
  return (
    <div className="flex flex-col items-start gap-4">
      <AvatarGroup members={GROUP_DEFAULT} size={32} />
      <AvatarGroup limit={4} members={GROUP_OVERFLOW} size={32} />
    </div>
  );
}

export function AvatarGitPlatformDemo() {
  return (
    <div className="flex flex-wrap gap-6">
      <div className="flex flex-col items-center gap-2">
        <GitHubAvatar username="rauchg" size={32} />
        <span className="text-[11px] text-muted-foreground">GitHub</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <GitLabAvatar username="leerob" size={32} />
        <span className="text-[11px] text-muted-foreground">GitLab</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <BitbucketAvatar username="atlassian" size={32} />
        <span className="text-[11px] text-muted-foreground">Bitbucket</span>
      </div>
    </div>
  );
}

export function AvatarWithIconDemo() {
  return (
    <div className="flex flex-col items-start gap-3.5">
      <AvatarWithIcon
        alt="Download queued"
        icon={<ArrowCircleDown className="text-muted-foreground" size={14} />}
        iconBackground
        size={32}
        src={gh("rauchg")}
      />
      <AvatarWithIcon
        alt="Verified member"
        icon={<CheckCircleFill className="text-muted-foreground" size={14} />}
        iconBackground
        size={32}
        src={gh("shuding")}
      />
      <AvatarWithIcon
        alt="Pending member"
        icon={<ClockDashed className="text-muted-foreground" size={14} />}
        iconBackground
        size={32}
        src={gh("leerob")}
      />
    </div>
  );
}

export function DiceBearAvatarDemo() {
  return (
    <div className="flex flex-wrap gap-6">
      <div className="flex flex-col items-center gap-2">
        <DiceBearAvatar seed="rauchg" avatarStyle="bottts-neutral" size={32} />
        <span className="text-[11px] text-muted-foreground">bottts-neutral</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DiceBearAvatar seed="leerob" avatarStyle="pixel-art" options={{ radius: 50 }} size={32} />
        <span className="text-[11px] text-muted-foreground">pixel-art</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DiceBearAvatar seed="guest-123" avatarStyle="lorelei" size={32} />
        <span className="text-[11px] text-muted-foreground">lorelei</span>
      </div>
    </div>
  );
}

export function AvatarCompositionDemo() {
  return (
    <Avatar size="md">
      <AvatarImage src={gh("rauchg")} alt="Avatar for rauchg" />
      <AvatarFallback>RG</AvatarFallback>
    </Avatar>
  );
}
