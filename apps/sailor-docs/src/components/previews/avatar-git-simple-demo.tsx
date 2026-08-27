"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@nebutra/ui/primitives";

export function AvatarGitSimpleDemo() {
  return (
    <div className="gap-4 flex items-center">
      <GitHubAvatar username="rauchg" />
      <GitLabAvatar username="leerob" />
      <BitbucketAvatar username="evilrabbit" />
    </div>
  );
}

function GitHubAvatar({ username }: { username: string }) {
  return (
    <Avatar>
      <AvatarImage src={`https://github.com/${username}.png`} alt={`@${username}`} />
      <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function GitLabAvatar({ username }: { username: string }) {
  return (
    <Avatar>
      <AvatarImage src={`https://gitlab.com/${username}.png`} alt={`@${username}`} />
      <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function BitbucketAvatar({ username }: { username: string }) {
  return (
    <Avatar>
      <AvatarImage src={`https://bitbucket.org/${username}.png`} alt={`@${username}`} />
      <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
