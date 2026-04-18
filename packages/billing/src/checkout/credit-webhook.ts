import { addCredits } from "../credits/index";
import { type CheckoutProviderType, CREDIT_PURCHASE_METADATA_TYPE } from "./types";

// =============================================================================
// Shared credit-purchase webhook handler
// =============================================================================
// Each payment provider's webhook route (Stripe, Polar, LemonSqueezy, ChinaPay)
// invokes this function when it detects a checkout session carrying the
// `type: "credit_purchase"` metadata. Centralizing the credit-granting logic
// guarantees identical behavior across providers and a single place to evolve
// idempotency, auditing, and error handling.
// =============================================================================

export interface CreditPurchaseWebhookInput {
  provider: CheckoutProviderType;
  sessionId: string;
  metadata: Record<string, string | undefined>;
  /** Dollar amount actually received from the provider (for audit trail). */
  amountPaid?: number;
  currency?: string;
}

export interface CreditPurchaseWebhookResult {
  handled: boolean;
  organizationId?: string;
  creditAmount?: number;
  transactionId?: string;
  skipped?: "already_processed" | "not_credit_purchase" | "invalid_metadata";
}

/**
 * Patterns in error messages that indicate `addCredits` refused the insert
 * because a transaction with the same `relatedId` already exists. This is
 * the idempotency contract upheld by the credits service / database layer.
 */
const DUPLICATE_ERROR_PATTERNS = ["duplicate", "already_processed", "unique constraint"];

function isDuplicateError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return DUPLICATE_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Handle a credit-purchase checkout completion webhook from any provider.
 *
 * Flow:
 * 1. If `metadata.type !== "credit_purchase"` → return early (not our job).
 * 2. Validate required fields (organizationId, creditAmount as positive int).
 * 3. Call `addCredits` with `relatedId = sessionId` for idempotency.
 * 4. Swallow duplicate errors (already processed); rethrow other errors.
 */
export async function handleCreditPurchaseWebhook(
  input: CreditPurchaseWebhookInput,
): Promise<CreditPurchaseWebhookResult> {
  const { provider, sessionId, metadata, amountPaid, currency } = input;

  // 1. Filter — only act on credit_purchase sessions
  if (metadata.type !== CREDIT_PURCHASE_METADATA_TYPE) {
    return { handled: false, skipped: "not_credit_purchase" };
  }

  // 2. Validate required fields
  const organizationId = metadata.organizationId;
  const rawCreditAmount = metadata.creditAmount;

  if (!organizationId || !rawCreditAmount) {
    return { handled: true, skipped: "invalid_metadata" };
  }

  const creditAmount = Number.parseInt(rawCreditAmount, 10);
  if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
    return { handled: true, skipped: "invalid_metadata" };
  }

  const referenceId = metadata.referenceId;
  const description = referenceId
    ? `Credit purchase via ${provider} (ref: ${referenceId})`
    : `Credit purchase via ${provider} (session: ${sessionId})`;

  // 3. Credit the balance — addCredits handles atomic balance update.
  //    We use sessionId as relatedId so repeated webhook deliveries map to
  //    the same transaction record (provider-level idempotency).
  try {
    const transaction = await addCredits({
      organizationId,
      amount: creditAmount,
      type: "PURCHASE",
      description,
      relatedId: sessionId,
      metadata: {
        provider,
        sessionId,
        ...(referenceId ? { referenceId } : {}),
        ...(amountPaid !== undefined ? { amountPaid } : {}),
        ...(currency ? { currency } : {}),
      },
    });

    return {
      handled: true,
      organizationId,
      creditAmount,
      transactionId: transaction.id,
    };
  } catch (error) {
    // 4. Idempotency: swallow duplicate errors, rethrow anything else.
    if (isDuplicateError(error)) {
      return { handled: true, skipped: "already_processed" };
    }
    throw error;
  }
}
