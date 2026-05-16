"use client";

import { FileAttachment } from "@nebutra/ui/primitives";
import { useState } from "react";

const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f8fafc"/><rect x="7" y="7" width="50" height="50" rx="10" fill="#ffffff" stroke="#d7dde8"/><circle cx="45" cy="20" r="7" fill="#dff3ed"/><path d="M10 48 L23 35 L33 43 L44 30 L56 44 L56 57 L10 57 Z" fill="#91c9b9"/><path d="M10 50 L25 40 L35 48 L47 38 L56 46 L56 57 L10 57 Z" fill="#b6d5ff" opacity="0.82"/></svg>`;
const heroImg = `data:image/svg+xml;utf8,${encodeURIComponent(heroSvg)}`;

type DemoFile = {
  id: string;
  filename: string;
  size?: number;
  isImage?: boolean;
  url?: string;
};

const INITIAL_FILES: DemoFile[] = [
  { id: "report", filename: "quarterly-report.pdf", size: 245_000 },
  { id: "server", filename: "server.ts", size: 4_200 },
  { id: "payload", filename: "payload.json", size: 1_240 },
  { id: "hero", filename: "hero.png", size: 86_000, isImage: true, url: heroImg },
];

export function FileAttachmentDemo() {
  const [files, setFiles] = useState<DemoFile[]>(INITIAL_FILES);
  return (
    <div className="flex w-full max-w-xl flex-wrap items-center gap-3">
      {files.map((file) => (
        <FileAttachment
          key={file.id}
          filename={file.filename}
          size={file.size}
          isImage={file.isImage}
          url={file.url}
          onRemove={() => setFiles((prev) => prev.filter((f) => f.id !== file.id))}
        />
      ))}
    </div>
  );
}
