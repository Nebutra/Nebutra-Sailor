"use client";

import { buildAuthCenterSignInUrl } from "@nebutra/auth/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useState } from "react";
import { listIdPhotoSkus, toPublicIdPhoto } from "@/catalog/skus";
import { createFilterHref, openShoot, parseShootSearch, reduceShoot, shootHref } from "@/lib/shoot";
import { clearShootSource, restoreShootSource, stashShootSource } from "@/lib/shoot-source";

export function IdPhotoStudio({
  initialSkuId,
  initialSizeId,
  initialQuery,
}: {
  initialSkuId?: string;
  initialSizeId?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const skus = useMemo(() => listIdPhotoSkus().map((sku) => toPublicIdPhoto(sku)), []);
  const initial = parseShootSearch({ sku: initialSkuId, size: initialSizeId });
  const [shoot, dispatch] = useReducer(reduceShoot, initial, openShoot);
  const [file, setFile] = useState<File | null>(null);

  const selected = skus.find((sku) => sku.id === shoot.skuId);
  const selectedSize =
    selected?.sizes.find((size) => size.id === shoot.sizeId) ?? selected?.sizes[0];

  useEffect(() => {
    const href = shootHref({ skuId: shoot.skuId, sizeId: shoot.sizeId }, { q: initialQuery });
    if (`${window.location.pathname}${window.location.search}` !== href) {
      router.replace(href, { scroll: false });
    }
  }, [initialQuery, router, shoot.skuId, shoot.sizeId]);

  useEffect(() => {
    let alive = true;
    void restoreShootSource().then((stashed) => {
      if (!alive || !stashed) return;
      setFile(stashed);
      dispatch({ type: "source", preview: URL.createObjectURL(stashed) });
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (shoot.sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(shoot.sourceUrl);
    };
  }, [shoot.sourceUrl]);

  function onPick(next: File | null) {
    if (shoot.sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(shoot.sourceUrl);
    setFile(next);
    if (next) {
      void stashShootSource(next);
      dispatch({ type: "source", preview: URL.createObjectURL(next) });
      return;
    }
    void clearShootSource();
    dispatch({ type: "clear-source" });
  }

  function chooseSpec(skuId: string, sizeId: string) {
    dispatch({ type: "spec", skuId, sizeId });
  }

  async function shootNow() {
    if (!file || !shoot.skuId || !selectedSize) {
      dispatch({ type: "failed" });
      return;
    }

    dispatch({ type: "shoot" });
    const body = new FormData();
    body.set("skuId", shoot.skuId);
    body.set("sizeId", selectedSize.id);
    body.set("file", file);

    try {
      const response = await fetch("/api/moments/id-photo", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        dispatch({ type: "http", status: response.status });
        return;
      }
      const moment = (await response.json()) as { url?: string; id?: string; sourceUrl?: string };
      if (!moment.url) {
        dispatch({ type: "failed" });
        return;
      }
      void clearShootSource();
      dispatch({ type: "kept", url: moment.url, id: moment.id });
    } catch {
      dispatch({ type: "failed" });
    }
  }

  const [signInHref, setSignInHref] = useState<string>();
  useEffect(() => {
    const path = shootHref({ skuId: shoot.skuId, sizeId: shoot.sizeId }, { q: initialQuery });
    setSignInHref(buildAuthCenterSignInUrl(`${window.location.origin}${path}`));
  }, [initialQuery, shoot.skuId, shoot.sizeId]);
  const emptyFail = shoot.phase === "failed" && !file;

  return (
    <div data-shoot={shoot.phase}>
      <ul className="sku-grid">
        {skus.map((sku) => (
          <li key={sku.id}>
            <button
              type="button"
              className="sku-card"
              data-sku={sku.id}
              data-active={sku.id === shoot.skuId}
              aria-pressed={sku.id === shoot.skuId}
              onClick={() => chooseSpec(sku.id, sku.sizeId)}
            >
              <span className="sku-still">
                <img
                  src={sku.sample}
                  alt={`${sku.title}${sku.subtitle}样例`}
                  width={sku.widthPx}
                  height={sku.heightPx}
                />
                {shoot.sourceUrl ? (
                  <img className="sku-source" src={shoot.sourceUrl} alt="" aria-hidden />
                ) : null}
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
                onClick={() => chooseSpec(selected.id, size.id)}
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
                <a href={createFilterHref({ view: "garment", piece: selected.garmentId })}>
                  这件衣服
                </a>
              </>
            ) : null}
          </p>
        </>
      ) : null}

      <label className="upload" data-has-file={file ? "true" : undefined}>
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
          onClick={() => void shootNow()}
          disabled={shoot.phase === "shooting"}
        >
          {shoot.phase === "shooting" ? "在拍…" : "开拍"}
        </button>
        {shoot.resultUrl ? (
          <>
            <a
              className="pill pill-ghost"
              href={shoot.resultUrl}
              download={`kuanlan-${shoot.skuId}-${selectedSize?.id ?? "print"}.png`}
            >
              留下这一张
            </a>
            <button type="button" className="pill" onClick={() => dispatch({ type: "again" })}>
              再拍一会儿
            </button>
          </>
        ) : null}
      </div>

      {shoot.note || emptyFail ? (
        <p className="note" data-tone={shoot.phase === "kept" ? undefined : "error"}>
          {emptyFail ? "先选一张本人照片。" : shoot.note}
          {shoot.phase === "needs-sign-in" && signInHref ? (
            <>
              {" "}
              <a href={signInHref}>进入</a>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="studio-frame" data-phase={shoot.phase}>
        {shoot.phase === "kept" && shoot.resultUrl ? (
          <img className="portrait" src={shoot.resultUrl} alt="拍好的一张" />
        ) : null}
        {shoot.sourceUrl ? (
          <img className="portrait" src={shoot.sourceUrl} alt="上传的本人照片" data-role="source" />
        ) : null}
      </div>
    </div>
  );
}
