export type PrepaidWalletErrorCode =
  | "insufficient_credits"
  | "insufficient_scope"
  | "invalid_amount"
  | "tenant_not_found"
  | "key_invalid";

export class PrepaidWalletError extends Error {
  readonly code: PrepaidWalletErrorCode;

  constructor(code: PrepaidWalletErrorCode, message: string) {
    super(message);
    this.name = "PrepaidWalletError";
    this.code = code;
  }
}
