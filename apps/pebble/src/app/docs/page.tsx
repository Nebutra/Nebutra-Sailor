import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs",
  description: "Pebble product documentation",
};

export default function DocsHomePage() {
  return (
    <>
      <h1>Pebble</h1>
      <p>
        Pebble is Nebutra&apos;s AI orchestrator for builders: run Codex, Claude Code, OpenCode, and
        more side-by-side in isolated git worktrees from one desktop surface.
      </p>

      <h2>Where things live</h2>
      <table>
        <thead>
          <tr>
            <th>Surface</th>
            <th>Host</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Product / download</td>
            <td>
              <a href="https://pebble.nebutra.com">pebble.nebutra.com</a>
            </td>
          </tr>
          <tr>
            <td>These docs</td>
            <td>
              <a href="https://pebble.nebutra.com/docs">pebble.nebutra.com/docs</a>
            </td>
          </tr>
          <tr>
            <td>Feedback &amp; diagnostics API</td>
            <td>
              <code>https://api.nebutra.com/pebble/*</code>
            </td>
          </tr>
          <tr>
            <td>Status</td>
            <td>
              <a href="https://status.nebutra.com">status.nebutra.com</a>
            </td>
          </tr>
          <tr>
            <td>Source &amp; releases</td>
            <td>
              <a href="https://github.com/Nebutra/pebble">github.com/Nebutra/pebble</a>
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        The brand front has no product database. Machine endpoints use the shared platform API under
        the <code>/pebble</code> prefix.
      </p>

      <h2>Start here</h2>
      <ul>
        <li>
          <a href="/download">Download</a>
        </li>
        <li>
          <a href="/docs/mobile">Mobile companion</a>
        </li>
        <li>
          <a href="/docs/model/worktrees">Parallel worktrees</a>
        </li>
        <li>
          <a href="/docs/terminal">Terminal</a>
        </li>
        <li>
          <a href="/docs/telemetry">Privacy &amp; telemetry</a>
        </li>
      </ul>
    </>
  );
}
