"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type MouseEvent, type ReactNode, startTransition } from "react";

type BlogTransitionLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
  prefetch?: boolean;
  style?: CSSProperties;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
};

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button === 1 ||
    event.currentTarget.target === "_blank"
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BlogTransitionLink({
  children,
  className,
  href,
  prefetch,
  style,
}: BlogTransitionLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const transitionDocument = document as ViewTransitionDocument;

    if (
      event.defaultPrevented ||
      isModifiedEvent(event) ||
      typeof transitionDocument.startViewTransition !== "function" ||
      prefersReducedMotion()
    ) {
      return;
    }

    event.preventDefault();
    transitionDocument.startViewTransition(() => {
      startTransition(() => {
        router.push(href);
      });
    });
  }

  return (
    <Link href={href} prefetch={prefetch} className={className} style={style} onClick={handleClick}>
      {children}
    </Link>
  );
}
