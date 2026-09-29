import { FileText, Image, MusicalNotes, Video } from "@nebutra/icons";
import type { WorkspaceNode } from "@/domain/types";

const GLYPH = { text: FileText, image: Image, video: Video, audio: MusicalNotes } as const;

/** The type icon LibTV puts before every node label, menu row and outliner row. */
export function NodeGlyph({
  type,
  className = "size-3.5",
}: {
  type: WorkspaceNode["type"];
  className?: string;
}) {
  const Icon = GLYPH[type];
  return <Icon aria-hidden="true" className={className} />;
}
