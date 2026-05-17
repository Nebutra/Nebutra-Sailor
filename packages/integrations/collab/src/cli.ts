/**
 * collab CLI — `doctor` (Yjs/store/transport health) and `debug <roomId>`
 * (open a real zero-config room, apply an update, report convergence state).
 * Mirrors the Sailor capability-CLI convention (see trace-store/src/cli.ts).
 */

import { getCollab } from "./index";

const command = process.argv[2] ?? "doctor";
const hub = await getCollab();

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "collab", ...(await hub.doctor()) }, null, 2)}\n`,
  );
} else if (command === "debug") {
  const roomId = process.argv[3] ?? "debug-room";
  const tenantId = "debug-tenant";
  const room = hub.room(tenantId, roomId);
  const before = room.encodeState().length;
  room.doc.getText("debug").insert(0, "hello canvas");
  const after = room.encodeState().length;
  process.stdout.write(
    `${JSON.stringify(
      {
        capability: "collab",
        tenantId,
        roomId,
        encodedBytes: { before, after },
        text: room.doc.getText("debug").toString(),
      },
      null,
      2,
    )}\n`,
  );
  room.destroy();
} else {
  process.stderr.write(`Unknown collab command: ${command}\n`);
  process.exitCode = 1;
}
