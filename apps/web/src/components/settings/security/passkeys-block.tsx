"use client";

import { Button } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import {
  listPasskeys,
  type PasskeyDescriptor,
  registerPasskey,
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
  onAdd?: () => Promise<void>;
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

async function defaultAdd(): Promise<void> {
  await registerPasskey({});
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

export function PasskeysBlock({ capability, onList, onAdd, onRemove }: PasskeysBlockProps) {
  const t = useTranslations("auth.security.passkeys");
  const tErrors = useTranslations("auth.errors");

  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  const refresh = useCallback(async () => {
    if (!capability.available) {
      return;
    }
    try {
      const list = onList ?? defaultList;
      const records = await list();
      setPasskeys(records);
      setListLoaded(true);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
      setListLoaded(true);
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

  async function handleAdd() {
    setErrorKey(null);
    setPending(true);
    try {
      const add = onAdd ?? defaultAdd;
      await add();
      await refresh();
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  async function handleRemove(id: string) {
    setErrorKey(null);
    setRemovingId(id);
    try {
      const remove = onRemove ?? defaultRemove;
      await remove(id);
      await refresh();
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setRemovingId(null);
    }
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;

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

      {listLoaded && passkeys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
          <p className="text-sm text-[var(--neutral-11)]">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--neutral-7)] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[var(--neutral-12)]">{passkey.name}</p>
                <p className="mt-1 text-xs text-[var(--neutral-10)]">
                  {[passkey.deviceType, formatDate(passkey.createdAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button
                disabled={removingId === passkey.id}
                htmlType="button"
                onClick={() => handleRemove(passkey.id)}
                variant="outlined"
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Button disabled={pending} htmlType="button" onClick={handleAdd} type="primary">
          {t("addPasskey")}
        </Button>
      </div>
    </section>
  );
}
