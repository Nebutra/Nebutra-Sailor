"use client";

import {
  ChevronCircleDown as ArrowDownCircle,
  CheckCircle as CheckCircle2,
  Clock,
} from "@nebutra/icons";
import { AvatarWithIcon } from "@nebutra/ui/primitives";

export function AvatarWithIconDemo() {
  return (
    <div className="flex flex-col items-start justify-start gap-4">
      <AvatarWithIcon
        src="https://avatar.vercel.sh/user1"
        alt="user1"
        size="sm"
        icon={
          <ArrowDownCircle className="h-full w-full text-[var(--neutral-11)]" strokeWidth={2.5} />
        }
        iconBackground="bg-background"
      />
      <AvatarWithIcon
        src="https://avatar.vercel.sh/user2"
        alt="user2"
        size="sm"
        icon={<CheckCircle2 className="h-full w-full text-[var(--neutral-11)]" strokeWidth={2.5} />}
        iconBackground="bg-background"
      />
      <AvatarWithIcon
        src="https://avatar.vercel.sh/user3"
        alt="user3"
        size="sm"
        icon={<Clock className="h-full w-full text-[var(--neutral-11)]" strokeWidth={2.5} />}
        iconBackground="bg-background"
      />
    </div>
  );
}
