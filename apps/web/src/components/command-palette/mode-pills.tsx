"use client";

import { ACCENT_ACTIVE_CLASSES, MODES, useCommandMode } from "./command-mode-context";

export function ModePills() {
  const { mode, setMode } = useCommandMode();

  return (
    <div
      role="radiogroup"
      aria-label="Command mode"
      className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max items-center gap-2 sm:w-full sm:flex-wrap sm:justify-center">
        {MODES.map((meta) => {
          const Icon = meta.icon;
          const isActive = mode === meta.id;
          return (
            // biome-ignore lint/a11y/useSemanticElements: visual pill group — input[type=radio] cannot host icon+label children and styled focus ring
            <button
              key={meta.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              title={meta.description}
              onClick={() => setMode(meta.id)}
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
