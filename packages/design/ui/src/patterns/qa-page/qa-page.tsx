"use client";

import {
  Bookmark,
  Calendar,
  Check,
  Eye,
  Flag,
  Pencil,
  Share as ShareIcon,
  StarFill,
} from "@nebutra/icons";
import { Fragment, useMemo, useState } from "react";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader } from "../../primitives/card";
import { Separator } from "../../primitives/separator";
import { cn } from "../../utils/cn";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownRenderer } from "./markdown-renderer";
import type { AnswerType, QuestionType, VoteType } from "./types";
import { UserInfo } from "./user-info";
import { VoteButtons } from "./vote-buttons";

/* -------------------------------------------------------------------------- *\
 *  QAPage — Stack Overflow-style question + answers surface.
 *
 *  Composed from @nebutra/ui primitives (Button, Card, Badge, Separator)
 *  plus sibling Q&A pieces (VoteButtons, UserInfo, MarkdownRenderer,
 *  MarkdownEditor). All icons from @nebutra/icons per the icon governance
 *  three-tier hierarchy — no lucide-react, no Phosphor (this isn't an
 *  AI-brand surface).
 *
 *  State ownership:
 *    The composition is uncontrolled by default — pass `initialQuestion` and
 *    `initialAnswers`, the component holds the optimistic vote / bookmark /
 *    accept / draft state. Provide `onVote*` / `onAccept` / `onSubmitAnswer`
 *    callbacks to persist upstream.
 *
 *  Submit semantics:
 *    `onSubmitAnswer` is invoked with the markdown source; the host owns
 *    persistence + author resolution. The pattern stamps a `Date.now()` id
 *    for the optimistic row only — replace with the server id on round-trip.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface QAPageProps {
  initialQuestion: QuestionType;
  initialAnswers: AnswerType[];
  /** Author resolved upstream for new answer drafts. */
  currentAuthor?: AnswerType["author"];
  /** Called when the user submits a new answer. Markdown source. */
  onSubmitAnswer?: (content: string) => void;
  /** Called when the user votes on the question. */
  onVoteQuestion?: (vote: VoteType) => void;
  /** Called when the user votes on an answer. */
  onVoteAnswer?: (id: AnswerType["id"], vote: VoteType) => void;
  /** Called when the user accepts/unaccepts an answer. */
  onAcceptAnswer?: (id: AnswerType["id"]) => void;
  /** Called when the user toggles the question bookmark. */
  onBookmark?: (next: boolean) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QAPage({
  initialQuestion,
  initialAnswers,
  currentAuthor = {
    name: "you",
    reputation: 0,
    badges: { gold: 0, silver: 0, bronze: 0 },
  },
  onSubmitAnswer,
  onVoteAnswer,
  onVoteQuestion,
  onAcceptAnswer,
  onBookmark,
  className,
}: QAPageProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answers, setAnswers] = useState(initialAnswers);
  const [draft, setDraft] = useState("");

  const handleQuestionVote = (next: "up" | "down") => {
    const userVote = question.userVote === next ? null : next;
    setQuestion((q) => ({ ...q, userVote }));
    onVoteQuestion?.(userVote);
  };

  const handleAnswerVote = (id: AnswerType["id"], next: "up" | "down") => {
    setAnswers((list) =>
      list.map((a) => (a.id === id ? { ...a, userVote: a.userVote === next ? null : next } : a)),
    );
    const fresh = answers.find((a) => a.id === id);
    const userVote = fresh && fresh.userVote === next ? null : next;
    onVoteAnswer?.(id, userVote);
  };

  const handleAccept = (id: AnswerType["id"]) => {
    setAnswers((list) =>
      list.map((a) => ({ ...a, isAccepted: a.id === id ? !a.isAccepted : false })),
    );
    onAcceptAnswer?.(id);
  };

  const handleBookmarkToggle = () => {
    setQuestion((q) => {
      const next = !q.bookmarked;
      onBookmark?.(next);
      return { ...q, bookmarked: next };
    });
  };

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const newAnswer: AnswerType = {
      id: Date.now(),
      content: trimmed,
      author: currentAuthor,
      votes: 0,
      timestamp: "just now",
      isAccepted: false,
      userVote: null,
    };
    setAnswers((list) => [...list, newAnswer]);
    setDraft("");
    onSubmitAnswer?.(trimmed);
  };

  // Sort: accepted first, then by score descending (with userVote applied)
  const sortedAnswers = useMemo(() => {
    return [...answers].sort((a, b) => {
      if (a.isAccepted !== b.isAccepted) return a.isAccepted ? -1 : 1;
      const aScore = a.votes + (a.userVote === "up" ? 1 : a.userVote === "down" ? -1 : 0);
      const bScore = b.votes + (b.userVote === "up" ? 1 : b.userVote === "down" ? -1 : 0);
      return bScore - aScore;
    });
  }, [answers]);

  return (
    <div className={cn("mx-auto w-full max-w-5xl p-4 md:p-6", className)}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="mb-6">
        <h1 className="mb-4 font-bold text-2xl leading-tight text-foreground">{question.title}</h1>
        <div className="mb-4 flex items-center gap-4 text-muted-foreground text-sm">
          <span className="flex items-center gap-1">
            <Calendar aria-hidden="true" className="h-4 w-4" />
            Asked {question.timestamp}
          </span>
          <span className="flex items-center gap-1">
            <Eye aria-hidden="true" className="h-4 w-4" />
            Viewed {question.views.toLocaleString()} times
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {question.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      {/* ── Question card ─────────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardContent className="flex gap-6 p-6">
          <div className="flex flex-col items-center gap-4">
            <VoteButtons
              votes={question.votes}
              userVote={question.userVote}
              onVote={handleQuestionVote}
              size="large"
              label="question"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={question.bookmarked ? "Remove bookmark" : "Bookmark question"}
              aria-pressed={question.bookmarked}
              onClick={handleBookmarkToggle}
              className={cn("p-2", question.bookmarked && "bg-warning/10 text-warning")}
            >
              <Bookmark className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <MarkdownRenderer content={question.content} />
            <PostActions
              className="mt-6"
              author={question.author}
              timestamp={question.timestamp}
              verb="asked"
              shareLabel="Share Question"
              editLabel="Edit Question"
              flagLabel="Flag Question"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Answers ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-xl">
          {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
        </h2>
      </div>

      <div className="mb-8">
        {sortedAnswers.map((answer, index) => (
          <Fragment key={answer.id}>
            <Card className={cn("mb-6", answer.isAccepted && "ring-2 ring-success/40")}>
              <CardContent className="flex gap-6 p-6">
                <div className="flex flex-col items-center gap-4">
                  <VoteButtons
                    votes={answer.votes}
                    userVote={answer.userVote}
                    onVote={(v) => handleAnswerVote(answer.id, v)}
                    size="large"
                    label="answer"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={answer.isAccepted ? "Unaccept this answer" : "Accept this answer"}
                    aria-pressed={answer.isAccepted}
                    onClick={() => handleAccept(answer.id)}
                    className={cn("p-2", answer.isAccepted && "bg-success/10 text-success")}
                  >
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </Button>
                  {answer.isAccepted && (
                    <div className="text-center">
                      <StarFill aria-hidden="true" className="mx-auto mb-1 h-4 w-4 text-success" />
                      <span className="font-medium text-success text-xs">Accepted</span>
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <MarkdownRenderer content={answer.content} />
                  <PostActions
                    className="mt-6"
                    author={answer.author}
                    timestamp={answer.timestamp}
                    verb="answered"
                    shareLabel="Share Answer"
                    editLabel="Edit Answer"
                    flagLabel="Flag Answer"
                  />
                </div>
              </CardContent>
            </Card>
            {index < sortedAnswers.length - 1 && <Separator className="mb-6" />}
          </Fragment>
        ))}
      </div>

      {/* ── Compose new answer ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-foreground text-lg">Your Answer</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <MarkdownEditor value={draft} onChange={setDraft} placeholder="Write your answer here…" />
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Thanks for contributing an answer!</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft("")}
                disabled={!draft}
              >
                Discard Draft
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={!draft.trim()}>
                Post Your Answer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostActions — share / edit / flag triad + author chrome
// ---------------------------------------------------------------------------

function PostActions({
  author,
  timestamp,
  verb,
  shareLabel,
  editLabel,
  flagLabel,
  className,
}: {
  author: AnswerType["author"];
  timestamp: string;
  verb: string;
  shareLabel: string;
  editLabel: string;
  flagLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" className="text-xs">
          <ShareIcon className="mr-1 h-3 w-3" aria-hidden="true" />
          {shareLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-xs">
          <Pencil className="mr-1 h-3 w-3" aria-hidden="true" />
          {editLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-xs">
          <Flag className="mr-1 h-3 w-3" aria-hidden="true" />
          {flagLabel}
        </Button>
      </div>
      <UserInfo author={author} timestamp={timestamp} verb={verb} />
    </div>
  );
}
