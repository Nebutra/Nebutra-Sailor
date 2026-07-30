import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mobile companion",
};

export default function DocsMobilePage() {
  return (
    <>
      <h1>Mobile companion</h1>
      <p>
        Monitor and steer agents from your phone — get notified when a run finishes and send
        follow-ups from anywhere.
      </p>
      <ul>
        <li>
          <strong>iOS:</strong>{" "}
          <a href="https://apps.apple.com/us/app/pebble-ide/id6766130217">App Store</a> ·{" "}
          <a href="https://testflight.apple.com/join/YjeGMQBA">TestFlight</a>
        </li>
        <li>
          <strong>Android:</strong> APK builds ship on{" "}
          <a href="https://github.com/Nebutra/pebble/releases">GitHub Releases</a>
        </li>
      </ul>
      <p>
        Pairing uses the local Pebble runtime (<code>pebble serve</code>, default port{" "}
        <strong>6768</strong> on <code>127.0.0.1</code>). Public mobile traffic never exposes that
        port; reach remote desktops over SSH tunnels when needed.
      </p>
      <pre>
        <code>{`ssh -L 6768:127.0.0.1:6768 user@host`}</code>
      </pre>
    </>
  );
}
