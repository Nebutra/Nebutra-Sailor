"use client";

import { useRef } from "react";
import {
  ACCENT_ACTIVE_CLASSES,
  type CommandMode,
  MODES,
  useCommandMode,
} from "./command-mode-context";

/**
 * Mode pills — WAI-ARIA radiogroup with full keyboard support.
 *
 * Keyboard model (matches WAI-ARIA radio pattern):
 *   ←/↑    move to previous mode (wraps)
 *   →/↓    move to next mode (wraps)
 *   Home   first mode
 *   End    last mode
 *   Space  activate current focused mode (Enter also fires onClick natively)
 *
 * The `tabIndex={isActive ? 0 : -1}` roving tab-index focuses only the
 * currently-selected pill — Tab into the group lands on the active one.
 */
export function ModePills() {
  const { mode, setMode } = useCommandMode();
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const focusByIndex = (index: number) => {
    const wrapped = ((index % MODES.length) + MODES.length) % MODES.length;
    const next = MODES[wrapped];
    setMode(next.id);
    // Schedule focus after state commit so the now-tabIndex=0 button gets it.
    queueMicrotask(() => {
      buttonsRef.current[wrapped]?.focus();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusByIndex(currentIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusByIndex(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusByIndex(0);
        break;
      case "End":
        event.preventDefault();
        focusByIndex(MODES.length - 1);
        break;
      case " ":
        event.preventDefault();
        setMode(MODES[currentIndex].id as CommandMode);
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Command mode"
      className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max items-center gap-2 sm:w-full sm:flex-wrap sm:justify-center">
        {MODES.map((meta, index) => {
          const Icon = meta.icon;
          const isActive = mode === meta.id;
          return (
            // biome-ignore lint/a11y/useSemanticElements: visual pill group — input[type=radio] cannot host icon+label children and styled focus ring
            <button
              key={meta.id}
              ref={(el) => {
                buttonsRef.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              title={meta.description}
              onClick={() => setMode(meta.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-8 focus-visible:ring-offset-2 ${
                isActive
                  ? ACCENT_ACTIVE_CLASSES[meta.accent]
                  : "border-neutral-6 bg-neutral-1 text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/[0.08] dark:hover:text-white"
              }`}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
