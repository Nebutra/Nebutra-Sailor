"use client";

import { UserMenu } from "@nebutra/ui/patterns";

export function UserMenuDemo() {
  return (
    <div className="flex justify-center p-10">
      <UserMenu
        user={{
          name: "Dana Reyes",
          email: "dana@acme.com",
          avatarUrl: "https://avatar.vercel.sh/dana",
        }}
        groups={[
          {
            id: "account",
            items: [
              { id: "profile", label: "Profile", shortcut: "⇧⌘P" },
              { id: "billing", label: "Billing" },
              { id: "settings", label: "Settings", shortcut: "⌘," },
            ],
          },
          { id: "session", items: [{ id: "sign-out", label: "Sign out", destructive: true }] },
        ]}
      />
    </div>
  );
}
