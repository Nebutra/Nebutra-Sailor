"use client";

import { useMemo, useState } from "react";
import { listIdPhotoSkus, toPublicIdPhoto } from "@/catalog/skus";

type Status = "idle" | "shooting" | "ready" | "error";

export function IdPhotoStudio({ initialSkuId }: { initialSkuId?: string }) {
  const skus = useMemo(() => listIdPhotoSkus().map(toPublicIdPhoto), []);
  const [skuId, setSkuId] = useState(
    () => (skus.some((sku) => sku.id === initialSkuId) ? initialSkuId : skus[0]?.id) ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState("");

  const selected = skus.find((sku) => sku.id === skuId);

  function onPick(next: File | null) {
    setFile(next);
    setResultUrl(null);
    setStatus("idle");
    setNote("");
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function shoot() {
    if (!file || !skuId) {
      setStatus("error");
      setNote("先选一张本人照片。");
      return;
    }

    setStatus("shooting");
    setNote("");
    const body = new FormData();
    body.set("skuId", skuId);
    body.set("file", file);

    try {
      const response = await fetch("/api/moments/id-photo", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        setStatus("error");
        setNote(
          response.status === 404
            ? "这一规格暂时不开放。"
            : response.status === 503
              ? "这一刻还存不进去。"
              : "这张照片观澜看不清。",
        );
        return;
      }
      const moment = (await response.json()) as { url?: string };
      if (!moment.url) {
        setStatus("error");
        setNote("这一刻没留下。再试一次。");
        return;
      }
      setResultUrl(moment.url);
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
                setResultUrl(null);
                setStatus("idle");
              }}
            >
              <img
                src={sku.sample}
                alt={`${sku.title}${sku.subtitle}样例`}
                width={sku.widthPx}
                height={sku.heightPx}
              />
              <span className="sku-name">
                {sku.title} · {sku.subtitle}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <p className="note">
          {selected.widthMm} × {selected.heightMm} mm · {selected.dpi} dpi · {selected.widthPx} ×{" "}
          {selected.heightPx}
          {selected.garmentId ? (
            <>
              {" · "}
              <a href="/wardrobe">衣柜</a>
            </>
          ) : null}
        </p>
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
            <a className="pill pill-ghost" href={resultUrl} download={`kuanlan-${skuId}.png`}>
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

      {status === "ready" ? <p className="note">这一组，拍好了。</p> : null}
      {note ? (
        <p className="note" data-tone={status === "error" ? "error" : undefined}>
          {note}
        </p>
      ) : null}

      <div className="studio-frame">
        {preview ? <img className="portrait" src={preview} alt="上传的本人照片" /> : null}
        {resultUrl ? <img className="portrait" src={resultUrl} alt="拍好的一张" /> : null}
      </div>
    </div>
  );
}
