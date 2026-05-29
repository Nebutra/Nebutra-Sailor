"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

export interface User {
  name: string;
  role?: string;
  image?: string;
}

export interface AvatarSmartGroupProps {
  users: User[];
  variant?: "centered" | "uniform"; // two display modes
  size?: number; // base size in px
  sizeStep?: number; // size difference for centered variant
  overlap?: number; // negative for overlap
  ringColor?: string; // ring color class
  hoverScale?: number;
  tooltipBg?: string;
}

function getAvatarUserKey(user: User): string {
  return [user.name, user.role ?? "member", user.image ?? "no-image"].join("|");
}

export function AvatarSmartGroup({
  users,
  variant = "uniform",
  size = 56,
  sizeStep = 8,
  overlap = -10,
  ringColor = "ring-background",
  hoverScale = 1.1,
  tooltipBg = "bg-popover",
}: AvatarSmartGroupProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const centerIndex = Math.floor(users.length / 2);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="flex items-center justify-center"
        style={overlap >= 0 ? { gap: `${overlap}px` } : undefined}
      >
        {users.map((user, index) => {
          const userKey = getAvatarUserKey(user);
          const isCenter = variant === "centered" && index === centerIndex;
          const avatarSize = variant === "centered" ? (isCenter ? size + sizeStep : size) : size;

          return (
            <Tooltip key={userKey}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={user.role ? `${user.name}, ${user.role}` : user.name}
                  className={`rounded-full ring-2 ${ringColor} transition-transform duration-200 cursor-pointer border-none bg-transparent p-0 outline-none`}
                  style={{
                    marginLeft: index > 0 && overlap < 0 ? `${overlap}px` : undefined,
                    transform: activeKey === userKey ? `scale(${hoverScale})` : "scale(1)",
                    zIndex: isCenter ? 10 : 0,
                  }}
                  onFocus={() => setActiveKey(userKey)}
                  onBlur={() => setActiveKey(null)}
                  onMouseEnter={() => setActiveKey(userKey)}
                  onMouseLeave={() => setActiveKey(null)}
                >
                  <Avatar
                    className="border-none"
                    style={{
                      width: avatarSize,
                      height: avatarSize,
                    }}
                  >
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent
                className={`${tooltipBg} text-popover-foreground shadow-md rounded-[var(--radius-lg)] px-3 py-2 border-inherit`}
              >
                <p className="font-semibold">{user.name}</p>
                {user.role && <p className="text-xs opacity-80">{user.role}</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
