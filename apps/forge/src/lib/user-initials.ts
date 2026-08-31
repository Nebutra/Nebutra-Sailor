/** One or two initials for the Forge header avatar fallback. */
export function userInitials(name?: string, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const letters = parts.map((part) => part[0] ?? "").join("");
    return letters.slice(0, 2).toUpperCase() || "?";
  }
  const local = email?.trim().split("@")[0] ?? "";
  return (local[0] ?? "?").toUpperCase();
}
