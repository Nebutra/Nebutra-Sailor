"use client";

import {
  LoaderCircle as Loader2,
  MagnifyingGlass as Search,
  Sparkles,
  ThumbDown as ThumbsDown,
  ThumbUp as ThumbsUp,
} from "@nebutra/icons";
import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../primitives/accordion";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { Textarea } from "../primitives/textarea";
import { cn } from "../utils/cn";

export interface FAQItem {
  question: string;
  answer: string;
}

// Default Nebutra-specific FAQs
const DEFAULT_FAQS: FAQItem[] = [
  {
    question: "What is Nebutra Sailor?",
    answer:
      "Nebutra Sailor is an enterprise-grade SaaS monorepo architecture supporting multi-tenant systems, AI-native features, and production-ready infrastructure.",
  },
  {
    question: "How does multi-tenant authentication work?",
    answer:
      "We use Clerk for authentication with organization-based multi-tenancy. Tenant context flows through the BFF layer to Supabase with Row-Level Security for data isolation.",
  },
  {
    question: "What AI features are included?",
    answer:
      "The platform includes Vercel AI SDK integration, a Python FastAPI AI microservice for LLM/embeddings, MCP protocol support for agent tool calling, and pgvector for semantic search.",
  },
  {
    question: "How do I deploy to production?",
    answer:
      "Apps deploy to Vercel automatically via CI/CD. Microservices deploy to Railway or Kubernetes. Use `pnpm build` to build all packages and `turbo run deploy` for deployments.",
  },
  {
    question: "Is there a free tier?",
    answer:
      "Yes! The open-source monorepo is free. Hosted services have a generous free tier with 10k API calls/month, 3 team members, and basic AI features.",
  },
  {
    question: "How do I add custom integrations?",
    answer:
      "Add new microservices in the `services/` directory following our FastAPI template. For frontend integrations, create packages in `packages/` and import them in your apps.",
  },
  {
    question: "What databases are supported?",
    answer:
      "Primary database is Supabase (Postgres 15 with pgvector). Redis (Upstash) handles caching. The Prisma schema is in `packages/platform/db/` for type-safe queries.",
  },
  {
    question: "How do background jobs work?",
    answer:
      "We use Inngest for serverless workflows and cron jobs. Define workflows in `workflows/inngest/` - they handle retries, scheduling, and event-driven processing automatically.",
  },
];

export interface FAQBlockProps {
  /** FAQ items to display */
  faqs?: FAQItem[];
  /** Title above the FAQ section */
  title?: string;
  /** Description text */
  description?: string;
  /** Show search input */
  showSearch?: boolean;
  /** Show AI assistant when no results */
  showAiAssistant?: boolean;
  /** Show feedback buttons on answers */
  showFeedback?: boolean;
  /** Show personalized suggestions */
  showSuggestions?: boolean;
  /** Callback when AI question is asked */
  onAiAsk?: (question: string) => Promise<string>;
  /** Callback when feedback is submitted */
  onFeedback?: (question: string, type: "up" | "down", text?: string) => void;
  /** Additional className */
  className?: string;
}

export default function FAQBlock({
  faqs = DEFAULT_FAQS,
  title = "Frequently Asked Questions",
  description = "Find answers to common questions about Nebutra Sailor.",
  showSearch = true,
  showAiAssistant = true,
  showFeedback = true,
  showSuggestions = true,
  onAiAsk,
  onFeedback,
  className,
}: FAQBlockProps) {
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [showFeedbackInput, setShowFeedbackInput] = useState<Record<string, boolean>>({});
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filteredFaqs = useMemo(
    () =>
      faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(search.toLowerCase()) ||
          faq.answer.toLowerCase().includes(search.toLowerCase()),
      ),
    [faqs, search],
  );

  const personalizedFaqs = useMemo(() => {
    const shuffled = [...faqs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  }, [faqs]);

  const handleFeedback = (q: string, type: "up" | "down") => {
    setFeedback((fb) => ({ ...fb, [q]: type }));
    if (type === "down") {
      setShowFeedbackInput((fb) => ({ ...fb, [q]: true }));
    }
    onFeedback?.(q, type);
  };

  const handleFeedbackSubmit = (q: string) => {
    onFeedback?.(q, "down", feedbackText[q]);
    setShowFeedbackInput((fb) => ({ ...fb, [q]: false }));
  };

  const handleAiAsk = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);

    try {
      if (onAiAsk) {
        const response = await onAiAsk(aiInput);
        setAiResponse(response);
      } else {
        // Default mock response
        await new Promise((r) => setTimeout(r, 1200));
        setAiResponse(
          `Thanks for your question about "${aiInput}". For detailed assistance, please check our documentation or contact support@nebutra.com.`,
        );
      }
    } catch {
      setAiResponse("Sorry, something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-2xl mx-auto rounded-[var(--radius-lg)] border border-border bg-card p-6",
        className,
      )}
    >
      {/* Header */}
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="relative mb-6">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search frequently asked questions"
          />
        </div>
      )}

      {/* FAQ Accordion */}
      <Accordion type="single" collapsible className="w-full">
        {filteredFaqs.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">
            <p className="mb-6">No FAQs found matching your search.</p>

            {/* AI Assistant */}
            {showAiAssistant && (
              <div className="flex flex-col gap-3 max-w-sm mx-auto text-left">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Ask our AI Assistant
                </div>
                <Textarea
                  placeholder="Type your question..."
                  value={aiInput}
                  onChange={(e) => {
                    setAiInput(e.target.value);
                    setAiResponse("");
                  }}
                  rows={2}
                  aria-label="Your question for AI assistant"
                />
                <Button
                  onClick={handleAiAsk}
                  disabled={aiLoading || !aiInput.trim()}
                  className="self-end"
                  size="sm"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {aiLoading ? "Thinking..." : "Ask AI"}
                </Button>
                {aiResponse && (
                  <div
                    className="bg-accent rounded-[var(--radius-md)] p-3 text-sm text-foreground"
                    role="alert"
                  >
                    {aiResponse}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredFaqs.map((faq, idx) => (
            <AccordionItem key={idx} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  <p className="text-muted-foreground">{faq.answer}</p>

                  {/* Feedback */}
                  {showFeedback && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Was this helpful?</span>
                      <Button
                        size="icon"
                        variant={feedback[faq.question] === "up" ? "secondary" : "ghost"}
                        onClick={() => handleFeedback(faq.question, "up")}
                        aria-label="This answer was helpful"
                        className="h-8 w-8"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={feedback[faq.question] === "down" ? "secondary" : "ghost"}
                        onClick={() => handleFeedback(faq.question, "down")}
                        aria-label="This answer was not helpful"
                        className="h-8 w-8"
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                      {feedback[faq.question] === "up" && (
                        <span className="text-green-600 dark:text-green-400 text-xs">
                          Thank you for your feedback!
                        </span>
                      )}
                    </div>
                  )}

                  {/* Feedback Input */}
                  {showFeedbackInput[faq.question] && (
                    <div className="flex flex-col gap-2 mt-2">
                      <Textarea
                        placeholder="How can we improve this answer?"
                        value={feedbackText[faq.question] || ""}
                        onChange={(e) =>
                          setFeedbackText((fb) => ({
                            ...fb,
                            [faq.question]: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                      <Button
                        size="sm"
                        className="self-end"
                        onClick={() => handleFeedbackSubmit(faq.question)}
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))
        )}
      </Accordion>

      {/* Personalized Suggestions */}
      {showSuggestions && filteredFaqs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <p className="font-medium text-sm text-muted-foreground mb-2">
            You might also be interested in:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {personalizedFaqs.map((faq, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {faq.question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export { FAQBlock };
