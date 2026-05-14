"use client";

import { FileAttachment } from "@nebutra/ui/primitives";
import { useState } from "react";

const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="44" cy="20" r="8" fill="#fff" fill-opacity="0.85"/><path d="M0 50 L20 36 L36 46 L52 30 L64 42 L64 64 L0 64 Z" fill="#000" fill-opacity="0.25"/></svg>`;
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
