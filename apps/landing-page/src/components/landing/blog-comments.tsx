"use client";

import { Heart, HeartFill, Message, PaperAirplane } from "@nebutra/icons";
import { useEffect, useMemo, useState } from "react";

interface BlogComment {
  id: string;
  body: string;
  authorName: string;
  authorImageUrl: string | null;
  createdAt: string | null;
  status?: "pending";
}

interface BlogCommentsResponse {
  comments: BlogComment[];
  viewer: {
    isSignedIn: boolean;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  reactions: {
    likeCount: number;
    viewerLiked: boolean;
  };
}

interface BlogCommentsProps {
  appUrl: string;
  translationKey: string;
  slug: string;
  language: "en" | "zh";
  labels: {
    title: string;
    subtitle: string;
    empty: string;
    signIn: string;
    placeholder: string;
    submit: string;
    submitting: string;
    pending: string;
    error: string;
    like: string;
    liked: string;
    signInToLike: string;
  };
}

function initialsFor(name: string): string {
  const source = name.trim();
  if (!source) return "?";
  const tokens = source.split(/\s+|@/).filter(Boolean);
  if (tokens.length >= 2) {
    return `${tokens[0]?.charAt(0) ?? ""}${tokens[1]?.charAt(0) ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null, language: "en" | "zh"): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function BlogComments({
  appUrl,
  labels,
  language,
  slug,
  translationKey,
}: BlogCommentsProps) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [viewer, setViewer] = useState<BlogCommentsResponse["viewer"] | null>(null);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<BlogCommentsResponse["reactions"]>({
    likeCount: 0,
    viewerLiked: false,
  });

  const endpoint = useMemo(() => {
    const url = new URL("/api/blog/comments", appUrl);
    url.searchParams.set("translationKey", translationKey);
    url.searchParams.set("slug", slug);
    url.searchParams.set("language", language);
    return url.toString();
  }, [appUrl, language, slug, translationKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadComments() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(endpoint, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Failed to load comments");
        const data = (await response.json()) as BlogCommentsResponse;
        if (cancelled) return;
        setComments(data.comments);
        setViewer(data.viewer);
        setReactions(data.reactions);
      } catch {
        if (!cancelled) setError(labels.error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadComments();
    return () => {
      cancelled = true;
    };
  }, [endpoint, labels.error]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(new URL("/api/blog/comments", appUrl).toString(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ translationKey, slug, language, body: trimmed }),
      });
      if (!response.ok) throw new Error("Failed to submit comment");
      const data = (await response.json()) as { comment: BlogComment };
      setComments((current) => [
        ...current,
        {
          ...data.comment,
          authorName: viewer?.name || viewer?.email || "Nebutra reader",
          authorImageUrl: viewer?.avatarUrl ?? null,
          status: "pending",
        },
      ]);
      setBody("");
    } catch {
      setError(labels.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLike() {
    if (isReacting) return;
    if (!viewer?.isSignedIn) {
      window.location.href = `${appUrl}/sign-in`;
      return;
    }

    const previous = reactions;
    const optimisticLiked = !previous.viewerLiked;
    setIsReacting(true);
    setError(null);
    setReactions({
      viewerLiked: optimisticLiked,
      likeCount: Math.max(0, previous.likeCount + (optimisticLiked ? 1 : -1)),
    });

    try {
      const response = await fetch(new URL("/api/blog/reactions", appUrl).toString(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ translationKey, slug, language, kind: "like" }),
      });
      if (!response.ok) throw new Error("Failed to update reaction");
      const data = (await response.json()) as { liked: boolean; likeCount: number };
      setReactions({ viewerLiked: data.liked, likeCount: data.likeCount });
    } catch {
      setReactions(previous);
      setError(labels.error);
    } finally {
      setIsReacting(false);
    }
  }

  const LikeIcon = reactions.viewerLiked ? HeartFill : Heart;

  return (
    <section
      className="mx-auto mt-16 max-w-3xl border-t border-[var(--neutral-6)] pt-10"
      aria-labelledby="blog-comments-title"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--neutral-11)]">
            <Message className="size-4" aria-hidden />
            {comments.length}
          </p>
          <h2
            id="blog-comments-title"
            className="text-2xl font-semibold tracking-tight text-[var(--neutral-12)]"
          >
            {labels.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--neutral-11)]">{labels.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleLike}
          disabled={isReacting}
          aria-pressed={reactions.viewerLiked}
          aria-label={
            viewer?.isSignedIn
              ? reactions.viewerLiked
                ? labels.liked
                : labels.like
              : labels.signInToLike
          }
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)] disabled:cursor-wait disabled:opacity-60"
        >
          <LikeIcon
            className={
              reactions.viewerLiked
                ? "size-4 text-[var(--accent-11)]"
                : "size-4 text-[var(--neutral-11)]"
            }
            aria-hidden
          />
          <span>{reactions.likeCount}</span>
        </button>
      </div>

      <div className="mt-8 space-y-5">
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-xl bg-[var(--neutral-3)]" />
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <article key={comment.id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--neutral-3)] text-xs font-semibold text-[var(--neutral-11)]">
                {comment.authorImageUrl ? (
                  // biome-ignore lint/performance/noImgElement: comment avatars are remote user assets outside next/image remotePatterns.
                  <img
                    src={comment.authorImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initialsFor(comment.authorName)
                )}
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium text-[var(--neutral-12)]">{comment.authorName}</span>
                  {formatDate(comment.createdAt, language) && (
                    <time className="text-xs text-[var(--neutral-10)]">
                      {formatDate(comment.createdAt, language)}
                    </time>
                  )}
                  {comment.status === "pending" && (
                    <span className="rounded-full bg-[var(--neutral-3)] px-2 py-0.5 text-[11px] font-medium text-[var(--neutral-11)]">
                      {labels.pending}
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--neutral-11)]">
                  {comment.body}
                </p>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--neutral-7)] px-4 py-6 text-sm text-[var(--neutral-11)]">
            {labels.empty}
          </p>
        )}
      </div>

      <div className="mt-8">
        {viewer?.isSignedIn ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[var(--neutral-6)] p-3"
          >
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1200}
              rows={4}
              placeholder={labels.placeholder}
              className="min-h-28 w-full resize-y bg-transparent px-1 py-1 text-sm leading-6 text-[var(--neutral-12)] outline-none placeholder:text-[var(--neutral-10)]"
            />
            <div className="flex items-center justify-between gap-4 border-t border-[var(--neutral-6)] pt-3">
              <span className="text-xs text-[var(--neutral-10)]">{body.trim().length}/1200</span>
              <button
                type="submit"
                disabled={body.trim().length < 2 || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--neutral-12)] px-4 py-2 text-sm font-medium text-[var(--neutral-1)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PaperAirplane className="size-4" aria-hidden />
                {isSubmitting ? labels.submitting : labels.submit}
              </button>
            </div>
          </form>
        ) : (
          <a
            href={`${appUrl}/sign-in`}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-7)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
          >
            {labels.signIn}
          </a>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-[color:var(--status-danger)]">{error}</p>}
    </section>
  );
}
