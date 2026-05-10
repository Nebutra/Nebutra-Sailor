"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UserButtonProps {
  user: { name?: string; email?: string; imageUrl?: string } | null;
  onSignOut: () => Promise<void>;
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

export function UserButton({ user, onSignOut }: UserButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  if (!user) return null;

  const initials = getInitials(user.name, user.email);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="User menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--neutral-3)] text-xs font-medium text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
      >
        {user.imageUrl ? (
          <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] py-1 shadow-lg">
          <div className="border-b border-[var(--neutral-7)] px-3 py-2">
            {user.name && (
              <p className="text-sm font-medium text-[var(--neutral-12)]">{user.name}</p>
            )}
            {user.email && <p className="truncate text-xs text-[var(--neutral-9)]">{user.email}</p>}
          </div>
          <button
            type="button"
            onClick={async () => {
              await onSignOut();
              close();
            }}
            className="w-full px-3 py-2 text-left text-sm text-[var(--neutral-11)] transition-colors hover:bg-[var(--neutral-3)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--blue-9)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export type { UserButtonProps };
