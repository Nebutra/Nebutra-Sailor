"use client";

import { Button } from "@nebutra/ui/components";
import { Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useReducer } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import {
  listPasskeys,
  type PasskeyDescriptor,
  registerPasskey,
  renamePasskey,
  revokePasskey,
} from "@/lib/auth/passkey-client";
import type { SecurityCapabilities } from "./security-capabilities";

export type PasskeyRecord = {
  id: string;
  name: string;
  deviceType?: string;
  createdAt?: string;
};

export interface PasskeysBlockProps {
  capability: SecurityCapabilities["passkeys"];
  /** Override list — defaults to passkey-client.listPasskeys(). */
  onList?: () => Promise<PasskeyRecord[]>;
  /** Override add — defaults to passkey-client.registerPasskey() (full WebAuthn ceremony). */
  onAdd?: (input?: { name?: string }) => Promise<void>;
  /** Override rename — defaults to passkey-client.renamePasskey(). */
  onRename?: (id: string, name: string) => Promise<void>;
  /** Override remove — defaults to passkey-client.revokePasskey(). */
  onRemove?: (id: string) => Promise<void>;
}

async function defaultList(): Promise<PasskeyRecord[]> {
  const records = await listPasskeys();
  return records.map((r: PasskeyDescriptor) => ({
    id: r.id,
    name: r.name ?? r.deviceType,
    ...(r.deviceType ? { deviceType: r.deviceType } : {}),
    ...(r.createdAt ? { createdAt: r.createdAt } : {}),
  }));
}

async function defaultAdd(input?: { name?: string }): Promise<void> {
  await registerPasskey(input ?? {});
}

async function defaultRename(id: string, name: string): Promise<void> {
  await renamePasskey(id, name);
}

async function defaultRemove(id: string): Promise<void> {
  await revokePasskey(id);
}

function formatDate(value: string | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString();
}

interface PasskeysState {
  passkeys: PasskeyRecord[];
  listLoaded: boolean;
  pending: boolean;
  removingId: string | null;
  renamingId: string | null;
  editingName: string;
  adding: boolean;
  newPasskeyName: string;
  errorKey: AuthErrorKey | null;
  statusMessage: string;
}

const INITIAL_PASSKEYS_STATE: PasskeysState = {
  passkeys: [],
  listLoaded: false,
  pending: false,
  removingId: null,
  renamingId: null,
  editingName: "",
  adding: false,
  newPasskeyName: "",
  errorKey: null,
  statusMessage: "",
};

type PasskeysAction =
  | { type: "list.success"; passkeys: PasskeyRecord[] }
  | { type: "list.failure"; errorKey: AuthErrorKey }
  | { type: "add.open"; defaultName: string }
  | { type: "add.cancel" }
  | { type: "add.name"; name: string }
  | { type: "add.start" }
  | { type: "add.cancelled"; message: string }
  | { type: "add.failure"; errorKey: AuthErrorKey }
  | { type: "rename.open"; id: string; name: string }
  | { type: "rename.cancel" }
  | { type: "rename.name"; name: string }
  | { type: "rename.start" }
  | { type: "rename.failure"; errorKey: AuthErrorKey }
  | { type: "remove.start"; id: string }
  | { type: "remove.failure"; errorKey: AuthErrorKey };

function passkeysReducer(state: PasskeysState, action: PasskeysAction): PasskeysState {
  switch (action.type) {
    case "list.success":
      return {
        ...state,
        passkeys: action.passkeys,
        listLoaded: true,
        pending: false,
        removingId: null,
        renamingId: null,
        editingName: "",
        adding: false,
        newPasskeyName: "",
        errorKey: null,
      };
    case "list.failure":
      return { ...state, listLoaded: true, pending: false, errorKey: action.errorKey };
    case "add.open":
      return {
        ...state,
        adding: true,
        newPasskeyName: action.defaultName,
        errorKey: null,
        statusMessage: "",
      };
    case "add.cancel":
      return { ...state, adding: false, newPasskeyName: "" };
    case "add.name":
      return { ...state, newPasskeyName: action.name };
    case "add.start":
      return { ...state, pending: true, errorKey: null, statusMessage: "" };
    case "add.cancelled":
      return { ...state, pending: false, adding: false, statusMessage: action.message };
    case "add.failure":
      return { ...state, pending: false, errorKey: action.errorKey };
    case "rename.open":
      return { ...state, renamingId: action.id, editingName: action.name };
    case "rename.cancel":
      return { ...state, renamingId: null, editingName: "" };
    case "rename.name":
      return { ...state, editingName: action.name };
    case "rename.start":
      return { ...state, pending: true, errorKey: null, statusMessage: "" };
    case "rename.failure":
      return { ...state, pending: false, errorKey: action.errorKey };
    case "remove.start":
      return { ...state, removingId: action.id, errorKey: null };
    case "remove.failure":
      return { ...state, removingId: null, errorKey: action.errorKey };
  }
}

export function PasskeysBlock({
  capability,
  onList,
  onAdd,
  onRename,
  onRemove,
}: PasskeysBlockProps) {
  const t = useTranslations("auth.security.passkeys");
  const tErrors = useTranslations("auth.errors");

  const [state, dispatch] = useReducer(passkeysReducer, INITIAL_PASSKEYS_STATE);

  const refresh = useCallback(async () => {
    if (!capability.available) {
      return;
    }
    try {
      const list = onList ?? defaultList;
      const records = await list();
      dispatch({ type: "list.success", passkeys: records });
    } catch (error) {
      dispatch({ type: "list.failure", errorKey: resolveAuthErrorKey(error) });
    }
  }, [capability.available, onList]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!capability.available) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
          </div>
          <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
            {t("unavailableBadge")}
          </span>
        </div>
        <p className="text-sm text-[var(--neutral-11)]">{capability.reason}</p>
      </section>
    );
  }

  function defaultPasskeyName(records: PasskeyRecord[]): string {
    return t("defaultName", { number: records.length + 1 });
  }

  function startAdd() {
    dispatch({ type: "add.open", defaultName: defaultPasskeyName(state.passkeys) });
  }

  function cancelAdd() {
    dispatch({ type: "add.cancel" });
  }

  function isCancelled(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const code = "code" in error ? String((error as { code?: unknown }).code).toLowerCase() : "";
    const message =
      "message" in error ? String((error as { message?: unknown }).message).toLowerCase() : "";
    return code === "cancelled" || message.includes("cancel");
  }

  async function handleAdd(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    dispatch({ type: "add.start" });
    try {
      const add = onAdd ?? defaultAdd;
      const name = state.newPasskeyName.trim() || defaultPasskeyName(state.passkeys);
      await add({ name });
      await refresh();
    } catch (error) {
      if (isCancelled(error)) {
        dispatch({ type: "add.cancelled", message: t("cancelled") });
      } else {
        dispatch({ type: "add.failure", errorKey: resolveAuthErrorKey(error) });
      }
    }
  }

  async function handleRename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const name = state.editingName.trim();
    if (!name) return;
    dispatch({ type: "rename.start" });
    try {
      const rename = onRename ?? defaultRename;
      await rename(id, name);
      await refresh();
    } catch (error) {
      dispatch({ type: "rename.failure", errorKey: resolveAuthErrorKey(error) });
    }
  }

  async function handleRemove(id: string) {
    dispatch({ type: "remove.start", id });
    try {
      const remove = onRemove ?? defaultRemove;
      await remove(id);
      await refresh();
    } catch (error) {
      dispatch({ type: "remove.failure", errorKey: resolveAuthErrorKey(error) });
    }
  }

  const errorMessage = state.errorKey ? tErrors(state.errorKey) : null;

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          Available
        </span>
      </div>

      {errorMessage && (
        <p className="mb-4 text-sm text-[hsl(var(--destructive))]" id="passkeys-error" role="alert">
          {errorMessage}
        </p>
      )}

      {state.statusMessage && (
        <p className="mb-4 text-sm text-[var(--neutral-11)]" role="status">
          {state.statusMessage}
        </p>
      )}

      {state.listLoaded && state.passkeys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
          <p className="text-sm text-[var(--neutral-11)]">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {state.passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--neutral-7)] p-4 md:flex-row md:items-center md:justify-between"
            >
              {state.renamingId === passkey.id ? (
                <form
                  className="flex flex-1 flex-col gap-3"
                  onSubmit={(event) => handleRename(event, passkey.id)}
                >
                  <label
                    className="text-sm font-medium text-[var(--neutral-12)]"
                    htmlFor={`passkey-name-${passkey.id}`}
                  >
                    {t("nameLabel")}
                  </label>
                  <Input
                    id={`passkey-name-${passkey.id}`}
                    onChange={(event) =>
                      dispatch({ type: "rename.name", name: event.target.value })
                    }
                    value={state.editingName}
                  />
                  <div className="flex gap-2">
                    <Button disabled={state.pending} htmlType="submit" type="primary">
                      {t("saveRename")}
                    </Button>
                    <Button
                      disabled={state.pending}
                      htmlType="button"
                      onClick={() => dispatch({ type: "rename.cancel" })}
                      variant="outlined"
                    >
                      {t("cancelAdd")}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-[var(--neutral-12)]">{passkey.name}</p>
                    <p className="mt-1 text-xs text-[var(--neutral-10)]">
                      {[passkey.deviceType, formatDate(passkey.createdAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={state.pending || state.removingId === passkey.id}
                      htmlType="button"
                      onClick={() =>
                        dispatch({ type: "rename.open", id: passkey.id, name: passkey.name })
                      }
                      variant="outlined"
                    >
                      {t("rename")}
                    </Button>
                    <Button
                      disabled={state.removingId === passkey.id}
                      htmlType="button"
                      onClick={() => handleRemove(passkey.id)}
                      variant="outlined"
                    >
                      {t("remove")}
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        {state.adding ? (
          <form
            className="space-y-3 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4"
            onSubmit={handleAdd}
          >
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-[var(--neutral-12)]"
                htmlFor="new-passkey-name"
              >
                {t("nameLabel")}
              </label>
              <Input
                id="new-passkey-name"
                onChange={(event) => dispatch({ type: "add.name", name: event.target.value })}
                value={state.newPasskeyName}
              />
              <p className="text-xs text-[var(--neutral-10)]">{t("nameHelp")}</p>
            </div>
            <div className="flex gap-2">
              <Button disabled={state.pending} htmlType="submit" type="primary">
                {t("addPasskey")}
              </Button>
              <Button
                disabled={state.pending}
                htmlType="button"
                onClick={cancelAdd}
                variant="outlined"
              >
                {t("cancelAdd")}
              </Button>
            </div>
          </form>
        ) : (
          <Button disabled={state.pending} htmlType="button" onClick={startAdd} type="primary">
            {t("addPasskey")}
          </Button>
        )}
      </div>
    </section>
  );
}
