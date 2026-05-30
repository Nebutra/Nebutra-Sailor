"use client";

import { useEffect } from "react";

import { useAppearance } from "./store";

export default function AppearanceVarsProvider(): null {
  const [state] = useAppearance();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.style.setProperty("--user-ui-font-size", `${state.uiFontSize}px`);
    root.style.setProperty("--user-code-font-size", `${state.codeFontSize}px`);

    root.classList.toggle("surface-translucent", state.transparency);

    root.dataset.accent = state.accent;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const reduce = state.motion === "off" || (state.motion === "system" && prefersReduced);
    const allow = state.motion === "on";

    root.classList.toggle("motion-reduce", reduce);
    root.classList.toggle("motion-allow", allow);
  }, [state]);

  useEffect(() => {
    if (state.motion !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      const root = document.documentElement;
      root.classList.toggle("motion-reduce", mq.matches);
      root.classList.toggle("motion-allow", false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [state.motion]);

  return null;
}
