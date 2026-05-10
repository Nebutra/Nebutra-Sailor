"use client";

import createGlobe, { type COBEOptions } from "cobe";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

export type GlobeMarker = {
  location: [number, number];
  size: number;
};

export interface GlobeConfig {
  /** Globe width in pixels */
  width?: number;
  /** Globe height in pixels */
  height?: number;
  /** Device pixel ratio */
  devicePixelRatio?: number;
  /** Initial phi rotation */
  phi?: number;
  /** Initial theta rotation */
  theta?: number;
  /** Dark mode (0-1) */
  dark?: number;
  /** Diffuse lighting */
  diffuse?: number;
  /** Map sample count for detail */
  mapSamples?: number;
  /** Map brightness */
  mapBrightness?: number;
  /** Base color RGB (0-1) */
  baseColor?: [number, number, number];
  /** Marker color RGB (0-1) */
  markerColor?: [number, number, number];
  /** Glow color RGB (0-1) */
  glowColor?: [number, number, number];
  /** Array of markers to display */
  markers?: GlobeMarker[];
}

export interface GlobeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Globe configuration */
  config?: GlobeConfig;
  /** Auto-rotation speed (set to 0 to disable) */
  rotationSpeed?: number;
}

const DEFAULT_CONFIG: GlobeConfig = {
  width: 800,
  height: 800,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
};

/**
 * Globe - Interactive 3D globe visualization
 *
 * A WebGL-powered 3D globe with markers, rotation, and drag interaction.
 * Requires the `cobe` library.
 *
 * @example
 * ```tsx
 * <Globe
 *   config={{
 *     markers: [
 *       { location: [40.7128, -74.006], size: 0.1 }, // NYC
 *       { location: [51.5074, -0.1278], size: 0.08 }, // London
 *     ],
 *     markerColor: [0.1, 0.8, 1],
 *   }}
 * />
 * ```
 */
export function Globe({ className, config, rotationSpeed = 0.005, ...props }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef((config?.phi ?? DEFAULT_CONFIG.phi) || 0);
  const widthRef = useRef(0);
  const [r, setR] = useState(0);

  // Store config and rotationSpeed in refs so onRender always sees latest values
  const configRef = useRef(config);
  configRef.current = config;
  const rotationSpeedRef = useRef(rotationSpeed);
  rotationSpeedRef.current = rotationSpeed;
  const rRef = useRef(r);
  rRef.current = r;

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      setR(delta / 200);
    }
  };

  const onRender = useCallback((state: Record<string, unknown>) => {
    if (pointerInteracting.current === null) phiRef.current += rotationSpeedRef.current;
    state.phi = phiRef.current + rRef.current;
    state.width = widthRef.current * 2;
    state.height = widthRef.current * 2;
  }, []);

  const onResize = useCallback(() => {
    if (canvasRef.current) {
      widthRef.current = canvasRef.current.offsetWidth;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();

    const mergedConfig = { ...DEFAULT_CONFIG, ...configRef.current };
    const cobeConfig = {
      ...mergedConfig,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      onRender,
    } as COBEOptions;

    if (!canvasRef.current) return;
    const globe = createGlobe(canvasRef.current, cobeConfig);

    const timer = setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [onRender, onResize]);

  return (
    <div
      className={cn("absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]", className)}
      {...props}
    >
      <canvas
        className="size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        ref={canvasRef}
        onPointerDown={(e) =>
          updatePointerInteraction(e.clientX - pointerInteractionMovement.current)
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) => e.touches[0] && updateMovement(e.touches[0].clientX)}
      />
    </div>
  );
}

Globe.displayName = "Globe";
