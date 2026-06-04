"use client";

import { Check, CloudUpload, FileText, Warning } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useId, useRef, useState } from "react";

import { useTypedApiClient } from "@/hooks/use-typed-api-client";
import {
  DocumentUploadTaskError,
  type UploadDocumentAndCreateTaskResult,
  uploadDocumentAndCreateTask,
} from "@/lib/api/document-upload-task";

type UploadRunnerInput = {
  file: File;
  metadata: Record<string, string>;
};

export type DocumentTaskUploaderProps = {
  onUpload?: (input: UploadRunnerInput) => Promise<UploadDocumentAndCreateTaskResult>;
  labels?: Partial<DocumentTaskUploaderLabels>;
  className?: string;
};

type DocumentTaskUploaderLabels = {
  intakeTitle: string;
  intakeDescription: string;
  chooseDocument: string;
  startParseTask: string;
  queued: string;
  fileInputLabel: string;
  fallbackError: string;
};

const DEFAULT_LABELS: DocumentTaskUploaderLabels = {
  intakeTitle: "Document intake",
  intakeDescription: "PDF, Markdown, text, or Word document",
  chooseDocument: "Choose document",
  startParseTask: "Start parse task",
  queued: "Queued",
  fileInputLabel: "Document file",
  fallbackError: "Document task failed.",
};

const ACCEPTED_DOCUMENT_TYPES = [
  ".pdf",
  ".md",
  ".markdown",
  ".txt",
  ".doc",
  ".docx",
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

export function DocumentTaskUploader({ onUpload, labels, className }: DocumentTaskUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const getApiClient = useTypedApiClient();
  const text = { ...DEFAULT_LABELS, ...labels };
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadDocumentAndCreateTaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function runUpload(input: UploadRunnerInput) {
    if (onUpload) {
      return onUpload(input);
    }

    const operationId = createOperationId();
    const apiClient = await getApiClient();
    return uploadDocumentAndCreateTask({
      apiClient,
      file: input.file,
      metadata: input.metadata,
      idempotencyKey: `upload:${operationId}`,
      taskIdempotencyKey: `task:${operationId}`,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || pending) {
      return;
    }

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const uploaded = await runUpload({
        file,
        metadata: { source: "workspace" },
      });
      setResult(uploaded);
    } catch (err) {
      setError(getErrorMessage(err, text.fallbackError));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "grid gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--neutral-1)] text-[var(--neutral-11)] ring-1 ring-[var(--neutral-6)]">
            <FileText className="size-4" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--neutral-12)]">{text.intakeTitle}</p>
            {file ? (
              <p className="mt-0.5 truncate text-xs text-[var(--neutral-11)]">
                <span className="font-medium text-[var(--neutral-12)]">{file.name}</span>
                <span className="mx-1 text-[var(--neutral-8)]">/</span>
                {formatBytes(file.size)}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-[var(--neutral-11)]">{text.intakeDescription}</p>
            )}
          </div>
        </div>

        {result ? (
          <div className="mt-3 grid gap-1.5 rounded-[var(--radius-md)] border border-[var(--green-6)] bg-[var(--green-2)] px-3 py-2 text-xs text-[var(--green-12)]">
            <div className="flex min-w-0 items-center gap-2">
              <Check className="size-3.5 shrink-0" aria-hidden={true} />
              <span className="font-medium">{text.queued}</span>
              <code className="truncate font-mono">{result.task.id}</code>
            </div>
            <code className="block truncate font-mono text-[var(--green-11)]">
              {result.upload.key}
            </code>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--red-6)] bg-[var(--red-2)] px-3 py-2 text-[var(--red-11)] text-xs"
          >
            <Warning className="size-3.5 shrink-0" aria-hidden={true} />
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <input
          data-allow-native
          id={inputId}
          type="file"
          accept={ACCEPTED_DOCUMENT_TYPES}
          aria-label={text.fileInputLabel}
          ref={inputRef}
          className="sr-only"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            setFile(nextFile);
            setResult(null);
            setError(null);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          prefix={<CloudUpload />}
          onClick={() => inputRef.current?.click()}
        >
          {text.chooseDocument}
        </Button>
        <Button type="submit" size="sm" loading={pending} disabled={!file}>
          {text.startParseTask}
        </Button>
      </div>
    </form>
  );
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DocumentUploadTaskError || error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function createOperationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
