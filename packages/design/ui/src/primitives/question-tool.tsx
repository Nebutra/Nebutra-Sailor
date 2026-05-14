"use client";

import { ChevronDown, ChevronUp, Question } from "@nebutra/icons";
import {
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { cn } from "../utils/cn";
import { Input } from "./input";
import { Textarea } from "./textarea";

/* -------------------------------------------------------------------------- *\
 *  QuestionPrompt / QuestionTool
 *
 *  Inline AI tool-call rendering of a multi-step questionnaire. Supports
 *  single-select, multi-select, and free-text question kinds, with optional
 *  "custom" write-in for option-based questions.
 *
 *  Aesthetic family: Linear / Vercel ai-elements / Raycast inline tool blocks.
 *
 *  a11y contract:
 *    - <fieldset role="radiogroup|group"> wrapping each question's options
 *    - role="radio" (single) or "checkbox" (multi) on each option button
 *    - aria-checked + aria-describedby on options
 *    - aria-labelledby links options to question title
 *    - Question title is rendered as <h2> for screen-reader landmarks
 *    - Keyboard A/B/C/D letter shortcuts select the corresponding option
 *      (option-based questions only; ignored when an input/textarea is focused)
 *
 *  Motion: all durations via four-rail Tailwind utilities (duration-micro/flow).
\* -------------------------------------------------------------------------- */

const QUESTION_CUSTOM_ID = "__custom__";

/** Hard cap on alphabetical option badges (A–Z). Questions with more options
 *  beyond Z fall back to "•" badges and forfeit letter shortcuts. */
const MAX_LETTER_OPTIONS = 26;

function optionBadge(idx: number): string {
  if (idx < 0 || idx >= MAX_LETTER_OPTIONS) return "•";
  return String.fromCharCode(65 + idx);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionOption = {
  id: string;
  label: string;
  description?: string;
};

export type QuestionKind = "single" | "multi" | "text";

export type QuestionConfig = {
  kind: QuestionKind;
  title: string;
  description?: string;
  options?: QuestionOption[];
  allowCustom?: boolean;
  customLabel?: string;
  customPlaceholder?: string;
  minSelections?: number;
  maxSelections?: number;
  placeholder?: string;
};

export type QuestionAnswer =
  | { kind: "single"; selectedIds: string[]; text?: string }
  | { kind: "multi"; selectedIds: string[]; text?: string }
  | { kind: "text"; text: string }
  | { kind: "skip" };

// ---------------------------------------------------------------------------
// Shared styling constants (semantic tokens only — no raw scale colors)
// ---------------------------------------------------------------------------

const optionRowBase =
  "w-full text-left rounded-md px-2 py-1.5 flex items-center gap-2 -mx-2 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none transition-colors duration-micro";

const badgeBase =
  "h-5 min-w-5 px-1 rounded-sm inline-flex items-center justify-center text-sm font-medium border transition-colors duration-micro";

const badgeOff = "bg-transparent text-muted-foreground border-border";
const badgeOn = "bg-primary text-primary-foreground border-primary";

// ---------------------------------------------------------------------------
// QuestionPrompt — atomic single-question renderer
// ---------------------------------------------------------------------------

export type QuestionPromptProps = {
  questions: QuestionConfig[];
  questionIndex?: number;
  totalQuestions?: number;
  onPreviousQuestion?: () => void;
  onNextQuestion?: () => void;
  initialAnswer?: QuestionAnswer;
  submitLabel?: string;
  nextLabel?: string;
  skipLabel?: string;
  previousLabel?: string;
  allowSkip?: boolean;
  onSubmit: (answer: QuestionAnswer) => void;
  onSkip?: () => void;
  className?: string;
};

export function QuestionPrompt({
  questions,
  questionIndex = 1,
  totalQuestions,
  onPreviousQuestion,
  onNextQuestion,
  submitLabel = "Send",
  nextLabel = "Next",
  skipLabel = "Skip",
  previousLabel = "Previous",
  allowSkip = true,
  initialAnswer,
  onSubmit,
  onSkip,
  className,
}: QuestionPromptProps): ReactElement | null {
  const titleId = useId();
  const descriptionId = useId();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [textValue, setTextValue] = useState("");

  const resolvedTotal = totalQuestions ?? questions.length;
  const clampedIndex = Math.max(1, Math.min(questionIndex, resolvedTotal));
  const activeQuestion = questions[clampedIndex - 1];
  const customEnabled = activeQuestion?.allowCustom ?? false;
  const showNav = resolvedTotal > 1 && (!!onPreviousQuestion || !!onNextQuestion);
  const canGoPrev = clampedIndex > 1;
  const canGoNext = clampedIndex < resolvedTotal;
  const isLastQuestion = clampedIndex >= resolvedTotal;
  const primaryLabel = isLastQuestion ? submitLabel : nextLabel;

  // Stable signature for initialAnswer keeps the reset effect from churning on
  // array-identity changes. Used in the deps array below.
  const initialAnswerSignature = useMemo(() => {
    if (!initialAnswer || initialAnswer.kind === "skip") return "";
    if (initialAnswer.kind === "text") return `t:${initialAnswer.text}`;
    return `${initialAnswer.kind}:${initialAnswer.selectedIds.join(",")}:${initialAnswer.text ?? ""}`;
  }, [initialAnswer]);

  useEffect(() => {
    if (!initialAnswer || initialAnswer.kind === "skip") {
      setSelectedIds([]);
      setCustomText("");
      setTextValue("");
      return;
    }
    if (initialAnswer.kind === "text") {
      setSelectedIds([]);
      setCustomText("");
      setTextValue(initialAnswer.text);
      return;
    }
    const nextSelected = new Set(initialAnswer.selectedIds);
    const nextCustomText = initialAnswer.text ?? "";
    if (customEnabled && nextCustomText.trim().length > 0) {
      nextSelected.add(QUESTION_CUSTOM_ID);
    }
    setSelectedIds(Array.from(nextSelected));
    setCustomText(nextCustomText);
    setTextValue("");
  }, [customEnabled, initialAnswer, initialAnswerSignature]);

  const canSubmit = useMemo(() => {
    if (!activeQuestion) return false;
    if (activeQuestion.kind === "text") return textValue.trim().length > 0;
    const selectedNonCustom = selectedIds.filter((id) => id !== QUESTION_CUSTOM_ID).length;
    const hasCustomText = customText.trim().length > 0;
    const total = selectedNonCustom + (hasCustomText ? 1 : 0);
    if (activeQuestion.kind === "single") return total === 1;
    const min = activeQuestion.minSelections ?? 1;
    const max = activeQuestion.maxSelections;
    if (total < min) return false;
    if (typeof max === "number" && total > max) return false;
    return total > 0;
  }, [activeQuestion, selectedIds, customText, textValue]);

  const handleSingleSelect = useCallback(
    (id: string) => {
      setSelectedIds([id]);
      if (customEnabled) setCustomText("");
    },
    [customEnabled],
  );

  const toggleMulti = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleOptionClick = useCallback(
    (id: string) => {
      if (!activeQuestion) return;
      if (activeQuestion.kind === "single") handleSingleSelect(id);
      else if (activeQuestion.kind === "multi") toggleMulti(id);
    },
    [activeQuestion, handleSingleSelect, toggleMulti],
  );

  const handleCustomTextChange = (nextValue: string) => {
    setCustomText(nextValue);
    if (!activeQuestion) return;
    if (activeQuestion.kind === "single") {
      setSelectedIds(nextValue.trim().length > 0 ? [QUESTION_CUSTOM_ID] : []);
      return;
    }
    setSelectedIds((prev) => {
      const hasCustom = prev.includes(QUESTION_CUSTOM_ID);
      if (nextValue.trim().length > 0 && !hasCustom) return [...prev, QUESTION_CUSTOM_ID];
      if (nextValue.trim().length === 0 && hasCustom)
        return prev.filter((id) => id !== QUESTION_CUSTOM_ID);
      return prev;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit || !activeQuestion) return;
    if (activeQuestion.kind === "text") {
      onSubmit({ kind: "text", text: textValue.trim() });
      return;
    }
    const selectedNonCustom = selectedIds.filter((id) => id !== QUESTION_CUSTOM_ID);
    const answerText = customText.trim();
    onSubmit({
      kind: activeQuestion.kind,
      selectedIds: selectedNonCustom,
      ...(answerText ? { text: answerText } : {}),
    });
  };

  const handleSkip = () => {
    onSkip?.();
    onSubmit({ kind: "skip" });
  };

  // A/B/C/… letter shortcuts — option-based questions only.
  // Ignored while an input/textarea is focused (so user can type freely).
  useEffect(() => {
    if (!activeQuestion || activeQuestion.kind === "text") return;
    const options = activeQuestion.options ?? [];
    if (options.length === 0) return;

    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toUpperCase();
      if (key.length !== 1) return;
      const code = key.charCodeAt(0);
      if (code < 65 || code >= 65 + MAX_LETTER_OPTIONS) return;
      const optionIdx = code - 65;
      const option = options[optionIdx];
      if (option) {
        event.preventDefault();
        handleOptionClick(option.id);
      } else if (customEnabled && optionIdx === options.length) {
        // The custom write-in slot reserves the next letter.
        event.preventDefault();
        const customInput = document.getElementById(
          `${descriptionId}-custom`,
        ) as HTMLInputElement | null;
        customInput?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeQuestion, customEnabled, descriptionId, handleOptionClick]);

  if (!activeQuestion) return null;

  const groupRole = activeQuestion.kind === "single" ? "radiogroup" : "group";
  const optionRole = activeQuestion.kind === "single" ? "radio" : "checkbox";

  return (
    <div className={cn("space-y-2 bg-background px-3 py-2", className)}>
      <div className="flex items-center justify-between gap-px">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <span
            aria-hidden="true"
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-sm font-medium text-muted-foreground"
          >
            {clampedIndex}
          </span>
          <h2 id={titleId} className="m-0 text-sm font-medium text-foreground">
            {activeQuestion.title}
          </h2>
        </div>
      </div>

      {activeQuestion.description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {activeQuestion.description}
        </p>
      )}

      {activeQuestion.kind !== "text" && (activeQuestion.options?.length ?? 0) > 0 && (
        <div
          role={groupRole}
          aria-labelledby={titleId}
          aria-describedby={activeQuestion.description ? descriptionId : undefined}
          {...(activeQuestion.kind === "multi" ? { "aria-multiselectable": true } : {})}
          className="space-y-px"
        >
          {activeQuestion.options?.map((option, idx) => {
            const checked = selectedIds.includes(option.id);
            const badge = optionBadge(idx);
            return (
              <button
                key={option.id}
                type="button"
                role={optionRole}
                aria-checked={checked}
                onClick={() => handleOptionClick(option.id)}
                className={optionRowBase}
              >
                <span aria-hidden="true" className={cn(badgeBase, checked ? badgeOn : badgeOff)}>
                  {badge}
                </span>
                <span className="text-sm text-foreground">
                  {option.label}
                  {option.description && (
                    <span className="text-muted-foreground"> {option.description}</span>
                  )}
                </span>
              </button>
            );
          })}

          {customEnabled && activeQuestion.options && (
            <div className="flex items-center gap-2 pt-1">
              <span
                aria-hidden="true"
                className={cn(
                  badgeBase,
                  selectedIds.includes(QUESTION_CUSTOM_ID) ? badgeOn : badgeOff,
                )}
              >
                {optionBadge(activeQuestion.options.length)}
              </span>
              <Input
                id={`${descriptionId}-custom`}
                value={customText}
                onChange={(event) => handleCustomTextChange(event.target.value)}
                placeholder={activeQuestion.customPlaceholder ?? "Type your answer"}
                aria-label={activeQuestion.customLabel ?? "Custom answer"}
              />
            </div>
          )}
        </div>
      )}

      {activeQuestion.kind === "text" && (
        <Textarea
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          placeholder={activeQuestion.placeholder ?? "Type your answer"}
          aria-labelledby={titleId}
          aria-describedby={activeQuestion.description ? descriptionId : undefined}
          rows={3}
          className="resize-y"
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
      )}

      <div className={cn("flex items-center gap-1.5", showNav ? "justify-between" : "justify-end")}>
        {showNav && (
          <div className="flex items-center gap-1.5">
            {onPreviousQuestion && (
              <button
                type="button"
                onClick={onPreviousQuestion}
                disabled={!canGoPrev}
                className="h-6 rounded-sm px-2 text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
              >
                {previousLabel}
              </button>
            )}
            {onNextQuestion && (
              <button
                type="button"
                onClick={onNextQuestion}
                disabled={!canGoNext}
                className="h-6 rounded-sm px-2 text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
              >
                {nextLabel}
              </button>
            )}
          </div>
        )}
        <div className="flex items-center justify-end gap-1.5">
          {allowSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="h-6 rounded-sm px-2 text-sm text-muted-foreground transition-colors duration-micro hover:bg-accent hover:text-foreground active:scale-[0.98]"
            >
              {skipLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-6 rounded-sm bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-[background-color,transform] duration-micro hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionTool — composed wrapper with chrome header + summary state
// ---------------------------------------------------------------------------

function findOptionLabel(question: QuestionConfig | undefined, id: string): string {
  if (!question?.options) return id;
  if (id === QUESTION_CUSTOM_ID) return question.customLabel ?? "Custom";
  return question.options.find((o) => o.id === id)?.label ?? id;
}

function formatAnswer(answer: QuestionAnswer, question: QuestionConfig | undefined): string {
  if (answer.kind === "skip") return "Skipped";
  if (answer.kind === "text") return answer.text || "Answered";
  const labels = answer.selectedIds.map((id) => findOptionLabel(question, id));
  const labelText = labels.length > 0 ? labels.join(", ") : "";
  if (answer.text) return labelText ? `${labelText} (${answer.text})` : answer.text;
  return labelText || "Answered";
}

export type QuestionToolProps = {
  questions: QuestionConfig[];
  questionIndex?: number;
  totalQuestions?: number;
  onPreviousQuestion?: () => void;
  onNextQuestion?: () => void;
  submitLabel?: string;
  nextLabel?: string;
  skipLabel?: string;
  previousLabel?: string;
  allowSkip?: boolean;
  onSubmitAnswer?: (answer: QuestionAnswer, questionIndex: number) => void;
  /** When provided, renders the summary state with this answer. */
  output?: { answer?: QuestionAnswer };
  /** Stable id used to reset internal state when the question set changes. */
  toolCallId?: string;
  /** Header label shown in the chrome bar. @default "Question" */
  headerLabel?: string;
  className?: string;
};

export function QuestionTool({
  questions,
  questionIndex,
  totalQuestions: totalQuestionsProp,
  onPreviousQuestion,
  onNextQuestion,
  submitLabel,
  nextLabel,
  skipLabel,
  previousLabel,
  allowSkip,
  onSubmitAnswer,
  output,
  toolCallId,
  headerLabel = "Question",
  className,
}: QuestionToolProps): ReactElement | null {
  const totalQuestions = totalQuestionsProp ?? questions.length;
  const [localIndex, setLocalIndex] = useState(questionIndex ?? 1);
  const isControlled = typeof questionIndex === "number";
  const effectiveIndex = isControlled
    ? (questionIndex ?? 1)
    : questions.length > 0
      ? localIndex
      : 1;
  const clampedIndex = Math.max(1, Math.min(effectiveIndex, totalQuestions));
  const question = questions[clampedIndex - 1];
  const [localAnswers, setLocalAnswers] = useState<Record<number, QuestionAnswer>>({});

  useEffect(() => {
    if (typeof questionIndex === "number") setLocalIndex(questionIndex);
  }, [questionIndex]);

  useEffect(() => {
    setLocalAnswers({});
    setLocalIndex(questionIndex ?? 1);
    // toolCallId is the reset signal — questionIndex left intentionally out of deps.
    // biome-ignore lint/correctness/useExhaustiveDependencies: reset signal
  }, [toolCallId]);

  const outputAnswer = output?.answer;
  const answeredCount = Object.keys(localAnswers).length;
  const isComplete =
    totalQuestions === 1
      ? !!outputAnswer || answeredCount >= 1
      : totalQuestions > 0 && answeredCount >= totalQuestions;
  const showNavigation = totalQuestions > 1 && !isComplete;
  const canGoPrev = clampedIndex > 1;
  const canGoNext = clampedIndex < totalQuestions;

  const summaryRows = useMemo(() => {
    if (!isComplete) return [];
    if (totalQuestions <= 1) {
      const answer = outputAnswer ?? localAnswers[clampedIndex];
      return answer ? [{ index: 1, answer, question: questions[0] }] : [];
    }
    return Array.from({ length: totalQuestions }, (_, idx) => ({
      index: idx + 1,
      answer: localAnswers[idx + 1],
      question: questions[idx],
    }));
  }, [isComplete, totalQuestions, outputAnswer, localAnswers, clampedIndex, questions]);

  const goPrev = () => {
    if (!canGoPrev) return;
    onPreviousQuestion?.();
    if (!isControlled) setLocalIndex((prev) => Math.max(1, prev - 1));
  };

  const goNext = () => {
    if (!canGoNext) return;
    onNextQuestion?.();
    if (!isControlled) setLocalIndex((prev) => Math.min(totalQuestions, prev + 1));
  };

  if (!question) return null;

  return (
    <section
      aria-label={headerLabel}
      className={cn("overflow-hidden rounded-lg border border-border bg-muted", className)}
    >
      <header className="flex h-7 items-center justify-between border-b border-border px-3 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <Question className="h-3.5 w-3.5" aria-hidden="true" />
          {headerLabel}
        </div>
        {showNavigation && (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              className="inline-flex size-5 items-center justify-center rounded-sm transition-colors duration-micro hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
              aria-label="Previous question"
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span aria-live="polite">
              {clampedIndex} of {totalQuestions}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="inline-flex size-5 items-center justify-center rounded-sm transition-colors duration-micro hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
              aria-label="Next question"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      {isComplete ? (
        <dl className="space-y-1 bg-background px-3 py-2 text-xs text-muted-foreground">
          {summaryRows.map(({ index, answer, question: q }) => (
            <div key={index} className="flex items-baseline gap-2">
              <dt className="font-medium text-muted-foreground">{index}.</dt>
              <dd className="text-foreground">{answer ? formatAnswer(answer, q) : "Pending"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <QuestionPrompt
          key={`${clampedIndex}-${question.title}`}
          questions={questions}
          questionIndex={clampedIndex}
          totalQuestions={totalQuestions}
          {...(localAnswers[clampedIndex] !== undefined
            ? { initialAnswer: localAnswers[clampedIndex] }
            : {})}
          {...(submitLabel !== undefined ? { submitLabel } : {})}
          {...(nextLabel !== undefined ? { nextLabel } : {})}
          {...(skipLabel !== undefined ? { skipLabel } : {})}
          {...(previousLabel !== undefined ? { previousLabel } : {})}
          {...(allowSkip !== undefined ? { allowSkip } : {})}
          onSubmit={(nextAnswer) => {
            setLocalAnswers((prev) => ({ ...prev, [clampedIndex]: nextAnswer }));
            onSubmitAnswer?.(nextAnswer, clampedIndex);
            if (clampedIndex < totalQuestions) goNext();
          }}
        />
      )}
    </section>
  );
}
