"use client";

import Image from "next/image";

import { cn } from "../utils/cn";

/**
 * Avatar item configuration
 */
export interface AvatarCircleItem {
  /** URL of the avatar image */
  imageUrl: string;
  /** URL to navigate to when avatar is clicked */
  profileUrl: string;
  /** Alt text for accessibility (defaults to "Avatar {index}") */
  alt?: string;
}

/**
 * Props for the AvatarCircles component
 */
export interface AvatarCirclesProps {
  /** Additional CSS classes */
  className?: string;
  /** Number to display in the overflow indicator (e.g., "+99") */
  numPeople?: number;
  /** Array of avatar configurations */
  avatarUrls: AvatarCircleItem[];
  /** Size of each avatar in pixels (default: 40) */
  size?: number;
  /** URL for the overflow indicator click */
  overflowUrl?: string;
}

/**
 * AvatarCircles - Overlapping avatar stack component
 *
 * Displays a row of overlapping circular avatars with an optional
 * count indicator for additional people. Commonly used for showing
 * team members, contributors, or social proof.
 *
 * @example Basic usage
 * ```tsx
 * <AvatarCircles
 *   avatarUrls={[
 *     { imageUrl: "https://example.com/avatar1.jpg", profileUrl: "/user/1" },
 *     { imageUrl: "https://example.com/avatar2.jpg", profileUrl: "/user/2" },
 *   ]}
 * />
 * ```
 *
 * @example With overflow count
 * ```tsx
 * <AvatarCircles
 *   numPeople={99}
 *   avatarUrls={[
 *     { imageUrl: "https://avatars.githubusercontent.com/u/1", profileUrl: "https://github.com/user1" },
 *     { imageUrl: "https://avatars.githubusercontent.com/u/2", profileUrl: "https://github.com/user2" },
 *     { imageUrl: "https://avatars.githubusercontent.com/u/3", profileUrl: "https://github.com/user3" },
 *   ]}
 * />
 * ```
 *
 * @example Custom size
 * ```tsx
 * <AvatarCircles
 *   size={48}
 *   numPeople={50}
 *   avatarUrls={avatars}
 * />
 * ```
 *
 * @example Social proof section
 * ```tsx
 * <div className="flex items-center gap-4">
 *   <AvatarCircles avatarUrls={users} numPeople={1000} />
 *   <span className="text-sm text-muted-foreground">
 *     Join 1,000+ developers
 *   </span>
 * </div>
 * ```
 */
export function AvatarCircles({
  numPeople,
  className,
  avatarUrls,
  size = 40,
  overflowUrl = "",
}: AvatarCirclesProps) {
  return (
    <div className={cn("z-10 flex -space-x-4 rtl:space-x-reverse", className)}>
      {avatarUrls.map((avatar, index) => (
        <a
          key={index}
          href={avatar.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-transform hover:z-10 hover:scale-110"
        >
          <Image
            className="rounded-full border-2 border-white"
            src={avatar.imageUrl}
            width={size}
            height={size}
            style={{ width: size, height: size }}
            alt={avatar.alt || `Avatar ${index + 1}`}
          />
        </a>
      ))}
      {(numPeople ?? 0) > 0 && (
        <a
          className="flex items-center justify-center rounded-full border-2 border-background bg-foreground text-center text-xs font-medium text-background hover:bg-muted-foreground dark:bg-foreground dark:text-background"
          style={{ width: size, height: size }}
          href={overflowUrl}
        >
          +{numPeople}
        </a>
      )}
    </div>
  );
}
