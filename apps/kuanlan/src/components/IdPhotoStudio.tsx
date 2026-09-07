"use client";

import { useEffect, useMemo, useState } from "react";
import { listIdPhotoSkus, parseIdPhotoRef, toPublicIdPhoto } from "@/catalog/skus";
import { FaceNotice } from "@/components/FaceNotice";
import type { ConsentGap } from "@/lib/consent";

type Status = "idle" | "shooting" | "ready" | "error";

const PENDING_KEY = "kuanlan.pendingShoot";

export function IdPhotoStudio({
  initialSkuId,
  initialSizeId,
}: {
  initialSkuId?: string;
  initialSizeId?: string;
}) {
  const skus = useMemo(() => listIdPhotoSkus().map((sku) => toPublicIdPhoto(sku)), []);
  const initial = parseIdPhotoRef(initialSkuId, initialSizeId);
  const [skuId, setSkuId] = useState(
    () => (skus.some((sku) => sku.id === initial.skuId) ? initial.skuId : skus[0]?.id) ?? "",
  );
  const [sizeId, setSizeId] = useState(() => {
    const sku = skus.find((item) => item.id === (initial.skuId || skus[0]?.id));
    return initial.sizeId && sku?.sizes.some((size) => size.id === initial.sizeId)
      ? initial.sizeId
      : (sku?.sizeId ?? "");
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState("");
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [consentGap, setConsentGap] = useState<ConsentGap | null>(null);
  const [credits, setCredits] = useState<{ balance: number; price: number } | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const selected = skus.find((sku) => sku.id === skuId);
  const selectedSize = selected?.sizes.find((size) => size.id === sizeId) ?? selected?.sizes[0];

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    let live = true;
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { balance?: number; price?: number } | null) => {
        if (live && c && typeof c.balance === "number" && typeof c.price === "number") {
          setCredits({ balance: c.balance, price: c.price });
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // A shoot outlives the page. If one was in flight when this page was last
  // closed, pick it back up and keep watching the row.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PENDING_KEY);
      if (saved) {
        setPendingId(saved);
        setStatus("shooting");
      }
    } catch {}
  }, []);

  // Watch the row. 2 s while the worker is running, backing off to 5 s after
  // the first half minute; paused entirely while the tab is hidden. The poll
  // reads the row and nothing else, so this is the whole client state model.
  useEffect(() => {
    if (!pendingId) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const settle = (next: Status, message: string, url?: string) => {
      try {
        window.localStorage.removeItem(PENDING_KEY);
      } catch {}
      setPendingId(null);
      if (url) setResultUrl(url);
      setStatus(next);
      setNote(message);
    };

    const tick = async () => {
      if (!live) return;
      if (document.hidden) {
        timer = setTimeout(tick, 5000);
        return;
      }
      try {
        const response = await fetch(`/api/moments/id-photo/${encodeURIComponent(pendingId)}`);
        if (response.status === 404) return settle("error", "这一刻没留下。再试一次。");
        if (!response.ok) {
          timer = setTimeout(tick, 5000);
          return;
        }
        const row = (await response.json()) as {
          status: string;
          result: { url: string } | null;
          error: { step: string } | null;
        };
        if (row.status === "SUCCEEDED" && row.result?.url) {
          return settle("ready", "", row.result.url);
        }
        if (row.status === "FAILED" || row.status === "CANCELLED") {
          const step = row.error?.step;
          return settle(
            "error",
            step === "compose"
              ? "这张照片观澜看不清。钱已退回。"
              : step === "store"
                ? "这一刻还存不进去。钱已退回。"
                : step === "runner"
                  ? "拍太久了，先停下。钱已退回。"
                  : "这一刻没拍成。钱已退回。",
          );
        }
        const elapsed = Date.now() - startedAt;
        timer = setTimeout(tick, elapsed < 30_000 ? 2000 : 5000);
      } catch {
        timer = setTimeout(tick, 5000);
      }
    };

    tick();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [pendingId]);

  function onPick(next: File | null) {
    setFile(next);
    setResultUrl(null);
    setStatus("idle");
    setNote("");
    setNeedsSignIn(false);
    setConsentGap(null);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function agree() {
    setAgreeing(true);
    try {
      const response = await fetch("/api/consent/face", { method: "POST" });
      if (!response.ok) {
        setAgreeing(false);
        setStatus("error");
        setNote("这一刻记不下来。再试一次。");
        return;
      }
      setConsentGap(null);
      setAgreeing(false);
      // They already asked to shoot; the notice interrupted it. Carry on.
      await shoot();
    } catch {
      setAgreeing(false);
      setStatus("error");
      setNote("这一刻记不下来。再试一次。");
    }
  }

  async function shoot() {
    if (!file || !skuId || !selectedSize) {
      setStatus("error");
      setNote("先选一张本人照片。");
      return;
    }

    setStatus("shooting");
    setNote("");
    setNeedsSignIn(false);
    const body = new FormData();
    body.set("skuId", skuId);
    body.set("sizeId", selectedSize.id);
    body.set("file", file);

    try {
      const response = await fetch("/api/moments/id-photo", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        setStatus("error");
        setNeedsSignIn(response.status === 401);
        if (response.status === 403) {
          const refused = (await response.json().catch(() => ({}))) as { gap?: ConsentGap };
          // Not an error state: nothing went wrong, we just have not asked yet.
          setStatus("idle");
          setConsentGap(refused.gap ?? "never");
          return;
        }
        if (response.status === 402) {
          const short = (await response.json().catch(() => ({}))) as {
            balance?: number;
            price?: number;
          };
          if (typeof short.balance === "number" && typeof short.price === "number") {
            setCredits({ balance: short.balance, price: short.price });
          }
          setNote("额度不够这一张了。");
          return;
        }
        if (response.status === 429) {
          const refused = (await response.json().catch(() => ({}))) as { scope?: string };
          setNote(
            refused.scope === "daily" ? "今天先拍到这儿。明天还有。" : "拍得有点快。等一会儿再来。",
          );
          return;
        }
        setNote(
          response.status === 401
            ? "先让观澜认识你。"
            : response.status === 404
              ? "这一规格暂时不开放。"
              : response.status === 503
                ? "这一刻还存不进去。"
                : "这张照片观澜看不清。",
        );
        return;
      }
      const moment = (await response.json()) as {
        id?: string;
        status?: string;
        url?: string;
        remainingToday?: number;
        balance?: number;
        price?: number;
      };
      if (typeof moment.balance === "number" && typeof moment.price === "number") {
        setCredits({ balance: moment.balance, price: moment.price });
      }
      setRemainingToday(typeof moment.remainingToday === "number" ? moment.remainingToday : null);

      // A finished row came straight back (the same shoot, already done).
      if (moment.url) {
        setResultUrl(moment.url);
        setStatus("ready");
        return;
      }
      // Otherwise it is queued: remember it, and the watcher above takes over.
      if (moment.id) {
        try {
          window.localStorage.setItem(PENDING_KEY, moment.id);
        } catch {}
        setNote("在拍。可以先去别处，拍好会留在 Moments。");
        setPendingId(moment.id);
        return;
      }
      setStatus("error");
      setNote("这一刻没留下。再试一次。");
    } catch {
      setStatus("error");
      setNote("这一刻没留下。再试一次。");
    }
  }

  return (
    <div>
      <ul className="sku-grid">
        {skus.map((sku) => (
          <li key={sku.id}>
            <button
              type="button"
              className="sku-card"
              data-sku={sku.id}
              data-active={sku.id === skuId}
              aria-pressed={sku.id === skuId}
              onClick={() => {
                setSkuId(sku.id);
                setSizeId(sku.sizeId);
                setResultUrl(null);
                setStatus("idle");
                setNeedsSignIn(false);
              }}
            >
              <span className="sku-still">
                <img
                  src={sku.sample}
                  alt={`${sku.title}${sku.subtitle}样例`}
                  width={sku.widthPx}
                  height={sku.heightPx}
                />
                {preview ? <img className="sku-source" src={preview} alt="" aria-hidden /> : null}
              </span>
              <span className="sku-name">
                {sku.title} · {sku.subtitle}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && selectedSize ? (
        <>
          <fieldset className="size-row">
            <legend>尺寸</legend>
            {selected.sizes.map((size) => (
              <button
                key={size.id}
                type="button"
                className="pill"
                data-size={size.id}
                data-active={size.id === selectedSize.id}
                aria-pressed={size.id === selectedSize.id}
                onClick={() => {
                  setSizeId(size.id);
                  setResultUrl(null);
                  setStatus("idle");
                }}
              >
                {size.label}
              </button>
            ))}
          </fieldset>
          <p className="note">
            {selectedSize.widthMm} × {selectedSize.heightMm} mm · {selectedSize.dpi} dpi ·{" "}
            {selectedSize.widthPx} × {selectedSize.heightPx}
            {selected.garmentId ? (
              <>
                {" · "}
                <a href="/wardrobe">衣柜</a>
              </>
            ) : null}
          </p>
        </>
      ) : null}

      <label className="upload">
        <input
          data-allow-native
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        />
        {file ? file.name : "选一张本人照片"}
      </label>

      <div className="hero-actions">
        <button
          type="button"
          className="pill pill-ink"
          onClick={shoot}
          disabled={status === "shooting"}
        >
          {status === "shooting" ? "在拍…" : credits ? `开拍 · ${credits.price}` : "开拍"}
        </button>
        {resultUrl ? (
          <>
            <a
              className="pill pill-ghost"
              href={resultUrl}
              download={`kuanlan-${skuId}-${selectedSize?.id ?? "print"}.png`}
            >
              留下这一张
            </a>
            <button
              type="button"
              className="pill"
              onClick={() => {
                setResultUrl(null);
                setStatus("idle");
              }}
            >
              再拍一会儿
            </button>
          </>
        ) : null}
      </div>

      {credits ? (
        <p className="note">
          还有 {credits.balance} credit。{credits.balance < credits.price ? " 这一张不够了。" : ""}
        </p>
      ) : null}

      {consentGap ? <FaceNotice gap={consentGap} busy={agreeing} onAgree={agree} /> : null}

      {status === "ready" ? (
        <p className="note">
          这一组，拍好了。
          {remainingToday !== null && remainingToday <= 5
            ? ` 今天还能拍 ${remainingToday} 张。`
            : ""}
        </p>
      ) : null}
      {note ? (
        <p className="note" data-tone={status === "error" ? "error" : undefined}>
          {note}
          {needsSignIn ? (
            <>
              {" "}
              <a href="/me">进入</a>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="studio-frame">
        {preview ? <img className="portrait" src={preview} alt="上传的本人照片" /> : null}
        {resultUrl ? <img className="portrait" src={resultUrl} alt="拍好的一张" /> : null}
      </div>
    </div>
  );
}
