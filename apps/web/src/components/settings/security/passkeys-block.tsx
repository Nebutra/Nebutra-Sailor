"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { type FormEvent, useReducer } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import {
  listPasskeys,
  type PasskeyDescriptor,
  registerPasskey,
  renamePasskey,
  revokePasskey,
} from "@/lib/auth/passkey-client";
import { queryKeys } from "@/lib/query-keys";
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

function isCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code).toLowerCase() : "";
  const message =
    "message" in error ? String((error as { message?: unknown }).message).toLowerCase() : "";
  return code === "cancelled" || message.includes("cancel");
}

/**
 * Pure-UI flow state. The passkey *list* itself is server cache and now lives in
 * React Query — this reducer only tracks the add/rename/remove UI flow (which
 * dialog is open, the in-progress input values, and the surfaced error/status
 * copy). It deliberately holds no `passkeys` array or loading flag.
 */
interface PasskeysUiState {
  removingId: string | null;
  renamingId: string | null;
  editingName: string;
  adding: boolean;
  newPasskeyName: string;
  errorKey: AuthErrorKey | null;
  statusMessage: string;
}

const INITIAL_UI_STATE: PasskeysUiState = {
  removingId: null,
  renamingId: null,
  editingName: "",
  adding: false,
  newPasskeyName: "",
  errorKey: null,
  statusMessage: "",
};

type PasskeysUiAction =
  | { type: "add.open"; defaultName: string }
  | { type: "add.cancel" }
  | { type: "add.name"; name: string }
  | { type: "add.start" }
  | { type: "add.success" }
  | { type: "add.cancelled"; message: string }
  | { type: "add.failure"; errorKey: AuthErrorKey }
  | { type: "rename.open"; id: string; name: string }
  | { type: "rename.cancel" }
  | { type: "rename.name"; name: string }
  | { type: "rename.start" }
  | { type: "rename.success" }
  | { type: "rename.failure"; errorKey: AuthErrorKey }
  | { type: "remove.start"; id: string }
  | { type: "remove.success" }
  | { type: "remove.failure"; errorKey: AuthErrorKey };

function passkeysUiReducer(state: PasskeysUiState, action: PasskeysUiAction): PasskeysUiState {
  switch (action.type) {
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
      return { ...state, errorKey: null, statusMessage: "" };
    case "add.success":
      return { ...state, adding: false, newPasskeyName: "", errorKey: null };
    case "add.cancelled":
      return { ...state, adding: false, statusMessage: action.message };
    case "add.failure":
      return { ...state, errorKey: action.errorKey };
    case "rename.open":
      return { ...state, renamingId: action.id, editingName: action.name };
    case "rename.cancel":
      return { ...state, renamingId: null, editingName: "" };
    case "rename.name":
      return { ...state, editingName: action.name };
    case "rename.start":
      return { ...state, errorKey: null, statusMessage: "" };
    case "rename.success":
      return { ...state, renamingId: null, editingName: "", errorKey: null };
    case "rename.failure":
      return { ...state, errorKey: action.errorKey };
    case "remove.start":
      return { ...state, removingId: action.id, errorKey: null };
    case "remove.success":
      return { ...state, removingId: null };
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
  const format = useFormatter();

  const [state, dispatch] = useReducer(passkeysUiReducer, INITIAL_UI_STATE);
  const queryClient = useQueryClient();
  const listKey = queryKeys.passkeys.list();

  // Server cache: the registered passkeys. Gated on `capability.available` so
  // the network call never fires when the feature is delegated/disabled —
  // replaces the old `if (!capability.available) return` guard in `refresh()`.
  const passkeysQuery = useQuery({
    queryKey: listKey,
    queryFn: () => (onList ?? defaultList)(),
    enabled: capability.available,
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => (onAdd ?? defaultAdd)({ name }),
    onMutate: () => {
      dispatch({ type: "add.start" });
    },
    onSuccess: () => {
      dispatch({ type: "add.success" });
    },
    onError: (error: unknown) => {
      if (isCancelled(error)) {
        dispatch({ type: "add.cancelled", message: t("cancelled") });
      } else {
        dispatch({ type: "add.failure", errorKey: resolveAuthErrorKey(error) });
      }
    },
    onSettled: () => {
      // Background refresh — mirrors the old `await refresh()` after a successful add.
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      (onRename ?? defaultRename)(id, name),
    onMutate: () => {
      dispatch({ type: "rename.start" });
    },
    onSuccess: () => {
      dispatch({ type: "rename.success" });
    },
    onError: (error: unknown) => {
      dispatch({ type: "rename.failure", errorKey: resolveAuthErrorKey(error) });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => (onRemove ?? defaultRemove)(id),
    // Optimistically drop the row from the cached list, mirroring the previous
    // local-state behaviour where the row disappeared immediately on remove
    // (`remove.start`). Adds onError rollback the old code lacked.
    onMutate: async (id: string) => {
      dispatch({ type: "remove.start", id });
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<PasskeyRecord[]>(listKey);
      queryClient.setQueryData<PasskeyRecord[]>(listKey, (current) =>
        (current ?? []).filter((p) => p.id !== id),
      );
      return { previous };
    },
    onSuccess: () => {
      dispatch({ type: "remove.success" });
    },
    onError: (error: unknown, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<PasskeyRecord[]>(listKey, context.previous);
      }
      dispatch({ type: "remove.failure", errorKey: resolveAuthErrorKey(error) });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  if (!capability.available) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <span className="w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {t("unavailableBadge")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{capability.reason}</p>
      </section>
    );
  }

  const passkeys = passkeysQuery.data ?? [];
  // The first successful (or failed) settle marks the list "loaded" — same gate
  // the old `listLoaded` flag drove the empty-state on.
  const listLoaded = !passkeysQuery.isPending;
  const pending = addMutation.isPending || renameMutation.isPending;

  function defaultPasskeyName(records: PasskeyRecord[]): string {
    return t("defaultName", { number: records.length + 1 });
  }

  function startAdd() {
    dispatch({ type: "add.open", defaultName: defaultPasskeyName(passkeys) });
  }

  function cancelAdd() {
    dispatch({ type: "add.cancel" });
  }

  function handleAdd(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const name = state.newPasskeyName.trim() || defaultPasskeyName(passkeys);
    addMutation.mutate(name);
  }

  function handleRename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const name = state.editingName.trim();
    if (!name) return;
    renameMutation.mutate({ id, name });
  }

  function handleRemove(id: string) {
    removeMutation.mutate(id);
  }

  // The list-load failure (old `list.failure`) and the mutation failures share
  // the same red error box, keyed through the auth error catalog.
  const errorKey = passkeysQuery.error ? resolveAuthErrorKey(passkeysQuery.error) : state.errorKey;
  const errorMessage = errorKey ? tErrors(errorKey) : null;

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <span className="w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Available
        </span>
      </div>

      {errorMessage && (
        <p className="mb-4 text-sm text-[hsl(var(--destructive))]" id="passkeys-error" role="alert">
          {errorMessage}
        </p>
      )}

      {state.statusMessage && (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {state.statusMessage}
        </p>
      )}

      {listLoaded && passkeys.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border p-4 md:flex-row md:items-center md:justify-between"
            >
              {state.renamingId === passkey.id ? (
                <form
                  className="flex flex-1 flex-col gap-3"
                  onSubmit={(event) => handleRename(event, passkey.id)}
                >
                  <label
                    className="text-sm font-medium text-foreground"
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
                    <Button disabled={pending} type="submit">
                      {t("saveRename")}
                    </Button>
                    <Button
                      disabled={pending}
                      type="button"
                      onClick={() => dispatch({ type: "rename.cancel" })}
                      variant="outline"
                    >
                      {t("cancelAdd")}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground">{passkey.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        passkey.deviceType,
                        passkey.createdAt && !Number.isNaN(new Date(passkey.createdAt).getTime())
                          ? format.dateTime(new Date(passkey.createdAt), {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={pending || state.removingId === passkey.id}
                      type="button"
                      onClick={() =>
                        dispatch({ type: "rename.open", id: passkey.id, name: passkey.name })
                      }
                      variant="outline"
                    >
                      {t("rename")}
                    </Button>
                    <Button
                      disabled={state.removingId === passkey.id}
                      type="button"
                      onClick={() => handleRemove(passkey.id)}
                      variant="outline"
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
            className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-muted p-4"
            onSubmit={handleAdd}
          >
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-foreground"
                htmlFor="new-passkey-name"
              >
                {t("nameLabel")}
              </label>
              <Input
                id="new-passkey-name"
                onChange={(event) => dispatch({ type: "add.name", name: event.target.value })}
                value={state.newPasskeyName}
              />
              <p className="text-xs text-muted-foreground">{t("nameHelp")}</p>
            </div>
            <div className="flex gap-2">
              <Button disabled={pending} type="submit">
                {t("addPasskey")}
              </Button>
              <Button disabled={pending} type="button" onClick={cancelAdd} variant="outline">
                {t("cancelAdd")}
              </Button>
            </div>
          </form>
        ) : (
          <Button disabled={pending} type="button" onClick={startAdd}>
            {t("addPasskey")}
          </Button>
        )}
      </div>
    </section>
  );
}
