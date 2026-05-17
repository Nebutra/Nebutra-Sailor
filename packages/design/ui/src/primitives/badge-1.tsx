"use client";

import Link from "next/link";
import type React from "react";
import { cn } from "../utils/cn";
import { Badge, type BadgeProps } from "./badge";

export interface Badge1Props extends Omit<BadgeProps, "asChild" | "icon" | "size" | "variant"> {
  variant?: BadgeProps["variant"];
  size?: BadgeProps["size"];
  capitalize?: boolean;
  icon?: React.ReactNode;
  as?: typeof Link;
  href?: string;
}

export const Badge1 = ({
  children,
  className,
  variant = "gray",
  size = "md",
  capitalize = false,
  icon,
  as,
  href,
  ...props
}: Badge1Props) => {
  const badgeClassName = cn(capitalize && "capitalize", className);

  if (as === Link && href) {
    return (
      <Badge
        asChild
        className={cn("!no-underline", badgeClassName)}
        icon={icon}
        size={size}
        variant={variant}
        {...props}
      >
        <Link href={href}>{children}</Link>
      </Badge>
    );
  }

  return (
    <Badge className={badgeClassName} icon={icon} size={size} variant={variant} {...props}>
      {children}
    </Badge>
  );
};
