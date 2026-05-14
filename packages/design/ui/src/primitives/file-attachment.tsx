"use client";

import { Code, File, Image as ImageIcon, Cross as X } from "@nebutra/icons";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  FileAttachment — chip / thumbnail display for an attached file.
 *
 *  Use case: rendering uploaded / pasted files in a chat composer, message
 *  bubble, or attachment list. NOT a chat tool-family member (those render
 *  AI output); this renders user input.
 *
 *  Two display modes:
 *    - "chip"        → icon-or-thumbnail + filename + size (default)
 *    - "image-only"  → just the thumbnail (for compact image grids).
 *                      Falls back to chip rendering when isImage or url is
 *                      missing — the mode hint is a *preference*, not a hard
 *                      guarantee, since image-only is meaningless without
 *                      both flags.
 *
 *  a11y:
 *    - Remove button is keyboard-accessible (Tab to focus, Enter/Space to
 *      activate). Surface is hidden by default but reveals on hover OR
 *      focus-visible OR group-focus-within — so keyboard and touch users
 *      can still remove files. Original 21st.dev hover-only pattern was a
 *      blocker for non-mouse input.
 *    - Remove button carries aria-label="Remove <filename>".
 *    - <img> uses loading="lazy" + alt={filename}.
\* -------------------------------------------------------------------------- */

export type FileAttachmentDisplay = "chip" | "image-only";

export type FileAttachmentProps = {
  filename: string;
  /** Optional file size in bytes; rendered below filename when present. */
  size?: number;
  /** Pass true when MIME indicates an image; pair with `url` to show a thumbnail. */
  isImage?: boolean;
  /** Preview URL — required for thumbnail rendering. */
  url?: string;
  /** Removal callback. When omitted, no remove button renders. */
  onRemove?: () => void;
  /** @default "chip" */
  display?: FileAttachmentDisplay;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileIconName = "image" | "code" | "data" | "text";

const CODE_EXTS: ReadonlySet<string> = new Set([
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "c",
  "cpp",
  "h",
  "hpp",
  "cs",
  "php",
]);

const DATA_EXTS: ReadonlySet<string> = new Set(["json", "yaml", "yml", "xml", "toml"]);

function getFileIconName(filename: string, isImage?: boolean): FileIconName {
  if (isImage) return "image";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (CODE_EXTS.has(ext)) return "code";
  if (DATA_EXTS.has(ext)) return "data";
  return "text";
}

function renderFileIcon(name: FileIconName): ReactElement {
  const cls = "size-4 text-muted-foreground";
  switch (name) {
    case "image":
      return <ImageIcon className={cls} aria-hidden="true" />;
    case "code":
      // Both source code and structured data (json/yaml/xml/toml) render with
      // the Code icon — they share the "structured text" mental model.
      return <Code className={cls} aria-hidden="true" />;
    case "data":
      return <Code className={cls} aria-hidden="true" />;
    case "text":
      return <File className={cls} aria-hidden="true" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileAttachment({
  filename,
  size,
  isImage,
  url,
  onRemove,
  display = "chip",
  className,
}: FileAttachmentProps): ReactElement {
  const iconName = getFileIconName(filename, isImage);
  const canShowImageOnly = display === "image-only" && isImage && !!url;
  const hasThumbnail = isImage && !!url;

  return (
    <div
      className={cn(
        "group relative rounded-md bg-muted",
        canShowImageOnly
          ? "flex size-10 items-center justify-center"
          : "flex min-w-[120px] max-w-[200px] items-center gap-2 py-1 pl-1 pr-2",
        className,
      )}
    >
      {canShowImageOnly ? (
        <span className="size-8 shrink-0 overflow-hidden rounded-[4px]">
          {/* biome-ignore lint/performance/noImgElement: framework-neutral primitive — consumers may not be on Next.js */}
          <img src={url} alt={filename} loading="lazy" className="h-full w-full object-cover" />
        </span>
      ) : (
        <>
          {hasThumbnail ? (
            <span className="w-8 shrink-0 self-stretch overflow-hidden rounded-[4px]">
              {/* biome-ignore lint/performance/noImgElement: framework-neutral primitive — consumers may not be on Next.js */}
              <img
                src={url}
                alt={filename}
                loading="lazy"
                className="aspect-square h-full w-full object-cover"
              />
            </span>
          ) : (
            <span className="flex w-8 shrink-0 items-center justify-center self-stretch rounded-[4px] bg-background">
              {renderFileIcon(iconName)}
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground" title={filename}>
              {filename}
            </span>
            {size !== undefined && (
              <span className="text-[10px] text-muted-foreground">{formatFileSize(size)}</span>
            )}
          </span>
        </>
      )}

      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${filename}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "absolute -right-1.5 -top-1.5 z-10 flex size-4 items-center justify-center",
            "rounded-full border border-border bg-background text-muted-foreground",
            "opacity-0 transition-opacity duration-150 ease-out",
            "group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
            "hover:text-foreground active:scale-[0.97]",
          )}
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
