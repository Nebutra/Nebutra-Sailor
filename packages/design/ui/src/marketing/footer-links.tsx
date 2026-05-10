"use client";

import { ChevronDown, ExternalLink, Github, Linkedin, Twitter, Youtube } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface FooterLink {
  /** Link title */
  title: string;
  /** Link URL */
  href: string;
  /** Whether link opens in new tab */
  external?: boolean;
  /** Optional icon */
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FooterDropdownItem {
  /** Item title */
  title: string;
  /** Item URL (optional if just text) */
  href?: string;
  /** Whether link opens in new tab */
  external?: boolean;
}

export interface FooterDropdown {
  /** Dropdown trigger text */
  title: string;
  /** Dropdown items */
  items: FooterDropdownItem[];
}

export interface FooterLinkGroup {
  /** Group title */
  title: string;
  /** Links in the group */
  links: FooterLink[];
  /** Optional dropdown at end of group */
  dropdown?: FooterDropdown;
}

export interface FooterSocialLink {
  /** Platform name for accessibility */
  name: string;
  /** Link URL */
  href: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
}

/* -------------------------------------------------------------------------- */
/*                              FooterLinkColumn                              */
/* -------------------------------------------------------------------------- */

export interface FooterLinkColumnProps {
  /** Link group data */
  group: FooterLinkGroup;
  /** Additional class names */
  className?: string;
}

/**
 * FooterLinkColumn - A single column of footer links with optional dropdown
 */
export function FooterLinkColumn({ group, className }: FooterLinkColumnProps) {
  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <span className="block font-medium">{group.title}</span>
      {group.links.map((link, index) => {
        const Icon = link.icon;
        return (
          <Link
            key={index}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className="text-muted-foreground hover:text-primary flex items-center gap-1 duration-150"
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{link.title}</span>
            {link.external && <ExternalLink className="h-3.5 w-3.5" />}
          </Link>
        );
      })}
      {group.dropdown && (
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm">
            {group.dropdown.title}
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60 p-1">
            {group.dropdown.items.map((item, index) =>
              item.href ? (
                <DropdownMenuItem key={index} asChild className="h-10 px-4">
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                  >
                    {item.title}
                    {item.external && <ExternalLink className="ml-auto h-4 w-4" />}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={index} className="h-10 px-4">
                  {item.title}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

FooterLinkColumn.displayName = "FooterLinkColumn";

/* -------------------------------------------------------------------------- */
/*                             FooterSocialLinks                              */
/* -------------------------------------------------------------------------- */

export interface FooterSocialLinksProps {
  /** Social links data */
  links: FooterSocialLink[];
  /** Title for the section */
  title?: string;
  /** Additional class names */
  className?: string;
}

/**
 * FooterSocialLinks - Social media links section
 */
export function FooterSocialLinks({ links, title = "Social", className }: FooterSocialLinksProps) {
  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <span className="block font-medium">{title}</span>
      {links.map((link, index) => {
        const Icon = link.icon;
        return (
          <Link
            key={index}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary block duration-150"
          >
            <span className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" />
              {link.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

FooterSocialLinks.displayName = "FooterSocialLinks";

/* -------------------------------------------------------------------------- */
/*                            SystemStatusButton                              */
/* -------------------------------------------------------------------------- */

export type SystemStatus = "normal" | "degraded" | "outage" | "maintenance";

export interface SystemStatusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Current system status */
  status?: SystemStatus;
  /** Status text */
  text?: string;
  /** Link to status page */
  href?: string;
}

const STATUS_CONFIG: Record<SystemStatus, { color: string; defaultText: string }> = {
  normal: { color: "bg-green-500", defaultText: "All systems normal" },
  degraded: { color: "bg-yellow-500", defaultText: "Degraded performance" },
  outage: { color: "bg-red-500", defaultText: "System outage" },
  maintenance: { color: "bg-blue-500", defaultText: "Under maintenance" },
};

/**
 * SystemStatusButton - Shows current system status with indicator
 */
export function SystemStatusButton({
  status = "normal",
  text,
  href,
  className,
  ...props
}: SystemStatusButtonProps) {
  const config = STATUS_CONFIG[status];
  const displayText = text ?? config.defaultText;

  const content = (
    <>
      <span className={cn("block size-3 rounded-full border border-background", config.color)} />
      {displayText}
    </>
  );

  const baseClassName = cn(
    "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors",
    "hover:bg-accent hover:text-accent-foreground",
    status === "normal" && "text-green-600 hover:text-green-600",
    status === "degraded" && "text-yellow-600 hover:text-yellow-600",
    status === "outage" && "text-red-600 hover:text-red-600",
    status === "maintenance" && "text-blue-600 hover:text-blue-600",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={cn(baseClassName, "cursor-pointer")} {...props}>
      {content}
    </button>
  );
}

SystemStatusButton.displayName = "SystemStatusButton";

/* -------------------------------------------------------------------------- */
/*                               Default Socials                              */
/* -------------------------------------------------------------------------- */

/** Default social links configuration */
export const DEFAULT_SOCIAL_LINKS: FooterSocialLink[] = [
  { name: "Github", href: "#", icon: Github },
  { name: "LinkedIn", href: "#", icon: Linkedin },
  { name: "Twitter", href: "#", icon: Twitter },
  { name: "YouTube", href: "#", icon: Youtube },
];
