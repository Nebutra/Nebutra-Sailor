/**
 * Minimal ZIP (store method only) for batch file download.
 * No external dependency — enough for bundling base64 image/PDF results.
 */

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i] ?? 0;
    c ^= byte;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  readonly name: string;
  readonly data: Buffer;
}

/** Build a ZIP archive with stored (uncompressed) entries. */
export function buildStoreZip(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
    const data = entry.data;
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length + data.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method store
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0, 12); // date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra
    name.copy(local, 30);
    data.copy(local, 30 + name.length);
    locals.push(local);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralDir, eocd]);
}

/** Extract base64 payload from common tool outputs. */
export function extractFileFromJobResult(result: unknown, fallbackName: string): ZipEntry | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const b64 =
    typeof r.base64 === "string"
      ? r.base64
      : typeof r.fileBase64 === "string"
        ? r.fileBase64
        : typeof r.pdfBase64 === "string"
          ? r.pdfBase64
          : null;
  if (!b64) return null;
  const cleaned = b64.includes(",") ? (b64.split(",").pop() ?? b64) : b64;
  let data: Buffer;
  try {
    data = Buffer.from(cleaned, "base64");
  } catch {
    return null;
  }
  if (data.length === 0) return null;

  let ext = "bin";
  const ct = typeof r.contentType === "string" ? r.contentType : "";
  if (ct.includes("png")) ext = "png";
  else if (ct.includes("jpeg") || ct.includes("jpg")) ext = "jpg";
  else if (ct.includes("webp")) ext = "webp";
  else if (ct.includes("pdf")) ext = "pdf";
  else if (fallbackName.includes(".")) {
    return { name: fallbackName.replace(/[^\w.-]+/g, "_"), data };
  }

  const base = fallbackName.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_") || "file";
  return { name: `${base}.${ext}`, data };
}
