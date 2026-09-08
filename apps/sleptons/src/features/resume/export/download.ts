"use client";

import { RESUME_CONTENT_VERSION, type ResumeContentV1 } from "@nebutra/contracts/sleptons";
import { toMarkdown } from "./markdown";

/** JSON export = validated content + version marker, re-importable via PUT. */
export function toJson(content: ResumeContentV1): string {
  return `${JSON.stringify({ schemaVersion: RESUME_CONTENT_VERSION, content }, null, 2)}\n`;
}

export function slugForFile(name: string): string {
  const s = name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return s || "resume";
}

function triggerDownload(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(content: ResumeContentV1) {
  triggerDownload(
    `${slugForFile(content.basic.name)}.md`,
    toMarkdown(content),
    "text/markdown;charset=utf-8",
  );
}

export function downloadJson(content: ResumeContentV1) {
  triggerDownload(
    `${slugForFile(content.basic.name)}.json`,
    toJson(content),
    "application/json;charset=utf-8",
  );
}
