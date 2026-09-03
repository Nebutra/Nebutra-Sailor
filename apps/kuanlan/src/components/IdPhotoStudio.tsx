"use client";

import { useEffect, useMemo, useState } from "react";
import { listIdPhotoSkus, parseIdPhotoRef, toPublicIdPhoto } from "@/catalog/skus";
import { FaceNotice } from "@/components/FaceNotice";
import type { ConsentGap } from "@/lib/consent";

type Status = "idle" | "shooting" | "ready" | "error";

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
  const [agreeing, setAgreeing] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const selected = skus.find((sku) => sku.id === skuId);
  const selectedSize = selected?.sizes.find((size) => size.id === sizeId) ?? selected?.sizes[0];

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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
      const moment = (await response.json()) as { url?: string; remainingToday?: number };
      if (!moment.url) {
        setStatus("error");
        setNote("这一刻没留下。再试一次。");
        return;
      }
      setResultUrl(moment.url);
      setRemainingToday(typeof moment.remainingToday === "number" ? moment.remainingToday : null);
      setStatus("ready");
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
          {status === "shooting" ? "在拍…" : "开拍"}
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
