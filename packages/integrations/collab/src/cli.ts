/**
 * collab CLI — `doctor` (Yjs/store/transport health) and `debug <roomId>`
 * (open a real zero-config room, apply an update, report convergence state).
 * The doctor/debug argv switch is the shared `@nebutra/capability-kit`
 * runner; only the collab-specific probes live here.
 */

import { runCapabilityCli } from "@nebutra/capability-kit";
import { getCollab } from "./index";

const hub = await getCollab();

await runCapabilityCli({
  capability: "collab",
  doctor: () => hub.doctor(),
  debug: (roomId?: string) => {
    const tenantId = "debug-tenant";
    const id = roomId ?? "debug-room";
    const room = hub.room(tenantId, id);
    const before = room.encodeState().length;
    room.doc.getText("debug").insert(0, "hello canvas");
    const after = room.encodeState().length;
    const text = room.doc.getText("debug").toString();
    room.destroy();
    return { tenantId, roomId: id, encodedBytes: { before, after }, text };
  },
});
