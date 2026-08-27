import { BrowserControl, readBrowserDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const browser = BrowserControl.local({ tenantId: process.env.NEBUTRA_TENANT_ID ?? "local" });

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "browser-control", results: await browser.doctor() }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "browser-control", entries: await readBrowserDebug() }, null, 2)}\n`,
  );
} else if (command === "replay") {
  const sessionId = process.argv[3];
  if (!sessionId) {
    process.stderr.write("Usage: pnpm browser:replay <session_id>\n");
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `${JSON.stringify({ capability: "browser-control", result: await browser.replay(sessionId) }, null, 2)}\n`,
    );
  }
} else if (command === "profile") {
  const tenant = process.argv[3] ?? process.env.NEBUTRA_TENANT_ID ?? "local";
  process.stdout.write(
    `${JSON.stringify(
      {
        capability: "browser-control",
        tenant,
        profile: `.nebutra/browser-control/${tenant}`,
        suggestion:
          "Browser profiles are content-store backed; connect the browser sidecar before mutating cookies.",
      },
      null,
      2,
    )}\n`,
  );
} else {
  process.stderr.write(`Unknown browser-control command: ${command}\n`);
  process.exitCode = 1;
}
