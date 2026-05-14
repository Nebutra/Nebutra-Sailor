"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";

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
  onUpdated?: (next: { logoUrl: string }) => void;
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

function initialsFor(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

export function OrganizationLogoForm({
  orgId,
  orgName,
  initialLogoUrl,
  uploadPipeline,
  onUpdated,
}: OrganizationLogoFormProps) {
  const t = useTranslations();
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl ?? null);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileSelected(file: File) {
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

    setPending(true);
    try {
      const pipeline = uploadPipeline ?? ((next: File) => defaultUploadPipeline(orgId, next));
      const result = await pipeline(file);
      setLogoUrl(result.logoUrl);
      setShowSuccess(true);
      onUpdated?.(result);
    } catch (err) {
      const key = resolveAuthErrorKey(err);
      const fallback =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : t(`auth.errors.${key}`);
      setErrorMessage(fallback);
    } finally {
      setPending(false);
      // Reset the input so re-selecting the same file fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <h3 className="text-sm font-medium text-[var(--neutral-12)]">
        {t("organizations.settings.logo.title")}
      </h3>
      <p className="mt-1 mb-4 text-sm text-[var(--neutral-11)]">
        {t("organizations.settings.logo.description")}
      </p>

      <div className="flex items-center gap-4">
        <div
          className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-[var(--neutral-6)] bg-[var(--neutral-3)]"
          aria-label="Organization logo preview"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${orgName} logo`}
              width={80}
              height={80}
              className="size-20 object-cover"
              unoptimized
            />
          ) : (
            <span className="text-sm font-semibold text-[var(--neutral-11)]">
              {initialsFor(orgName)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {/* TODO: replace with a crop dialog (see Supastarter CropImageDialog reference). */}
          <input
            data-allow-native
            ref={inputRef}
            id="organization-logo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleInputChange}
            disabled={pending}
          />
          <label
            htmlFor="organization-logo-input"
            className={`inline-flex cursor-pointer items-center justify-center rounded-md border border-[var(--neutral-7)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-2)] ${
              pending ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {pending
              ? t("organizations.settings.logo.uploading")
              : t("organizations.settings.logo.uploadButton")}
          </label>
        </div>
      </div>

      {errorMessage && <p className="mt-3 text-sm text-[var(--status-danger)]">{errorMessage}</p>}
      {showSuccess && (
        <p className="mt-3 text-sm text-[color:var(--status-success)]">
          {t("organizations.settings.logo.success")}
        </p>
      )}
    </section>
  );
}
