"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Consent as it stands, on the page where a person goes to ask.
 *
 * Withdrawing is two taps, like deleting a Moment: the first arms it, the
 * second does it. Both are decisions about a face, and neither should happen on
 * a stray click.
 */
export function ConsentControl({ consentedAt }: { consentedAt: string | null }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function withdraw() {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/consent/face", { method: "DELETE" });
      if (!response.ok) {
        setBusy(false);
        setArmed(false);
        setNote(response.status === 503 ? "这一刻还改不了。" : "没能撤回。再试一次。");
        return;
      }
      router.refresh();
    } catch {
      setBusy(false);
      setArmed(false);
      setNote("没能撤回。再试一次。");
    }
  }

  if (!consentedAt) {
    return <dd>还没有同意过。第一次开拍时会问你。</dd>;
  }

  return (
    <dd>
      <span>{consentedAt} 同意</span>
      <span className="tile-actions">
        {armed ? (
          <>
            <button type="button" className="link-danger" onClick={withdraw} disabled={busy}>
              {busy ? "撤回中" : "确定撤回"}
            </button>
            <button
              type="button"
              className="link-quiet"
              onClick={() => setArmed(false)}
              disabled={busy}
            >
              取消
            </button>
          </>
        ) : (
          <button type="button" className="link-quiet" onClick={() => setArmed(true)}>
            撤回同意
          </button>
        )}
      </span>
      {note ? (
        <span className="tile-sub" data-tone="error">
          {note}
        </span>
      ) : null}
    </dd>
  );
}
