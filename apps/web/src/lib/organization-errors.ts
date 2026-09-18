export const ORGANIZATION_ERROR_CODES = {
  /** The deployment has no organization support (provider or plugin missing). */
  notEnabled: "ORGANIZATIONS_NOT_ENABLED",
  /** The requested slug is already in use. */
  slugTaken: "ORGANIZATION_SLUG_TAKEN",
} as const;

/**
 * Classify a thrown create-organization error into a code the UI can explain.
 *
 * Everything used to collapse into one unattributed 500, so onboarding said
 * "workspace creation failed" whether the organization plugin was absent from
 * the build or the slug was simply taken. Two very different situations, one
 * dead end — for the user and for whoever had to debug it.
 *
 * Returns null when the cause is genuinely unknown; callers keep the generic
 * message for that rather than guessing.
 */
export function classifyOrganizationCreateError(
  error: unknown,
  isUnavailable: (candidate: unknown) => boolean,
): (typeof ORGANIZATION_ERROR_CODES)[keyof typeof ORGANIZATION_ERROR_CODES] | null {
  if (isUnavailable(error)) return ORGANIZATION_ERROR_CODES.notEnabled;

  // Slug conflicts surface differently per provider: Better Auth raises an
  // APIError whose body mentions the slug, Clerk returns a 422 with
  // `form_identifier_exists`, and Prisma a P2002 unique violation. Match on all
  // three rather than on one provider's wording.
  const haystack = [
    error instanceof Error ? error.message : "",
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "",
    typeof error === "object" && error !== null && "body" in error
      ? JSON.stringify((error as { body?: unknown }).body ?? "")
      : "",
  ]
    .join(" ")
    .toLowerCase();

  const mentionsSlug = haystack.includes("slug") || haystack.includes("identifier");
  const mentionsConflict =
    haystack.includes("already") ||
    haystack.includes("taken") ||
    haystack.includes("exists") ||
    haystack.includes("unique") ||
    haystack.includes("p2002") ||
    haystack.includes("duplicate");

  if (mentionsSlug && mentionsConflict) return ORGANIZATION_ERROR_CODES.slugTaken;

  return null;
}
