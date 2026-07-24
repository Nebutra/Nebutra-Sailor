// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type * as React from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/icons", () => {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => <svg aria-hidden="true" {...props} />;
  return {
    Heart: Icon,
    HeartFill: Icon,
    Message: Icon,
    PaperAirplane: Icon,
    Star: Icon,
    StarFill: Icon,
  };
});

vi.mock("@nebutra/ui/primitives", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

import { BlogComments } from "../blog-comments";

const labels = {
  title: "Comments",
  subtitle: "Join the thread",
  empty: "No comments",
  signIn: "Sign in",
  placeholder: "Write a comment",
  submit: "Submit",
  submitting: "Submitting",
  pending: "Pending",
  error: "Could not load comments",
  like: "Like",
  liked: "Liked",
  save: "Save",
  saved: "Saved",
  signInToLike: "Sign in to like",
  signInToSave: "Sign in to save",
} as const;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: 30_000 },
    },
  });
}

function renderWithQueryClient(ui: ReactNode, client = createQueryClient()) {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function commentsUi() {
  return (
    <BlogComments
      appUrl="https://app.nebutra.com"
      language="en"
      labels={labels}
      slug="query-cache"
      translationKey="post.query-cache"
    />
  );
}

describe("BlogComments", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          comments: [
            {
              id: "comment_1",
              body: "First cached comment",
              authorName: "Ada",
              authorImageUrl: null,
              createdAt: "2026-06-01T00:00:00.000Z",
            },
          ],
          viewer: {
            isSignedIn: true,
            name: "Reader",
            email: "reader@example.com",
            avatarUrl: null,
          },
          reactions: {
            likeCount: 2,
            saveCount: 1,
            viewerLiked: false,
            viewerSaved: false,
          },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses the cached comment snapshot when the same article remounts", async () => {
    const client = createQueryClient();
    const first = renderWithQueryClient(commentsUi(), client);

    await screen.findByText("First cached comment");
    expect(fetch).toHaveBeenCalledTimes(1);

    first.unmount();
    renderWithQueryClient(commentsUi(), client);

    await waitFor(() => expect(screen.getByText("First cached comment")).toBeTruthy());
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
