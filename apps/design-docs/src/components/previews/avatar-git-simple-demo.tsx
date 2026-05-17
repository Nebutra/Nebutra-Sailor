"use client";

import { BitbucketAvatar, GitHubAvatar, GitLabAvatar } from "@nebutra/ui/primitives";

export function AvatarGitSimpleDemo() {
  return (
    <div className="flex items-center gap-4">
      <GitHubAvatar username="rauchg" size={32} />
      <GitLabAvatar username="leerob" size={32} />
      <BitbucketAvatar username="atlassian" size={32} />
    </div>
  );
}
