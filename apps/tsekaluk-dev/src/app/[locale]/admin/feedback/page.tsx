"use client";

import { MessageSquare, RefreshCw } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface FeedbackEntry {
  id: string;
  rating: string | null;
  message: string | null;
  createdAt: string;
}

const RATING_META: Record<string, { label: string; color: string }> = {
  love: {
    label: "Love It 😍",
    color: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  },
  okay: {
    label: "It's Okay 😐",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  },
  bad: {
    label: "Not Great 😕",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  },
  hate: { label: "Hate 😤", color: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
};

export default function AdminFeedbackPage() {
  const locale = useLocale();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", { signal: AbortSignal.timeout(15_000) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to fetch");
      setEntries(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const ratingCounts = entries.reduce<Record<string, number>>((acc, e) => {
    if (e.rating) acc[e.rating] = (acc[e.rating] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-serif italic text-gray-400 dark:text-gray-500 text-sm">
            Portfolio feedback inbox
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">Feedback</h1>
        </div>
        <button
          type="button"
          onClick={fetchEntries}
          disabled={loading}
          aria-label="Refresh"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Rating summary */}
      {entries.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(RATING_META).map(([key, meta]) =>
            ratingCounts[key] ? (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.color}`}
              >
                {meta.label} <span className="font-bold">{ratingCounts[key]}</span>
              </span>
            ) : null,
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No feedback yet.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => {
            const meta = entry.rating ? RATING_META[entry.rating] : null;
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {meta && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mb-2 ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    )}
                    {entry.message ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{entry.message}</p>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-600 italic">No message.</p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-gray-400 dark:text-gray-600">
                    {new Date(entry.createdAt).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-400 px-1">{entries.length} total</p>
        </div>
      )}
    </div>
  );
}
