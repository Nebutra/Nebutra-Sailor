export function pinScrollPosition(durationMs = 2500): void {
  if (typeof window === "undefined") return;
  const targetX = window.scrollX;
  const targetY = window.scrollY;
  const start = performance.now();
  let active = true;

  function correct() {
    if (!active) return;
    if (window.scrollX !== targetX || window.scrollY !== targetY) {
      window.scrollTo({ left: targetX, top: targetY, behavior: "instant" as ScrollBehavior });
    }
  }

  function stop() {
    if (!active) return;
    active = false;
    window.removeEventListener("wheel", release);
    window.removeEventListener("touchmove", release);
    window.removeEventListener("pointerdown", release);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", correct);
  }

  function release() {
    stop();
  }

  function onKey(e: KeyboardEvent) {
    if (
      ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"].includes(e.key)
    ) {
      stop();
    }
  }

  window.addEventListener("wheel", release, { passive: true });
  window.addEventListener("touchmove", release, { passive: true });
  window.addEventListener("pointerdown", release, { passive: true });
  window.addEventListener("keydown", onKey);
  window.addEventListener("scroll", correct, { passive: true });

  const tick = () => {
    if (!active) return;
    correct();
    if (performance.now() - start < durationMs) requestAnimationFrame(tick);
    else stop();
  };
  requestAnimationFrame(tick);
}
