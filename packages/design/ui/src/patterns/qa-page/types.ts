/**
 * Q&A page shared types.
 *
 * Reusable across any consumer that builds a Stack Overflow-style forum or
 * help center surface. Authoring rules:
 *   - `content` is markdown — react-markdown + remark-gfm renders it
 *   - `timestamp` is an already-formatted display string (e.g. "2h ago",
 *     "Mar 14, 2026"). The pattern does not own time formatting — pair with
 *     RelativeTimeCard upstream for live updates.
 *   - `userVote` of `null` means the current viewer hasn't voted yet
 */

export type VoteType = "up" | "down" | null;

export interface Author {
  name: string;
  reputation: number;
  badges: { gold: number; silver: number; bronze: number };
  /** Pre-resolved avatar URL. Falls back to initials when omitted. */
  avatar?: string | null;
}

export interface QuestionType {
  id: number | string;
  title: string;
  /** Markdown source. */
  content: string;
  author: Author;
  tags: string[];
  votes: number;
  views: number;
  timestamp: string;
  bookmarked: boolean;
  userVote: VoteType;
}

export interface AnswerType {
  id: number | string;
  /** Markdown source. */
  content: string;
  author: Author;
  votes: number;
  timestamp: string;
  isAccepted: boolean;
  userVote: VoteType;
}
