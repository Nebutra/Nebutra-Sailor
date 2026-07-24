"use client";

import { useMutation } from "@tanstack/react-query";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import { queryKeys } from "@/lib/query-keys";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

interface OrganizationLogoFormProps {
  orgId: string;
  orgName: string;
  initialLogoUrl?: string | null;
  /**
   * Override the upload pipeline for tests. Defaults to the three-step
   * presigned-URL/PUT/finalize sequence against `/api/organizations/[orgId]/logo*`.
   */
  uploadPipeline?: (file: File) => Promise<{ logoUrl: string }>;
  deletePipeline?: () => Promise<{ logoUrl: string | null }>;
  onUpdated?: (next: { logoUrl: string | null }) => void;
}

async function defaultUploadPipeline(orgId: string, file: File): Promise<{ logoUrl: string }> {
  // Step 1 — presigned URL
  const presignRes = await fetch(`/api/organizations/${orgId}/logo-upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, contentLength: file.size }),
  });
  const presignBody = (await presignRes.json().catch(() => ({}))) as {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    key?: string;
    error?: string;
    code?: string;
  };
  if (!presignRes.ok || !presignBody.url || !presignBody.key) {
    throw {
      code: presignBody.code,
      message: presignBody.error ?? "Failed to obtain upload URL.",
    };
  }

  // Step 2 — PUT bytes to presigned URL
  const putRes = await fetch(presignBody.url, {
    method: presignBody.method ?? "PUT",
    headers: presignBody.headers ?? { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw { message: "Upload failed. Please try again." };
  }

  // Step 3 — finalize
  const finalizeRes = await fetch(`/api/organizations/${orgId}/logo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: presignBody.key }),
  });
  const finalizeBody = (await finalizeRes.json().catch(() => ({}))) as {
    organization?: { logoUrl?: string };
    error?: string;
    code?: string;
  };
  if (!finalizeRes.ok || !finalizeBody.organization?.logoUrl) {
    throw {
      code: finalizeBody.code,
      message: finalizeBody.error ?? "Failed to finalize logo upload.",
    };
  }

  return { logoUrl: finalizeBody.organization.logoUrl };
}

async function defaultDeletePipeline(orgId: string): Promise<{ logoUrl: null }> {
  const response = await fetch(`/api/organizations/${orgId}/logo`, { method: "DELETE" });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  };
  if (!response.ok) {
    throw {
      code: body.code,
      message: body.error ?? "Failed to delete organization logo.",
    };
  }
  return { logoUrl: null };
}

/**
 * Aspect policy (#229): org logos are square 1:1.
 * Auto center-crop before upload — no interactive crop dialog required for v1.
 * Interactive CropImageDialog can be added later without changing storage path.
 */
async function centerCropSquareImage(file: File): Promise<File> {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return file;
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
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

function initialsFor(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

export function OrganizationLogoForm({
  orgId,
  orgName,
  initialLogoUrl,
  uploadPipeline,
  deletePipeline,
  onUpdated,
}: OrganizationLogoFormProps) {
  const t = useTranslations();
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl ?? null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function resolveLogoErrorMessage(err: unknown) {
    const key = resolveAuthErrorKey(err);
    return err && typeof err === "object" && "message" in err && typeof err.message === "string"
      ? err.message
      : t(`auth.errors.${key}`);
  }

  const uploadMutation = useMutation({
    mutationKey: queryKeys.organizationLogo.upload(orgId),
    mutationFn: async (file: File) => {
      const pipeline = uploadPipeline ?? ((next: File) => defaultUploadPipeline(orgId, next));
      const uploadFile = uploadPipeline ? file : await centerCropSquareImage(file);
      return pipeline(uploadFile);
    },
  });

  const deleteMutation = useMutation({
    mutationKey: queryKeys.organizationLogo.remove(orgId),
    mutationFn: async () => {
      const pipeline = deletePipeline ?? (() => defaultDeletePipeline(orgId));
      return pipeline();
    },
  });

  const pending = uploadMutation.isPending || deleteMutation.isPending;

  function handleFileSelected(file: File) {
    if (pending) return;
    setErrorMessage("");
    setShowSuccess(false);

    if (!ALLOWED_TYPES.has(file.type)) {
      setErrorMessage(t("organizations.settings.logo.invalidType"));
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setErrorMessage(t("organizations.settings.logo.fileTooBig"));
      return;
    }

    uploadMutation.mutate(file, {
      onSuccess: (result) => {
        setLogoUrl(result.logoUrl);
        setShowSuccess(true);
        onUpdated?.(result);
      },
      onError: (err) => setErrorMessage(resolveLogoErrorMessage(err)),
      onSettled: () => {
        // Reset the input so re-selecting the same file fires onChange.
        if (inputRef.current) inputRef.current.value = "";
      },
    });
  }

  function handleDelete() {
    if (pending) return;
    setErrorMessage("");
    setShowSuccess(false);
    deleteMutation.mutate(undefined, {
      onSuccess: (result) => {
        setLogoUrl(result.logoUrl);
        setShowSuccess(true);
        onUpdated?.(result);
      },
      onError: (err) => setErrorMessage(resolveLogoErrorMessage(err)),
    });
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
      <h3 className="text-sm font-medium text-foreground">
        {t("organizations.settings.logo.title")}
      </h3>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        {t("organizations.settings.logo.description")}
      </p>

      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            <NextImage
              src={logoUrl}
              alt={`${orgName} logo`}
              width={80}
              height={80}
              className="size-20 object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div
            role="img"
            className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted"
            aria-label="Organization logo preview"
          >
            <span className="text-sm font-semibold text-muted-foreground">
              {initialsFor(orgName)}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* Center-crop (1:1) applied in handleFileSelected via centerCropSquareImage. */}
          <input
            data-allow-native
            ref={inputRef}
            id="organization-logo-input"
            data-testid="organization-logo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleInputChange}
            disabled={pending}
          />
          <label
            htmlFor="organization-logo-input"
            className={`inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted ${
              pending ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {pending
              ? t("organizations.settings.logo.uploading")
              : t("organizations.settings.logo.uploadButton")}
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={pending}
              className="text-left text-xs font-medium text-[var(--status-danger)] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("organizations.settings.logo.removeButton")}
            </button>
          )}
        </div>
      </div>

      {errorMessage && <p className="mt-3 text-sm text-[var(--status-danger)]">{errorMessage}</p>}
      {showSuccess && (
        <p className="mt-3 text-sm text-[color:var(--status-success)]">
          {logoUrl
            ? t("organizations.settings.logo.success")
            : t("organizations.settings.logo.removed")}
        </p>
      )}
    </section>
  );
}
