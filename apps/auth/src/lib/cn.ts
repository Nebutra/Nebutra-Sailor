/** Minimal className join — avoids runtime dep on @nebutra/ui/utils in standalone. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
