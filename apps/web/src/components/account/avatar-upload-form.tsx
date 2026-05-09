"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

interface UploadResult {
  avatarUrl: string;
}

interface AvatarUploadFormProps {
  initialAvatarUrl?: string | null;
  fallbackName?: string;
  /**
   * Override the upload pipeline for tests. Defaults to the three-step
   * presign / PUT / finalize sequence against `/api/account/avatar`.
   */
  uploadPipeline?: (file: File) => Promise<UploadResult>;
  onUpdated?: (next: UploadResult) => void;
}

interface PresignResponse {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  key?: string;
  error?: string;
}

interface FinalizeResponse {
  user?: { avatarUrl?: string };
  avatarUrl?: string;
  error?: string;
}

async function defaultUploadPipeline(file: File): Promise<UploadResult> {
  // Step 1 — presigned URL
  const presignRes = await fetch("/api/account/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, contentLength: file.size }),
  });
  const presignBody = (await presignRes.json().catch(() => ({}))) as PresignResponse;
  if (!presignRes.ok || !presignBody.url || !presignBody.key) {
    throw new Error(presignBody.error ?? "Failed to obtain upload URL.");
  }

  // Step 2 — PUT bytes to presigned URL
  const putRes = await fetch(presignBody.url, {
    method: presignBody.method ?? "PUT",
    headers: presignBody.headers ?? { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error("Upload failed. Please try again.");
  }

  // Step 3 — finalize
  const finalizeRes = await fetch("/api/account/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: presignBody.key }),
  });
  const finalizeBody = (await finalizeRes.json().catch(() => ({}))) as FinalizeResponse;
  const finalUrl = finalizeBody.user?.avatarUrl ?? finalizeBody.avatarUrl;
  if (!finalizeRes.ok || !finalUrl) {
    throw new Error(finalizeBody.error ?? "Failed to finalize avatar upload.");
  }
  return { avatarUrl: finalUrl };
}

function initialsFor(name?: string | null): string {
  const source = (name ?? "").trim();
  if (!source) return "?";
  const tokens = source.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AvatarUploadForm({
  initialAvatarUrl,
  fallbackName,
  uploadPipeline,
  onUpdated,
}: AvatarUploadFormProps) {
  const t = useTranslations("account.avatar");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileSelected(file: File) {
    setErrorMessage("");
    setStatusMessage("");

    if (!ALLOWED_TYPES.has(file.type)) {
      setErrorMessage(t("invalidType"));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setErrorMessage(t("fileTooBig"));
      return;
    }

    setPending(true);
    try {
      const pipeline = uploadPipeline ?? defaultUploadPipeline;
      const result = await pipeline(file);
      setAvatarUrl(result.avatarUrl);
      setStatusMessage(t("success"));
      onUpdated?.(result);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("invalidType"));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <h2 className="text-base font-semibold text-[var(--neutral-12)]">{t("title")}</h2>
      <p className="mt-1 mb-4 text-sm text-[var(--neutral-11)]">{t("description")}</p>

      <div className="flex items-center gap-4">
        <div
          aria-label="Avatar preview"
          className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-[var(--neutral-6)] bg-[var(--neutral-3)]"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="User avatar"
              width={80}
              height={80}
              className="size-20 object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-[var(--neutral-11)]">
              {initialsFor(fallbackName)}
            </span>
          )}
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex flex-1 flex-col items-start gap-2 rounded-md border border-dashed px-4 py-3 ${
            dragActive
              ? "border-[var(--blue-9)] bg-[var(--blue-2)]"
              : "border-[var(--neutral-7)] bg-[var(--neutral-2)]"
          }`}
        >
          <input
            ref={inputRef}
            id="account-avatar-input"
            data-testid="avatar-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleInputChange}
            disabled={pending}
          />
          <label
            htmlFor="account-avatar-input"
            className={`inline-flex cursor-pointer items-center justify-center rounded-md border border-[var(--neutral-7)] px-3 py-1.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-3)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 ${
              pending ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {pending ? t("uploading") : t("uploadButton")}
          </label>
          <p className="text-xs text-[var(--neutral-11)]">{t("description")}</p>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-[var(--status-danger)]">
          {errorMessage}
        </p>
      )}
      {statusMessage && (
        <p role="status" className="mt-3 text-sm text-[color:var(--status-success)]">
          {statusMessage}
        </p>
      )}
    </section>
  );
}
