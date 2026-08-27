"use client";

import { Heart, HeartFill, Message, PaperAirplane, Star, StarFill } from "@nebutra/icons";
import { Textarea } from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComponentType, SVGProps } from "react";
import { useMemo, useState } from "react";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { queryKeys } from "@/lib/query-keys";

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
    saveCount: number;
    viewerLiked: boolean;
    viewerSaved: boolean;
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
    save: string;
    saved: string;
    signInToLike: string;
    signInToSave: string;
  };
}

type ReactionKind = "like" | "save";

interface CommentCreateResponse {
  comment: BlogComment;
}

interface ReactionResponse {
  likeCount?: number;
  liked?: boolean;
  saveCount?: number;
  saved?: boolean;
}

async function fetchComments(
  endpoint: string,
  signal?: AbortSignal,
): Promise<BlogCommentsResponse> {
  const requestInit: RequestInit = {
    credentials: "include",
    headers: { Accept: "application/json" },
  };
  if (signal) {
    requestInit.signal = signal;
  }
  const response = await fetch(endpoint, requestInit);
  if (!response.ok) {
    throw new Error(`Failed to load blog comments (${response.status})`);
  }
  return (await response.json()) as BlogCommentsResponse;
}

async function createComment(input: {
  body: string;
  language: "en" | "zh";
  slug: string;
  translationKey: string;
}): Promise<CommentCreateResponse> {
  const response = await fetch("/api/blog/comments", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Failed to create blog comment (${response.status})`);
  }
  return (await response.json()) as CommentCreateResponse;
}

async function submitReaction(input: {
  kind: ReactionKind;
  language: "en" | "zh";
  slug: string;
  translationKey: string;
}): Promise<ReactionResponse> {
  const response = await fetch("/api/blog/reactions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Failed to update blog reaction (${response.status})`);
  }
  return (await response.json()) as ReactionResponse;
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
  return new Intl.DateTimeFormat(isZhUiLocale(language) ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function ReactionButton({
  active,
  count,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  disabled: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
    >
      <Icon
        className={active ? "size-4 text-primary" : "size-4 text-muted-foreground"}
        aria-hidden
      />
      <span>{count}</span>
    </button>
  );
}

export function BlogComments({
  appUrl,
  labels,
  language,
  slug,
  translationKey,
}: BlogCommentsProps) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const endpoint = `/api/blog/comments?${new URLSearchParams({
    language,
    slug,
    translationKey,
  }).toString()}`;
  const commentsKey = useMemo(
    () => queryKeys.blogComments.detail({ language, slug, translationKey }),
    [language, slug, translationKey],
  );

  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: ({ signal }) => fetchComments(endpoint, signal),
  });

  const snapshot = commentsQuery.data;
  const comments = snapshot?.comments ?? [];
  const viewer = snapshot?.viewer ?? null;
  const reactions = snapshot?.reactions ?? {
    likeCount: 0,
    saveCount: 0,
    viewerLiked: false,
    viewerSaved: false,
  };

  const submitMutation = useMutation({
    mutationFn: (trimmedBody: string) =>
      createComment({ translationKey, slug, language, body: trimmedBody }),
    onSuccess: (data) => {
      queryClient.setQueryData<BlogCommentsResponse>(commentsKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          comments: [
            ...current.comments,
            {
              ...data.comment,
              authorName: current.viewer.name || current.viewer.email || "Nebutra reader",
              authorImageUrl: current.viewer.avatarUrl ?? null,
              status: "pending",
            },
          ],
        };
      });
      setBody("");
    },
  });

  const reactionMutation = useMutation<
    ReactionResponse,
    Error,
    ReactionKind,
    { previous?: BlogCommentsResponse }
  >({
    mutationFn: (kind) => submitReaction({ translationKey, slug, language, kind }),
    onMutate: async (kind) => {
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const previous = queryClient.getQueryData<BlogCommentsResponse>(commentsKey);
      queryClient.setQueryData<BlogCommentsResponse>(commentsKey, (current) => {
        if (!current) return current;
        const activeField = kind === "like" ? "viewerLiked" : "viewerSaved";
        const countField = kind === "like" ? "likeCount" : "saveCount";
        const optimisticActive = !current.reactions[activeField];
        return {
          ...current,
          reactions: {
            ...current.reactions,
            [activeField]: optimisticActive,
            [countField]: Math.max(0, current.reactions[countField] + (optimisticActive ? 1 : -1)),
          },
        };
      });
      return { previous };
    },
    onError: (_error, _kind, context) => {
      if (context?.previous) {
        queryClient.setQueryData(commentsKey, context.previous);
      }
    },
    onSuccess: (data, kind) => {
      queryClient.setQueryData<BlogCommentsResponse>(commentsKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          reactions:
            kind === "like"
              ? {
                  ...current.reactions,
                  likeCount: data.likeCount ?? current.reactions.likeCount,
                  viewerLiked: Boolean(data.liked),
                }
              : {
                  ...current.reactions,
                  saveCount: data.saveCount ?? current.reactions.saveCount,
                  viewerSaved: Boolean(data.saved),
                },
        };
      });
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitMutation.isPending) return;
    submitMutation.mutate(trimmed);
  }

  function handleReaction(kind: ReactionKind) {
    if (reactionMutation.isPending) return;
    if (!viewer?.isSignedIn) {
      window.location.href = `${appUrl}/sign-in`;
      return;
    }
    reactionMutation.mutate(kind);
  }

  const LikeIcon = reactions.viewerLiked ? HeartFill : Heart;
  const SaveIcon = reactions.viewerSaved ? StarFill : Star;

  function getReactionLabel(kind: "like" | "save"): string {
    if (kind === "like") {
      return viewer?.isSignedIn
        ? reactions.viewerLiked
          ? labels.liked
          : labels.like
        : labels.signInToLike;
    }
    return viewer?.isSignedIn
      ? reactions.viewerSaved
        ? labels.saved
        : labels.save
      : labels.signInToSave;
  }

  return (
    <section
      className="mx-auto mt-16 max-w-3xl border-t border-border pt-10"
      aria-labelledby="blog-comments-title"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Message className="size-4" aria-hidden />
            {comments.length}
          </p>
          <h2
            id="blog-comments-title"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            {labels.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{labels.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ReactionButton
            active={reactions.viewerLiked}
            count={reactions.likeCount}
            disabled={reactionMutation.isPending}
            icon={LikeIcon}
            label={getReactionLabel("like")}
            onClick={() => {
              handleReaction("like");
            }}
          />
          <ReactionButton
            active={reactions.viewerSaved}
            count={reactions.saveCount}
            disabled={reactionMutation.isPending}
            icon={SaveIcon}
            label={getReactionLabel("save")}
            onClick={() => {
              handleReaction("save");
            }}
          />
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {commentsQuery.isPending ? (
          <div className="h-20 animate-pulse rounded-[var(--radius-xl)] bg-muted" />
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <article key={comment.id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground">
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
              <div className="min-w-0 flex-1 rounded-[var(--radius-xl)] border border-border bg-background px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium text-foreground">{comment.authorName}</span>
                  {formatDate(comment.createdAt, language) && (
                    <time className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt, language)}
                    </time>
                  )}
                  {comment.status === "pending" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {labels.pending}
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {comment.body}
                </p>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-[var(--radius-xl)] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            {labels.empty}
          </p>
        )}
      </div>

      <div className="mt-8">
        {viewer?.isSignedIn ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-[var(--radius-2xl)] border border-border p-3"
          >
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1200}
              rows={4}
              aria-label={labels.placeholder}
              placeholder={labels.placeholder}
              className="min-h-28 w-full resize-y border-0 bg-transparent px-1 py-1 text-sm leading-6 shadow-none"
            />
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">{body.trim().length}/1200</span>
              <button
                type="submit"
                disabled={body.trim().length < 2 || submitMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--foreground))] px-4 py-2 text-sm font-medium text-[hsl(var(--background))] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PaperAirplane className="size-4" aria-hidden />
                {submitMutation.isPending ? labels.submitting : labels.submit}
              </button>
            </div>
          </form>
        ) : (
          <a
            href={`${appUrl}/sign-in`}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {labels.signIn}
          </a>
        )}
      </div>

      {(commentsQuery.isError || submitMutation.isError || reactionMutation.isError) && (
        <p className="mt-4 text-sm text-[color:var(--status-danger)]">{labels.error}</p>
      )}
    </section>
  );
}
