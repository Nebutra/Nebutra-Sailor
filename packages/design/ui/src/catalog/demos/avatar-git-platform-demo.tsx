"use client";

import { BitbucketAvatar, GitHubAvatar, GitLabAvatar } from "@nebutra/ui/primitives";

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
