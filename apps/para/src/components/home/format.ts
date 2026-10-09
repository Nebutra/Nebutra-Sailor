/**
 * Dates the way LibTV prints them on a card: 2026-09-08. Local calendar day, not UTC — a project
 * touched at 1am in Shanghai belongs to that day, not the one before.
 */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
