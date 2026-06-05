/**
 * Pure form-team orchestration helpers — eligibility checks and the transfer
 * journal payload. Kept side-effect-free so the rules are unit-tested without a
 * database or auth. The route handler (Task 3) and the async provisioning worker
 * (Task 4) consume these.
 */
export type FormTeamErrorCode = "not-a-match" | "unpaid" | "not-owner";

export class FormTeamError extends Error {
  constructor(
    readonly code: FormTeamErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FormTeamError";
  }
}

export interface FormTeamEligibility {
  /** The target profile is a real mutual match of the initiator. */
  readonly isMatch: boolean;
  /** The initiator holds a paid plan (Cofounder Room paywall parity). */
  readonly initiatorPaid: boolean;
  /** The initiator owns the company/project being carried over. */
  readonly isInitiatorOwnerOfProject: boolean;
}

/**
 * Throws a typed FormTeamError when the initiator may not form this team.
 * Order matters: a non-match is a 404 (don't reveal anything), unpaid is the
 * paywall, not-owner is a 403.
 */
export function assertFormTeamEligible(eligibility: FormTeamEligibility): void {
  if (!eligibility.isMatch) {
    throw new FormTeamError("not-a-match", "This is not a mutual match.");
  }
  if (!eligibility.initiatorPaid) {
    throw new FormTeamError("unpaid", "A paid plan is required to form a team.");
  }
  if (!eligibility.isInitiatorOwnerOfProject) {
    throw new FormTeamError("not-owner", "Only the company owner can form a team from it.");
  }
}

export type TransferJournalEntryKind = "company_context" | "startup_project" | "license";

export interface TransferJournalEntryInput {
  readonly fromTenantId: string;
  readonly toOrganizationId: string;
  /** The Startup OS project carried over whole (its CompanyContext travels with it). */
  readonly projectId: string;
  readonly cofounderProfileId: string;
  readonly userId: string;
}

export interface TransferJournalEntry {
  readonly fromTenantId: string;
  readonly toOrganizationId: string;
  readonly kind: TransferJournalEntryKind;
  readonly subjectId: string | null;
  readonly cofounderProfileId: string;
  readonly initiatedByUserId: string;
  readonly status: "pending";
}

/**
 * The explicit, no-implicit-copy transfer intent: carry the whole Startup OS
 * project (which contains the CompanyContext) and the Sailor commercial-exemption
 * license into the new org tenant. Rows are `pending` until the org tenant is
 * provisioned and the worker applies them.
 */
export function buildTransferJournalEntries(
  input: TransferJournalEntryInput,
): TransferJournalEntry[] {
  const base = {
    fromTenantId: input.fromTenantId,
    toOrganizationId: input.toOrganizationId,
    cofounderProfileId: input.cofounderProfileId,
    initiatedByUserId: input.userId,
    status: "pending" as const,
  };
  return [
    { ...base, kind: "startup_project", subjectId: input.projectId },
    { ...base, kind: "license", subjectId: null },
  ];
}
