/**
 * Extract a user-friendly error message from Clerk SDK errors.
 */
export function extractClerkErrorMessage(
  err: unknown,
  defaultMessage = "Something went wrong. Please try again.",
): string {
  if (!err || typeof err !== "object") return defaultMessage;

  const clerkError = err as {
    errors?: Array<{ longMessage?: string; message?: string }>;
  };

  return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? defaultMessage;
}
