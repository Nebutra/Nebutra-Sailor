"use client";

import { Avatar, AvatarFallback, AvatarImage } from "../../primitives/avatar";
import { cn } from "../../utils/cn";
import type { Author } from "./types";

/* -------------------------------------------------------------------------- *\
 *  UserInfo — author + timestamp + reputation + badges row.
 *
 *  Displayed in the bottom-right of a question or answer card. Visual chrome
 *  only — semantics live on the surrounding question/answer container.
 *
 *  Avatar fallback: when the author has no avatar URL, render initials. The
 *  prior implementation reached for `api.dicebear.com` as a default which is
 *  a hidden third-party network call — removed.
\* -------------------------------------------------------------------------- */

export interface UserInfoProps {
  author: Author;
  timestamp: string;
  /** Verb shown before the timestamp. @default "asked" */
  verb?: string;
  className?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

export function UserInfo({ author, timestamp, verb = "asked", className }: UserInfoProps) {
  return (
    <div
      className={cn("flex items-start gap-3 rounded-[var(--radius-md)] bg-muted/40 p-3", className)}
    >
      <Avatar className="h-8 w-8 shrink-0">
        {author.avatar && <AvatarImage src={author.avatar} alt={author.name} />}
        <AvatarFallback>{initials(author.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {verb} {timestamp}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground text-sm">{author.name}</span>
          <span className="font-bold text-muted-foreground text-xs tabular-nums">
            {author.reputation.toLocaleString()}
          </span>
          {author.badges.gold > 0 && (
            <Badge color="bg-yellow-500" count={author.badges.gold} label="gold" />
          )}
          {author.badges.silver > 0 && (
            <Badge color="bg-gray-400" count={author.badges.silver} label="silver" />
          )}
          {author.badges.bronze > 0 && (
            <Badge color="bg-amber-600" count={author.badges.bronze} label="bronze" />
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-muted-foreground text-xs">
        <span className="sr-only">{label} badges: </span>
        {count}
      </span>
    </span>
  );
}
