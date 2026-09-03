"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * One Moment, with a way to take it back.
 *
 * Deleting is two taps rather than a dialog: the first arms it, the second does
 * it. A face photograph should not come off the shelf on a stray click, and it
 * should not need a modal to come off at all.
 */
export function MomentTile({
  id,
  url,
  label,
  day,
}: {
  id: string;
  url: string;
  label: string;
  day: string | null;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function drop() {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch(`/api/moments/id-photo?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setBusy(false);
        setArmed(false);
        setNote(response.status === 503 ? "这一刻还删不掉。" : "没能删掉。再试一次。");
        return;
      }
      router.refresh();
    } catch {
      setBusy(false);
      setArmed(false);
      setNote("没能删掉。再试一次。");
    }
  }

  return (
    <li>
      <a className="sku-card" href={url}>
        <img src={url} alt={label} />
        <span className="sku-name">{label}</span>
        {day ? <span className="tile-sub">{day}</span> : null}
      </a>
      <div className="tile-actions">
        {armed ? (
          <>
            <button type="button" className="link-danger" onClick={drop} disabled={busy}>
              {busy ? "删除中" : "确定删除"}
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
            删除
          </button>
        )}
      </div>
      {note ? (
        <span className="tile-sub" data-tone="error">
          {note}
        </span>
      ) : null}
    </li>
  );
}
