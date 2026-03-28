"use client";

import { useMemo } from "react";
// HotkeyConfig is defined locally for standalone use

export type UseHotkeysOptions = Pick<
  HotkeyConfig,
  | "description"
  | "scope"
  | "enabled"
  | "preventDefault"
  | "enableOnFormTags"
  | "enableOnContentEditable"
>;

type HotkeyInput = string | HotkeyConfig | HotkeyConfig[];

/**
 * useHotkeys Hook
 *
 * 基于 react-hotkeys-hook 的注册封装，统一走 HotkeysContext。
 */
export function useHotkeys(
  input: HotkeyInput,
  callbackOrOptions?: (() => void) | UseHotkeysOptions,
  maybeOptions?: UseHotkeysOptions,
): void {
  const configs = useMemo(
    () => normalizeInput(input, callbackOrOptions, maybeOptions),
    [input, callbackOrOptions, maybeOptions],
  );

  useRegisterHotkeys(configs, [configs]);
}

// ============================================================
// Helpers
// ============================================================

function normalizeInput(
  input: HotkeyInput,
  callbackOrOptions?: (() => void) | UseHotkeysOptions,
  maybeOptions?: UseHotkeysOptions,
): HotkeyConfig[] {
  if (typeof input === "string") {
    if (typeof callbackOrOptions !== "function") {
      throw new Error("When using string key, callback must be provided");
    }
    return [
      {
        key: input,
        callback: callbackOrOptions,
        ...(maybeOptions ?? {}),
      },
    ];
  }

  if (Array.isArray(input)) {
    return input;
  }

  return [input];
}

/**
 * 检测是否为 Mac 平台
 */
export function useIsMac(): boolean {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * 格式化快捷键显示
 */
export function formatHotkey(hotkey: string, isMac: boolean = true): string {
  return hotkey
    .split(">")
    .map((part) => {
      return part
        .trim()
        .split("+")
        .map((key) => {
          const k = key.trim().toLowerCase();
          switch (k) {
            case "mod":
              return isMac ? "⌘" : "Ctrl";
            case "shift":
              return isMac ? "⇧" : "Shift";
            case "alt":
              return isMac ? "⌥" : "Alt";
            case "ctrl":
              return isMac ? "⌃" : "Ctrl";
            case "meta":
              return isMac ? "⌘" : "Win";
            case "enter":
              return "↵";
            case "escape":
              return "Esc";
            case "space":
              return "Space";
            case "backspace":
              return "⌫";
            case "delete":
              return "Del";
            case "up":
              return "↑";
            case "down":
              return "↓";
            case "left":
              return "←";
            case "right":
              return "→";
            case "tab":
              return "⇥";
            default:
              return k.toUpperCase();
          }
        })
        .join(" + ");
    })
    .join(" then ");
}
