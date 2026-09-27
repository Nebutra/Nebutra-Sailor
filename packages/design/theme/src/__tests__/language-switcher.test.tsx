/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useDesignLanguage } from "../language-switcher";

/**
 * A page may put its own Brand Package on <html> (the Nebutra site, or the
 * Studio look on the preview site). Mounting the switcher with no choice made
 * used to write "factory" and delete it.
 */
function Probe() {
  useDesignLanguage();
  return null;
}

function mount() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<Probe />));
  return () => act(() => root.unmount());
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("useDesignLanguage", () => {
  afterEach(() => {
    delete document.documentElement.dataset.brand;
    sessionStorage.clear();
  });

  it("leaves a server-set data-brand alone when the visitor chose nothing", () => {
    document.documentElement.dataset.brand = "studio";
    const unmount = mount();
    expect(document.documentElement.dataset.brand).toBe("studio");
    unmount();
  });

  it("still restores a language the visitor chose", () => {
    sessionStorage.setItem("nebutra.design.brand", "linear");
    const unmount = mount();
    expect(document.documentElement.dataset.brand).toBe("linear");
    unmount();
  });
});
