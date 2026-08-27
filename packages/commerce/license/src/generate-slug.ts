/**
 * Generate a URL-safe slug from a display name and sequential member number.
 * Base is truncated to 40 characters to keep slugs predictable.
 */
export function generateSlug(displayName: string, memberNumber: number): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return `${base}-${memberNumber}`;
}
