"use client";

import { Plus, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface NowEntry {
  id: string;
  date: string;
  building: string[];
  thinking: string[];
  shipped: string[];
  reading: string[];
}

const SECTIONS = [
  { key: "building" as const, label: "Building" },
  { key: "shipped" as const, label: "Shipped" },
  { key: "thinking" as const, label: "Thinking" },
  { key: "reading" as const, label: "Reading" },
];

function itemsToText(items: string[]) {
  return items.join("\n");
}

function textToItems(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminNowPage() {
  const [entry, setEntry] = useState<NowEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [fields, setFields] = useState({
    building: "",
    shipped: "",
    thinking: "",
    reading: "",
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/now", { signal: AbortSignal.timeout(15_000) });
      const json = await res.json();
      if (json.success && json.data) {
        const e: NowEntry = json.data;
        setEntry(e);
        setDate(e.date);
        setFields({
          building: itemsToText(e.building),
          shipped: itemsToText(e.shipped),
          thinking: itemsToText(e.thinking),
          reading: itemsToText(e.reading),
        });
      } else {
        // No entry yet — set today's date
        setDate(new Date().toISOString().slice(0, 10));
      }
    } catch {
      setError("Failed to load entry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        date,
        building: textToItems(fields.building),
        shipped: textToItems(fields.shipped),
        thinking: textToItems(fields.thinking),
        reading: textToItems(fields.reading),
      };

      const res = entry
        ? await fetch("/api/now", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(15_000),
            body: JSON.stringify({ id: entry.id, ...payload }),
          })
        : await fetch("/api/now", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(15_000),
            body: JSON.stringify(payload),
          });

      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Save failed");

      setEntry(json.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-serif italic text-gray-400 dark:text-gray-500 text-sm">
            {entry ? "Edit latest entry" : "Create first entry"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">Now</h1>
        </div>
        <button
          type="button"
          onClick={fetch_}
          disabled={loading}
          aria-label="Refresh"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Date */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          />
        </div>

        {/* Sections */}
        {SECTIONS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              {label}
              <span className="ml-2 font-normal normal-case text-gray-400">one item per line</span>
            </label>
            <textarea
              value={fields[key]}
              onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
              rows={4}
              placeholder={`Add ${label.toLowerCase()} items, one per line...`}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-y"
            />
          </div>
        ))}

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !date}
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : entry ? (
              <Save className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {saving ? "Saving..." : entry ? "Save changes" : "Create entry"}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved!</span>}
        </div>
      </div>
    </div>
  );
}
