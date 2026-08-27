"use client";

import { KineticCommandBox } from "@nebutra/ui/patterns";

interface CommandInstallBoxProps {
  command: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}

export function CommandInstallBox({
  command,
  copyLabel,
  copiedLabel,
  className,
}: CommandInstallBoxProps) {
  return (
    <KineticCommandBox
      command={command}
      copyLabel={copyLabel}
      copiedLabel={copiedLabel}
      className={className}
    />
  );
}

CommandInstallBox.displayName = "CommandInstallBox";
