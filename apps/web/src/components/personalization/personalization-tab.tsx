"use client";

import { LoaderCircle as Loader2 } from "@nebutra/icons";
import { useCallback, useEffect, useState } from "react";
import {
  PersonalizationPanel,
  type ProfileFormValue,
} from "@/components/personalization/personalization-panel";

interface ApiResponse {
  profile: ProfileFormValue & { updatedAt?: string | null };
}

const EMPTY: ProfileFormValue = {
  nickname: "",
  occupation: "",
  bio: "",
  customInstructions: "",
};

/**
 * PersonalizationTab — fetch + save wrapper around PersonalizationPanel.
 *
 * The panel itself is presentation-only. This wrapper owns the data lifecycle:
 *
 *   1. Mount → GET `/api/me/profile`
 *   2. Save  → PUT `/api/me/profile`
 *
 * Errors surface via `toast` inside the panel (already wired). Loading state
 * shows a minimal spinner — no fake placeholder fields.
 */
export function PersonalizationTab() {
  const [initial, setInitial] = useState<ProfileFormValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/me/profile", { credentials: "include" });
        if (!res.ok) {
          throw new Error(`Failed to load profile (${res.status})`);
        }
        const data = (await res.json()) as ApiResponse;
        if (cancelled) return;
        setInitial({
          nickname: data.profile.nickname ?? "",
          occupation: data.profile.occupation ?? "",
          bio: data.profile.bio ?? "",
          customInstructions: data.profile.customInstructions ?? "",
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
        setInitial(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async (value: ProfileFormValue) => {
    const res = await fetch("/api/me/profile", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Failed to save (${res.status})`);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-10 dark:text-white/40" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-7 bg-red-2/40 px-3 py-2 text-xs text-red-11 dark:border-red-7/40 dark:bg-red-2/10 dark:text-red-9">
          {error} — showing empty form.
        </p>
      )}
      <PersonalizationPanel initialValue={initial} onSave={handleSave} />
    </div>
  );
}
