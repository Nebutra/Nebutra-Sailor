"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

interface ViewTransitionLinkProps extends Omit<React.ComponentProps<typeof Link>, "href"> {
  href: string;
  onNavigate?: () => void;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => void;
};

function isModifiedEvent(event: React.MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function supportsViewTransitions() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return typeof (document as DocumentWithViewTransition).startViewTransition === "function";
}

export function ViewTransitionLink({
  href,
  onClick,
  onNavigate,
  replace,
  scroll,
  ...props
}: ViewTransitionLinkProps) {
  const router = useRouter();

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;

      onNavigate?.();

      if (isModifiedEvent(event)) return;
      if (!supportsViewTransitions()) return;

      event.preventDefault();

      const navigate = () => {
        if (replace) {
          router.replace(href, { scroll });
          return;
        }
        router.push(href, { scroll });
      };

      const doc = document as DocumentWithViewTransition;
      if (!doc.startViewTransition) {
        navigate();
        return;
      }

      doc.startViewTransition(() => {
        navigate();
      });
    },
    [href, onClick, onNavigate, replace, router, scroll],
  );

  return <Link href={href} replace={replace} scroll={scroll} onClick={handleClick} {...props} />;
}
