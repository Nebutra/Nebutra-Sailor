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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const centerIndex = Math.floor(users.length / 2);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center justify-center -space-x-4" style={{ gap: `${overlap}px` }}>
        {users.map((user, index) => {
          const isCenter = variant === "centered" && index === centerIndex;
          const avatarSize = variant === "centered" ? (isCenter ? size + sizeStep : size) : size;

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={`rounded-full ring-2 ${ringColor} transition-transform duration-200 cursor-pointer border-none outline-none`}
                  style={{
                    transform: activeIndex === index ? `scale(${hoverScale})` : "scale(1)",
                    zIndex: isCenter ? 10 : 0,
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
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
                </div>
              </TooltipTrigger>
              <TooltipContent
                className={`${tooltipBg} text-popover-foreground shadow-md rounded-lg px-3 py-2 border-inherit`}
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
