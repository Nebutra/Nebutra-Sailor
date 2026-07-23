"use client";

import { Suspense } from "react";
import {
  enrichTweet,
  TweetBody,
  TweetContainer,
  TweetHeader,
  TweetInfo,
  TweetInReplyTo,
  TweetMedia,
  TweetNotFound,
  TweetReplies,
  type TwitterComponents,
  useTweet,
} from "react-tweet";
import type { Tweet } from "react-tweet/api";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface XPostCardProps {
  /** The ID of the X post to display */
  id: string;
  /** Additional CSS classes */
  className?: string;
  /** Custom API URL for fetching tweet data */
  apiUrl?: string;
  /** Custom fetch options */
  fetchOptions?: RequestInit;
  /** Fallback content while loading */
  fallback?: React.ReactNode;
  /** Custom components to override defaults */
  components?: TwitterComponents;
  /** Error handler callback */
  onError?: (error: Error | undefined) => Error | undefined;
}

// =============================================================================
// Internal Components
// =============================================================================

interface MagicXPostProps {
  tweet: Tweet;
  components?: TwitterComponents;
  className?: string;
}

function MagicXPost({ tweet: t, components, className }: MagicXPostProps) {
  const tweet = enrichTweet(t);

  return (
    <TweetContainer
      className={cn(
        "relative flex size-full max-w-lg flex-col gap-2 overflow-hidden rounded-[var(--radius-lg)] border p-4",
        "bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <TweetHeader tweet={tweet} {...(components && { components })} />
      {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
      <TweetBody tweet={tweet} />
      {tweet.mediaDetails?.length ? (
        <TweetMedia tweet={tweet} {...(components && { components })} />
      ) : null}
      <TweetInfo tweet={tweet} />
      <TweetReplies tweet={tweet} />
    </TweetContainer>
  );
}

// =============================================================================
// Client Component
// =============================================================================

/**
 * ClientXPostCard - Client-side rendered X (formerly Twitter) post card
 *
 * @description
 * Embeds an X post using client-side rendering with the react-tweet library.
 * Use this component when you need to render posts in a client component.
 *
 * @example
 * ```tsx
 * "use client"
 *
 * import { ClientXPostCard } from "@nebutra/ui/primitives";
 *
 * export default function Page() {
 *   return <ClientXPostCard id="1441032681968212480" />;
 * }
 * ```
 */
export function ClientXPostCard({
  id,
  apiUrl,
  fetchOptions,
  fallback = <XPostSkeleton />,
  components,
  onError,
  className,
}: XPostCardProps) {
  const { data, error, isLoading } = useTweet(id, apiUrl, fetchOptions);

  if (isLoading) return <>{fallback}</>;

  if (error || !data) {
    const NotFound = components?.TweetNotFound || TweetNotFound;
    return <NotFound error={onError ? onError(error) : error} />;
  }

  return <MagicXPost tweet={data} {...(components && { components })} className={cn(className)} />;
}

// =============================================================================
// Server Component (wrapper for Suspense)
// =============================================================================

/**
 * XPostCard - X (formerly Twitter) post card with Suspense
 *
 * @description
 * A wrapper around ClientXPostCard with built-in Suspense boundary.
 * This is the recommended component for most use cases.
 *
 * @example
 * ```tsx
 * import { XPostCard } from "@nebutra/ui/primitives";
 *
 * export default function Page() {
 *   return <XPostCard id="1441032681968212480" />;
 * }
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <XPostCard
 *   id="1441032681968212480"
 *   fallback={<div>Loading post...</div>}
 * />
 * ```
 */
export function XPostCard(props: XPostCardProps) {
  return (
    <Suspense fallback={props.fallback || <XPostSkeleton />}>
      <ClientXPostCard {...props} />
    </Suspense>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

/**
 * XPostSkeleton - Loading skeleton for X post cards
 */
export function XPostSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-full max-w-lg flex-col gap-2 rounded-[var(--radius-lg)] border p-4",
        "bg-card animate-pulse",
        className,
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="flex flex-col gap-1">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
      {/* Footer skeleton */}
      <div className="flex gap-4 pt-4">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}
