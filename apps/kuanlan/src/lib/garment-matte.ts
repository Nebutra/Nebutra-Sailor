import sharp from "sharp";

export type MattePaperOptions = {
  maxDistance?: number;
  feather?: number;
  choke?: number;
};

function colorDistance(a: readonly number[], b: readonly number[]): number {
  const dr = (a[0] ?? 0) - (b[0] ?? 0);
  const dg = (a[1] ?? 0) - (b[1] ?? 0);
  const db = (a[2] ?? 0) - (b[2] ?? 0);
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleSeed(data: Buffer, width: number, height: number, channels: number): number[] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const acc = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    r += data[i] ?? 0;
    g += data[i + 1] ?? 0;
    b += data[i + 2] ?? 0;
    n += 1;
  };
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      acc(x, y);
      acc(width - 1 - x, y);
      acc(x, height - 1 - y);
      acc(width - 1 - x, height - 1 - y);
    }
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/**
 * Punch a connected paper backdrop to alpha.
 * Walks from the frame edge so a white collar inside the garment stays opaque.
 */
export async function matteConnectedBackground(
  input: Buffer,
  options: MattePaperOptions = {},
): Promise<Buffer> {
  const maxDistance = options.maxDistance ?? 22;
  const feather = options.feather ?? 3;
  const choke = options.choke ?? 2;
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const seed = sampleSeed(data, width, height, channels);
  const mark = new Uint8Array(width * height);
  const queue: number[] = [];

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const idx = y * width + x;
    if (mark[idx]) {
      return;
    }
    const i = idx * channels;
    const pixel = [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
    if (colorDistance(pixel, seed) > maxDistance) {
      return;
    }
    mark[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop();
    if (idx === undefined) {
      break;
    }
    const x = idx % width;
    const y = Math.floor(idx / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  if (choke > 0) {
    const grown = new Uint8Array(mark);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!mark[y * width + x]) {
          continue;
        }
        for (let dy = -choke; dy <= choke; dy += 1) {
          for (let dx = -choke; dx <= choke; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              continue;
            }
            grown[ny * width + nx] = 1;
          }
        }
      }
    }
    mark.set(grown);
  }

  const out = Buffer.from(data);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const alphaIndex = idx * channels + 3;
      if (mark[idx]) {
        out[alphaIndex] = 0;
        continue;
      }
      if (feather <= 0) {
        continue;
      }
      let nearest = feather + 1;
      for (let dy = -feather; dy <= feather; dy += 1) {
        for (let dx = -feather; dx <= feather; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          if (mark[ny * width + nx]) {
            nearest = Math.min(nearest, Math.hypot(dx, dy));
          }
        }
      }
      if (nearest <= feather) {
        out[alphaIndex] = Math.round(255 * (nearest / (feather + 0.01)));
      }
    }
  }

  return sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
