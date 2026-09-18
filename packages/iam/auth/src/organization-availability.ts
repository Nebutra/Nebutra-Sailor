/**
 * Machine-readable marker for "this deployment has no organization support".
 *
 * Distinguishing that from "the create failed" used to be impossible: the
 * provider threw a plain Error, the API layer caught everything into one 500,
 * and onboarding rendered a single generic string. A missing plugin and a
 * duplicate slug were indistinguishable to the user and to whoever debugged it.
 *
 * Attached as `error.code`, so a caller can branch on it without matching
 * message text — message wording is not a contract, this is.
 */
export const ORGANIZATIONS_UNAVAILABLE_CODE = "ORGANIZATIONS_UNAVAILABLE" as const;

/** True when `error` reports that organizations are unavailable in this deployment. */
export function isOrganizationsUnavailableError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === ORGANIZATIONS_UNAVAILABLE_CODE
  );
}
