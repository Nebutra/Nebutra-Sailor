"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

export interface NotificationMessage {
  /** Message title */
  title: string;
  /** Time ago text */
  time: string;
  /** Message content */
  content: string;
  /** Gradient color classes (e.g. "from-pink-400 to-indigo-500") */
  gradientColor?: string;
}

export interface NotificationMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** List of messages */
  messages: NotificationMessage[];
  /** Max height of the container */
  maxHeight?: string;
  /** Animation delay between items (ms) */
  animationDelay?: number;
}

// Inline keyframes for animation
const ANIMATION_STYLES = `
@keyframes notification-scale-up {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.notification-animate-scale-up {
  animation: notification-scale-up 0.3s ease-out forwards;
  opacity: 0;
}
`;

/**
 * NotificationMessageList - Animated notification message list
 *
 * Displays a list of notification messages with staggered scale-up animation.
 * Includes a fade overlay at the bottom for overflow effect.
 */
export function NotificationMessageList({
  messages,
  maxHeight = "280px",
  animationDelay = 300,
  className,
  ...props
}: NotificationMessageListProps) {
  return (
    <div
      className={cn("relative w-full max-w-sm overflow-hidden bg-background p-2", className)}
      style={{ height: maxHeight }}
      {...props}
    >
      <style>{ANIMATION_STYLES}</style>

      {/* Fade overlay at bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-0 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="notification-animate-scale-up flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border p-3 transition duration-300 ease-in-out hover:bg-muted/50"
            style={{ animationDelay: `${i * animationDelay}ms` }}
          >
            <div
              className={cn(
                "size-8 min-h-[2rem] min-w-[2rem] rounded-[var(--radius-lg)] bg-gradient-to-br",
                msg.gradientColor || "from-primary to-primary/60",
              )}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                {msg.title}
                <span className="text-xs text-muted-foreground before:mr-1 before:content-['•']">
                  {msg.time}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

NotificationMessageList.displayName = "NotificationMessageList";
