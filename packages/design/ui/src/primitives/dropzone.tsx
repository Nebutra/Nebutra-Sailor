"use client";

/**
 * Dropzone — accessible file selection: drag-and-drop, paste, and the native
 * picker behind one surface.
 *
 * Built on the native `<input type="file">` rather than a focusable div (the
 * react-dropzone model): the input is visually hidden but stays in the tab
 * order and inside a `<label>`, so Tab reaches it, Enter / Space opens the OS
 * picker, screen readers announce it as a file control with its accessible
 * name, and forms still submit it by `name`. The whole surface is the label,
 * so a click anywhere opens the picker, and it draws the focus ring when the
 * input has keyboard focus.
 *
 * On top of that:
 *   - drop and (optionally) paste, with `data-dragging` / `data-drag-reject`
 *     for styling while a drag is over the zone
 *   - `accept`, `maxSize` and `maxFiles` validation with reasons; rejections
 *     are shown inline and announced through a polite live region
 *   - a `progress` slot (number for determinate, `null` for indeterminate)
 *   - selecting the same file twice fires twice (the input is reset)
 *
 * ```tsx
 * <Dropzone
 *   accept="image/png,image/jpeg"
 *   maxSize={5 * 1024 * 1024}
 *   description="PNG or JPG, up to 5 MB"
 *   onFiles={([file]) => upload(file)}
 *   progress={uploading ? percent : undefined}
 * />
 * ```
 */

import { CloudUpload } from "@nebutra/icons";
import * as React from "react";
import { cn } from "../utils/cn";
import { Progress } from "./progress";

export type DropzoneRejectionReason = "type" | "size" | "count";

export interface DropzoneRejection {
  file: File;
  reason: DropzoneRejectionReason;
  message: string;
}

export interface DropzoneProps {
  /** Same syntax as the input `accept` attribute: ".pdf,image/*,text/csv". */
  accept?: string;
  multiple?: boolean;
  /** Largest accepted file, in bytes. */
  maxSize?: number;
  /** Most files accepted in one selection (with `multiple`). */
  maxFiles?: number;
  disabled?: boolean;
  /** Accept files pasted while the zone has focus. */
  paste?: boolean;
  /** Fires with the accepted files of a selection, drop or paste. */
  onFiles: (files: File[]) => void;
  /** Fires with the files that failed validation, with reasons. */
  onReject?: (rejections: DropzoneRejection[]) => void;
  /** Primary line. Defaults to an English prompt; pass translated copy. */
  label?: React.ReactNode;
  /** Secondary line, e.g. accepted types and size limit. */
  description?: React.ReactNode;
  /** Determinate progress 0–100, or `null` for indeterminate. Omit to hide. */
  progress?: number | null;
  /** Accessible label for the progress bar. */
  progressLabel?: string;
  /** External error to show (e.g. an upload failure). */
  error?: string;
  /** Replace the default icon + copy body. */
  children?: React.ReactNode;
  /** `sm` is a single inline row; `md` is the tall drop target. */
  size?: "sm" | "md";
  id?: string;
  name?: string;
  className?: string;
  /** Extra attributes for the hidden `<input type="file">`, e.g. `capture`. */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "accept" | "multiple" | "disabled" | "onChange" | "id" | "name"
  >;
  /** Rejection copy. Pass translated strings. */
  messages?: Partial<Record<DropzoneRejectionReason, (file: File) => string>>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${Number(value.toFixed(1))} ${units[unit]}`;
}

/** Mirrors how browsers apply the `accept` attribute. */
export function fileMatchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

function dragCarriesAcceptedTypes(event: React.DragEvent, accept: string | undefined): boolean {
  if (!accept) return true;
  const items = Array.from(event.dataTransfer?.items ?? []);
  // Browsers expose only MIME types during a drag (no names), and some expose
  // none. Only reject when every item has a type and none can match.
  const mimeTokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token && !token.startsWith("."));
  const hasExtensionTokens = accept.split(",").some((token) => token.trim().startsWith("."));
  if (items.length === 0 || hasExtensionTokens || mimeTokens.length === 0) return true;
  return items.every((item) => {
    const type = item.type.toLowerCase();
    if (!type) return true;
    return mimeTokens.some((token) =>
      token.endsWith("/*") ? type.startsWith(token.slice(0, -1)) : type === token,
    );
  });
}

export function Dropzone({
  accept,
  multiple = false,
  maxSize,
  maxFiles,
  disabled = false,
  paste = false,
  onFiles,
  onReject,
  label,
  description,
  progress,
  progressLabel = "Upload progress",
  error,
  children,
  size = "md",
  id,
  name,
  className,
  inputProps,
  messages,
}: DropzoneProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const statusId = `${inputId}-status`;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const dragDepth = React.useRef(0);
  const [dragging, setDragging] = React.useState(false);
  const [dragReject, setDragReject] = React.useState(false);
  const [status, setStatus] = React.useState<{ tone: "info" | "error"; text: string } | null>(null);

  const messageFor = React.useCallback(
    (reason: DropzoneRejectionReason, file: File): string => {
      const custom = messages?.[reason];
      if (custom) return custom(file);
      if (reason === "type") return `${file.name} is not an accepted file type.`;
      if (reason === "size") return `${file.name} is larger than ${formatBytes(maxSize ?? 0)}.`;
      return `${file.name} was not added: at most ${maxFiles ?? 1} file${(maxFiles ?? 1) === 1 ? "" : "s"}.`;
    },
    [messages, maxSize, maxFiles],
  );

  const handleFiles = React.useCallback(
    (incoming: File[]) => {
      if (disabled || incoming.length === 0) return;
      const limit = multiple ? (maxFiles ?? Number.POSITIVE_INFINITY) : 1;
      const accepted: File[] = [];
      const rejected: DropzoneRejection[] = [];
      for (const file of incoming) {
        let reason: DropzoneRejectionReason | null = null;
        if (!fileMatchesAccept(file, accept)) reason = "type";
        else if (maxSize !== undefined && file.size > maxSize) reason = "size";
        else if (accepted.length >= limit) reason = "count";
        if (reason) rejected.push({ file, reason, message: messageFor(reason, file) });
        else accepted.push(file);
      }
      if (rejected.length > 0) {
        onReject?.(rejected);
        setStatus({ tone: "error", text: rejected.map((r) => r.message).join(" ") });
      } else {
        setStatus({
          tone: "info",
          text:
            accepted.length === 1
              ? `${accepted[0]?.name} selected.`
              : `${accepted.length} files selected.`,
        });
      }
      if (accepted.length > 0) onFiles(accepted);
    },
    [accept, disabled, maxFiles, maxSize, messageFor, multiple, onFiles, onReject],
  );

  function resetDrag() {
    dragDepth.current = 0;
    setDragging(false);
    setDragReject(false);
  }

  const shownError = error ?? (status?.tone === "error" ? status.text : undefined);
  const describedBy = [
    description && children == null ? descriptionId : undefined,
    shownError ? statusId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const defaultLabel = multiple ? "Drop files here or browse" : "Drop a file here or browse";

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label
        htmlFor={inputId}
        data-dragging={dragging ? "" : undefined}
        data-drag-reject={dragReject ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "group relative flex w-full cursor-pointer items-center rounded-[var(--radius-lg)]",
          "border border-dashed border-input bg-background text-sm text-muted-foreground",
          "transition-[background-color,border-color,box-shadow] duration-micro ease-out",
          "hover:border-ring/60 hover:bg-accent/40",
          // The hidden input owns focus; the surface draws the ring for it.
          "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/30",
          "data-[dragging]:border-ring data-[dragging]:bg-accent/60",
          "data-[drag-reject]:border-destructive/60 data-[drag-reject]:bg-destructive/5",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-background",
          size === "md"
            ? "min-h-32 flex-col justify-center gap-2 p-6 text-center"
            : "gap-3 px-3 py-2",
          shownError && "border-destructive/60",
        )}
        onDragEnter={(event) => {
          if (disabled) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
          setDragReject(!dragCarriesAcceptedTypes(event, accept));
        }}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) resetDrag();
        }}
        onDrop={(event) => {
          event.preventDefault();
          resetDrag();
          handleFiles(Array.from(event.dataTransfer?.files ?? []));
        }}
        onPaste={
          paste
            ? (event) => {
                const files = Array.from(event.clipboardData?.files ?? []);
                if (files.length === 0) return;
                event.preventDefault();
                handleFiles(files);
              }
            : undefined
        }
      >
        <input
          {...inputProps}
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          aria-describedby={describedBy || undefined}
          aria-invalid={shownError ? true : undefined}
          className="sr-only"
          onChange={(event) => {
            handleFiles(Array.from(event.target.files ?? []));
            // Allow choosing the same file again.
            event.target.value = "";
          }}
        />
        {children ?? (
          <>
            <CloudUpload
              aria-hidden="true"
              className={cn(
                "shrink-0 text-muted-foreground transition-colors group-hover:text-foreground",
                size === "md" ? "size-6" : "size-4",
              )}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-foreground">{label ?? defaultLabel}</span>
              {description ? (
                <span id={descriptionId} className="text-xs text-muted-foreground">
                  {description}
                </span>
              ) : null}
            </span>
          </>
        )}
      </label>
      {progress !== undefined ? (
        <Progress value={progress} aria-label={progressLabel} size="sm" />
      ) : null}
      <p
        id={statusId}
        aria-live="polite"
        className={cn("text-xs", shownError ? "font-medium text-destructive-strong" : "sr-only")}
      >
        {shownError ?? status?.text ?? ""}
      </p>
    </div>
  );
}
