// jsdom ships no ResizeObserver / DOMMatrix / matchMedia; xyflow probes for
// them on mount. Minimal no-op shims keep the render smoke test honest
// without a heavy browser-emulation dependency.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof globalThis.DOMMatrixReadOnly === "undefined") {
  globalThis.DOMMatrixReadOnly = class {
    m22 = 1;
  } as unknown as typeof DOMMatrixReadOnly;
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
