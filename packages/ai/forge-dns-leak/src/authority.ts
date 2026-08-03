/**
 * Authoritative DNS (UDP/TCP) for the leak zone (pure Node dgram/net).
 * Logs recursive resolver source IPs for every query under the zone.
 */
import { createSocket, type Socket as UdpSocket } from "node:dgram";
import { createServer as createNetServer, type Server as NetServer } from "node:net";
import type { SessionStore } from "./sessions";

export type AuthorityServer = {
  udp: UdpSocket;
  tcp: NetServer;
  close: () => Promise<void>;
};

const TYPE_A = 1;
const TYPE_NS = 2;
const TYPE_SOA = 6;
const CLASS_IN = 1;

function encodeIpv4(ip: string): Buffer {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error(`Invalid answer IP: ${ip}`);
  }
  return Buffer.from(parts);
}

/**
 * Minimal pure-JS DNS response builder (A / NS / SOA) so we do not depend on
 * dns2's Packet helpers for packing — only for optional decode if present.
 */
function encodeName(name: string): Buffer {
  const labels = name.replace(/\.$/, "").split(".").filter(Boolean);
  const chunks: Buffer[] = [];
  for (const lab of labels) {
    const b = Buffer.from(lab, "ascii");
    chunks.push(Buffer.from([b.length]), b);
  }
  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
}

function buildResponse(opts: {
  id: number;
  qname: string;
  qtype: number;
  answerIp: string;
  zone: string;
  nsHostname: string;
  ttl: number;
}): Buffer {
  const { id, qname, qtype, answerIp, zone, nsHostname, ttl } = opts;
  const flags = 0x8400; // QR=1, AA=1, RD=0, RA=0
  const qnameBuf = encodeName(qname);
  const question = Buffer.concat([
    qnameBuf,
    Buffer.from([(qtype >> 8) & 0xff, qtype & 0xff, 0, CLASS_IN]),
  ]);

  const answers: Buffer[] = [];
  if (qtype === TYPE_A || qtype === 255 /* ANY simplified */) {
    const rdata = encodeIpv4(answerIp);
    answers.push(
      Buffer.concat([
        encodeName(qname),
        Buffer.from([0, TYPE_A, 0, CLASS_IN]),
        Buffer.from([(ttl >> 24) & 0xff, (ttl >> 16) & 0xff, (ttl >> 8) & 0xff, ttl & 0xff]),
        Buffer.from([0, rdata.length]),
        rdata,
      ]),
    );
  } else if (qtype === TYPE_NS) {
    const rdata = encodeName(nsHostname);
    answers.push(
      Buffer.concat([
        encodeName(zone),
        Buffer.from([0, TYPE_NS, 0, CLASS_IN]),
        Buffer.from([(ttl >> 24) & 0xff, (ttl >> 16) & 0xff, (ttl >> 8) & 0xff, ttl & 0xff]),
        Buffer.from([0, rdata.length]),
        rdata,
      ]),
    );
  } else if (qtype === TYPE_SOA) {
    // mname rname serial refresh retry expire minimum
    const rdata = Buffer.concat([
      encodeName(nsHostname),
      encodeName(`hostmaster.${zone}`),
      Buffer.from([0, 0, 0, 1]), // serial
      Buffer.from([0, 0, 0x0e, 0x10]), // refresh 3600
      Buffer.from([0, 0, 0x01, 0x2c]), // retry 300
      Buffer.from([0, 0x09, 0x3a, 0x80]), // expire 604800
      Buffer.from([0, 0, 0x00, 0x3c]), // minimum 60
    ]);
    answers.push(
      Buffer.concat([
        encodeName(zone),
        Buffer.from([0, TYPE_SOA, 0, CLASS_IN]),
        Buffer.from([(ttl >> 24) & 0xff, (ttl >> 16) & 0xff, (ttl >> 8) & 0xff, ttl & 0xff]),
        Buffer.from([0, rdata.length]),
        rdata,
      ]),
    );
  }

  // If unsupported type under our zone, still AA with empty answer (NOERROR)
  const ancount = answers.length;
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id & 0xffff, 0);
  header.writeUInt16BE(flags, 2);
  header.writeUInt16BE(1, 4); // QDCOUNT
  header.writeUInt16BE(ancount, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(0, 10);

  return Buffer.concat([header, question, ...answers]);
}

function parseQuery(buf: Buffer): { id: number; qname: string; qtype: number } | null {
  if (buf.length < 12) return null;
  const id = buf.readUInt16BE(0);
  let offset = 12;
  const labels: string[] = [];
  while (offset < buf.length) {
    const len = buf[offset] ?? 0;
    if (len === 0) {
      offset += 1;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      // compression in question is rare; abort
      return null;
    }
    offset += 1;
    if (offset + len > buf.length) return null;
    labels.push(buf.subarray(offset, offset + len).toString("ascii"));
    offset += len;
  }
  if (offset + 4 > buf.length) return null;
  const qtype = buf.readUInt16BE(offset);
  // qclass = buf.readUInt16BE(offset + 2);
  const qname = labels.join(".");
  return { id, qname, qtype };
}

export async function startAuthority(
  store: SessionStore,
  opts: {
    host?: string;
    port?: number;
    nsHostname: string;
    ttlSec?: number;
  },
): Promise<AuthorityServer> {
  const host = opts.host ?? "0.0.0.0";
  const port = opts.port ?? 5353;
  const ttl = opts.ttlSec ?? 30;
  const nsHostname = opts.nsHostname.replace(/\.$/, "").toLowerCase();

  const handle = (msg: Buffer, rinfo: { address: string; port: number }): Buffer | null => {
    const q = parseQuery(msg);
    if (!q) return null;
    if (!store.isAuthoritative(q.qname)) {
      // REFUSED
      const header = Buffer.alloc(12);
      header.writeUInt16BE(q.id, 0);
      header.writeUInt16BE(0x8005, 2); // QR + REFUSED
      header.writeUInt16BE(0, 4);
      return header;
    }
    store.recordQuery(q.qname, rinfo.address);
    return buildResponse({
      id: q.id,
      qname: q.qname,
      qtype: q.qtype,
      answerIp: store.answer,
      zone: store.zoneName,
      nsHostname,
      ttl,
    });
  };

  const udp = createSocket("udp4");
  await new Promise<void>((resolve, reject) => {
    udp.once("error", reject);
    udp.bind(port, host, () => resolve());
  });
  const bound = udp.address();
  const listenPort = typeof bound === "object" ? bound.port : port;
  udp.on("message", (msg: Buffer, rinfo) => {
    try {
      const res = handle(msg, rinfo);
      if (res) udp.send(res, rinfo.port, rinfo.address);
    } catch {
      /* drop */
    }
  });

  const tcp = createNetServer((socket) => {
    let buf = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, Buffer.from(chunk)]);
      while (buf.length >= 2) {
        const len = buf.readUInt16BE(0);
        if (buf.length < 2 + len) break;
        const msg = buf.subarray(2, 2 + len);
        buf = buf.subarray(2 + len);
        try {
          const res = handle(Buffer.from(msg), {
            address: socket.remoteAddress ?? "0.0.0.0",
            port: socket.remotePort ?? 0,
          });
          if (res) {
            const out = Buffer.alloc(2 + res.length);
            out.writeUInt16BE(res.length, 0);
            res.copy(out, 2);
            socket.write(out);
          }
        } catch {
          /* drop */
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    tcp.once("error", reject);
    tcp.listen(listenPort, host, () => resolve());
  });

  return {
    udp,
    tcp,
    close: async () => {
      await Promise.all([
        new Promise<void>((r) => udp.close(() => r())),
        new Promise<void>((r) => tcp.close(() => r())),
      ]);
    },
  };
}
