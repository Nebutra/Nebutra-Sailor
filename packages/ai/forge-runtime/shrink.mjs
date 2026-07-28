import { readdir, readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = "/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/docs/research/forge";
let before = 0,
  after = 0,
  n = 0;
for (const dir of await readdir(ROOT)) {
  for (const f of await readdir(join(ROOT, dir))) {
    if (!/\.(webp|jpg)$/.test(f)) continue;
    const src = join(ROOT, dir, f);
    const buf = await readFile(src);
    const meta = await sharp(buf, { limitInputPixels: false }).metadata();
    before += (await stat(src)).size;
    // Captures are deviceScaleFactor 2. 1440px wide reads layout fine at half the pixels.
    const pipeline = sharp(buf, { limitInputPixels: false });
    if ((meta.width ?? 0) > 1440) pipeline.resize({ width: 1440, withoutEnlargement: true });
    const out = join(ROOT, dir, f.replace(/\.(webp|jpg)$/, ".tmp.webp"));
    let dst = src.replace(/\.(webp|jpg)$/, ".webp");
    try {
      await pipeline.webp({ quality: 88, effort: 5 }).toFile(out);
    } catch {
      dst = src.replace(/\.(webp|jpg)$/, ".jpg");
      await sharp(buf, { limitInputPixels: false })
        .resize({ width: 1440, withoutEnlargement: true })
        .jpeg({ quality: 84, mozjpeg: true })
        .toFile(out);
    }
    await unlink(src);
    const { rename } = await import("node:fs/promises");
    await rename(out, dst);
    after += (await stat(dst)).size;
    n += 1;
  }
}
process.stdout.write(
  `${n} files  ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(1)}MB\n`,
);
