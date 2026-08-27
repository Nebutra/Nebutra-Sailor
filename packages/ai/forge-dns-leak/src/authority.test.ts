import { createSocket } from "node:dgram";
import { describe, expect, it } from "vitest";
import { startAuthority } from "./authority";
import { SessionStore } from "./sessions";

function encodeQuery(name: string, type = 1): Buffer {
  const labels = name.split(".").filter(Boolean);
  const nameParts: Buffer[] = [];
  for (const lab of labels) {
    const b = Buffer.from(lab, "ascii");
    nameParts.push(Buffer.from([b.length]), b);
  }
  nameParts.push(Buffer.from([0]));
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0x1234, 0);
  header.writeUInt16BE(0x0100, 2); // RD
  header.writeUInt16BE(1, 4);
  const q = Buffer.concat([...nameParts, Buffer.from([0, type, 0, 1])]);
  return Buffer.concat([header, q]);
}

describe("authority DNS", () => {
  it("answers A and records recursive IP", async () => {
    const store = new SessionStore({ zone: "leak.test", answerIp: "203.0.113.9" });
    const session = store.create({ probeCount: 4 });
    const auth = await startAuthority(store, {
      host: "127.0.0.1",
      port: 0, // ephemeral — dgram bind 0
      nsHostname: "ns1.leak.test",
    });
    // udp.address() after bind
    const addr = auth.udp.address();
    const port = typeof addr === "object" ? addr.port : 0;
    expect(port).toBeGreaterThan(0);

    const name = session.probeNames[0] ?? "";
    expect(name).toBeTruthy();
    const client = createSocket("udp4");
    const reply = await new Promise<Buffer>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), 3_000);
      client.once("message", (msg) => {
        clearTimeout(t);
        resolve(msg);
      });
      client.send(encodeQuery(name), port, "127.0.0.1", (err) => {
        if (err) {
          clearTimeout(t);
          reject(err);
        }
      });
    });
    client.close();
    await auth.close();

    expect(reply.readUInt16BE(0)).toBe(0x1234);
    expect(reply.readUInt16BE(2) & 0x8400).toBe(0x8400); // QR+AA
    const got = store.get(session.id);
    expect(got?.ready).toBe(true);
    expect(got?.resolvers.some((r) => r.ip === "127.0.0.1")).toBe(true);
  });
});
