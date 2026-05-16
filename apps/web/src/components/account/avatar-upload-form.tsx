"use client";

import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { useReducer, useRef } from "react";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

interface UploadResult {
  avatarUrl: string | null;
}

interface AvatarUploadFormProps {
  initialAvatarUrl?: string | null;
  fallbackName?: string;
  /**
   * Override the upload pipeline for tests. Defaults to the three-step
   * presign / PUT / finalize sequence against `/api/account/avatar`.
   */
  uploadPipeline?: (file: File) => Promise<UploadResult>;
  deletePipeline?: () => Promise<UploadResult>;
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

async function defaultDeletePipeline(): Promise<UploadResult> {
  const response = await fetch("/api/account/avatar", { method: "DELETE" });
  const body = (await response.json().catch(() => ({}))) as FinalizeResponse;
  if (!response.ok) {
    throw new Error(body.error ?? "Failed to delete avatar.");
  }
  return { avatarUrl: null };
}

async function centerCropSquareImage(file: File): Promise<File> {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return file;
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image for cropping."));
      img.src = objectUrl;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) return file;
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(
      image,
      Math.floor((image.naturalWidth - side) / 2),
      Math.floor((image.naturalHeight - side) / 2),
      side,
      side,
      0,
      0,
      side,
      side,
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

interface AvatarUploadState {
  avatarUrl: string | null;
  pending: boolean;
  errorMessage: string;
  statusMessage: string;
  dragActive: boolean;
}

type AvatarUploadAction =
  | { type: "drag.active"; active: boolean }
  | { type: "file.reject"; message: string }
  | { type: "upload.start" }
  | { type: "upload.success"; avatarUrl: string | null; message: string }
  | { type: "upload.failure"; message: string }
  | { type: "delete.start" }
  | { type: "delete.success"; message: string }
  | { type: "delete.failure"; message: string };

function avatarUploadReducer(
  state: AvatarUploadState,
  action: AvatarUploadAction,
): AvatarUploadState {
  switch (action.type) {
    case "drag.active":
      return { ...state, dragActive: action.active };
    case "file.reject":
      return { ...state, errorMessage: action.message, statusMessage: "" };
    case "upload.start":
      return { ...state, pending: true, errorMessage: "", statusMessage: "" };
    case "upload.success":
      return {
        ...state,
        avatarUrl: action.avatarUrl,
        pending: false,
        errorMessage: "",
        statusMessage: action.message,
      };
    case "upload.failure":
      return { ...state, pending: false, errorMessage: action.message, statusMessage: "" };
    case "delete.start":
      return { ...state, pending: true, errorMessage: "", statusMessage: "" };
    case "delete.success":
      return {
        ...state,
        avatarUrl: null,
        pending: false,
        errorMessage: "",
        statusMessage: action.message,
      };
    case "delete.failure":
      return { ...state, pending: false, errorMessage: action.message, statusMessage: "" };
  }
}

export function AvatarUploadForm({
  initialAvatarUrl,
  fallbackName,
  uploadPipeline,
  deletePipeline,
  onUpdated,
}: AvatarUploadFormProps) {
  const t = useTranslations("account.avatar");
  const [state, dispatch] = useReducer(avatarUploadReducer, {
    avatarUrl: initialAvatarUrl ?? null,
    pending: false,
    errorMessage: "",
    statusMessage: "",
    dragActive: false,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileSelected(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) {
      dispatch({ type: "file.reject", message: t("invalidType") });
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      dispatch({ type: "file.reject", message: t("fileTooBig") });
      return;
    }

    dispatch({ type: "upload.start" });
    try {
      const pipeline = uploadPipeline ?? defaultUploadPipeline;
      const uploadFile = uploadPipeline ? file : await centerCropSquareImage(file);
      const result = await pipeline(uploadFile);
      dispatch({ type: "upload.success", avatarUrl: result.avatarUrl, message: t("success") });
      onUpdated?.(result);
    } catch (err) {
      dispatch({
        type: "upload.failure",
        message: err instanceof Error ? err.message : t("invalidType"),
      });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    dispatch({ type: "delete.start" });
    try {
      const pipeline = deletePipeline ?? defaultDeletePipeline;
      const result = await pipeline();
      dispatch({ type: "delete.success", message: t("removed") });
      onUpdated?.(result);
    } catch (err) {
      dispatch({
        type: "delete.failure",
        message: err instanceof Error ? err.message : t("deleteError"),
      });
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dispatch({ type: "drag.active", active: false });
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
        {state.avatarUrl ? (
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-[var(--neutral-6)] bg-[var(--neutral-3)]">
            <NextImage
              src={state.avatarUrl}
              alt="User avatar"
              width={80}
              height={80}
              unoptimized
              className="size-20 object-cover"
            />
          </div>
        ) : (
          <div
            role="img"
            aria-label="Avatar preview"
            className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-[var(--neutral-6)] bg-[var(--neutral-3)]"
          >
            <span className="text-sm font-semibold text-[var(--neutral-11)]">
              {initialsFor(fallbackName)}
            </span>
          </div>
        )}

        <fieldset
          onDragOver={(event) => {
            event.preventDefault();
            dispatch({ type: "drag.active", active: true });
          }}
          onDragLeave={() => dispatch({ type: "drag.active", active: false })}
          onDrop={handleDrop}
          className={`flex flex-1 flex-col items-start gap-2 rounded-md border border-dashed px-4 py-3 ${
            state.dragActive
              ? "border-[var(--blue-9)] bg-[var(--blue-2)]"
              : "border-[var(--neutral-7)] bg-[var(--neutral-2)]"
          }`}
        >
          <input
            data-allow-native
            ref={inputRef}
            id="account-avatar-input"
            data-testid="avatar-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleInputChange}
            disabled={state.pending}
          />
          <label
            htmlFor="account-avatar-input"
            className={`inline-flex cursor-pointer items-center justify-center rounded-md border border-[var(--neutral-7)] px-3 py-1.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-3)] ${
              state.pending ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {state.pending ? t("uploading") : t("uploadButton")}
          </label>
          <p className="text-xs text-[var(--neutral-11)]">{t("description")}</p>
          {state.avatarUrl && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={state.pending}
              className="text-xs font-medium text-[var(--status-danger)] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("removeButton")}
            </button>
          )}
        </fieldset>
      </div>

      {state.errorMessage && (
        <p role="alert" className="mt-3 text-sm text-[var(--status-danger)]">
          {state.errorMessage}
        </p>
      )}
      {state.statusMessage && (
        <p role="status" className="mt-3 text-sm text-[color:var(--status-success)]">
          {state.statusMessage}
        </p>
      )}
    </section>
  );
}
