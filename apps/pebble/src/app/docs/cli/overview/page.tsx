import type { Metadata } from "next";

export const metadata: Metadata = { title: "CLI overview" };

export default function Page() {
  return (
    <>
      <h1>CLI overview</h1>
      <p>
        The <code>pebble</code> CLI scripts workspaces, agents, and automation from the terminal.
        Install paths follow the desktop release channel (Homebrew cask, AppImage, etc.).
      </p>
      <pre>
        <code>pebble --help</code>
      </pre>
    </>
  );
}
