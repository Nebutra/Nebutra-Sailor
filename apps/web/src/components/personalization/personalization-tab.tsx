"use client";

import { LoaderCircle as Loader2 } from "@nebutra/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PersonalizationPanel,
  type ProfileFormValue,
} from "@/components/personalization/personalization-panel";
import { queryKeys } from "@/lib/query-keys";

interface ApiResponse {
  profile: ProfileFormValue & { updatedAt?: string | null };
}

const EMPTY: ProfileFormValue = {
  nickname: "",
  occupation: "",
  bio: "",
  customInstructions: "",
};

async function fetchProfile(signal?: AbortSignal): Promise<ProfileFormValue> {
  const res = await fetch("/api/me/profile", { credentials: "include", signal });
  if (!res.ok) {
    throw new Error(`Failed to load profile (${res.status})`);
  }
  const data = (await res.json()) as ApiResponse;
  return {
    nickname: data.profile.nickname ?? "",
    occupation: data.profile.occupation ?? "",
    bio: data.profile.bio ?? "",
    customInstructions: data.profile.customInstructions ?? "",
  };
}

async function saveProfile(value: ProfileFormValue): Promise<void> {
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
}

/**
 * PersonalizationTab — fetch + save wrapper around PersonalizationPanel.
 *
 * The panel itself is presentation-only and owns the in-progress edit draft
 * (pure client state — kept local, NOT in React Query). This wrapper owns the
 * server data lifecycle:
 *
 *   1. Mount → GET `/api/me/profile`            (useQuery, signal auto-cancels)
 *   2. Save  → PUT `/api/me/profile`            (useMutation, invalidate on success)
 *
 * Save failures reject `mutateAsync`, which propagates to the panel's
 * try/catch so its `toast.error` still fires (behaviour preserved). Loading
 * shows a minimal spinner — no fake placeholder fields.
 */
export function PersonalizationTab() {
  const queryClient = useQueryClient();
  const profileKey = queryKeys.personalization.detail();

  const profileQuery = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => fetchProfile(signal),
  });

  const saveMutation = useMutation({
    mutationFn: (value: ProfileFormValue) => saveProfile(value),
    onSettled: () => {
      // Re-sync with server truth in the background after a save.
      void queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });

  const handleSave = async (value: ProfileFormValue): Promise<void> => {
    // mutateAsync rejects on failure → panel's catch shows toast.error.
    await saveMutation.mutateAsync(value);
  };

  if (profileQuery.isPending) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-10" />
      </div>
    );
  }

  const error = profileQuery.error
    ? profileQuery.error instanceof Error
      ? profileQuery.error.message
      : "Failed to load profile"
    : null;

  // On load failure, fall back to an empty form (matches prior behaviour).
  const initial = profileQuery.data ?? EMPTY;

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-[var(--radius-lg)] border border-red-7/40 bg-red-2/40 px-3 py-2 text-xs text-red-11 dark:border-red-7/30 dark:bg-red-2/10 dark:text-red-9">
          {error} — showing empty form.
        </p>
      )}
      <PersonalizationPanel initialValue={initial} onSave={handleSave} />
    </div>
  );
}
