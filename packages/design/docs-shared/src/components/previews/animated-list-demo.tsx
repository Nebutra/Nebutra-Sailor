"use client";

import { AnimatedList } from "@nebutra/ui/primitives";

const notifications = [
  {
    id: "1",
    emoji: "👤",
    title: "New signup",
    body: "john@example.com joined",
  },
  {
    id: "2",
    emoji: "💳",
    title: "Payment received",
    body: "$49/mo plan activated",
  },
  {
    id: "3",
    emoji: "🚀",
    title: "Deploy completed",
    body: "v2.1.0 is live in production",
  },
];

export function AnimatedListDemo() {
  return (
    <div className="p-8 flex h-[300px] w-full items-center justify-center overflow-hidden">
      <AnimatedList delay={1500} className="w-72 bottom-0 absolute">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="gap-3 px-4 py-3 w-72 flex items-center rounded-xl border bg-background shadow-sm"
          >
            <span className="text-xl">{n.emoji}</span>
            <div>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
            </div>
          </div>
        ))}
      </AnimatedList>
    </div>
  );
}
