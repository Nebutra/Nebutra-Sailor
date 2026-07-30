import type { Metadata } from "next";

export const metadata: Metadata = { title: "SSH worktrees" };

export default function Page() {
  return (
    <>
      <h1>SSH worktrees</h1>
      <p>
        Run agents against remote machines over SSH without exposing Pebble&apos;s local control
        ports to the public internet.
      </p>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Port</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>pebble-runtime</code>
            </td>
            <td>17777</td>
          </tr>
          <tr>
            <td>
              <code>pebble serve</code> / pairing
            </td>
            <td>6768</td>
          </tr>
        </tbody>
      </table>
      <pre>
        <code>{`ssh -L 17777:127.0.0.1:17777 user@host
ssh -L 6768:127.0.0.1:6768 user@host`}</code>
      </pre>
    </>
  );
}
