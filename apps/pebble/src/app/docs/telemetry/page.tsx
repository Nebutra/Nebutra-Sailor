import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy & telemetry" };

export default function Page() {
  return (
    <>
      <h1>Privacy &amp; telemetry</h1>
      <p>
        Desktop telemetry is anonymous product analytics (PostHog Cloud) plus error/crash reporting
        (Sentry Cloud). Ordinary product feedback is private support data.
      </p>
      <table>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Destination</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Product analytics</td>
            <td>PostHog Cloud (opt-out in settings)</td>
          </tr>
          <tr>
            <td>Errors / crashes</td>
            <td>Sentry Cloud</td>
          </tr>
          <tr>
            <td>In-app feedback</td>
            <td>
              <code>POST https://api.nebutra.com/pebble/v1/feedback</code>
            </td>
          </tr>
          <tr>
            <td>Diagnostics bundles</td>
            <td>
              <code>POST https://api.nebutra.com/pebble/diagnostics/*</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Diagnostics uploads are capped (4 MiB), tokenized (short-lived, single-use), rate-limited
        per IP, and retained for 30 days unless deleted earlier.
      </p>
      <p>
        Opt out of product analytics in <strong>Settings → Privacy</strong>. Set{" "}
        <code>PEBBLE_DIAGNOSTICS_DISABLED=1</code> to disable diagnostic bundle collection.
      </p>
    </>
  );
}
