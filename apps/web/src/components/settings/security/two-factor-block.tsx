"use client";

import { Button } from "@nebutra/ui/components";
import { Input } from "@nebutra/ui/primitives";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { type FormEvent, useReducer } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import type { SecurityCapabilities } from "./security-capabilities";

const VERIFICATION_CODE_LENGTH = 6;

export interface TotpSetupData {
  totpUri: string;
  secret: string;
  backupCodes: string[];
}

interface EnableInitInput {
  password: string;
}

interface VerifyInput {
  code: string;
}

interface DisableInput {
  password: string;
}

interface TwoFactorBlockProps {
  capability: SecurityCapabilities["twoFactor"];
  /**
   * Whether 2FA is currently enabled — pass from parent. Defaults to `false` so the
   * existing parent that has not yet wired the runtime state still type-checks.
   */
  enabled?: boolean;
  /** Initiate enrollment. Returns TOTP URI + secret + backup codes. */
  onEnableInit?: (input: EnableInitInput) => Promise<TotpSetupData>;
  /** Verify the 6-digit code to finalize enrollment. */
  onVerify?: (input: VerifyInput) => Promise<void>;
  /** Disable 2FA. */
  onDisable?: (input: DisableInput) => Promise<void>;
  /** Called when enable / disable succeeds. */
  onChanged?: () => void;
}

type Step = "idle" | "enable-password" | "verify" | "backup-codes" | "disable-password";

interface TwoFactorState {
  step: Step;
  password: string;
  code: string;
  setupData: TotpSetupData | null;
  errorKey: AuthErrorKey | null;
  pending: boolean;
  successMessageKey: "successEnabled" | "successDisabled" | null;
  copied: boolean;
}

const INITIAL_TWO_FACTOR_STATE: TwoFactorState = {
  step: "idle",
  password: "",
  code: "",
  setupData: null,
  errorKey: null,
  pending: false,
  successMessageKey: null,
  copied: false,
};

type TwoFactorAction =
  | { type: "flow.idle" }
  | { type: "flow.enablePassword" }
  | { type: "flow.disablePassword" }
  | { type: "field.password"; value: string }
  | { type: "field.code"; value: string }
  | { type: "submit.start" }
  | { type: "submit.validationError"; errorKey: AuthErrorKey }
  | { type: "enableInit.success"; setupData: TotpSetupData }
  | { type: "verify.success" }
  | { type: "disable.success" }
  | { type: "submit.failure"; errorKey: AuthErrorKey }
  | { type: "copy.success" }
  | { type: "copy.failure" }
  | { type: "backupCodes.finish" };

function twoFactorReducer(state: TwoFactorState, action: TwoFactorAction): TwoFactorState {
  switch (action.type) {
    case "flow.idle":
      return { ...INITIAL_TWO_FACTOR_STATE, successMessageKey: state.successMessageKey };
    case "flow.enablePassword":
      return { ...INITIAL_TWO_FACTOR_STATE, step: "enable-password" };
    case "flow.disablePassword":
      return { ...INITIAL_TWO_FACTOR_STATE, step: "disable-password" };
    case "field.password":
      return { ...state, password: action.value };
    case "field.code":
      return { ...state, code: action.value };
    case "submit.start":
      return { ...state, errorKey: null, pending: true };
    case "submit.validationError":
      return { ...state, errorKey: action.errorKey, pending: false };
    case "enableInit.success":
      return {
        ...state,
        step: "verify",
        setupData: action.setupData,
        password: "",
        code: "",
        pending: false,
      };
    case "verify.success":
      return {
        ...state,
        step: "backup-codes",
        successMessageKey: "successEnabled",
        pending: false,
      };
    case "disable.success":
      return { ...INITIAL_TWO_FACTOR_STATE, successMessageKey: "successDisabled" };
    case "submit.failure":
      return { ...state, errorKey: action.errorKey, pending: false };
    case "copy.success":
      return { ...state, copied: true };
    case "copy.failure":
      return { ...state, copied: false };
    case "backupCodes.finish":
      return { ...INITIAL_TWO_FACTOR_STATE };
  }
}

async function defaultEnableInit({ password }: EnableInitInput): Promise<TotpSetupData> {
  const response = await fetch("/api/auth/two-factor/enable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }

  return (await response.json()) as TotpSetupData;
}

async function defaultVerify({ code }: VerifyInput): Promise<void> {
  const response = await fetch("/api/auth/two-factor/verify-totp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

async function defaultDisable({ password }: DisableInput): Promise<void> {
  const response = await fetch("/api/auth/two-factor/disable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

function buildQrSrc(totpUri: string): string {
  const encoded = encodeURIComponent(totpUri);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=200x200`;
}

export function TwoFactorBlock({
  capability,
  enabled = false,
  onEnableInit,
  onVerify,
  onDisable,
  onChanged,
}: TwoFactorBlockProps) {
  const t = useTranslations("auth.security.twoFactor");
  const tErrors = useTranslations("auth.errors");
  const tActions = useTranslations("Common.actions");

  const [state, dispatch] = useReducer(twoFactorReducer, INITIAL_TWO_FACTOR_STATE);

  function returnToIdle() {
    dispatch({ type: "flow.idle" });
  }

  if (!capability.available) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
          </div>
          <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
            {capability.requiresPasswordAccount ? "Needs password account" : "Not wired"}
          </span>
        </div>

        <div className="rounded-lg border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
          <p className="text-sm font-medium text-[var(--neutral-12)]">Authenticator app setup</p>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{capability.reason}</p>
        </div>
      </section>
    );
  }

  const errorMessage = state.errorKey ? tErrors(state.errorKey) : null;

  async function handleEnablePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "submit.start" });

    if (!state.password) {
      dispatch({ type: "submit.validationError", errorKey: "invalidCredentials" });
      return;
    }

    try {
      const submit = onEnableInit ?? defaultEnableInit;
      const data = await submit({ password: state.password });
      dispatch({ type: "enableInit.success", setupData: data });
    } catch (error) {
      dispatch({ type: "submit.failure", errorKey: resolveAuthErrorKey(error) });
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "submit.start" });

    if (state.code.length !== VERIFICATION_CODE_LENGTH) {
      dispatch({ type: "submit.validationError", errorKey: "invalidVerificationCode" });
      return;
    }

    try {
      const submit = onVerify ?? defaultVerify;
      await submit({ code: state.code });
      dispatch({ type: "verify.success" });
      onChanged?.();
    } catch (error) {
      dispatch({ type: "submit.failure", errorKey: resolveAuthErrorKey(error) });
    }
  }

  async function handleDisableSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "submit.start" });

    if (!state.password) {
      dispatch({ type: "submit.validationError", errorKey: "invalidCredentials" });
      return;
    }

    try {
      const submit = onDisable ?? defaultDisable;
      await submit({ password: state.password });
      dispatch({ type: "disable.success" });
      onChanged?.();
    } catch (error) {
      dispatch({ type: "submit.failure", errorKey: resolveAuthErrorKey(error) });
    }
  }

  async function handleCopyCodes() {
    if (!state.setupData) return;
    try {
      await navigator.clipboard.writeText(state.setupData.backupCodes.join("\n"));
      dispatch({ type: "copy.success" });
    } catch {
      dispatch({ type: "copy.failure" });
    }
  }

  function handleDoneFromBackupCodes() {
    dispatch({ type: "backupCodes.finish" });
  }

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <TwoFactorHeader
        title={t("title")}
        description={t("description")}
        help={enabled ? t("enabledHelp") : t("disabledHelp")}
        status={enabled ? t("enabled") : t("disabled")}
      />

      {errorMessage && (
        <p
          className="mb-4 text-sm text-[hsl(var(--destructive))]"
          id="two-factor-error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {state.successMessageKey && state.step !== "verify" && state.step !== "backup-codes" && (
        <p
          className="mb-4 text-sm text-[var(--status-success,hsl(var(--success,142_71%_45%)))]"
          id="two-factor-success"
          role="status"
        >
          {t(state.successMessageKey)}
        </p>
      )}

      {state.step === "idle" && (
        <IdleTwoFactorActions
          enabled={enabled}
          enableLabel={t("enable")}
          disableLabel={t("disable")}
          onEnable={() => dispatch({ type: "flow.enablePassword" })}
          onDisable={() => dispatch({ type: "flow.disablePassword" })}
        />
      )}

      {state.step === "enable-password" && (
        <PasswordStepForm
          errorMessage={errorMessage}
          inputId="two-factor-enable-password"
          password={state.password}
          pending={state.pending}
          promptLabel={t("passwordPrompt")}
          submitLabel={tActions("continue")}
          cancelLabel={tActions("cancel")}
          onCancel={returnToIdle}
          onPasswordChange={(value) => dispatch({ type: "field.password", value })}
          onSubmit={handleEnablePasswordSubmit}
        />
      )}

      {state.step === "verify" && state.setupData && (
        <VerifyTotpForm
          code={state.code}
          errorMessage={errorMessage}
          pending={state.pending}
          scanLabel={t("scanQrCode")}
          secretLabel={t("secretKeyLabel")}
          verificationCodeLabel={t("verificationCodeLabel")}
          verifyLabel={t("verify")}
          cancelLabel={tActions("cancel")}
          setupData={state.setupData}
          onCancel={returnToIdle}
          onCodeChange={(value) => dispatch({ type: "field.code", value })}
          onSubmit={handleVerifySubmit}
        />
      )}

      {state.step === "backup-codes" && state.setupData && (
        <BackupCodesPanel
          codes={state.setupData.backupCodes}
          title={t("backupCodesTitle")}
          description={t("backupCodesDescription")}
          copyLabel={t("copyBackupCodes")}
          finishLabel={t("finishSetup")}
          copied={state.copied}
          onCopy={handleCopyCodes}
          onFinish={handleDoneFromBackupCodes}
        />
      )}

      {state.step === "disable-password" && (
        <PasswordStepForm
          errorMessage={errorMessage}
          inputId="two-factor-disable-password"
          password={state.password}
          pending={state.pending}
          promptLabel={t("passwordPrompt")}
          submitLabel={tActions("confirm")}
          cancelLabel={tActions("cancel")}
          onCancel={returnToIdle}
          onPasswordChange={(value) => dispatch({ type: "field.password", value })}
          onSubmit={handleDisableSubmit}
        />
      )}
    </section>
  );
}

interface TwoFactorHeaderProps {
  title: string;
  description: string;
  help: string;
  status: string;
}

function TwoFactorHeader({
  title,
  description,
  help,
  status,
}: TwoFactorHeaderProps): React.ReactElement {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h3 className="text-sm font-medium text-[var(--neutral-12)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{description}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--neutral-10)]">{help}</p>
      </div>
      <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
        {status}
      </span>
    </div>
  );
}

interface IdleTwoFactorActionsProps {
  enabled: boolean;
  enableLabel: string;
  disableLabel: string;
  onEnable: () => void;
  onDisable: () => void;
}

function IdleTwoFactorActions({
  enabled,
  enableLabel,
  disableLabel,
  onEnable,
  onDisable,
}: IdleTwoFactorActionsProps): React.ReactElement {
  return (
    <div className="flex justify-start">
      {enabled ? (
        <Button htmlType="button" onClick={onDisable} variant="outlined">
          {disableLabel}
        </Button>
      ) : (
        <Button htmlType="button" onClick={onEnable} type="primary">
          {enableLabel}
        </Button>
      )}
    </div>
  );
}

interface PasswordStepFormProps {
  errorMessage: string | null;
  inputId: string;
  password: string;
  pending: boolean;
  promptLabel: string;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function PasswordStepForm({
  errorMessage,
  inputId,
  password,
  pending,
  promptLabel,
  submitLabel,
  cancelLabel,
  onCancel,
  onPasswordChange,
  onSubmit,
}: PasswordStepFormProps): React.ReactElement {
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--neutral-12)]" htmlFor={inputId}>
          {promptLabel}
        </label>
        <Input
          aria-describedby={errorMessage ? "two-factor-error" : undefined}
          aria-invalid={Boolean(errorMessage)}
          autoComplete="current-password"
          id={inputId}
          name="password"
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={pending} htmlType="submit" type="primary">
          {submitLabel}
        </Button>
        <Button disabled={pending} htmlType="button" onClick={onCancel} variant="outlined">
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}

interface VerifyTotpFormProps {
  code: string;
  errorMessage: string | null;
  pending: boolean;
  scanLabel: string;
  secretLabel: string;
  verificationCodeLabel: string;
  verifyLabel: string;
  cancelLabel: string;
  setupData: TotpSetupData;
  onCancel: () => void;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function VerifyTotpForm({
  code,
  errorMessage,
  pending,
  scanLabel,
  secretLabel,
  verificationCodeLabel,
  verifyLabel,
  cancelLabel,
  setupData,
  onCancel,
  onCodeChange,
  onSubmit,
}: VerifyTotpFormProps): React.ReactElement {
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <p className="text-sm text-[var(--neutral-11)]">{scanLabel}</p>

      <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4 sm:flex-row sm:items-center">
        <NextImage
          alt="Two-factor QR code"
          className="size-[200px] rounded bg-white p-2"
          height={200}
          unoptimized
          src={buildQrSrc(setupData.totpUri)}
          width={200}
        />

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-medium text-[var(--neutral-10)] uppercase tracking-wide">
            {secretLabel}
          </p>
          <code className="block break-all rounded bg-[var(--neutral-3)] px-2 py-1.5 font-mono text-[var(--neutral-12)] text-xs">
            {setupData.secret}
          </code>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium text-[var(--neutral-12)]"
          htmlFor="two-factor-code"
        >
          {verificationCodeLabel}
        </label>
        <Input
          aria-describedby={errorMessage ? "two-factor-error" : undefined}
          aria-invalid={Boolean(errorMessage)}
          autoComplete="one-time-code"
          id="two-factor-code"
          inputMode="numeric"
          maxLength={VERIFICATION_CODE_LENGTH}
          name="code"
          onChange={(event) => {
            const digitsOnly = event.target.value
              .replace(/\D+/g, "")
              .slice(0, VERIFICATION_CODE_LENGTH);
            onCodeChange(digitsOnly);
          }}
          pattern="\d{6}"
          required
          type="text"
          value={code}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={pending} htmlType="submit" type="primary">
          {verifyLabel}
        </Button>
        <Button disabled={pending} htmlType="button" onClick={onCancel} variant="outlined">
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}

interface BackupCodesPanelProps {
  codes: readonly string[];
  title: string;
  description: string;
  copyLabel: string;
  finishLabel: string;
  copied: boolean;
  onCopy: () => void;
  onFinish: () => void;
}

function BackupCodesPanel({
  codes,
  title,
  description,
  copyLabel,
  finishLabel,
  copied,
  onCopy,
  onFinish,
}: BackupCodesPanelProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-[var(--neutral-12)]">{title}</h4>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{description}</p>
      </div>

      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
        {codes.map((backupCode) => (
          <li
            className="rounded bg-[var(--neutral-1)] px-2 py-1.5 text-center font-mono text-[var(--neutral-12)] text-xs"
            key={backupCode}
          >
            {backupCode}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <Button htmlType="button" onClick={onCopy} variant="outlined">
          {copyLabel}
        </Button>
        <Button htmlType="button" onClick={onFinish} type="primary">
          {finishLabel}
        </Button>
        {copied && (
          <span className="text-xs text-[var(--neutral-11)]" role="status">
            Copied
          </span>
        )}
      </div>
    </div>
  );
}
