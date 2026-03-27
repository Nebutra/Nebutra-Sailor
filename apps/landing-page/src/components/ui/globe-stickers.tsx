"use client";

import createGlobe from "cobe";
import { useCallback, useEffect, useRef } from "react";

interface StickerMarker {
  id: string;
  location: [number, number];
  sticker: React.ReactNode;
}

interface GlobeStickersProps {
  markers?: StickerMarker[];
  className?: string;
  speed?: number;
}

const defaultMarkers: StickerMarker[] = [
  { id: "paris", location: [48.86, 2.35], sticker: "🥐" },
  { id: "tokyo", location: [35.68, 139.65], sticker: "🗼" },
  { id: "nyc", location: [40.71, -74.01], sticker: "🍎" },
  { id: "rio", location: [-22.91, -43.17], sticker: "🎭" },
  { id: "sydney", location: [-33.87, 151.21], sticker: "🐨" },
  { id: "cairo", location: [30.04, 31.24], sticker: "🐪" },
  { id: "rome", location: [41.9, 12.5], sticker: "🍕" },
  { id: "mexico", location: [19.43, -99.13], sticker: "🌮" },
  { id: "india", location: [28.61, 77.21], sticker: "🐘" },
  { id: "iceland", location: [64.15, -21.94], sticker: "🧊" },
  { id: "london", location: [51.51, -0.13], sticker: "☕" },
  { id: "hawaii", location: [21.31, -157.86], sticker: "🏄" },
  { id: "amsterdam", location: [52.37, 4.9], sticker: "🚲" },
  { id: "beijing", location: [39.9, 116.4], sticker: "🐉" },
  { id: "moscow", location: [55.75, 37.62], sticker: "🪆" },
  { id: "seoul", location: [37.57, 126.98], sticker: "🎮" },
];

// Exact 3D to 2D Orthographic Projection matching cobe's GLSL rotation matrix
const getMarkerCoordinates = (
  lat: number,
  lon: number,
  width: number,
  phi: number,
  theta: number,
) => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180 - Math.PI;

  const x = -Math.cos(latRad) * Math.cos(lonRad);
  const y = Math.sin(latRad);
  const z = Math.cos(latRad) * Math.sin(lonRad);

  const c = Math.cos(theta);
  const d = Math.cos(phi);
  const e = Math.sin(theta);
  const f = Math.sin(phi);

  const lx = d * x + f * z;
  const ly = f * e * x + c * y - d * e * z;
  const lz = -(f * c) * x + e * y + d * c * z;

  const px = (0.8 * lx + 1) * (width / 2);
  const py = (1 - 0.8 * ly) * (width / 2);

  return { px, py, opacity: Math.max(0, Math.min(1, lz * 5 + 0.5)) };
};

export function GlobeStickers({
  markers = defaultMarkers,
  className = "",
  speed = 0.003,
}: GlobeStickersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const markerRefs = useRef<Array<HTMLDivElement | null>>([]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let phi = 0;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 1.5,
        mapSamples: Math.min(60000, 16000), // Ensures high density
        mapBrightness: 8,
        baseColor: [1, 1, 1],
        markerColor: [0.39, 0.4, 0.94], // primary mapped to RGB approx
        glowColor: [0.94, 0.93, 0.91],
        markers: markers.map((m) => ({ location: m.location, size: 0.04, id: m.id })),
        opacity: 0.8,
        onRender: (state) => {
          if (!isPausedRef.current) phi += speed;
          state.phi = phi + phiOffsetRef.current + dragOffset.current.phi;
          state.theta = 0.2 + thetaOffsetRef.current + dragOffset.current.theta;

          const w = canvas.offsetWidth;
          state.width = w * 2;
          state.height = w * 2;

          markers.forEach((m, i) => {
            const coords = getMarkerCoordinates(
              m.location[0],
              m.location[1],
              w,
              state.phi,
              state.theta,
            );
            const el = markerRefs.current[i];
            if (el) {
              el.style.transform = `translate(${coords.px}px, ${coords.py}px) translateX(-50%) translateY(-50%) rotate(${[-8, 6, -4, 10][i % 4]}deg)`;
              el.style.opacity = coords.opacity.toString();
              el.style.pointerEvents = coords.opacity > 0.5 ? "auto" : "none";
            }
          });
        },
      });

      setTimeout(() => canvas && (canvas.style.opacity = "1"));
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0] && entries[0].contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (globe) {
        globe.destroy();
        globe = null;
      }
    };
  }, [markers, speed]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="sticker-outline">
            <feMorphology in="SourceAlpha" result="Dilated" operator="dilate" radius="2" />
            <feFlood floodColor="#ffffff" result="OutlineColor" />
            <feComposite in="OutlineColor" in2="Dilated" operator="in" result="Outline" />
            <feMerge>
              <feMergeNode in="Outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          contain: "layout paint size",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
      {markers.map((m, i) => (
        <div
          key={m.id}
          ref={(el) => {
            markerRefs.current[i] = el;
          }}
          className="group"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            fontSize: "1.75rem",
            lineHeight: 1,
            filter: "url(#sticker-outline) drop-shadow(0 2px 3px rgba(0,0,0,0.15))",
            opacity: 0,
            willChange: "transform, opacity",
            transition: "filter 0.3s, transform 0.05s linear",
            cursor: "pointer",
          }}
        >
          <div className="group-hover:scale-125 transition-transform duration-300">{m.sticker}</div>
        </div>
      ))}
    </div>
  );
}
