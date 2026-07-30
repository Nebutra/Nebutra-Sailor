import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terminal" };

export default function Page() {
  return (
    <>
      <h1>Terminal</h1>
      <p>
        Pebble embeds Ghostty-class terminals with WebGL rendering, infinite splits, and scrollback
        that survives restarts.
      </p>
      <p>
        Terminal sessions stay owned by the Go runtime control plane; the desktop shell is the
        surface, not a second PTY host.
      </p>
    </>
  );
}
