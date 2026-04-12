"use client";

import { Code } from "@nebutra/icons";
import { useAnalytics } from "@/hooks/use-analytics";

interface ResumeDownloadButtonProps {
  label: string;
}

export function ResumeDownloadButton({ label }: ResumeDownloadButtonProps) {
  const { track } = useAnalytics();

  return (
    <a
      href="/api/resume"
      download="Tseka_Luk_Resume.pdf"
      onClick={() => track("resume_downloaded")}
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm px-7 py-3 text-sm font-medium text-gray-900 dark:text-white transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ml-4"
    >
      <Code className="h-4 w-4" />
      {label}
    </a>
  );
}
