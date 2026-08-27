export type ForgeErrorCode =
  | "tool_not_found"
  | "invalid_input"
  | "execution_failed"
  | "not_implemented";

export class ForgeRuntimeError extends Error {
  readonly code: ForgeErrorCode;

  constructor(code: ForgeErrorCode, message: string) {
    super(message);
    this.name = "ForgeRuntimeError";
    this.code = code;
  }
}
