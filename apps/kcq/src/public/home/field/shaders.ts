/**
 * WGSL for the hero light field. The technique (jump-flood distance field, radiance cascades with
 * branching factor 4 and merge-then-average) follows vercel-labs/vgpu's `radiance-cascades`
 * example (MIT, vgpu 0.5.0, apps/docs/examples/radiance-cascades). What it lights is KCQ's own:
 * capsule and box emitters fed from a storage buffer (candle wicks and bodies, the candle glyph,
 * the last-price line, the visitor's crosshair), market and Cobalt radiance, the preset surface as
 * ground, and a light-mode present that tints instead of glowing. No triangle, no warm-white
 * source, no floor grid.
 */

/** Shape layout in the storage buffer: three vec4f per emitter. */
export const SHAPE_STRIDE = 3;
export const MAX_SHAPES = 400;

/** Paints every emitter into an HDR target: RGB = linear radiance, A = occluder mask. */
export const PAINT_WGSL = /* wgsl */ `
struct Paint {
  /** x: shape count. */
  count: vec4f,
};

@group(0) @binding(0) var<uniform> paint: Paint;
@group(0) @binding(1) var<storage, read> shapes: array<vec4f>;

fn sdf_capsule(p: vec2f, a: vec2f, b: vec2f, r: f32) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

fn sdf_box(p: vec2f, lo: vec2f, hi: vec2f, r: f32) -> f32 {
  let centre = (lo + hi) * 0.5;
  let half_size = max(abs(hi - lo) * 0.5 - vec2f(r), vec2f(0.0));
  let q = abs(p - centre) - half_size;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let count = u32(paint.count.x);
  let size = paint.count.yz;
  let p = uv * size;
  var out = vec4f(0.0);
  for (var i = 0u; i < count; i = i + 1u) {
    let shape = shapes[i * 3u];
    let geo = shapes[i * 3u + 1u];
    let light = shapes[i * 3u + 2u];
    var d: f32;
    if (shape.x > 0.5) {
      d = sdf_box(p, geo.xy, geo.zw, shape.y);
    } else {
      d = sdf_capsule(p, geo.xy, geo.zw, shape.y);
    }
    // Sub-texel shapes (a 1px wick at half resolution) keep a half-covered texel instead of
    // vanishing, so every candle still lights and occludes.
    let coverage = 1.0 - smoothstep(-0.5, 0.5, d - 0.25);
    // Max, not sum: overlapping emitters keep the radiance they were painted with.
    out = max(out, vec4f(light.rgb * light.a * coverage, coverage * shape.z));
  }
  return out;
}
`;

/** Seeds the jump flood: every occluder texel points at itself. */
export const JFA_INIT_WGSL = /* wgsl */ `
@group(0) @binding(0) var emitter: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(emitter));
  let pixel = clamp(floor(uv * size), vec2f(0.0), size - 1.0);
  if (textureLoad(emitter, vec2i(pixel), 0).a > 0.5) {
    return vec4f(pixel + 0.5, 0.0, 1.0);
  }
  return vec4f(0.0);
}
`;

/** One jump-flood round over the 3×3 neighbourhood `jump` texels away. */
export const JFA_STEP_WGSL = /* wgsl */ `
struct JfaStep {
  jump: vec4f,
};

@group(0) @binding(0) var<uniform> jfa: JfaStep;
@group(0) @binding(1) var seeds: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(seeds));
  let pixel = clamp(floor(uv * size), vec2f(0.0), size - 1.0);
  let position = pixel + 0.5;
  let coord = vec2i(pixel);
  let limit = vec2i(size) - vec2i(1);
  let jump = i32(jfa.jump.x);
  var best = textureLoad(seeds, coord, 0);
  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let n = coord + vec2i(x, y) * jump;
      if (n.x < 0 || n.y < 0 || n.x > limit.x || n.y > limit.y) {
        continue;
      }
      let candidate = textureLoad(seeds, n, 0);
      if (candidate.w < 0.5) {
        continue;
      }
      if (best.w < 0.5 || distance(candidate.xy, position) < distance(best.xy, position)) {
        best = candidate;
      }
    }
  }
  return best;
}
`;

/** Converged seeds to a filterable distance field (R = distance in field texels). */
export const SDF_WGSL = /* wgsl */ `
@group(0) @binding(0) var seeds: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(seeds));
  let pixel = clamp(floor(uv * size), vec2f(0.0), size - 1.0);
  let seed = textureLoad(seeds, vec2i(pixel), 0);
  let far = length(size) * 2.0;
  return vec4f(select(far, distance(seed.xy, pixel + 0.5), seed.w >= 0.5), 0.0, 0.0, 1.0);
}
`;

const RC_COMMON = /* wgsl */ `
const TAU: f32 = 6.283185307179586;

fn rc_ray_count(cascade: f32) -> f32 { return pow(4.0, cascade + 1.0); }
fn rc_probe_spacing(cascade: f32) -> f32 { return pow(2.0, cascade); }
fn rc_block_size(cascade: f32) -> f32 { return pow(2.0, cascade + 1.0); }
fn rc_direction(index: f32, rays: f32) -> vec2f {
  let theta = TAU * (index + 0.5) / rays;
  return vec2f(cos(theta), sin(theta));
}
fn rc_atlas_decode(texel: vec2f, block: f32) -> vec3f {
  let probe = floor(texel / block);
  let slot = texel - probe * block;
  return vec3f(probe, slot.y * block + slot.x);
}
fn rc_atlas_texel(probe: vec2f, direction_index: f32, block: f32) -> vec2f {
  return probe * block + vec2f(direction_index % block, floor(direction_index / block));
}
`;

/** One cascade level: trace this interval, then merge the level above (merge-then-average). */
export const CASCADE_WGSL = /* wgsl */ `
${RC_COMMON}

struct Cascade {
  /** x: level, y: has an upper level, z: steps budget. */
  state: vec4f,
};

@group(0) @binding(0) var<uniform> rc: Cascade;
@group(0) @binding(1) var sdf_tex: texture_2d<f32>;
@group(0) @binding(2) var sdf_samp: sampler;
@group(0) @binding(3) var emitter_tex: texture_2d<f32>;
@group(0) @binding(4) var emitter_samp: sampler;
@group(0) @binding(5) var upper_tex: texture_2d<f32>;

fn field_uv(p: vec2f, size: vec2f) -> vec2f {
  let half_texel = 0.5 / size;
  return clamp(p / size, half_texel, vec2f(1.0) - half_texel);
}

fn trace(size: vec2f, origin: vec2f, direction: vec2f, t_start: f32, t_end: f32, steps: i32) -> vec4f {
  var t = t_start;
  for (var step = 0; step < steps; step = step + 1) {
    let p = origin + direction * t;
    if (p.x < -1.0 || p.y < -1.0 || p.x > size.x + 1.0 || p.y > size.y + 1.0) {
      break;
    }
    let d = textureSampleLevel(sdf_tex, sdf_samp, field_uv(p, size), 0.0).r;
    if (d <= 0.5) {
      return vec4f(textureSampleLevel(emitter_tex, emitter_samp, field_uv(p, size), 0.0).rgb, 0.0);
    }
    t = t + max(d, 0.35);
    if (t > t_end) {
      break;
    }
  }
  return vec4f(0.0, 0.0, 0.0, 1.0);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let atlas_size = vec2f(textureDimensions(upper_tex));
  let size = vec2f(textureDimensions(sdf_tex));
  let cascade = rc.state.x;
  let texel = floor(uv * atlas_size);
  let block = rc_block_size(cascade);
  let rays = rc_ray_count(cascade);
  let decoded = rc_atlas_decode(texel, block);
  let spacing = rc_probe_spacing(cascade);
  let origin = (decoded.xy + 0.5) * spacing;
  let direction = rc_direction(decoded.z, rays);
  let start = 2.0 * (pow(4.0, cascade) - 1.0) / 3.0;
  let end = start + 2.0 * pow(4.0, cascade) * 1.02;
  var radiance = trace(size, origin, direction, start, end, i32(rc.state.z));

  if (rc.state.y > 0.5) {
    let upper_block = block * 2.0;
    let upper_grid = atlas_size / upper_block;
    let position = origin / (spacing * 2.0) - 0.5;
    let base = floor(position);
    let f = clamp(position - base, vec2f(0.0), vec2f(1.0));
    var weights = array<f32, 4>((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);
    var far = vec4f(0.0);
    for (var branch = 0; branch < 4; branch = branch + 1) {
      let upper_direction = decoded.z * 4.0 + f32(branch);
      var interpolated = vec4f(0.0);
      for (var corner = 0; corner < 4; corner = corner + 1) {
        let offset = vec2f(f32(corner % 2), f32(corner / 2));
        let neighbour = clamp(base + offset, vec2f(0.0), upper_grid - vec2f(1.0));
        let coord = rc_atlas_texel(neighbour, upper_direction, upper_block);
        interpolated += weights[corner] * textureLoad(upper_tex, vec2i(coord), 0);
      }
      far += interpolated * 0.25;
    }
    radiance = vec4f(radiance.rgb + radiance.a * far.rgb, radiance.a * far.a);
  }
  return radiance;
}
`;

/**
 * Resolve cascade 0 into irradiance and composite on the preset ground. Dark mode adds light to a
 * dark surface (ACES, then sRGB once, here only). Light mode cannot add light to a near-white
 * surface, so it tints the ground toward the light's hue by the light's strength.
 */
export const PRESENT_WGSL = /* wgsl */ `
${RC_COMMON}

struct Present {
  /** rgb: ground (linear), a: 0 dark / 1 light. */
  ground: vec4f,
  /** x: exposure, y: emitter visibility. */
  tone: vec4f,
};

@group(0) @binding(0) var<uniform> present: Present;
@group(0) @binding(1) var cascade_tex: texture_2d<f32>;
@group(0) @binding(2) var emitter_tex: texture_2d<f32>;

fn aces(c: vec3f) -> vec3f {
  return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
}

fn to_srgb(c: vec3f) -> vec3f {
  let high = 1.055 * pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055;
  return select(high, c * 12.92, c <= vec3f(0.0031308));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(emitter_tex));
  let atlas_size = vec2f(textureDimensions(cascade_tex));
  let pixel = uv * size;
  let texel = vec2i(clamp(floor(pixel), vec2f(0.0), size - 1.0));
  let block = rc_block_size(0.0);
  let probe = clamp(floor(pixel), vec2f(0.0), atlas_size / block - 1.0);
  var irradiance = vec3f(0.0);
  for (var i = 0.0; i < 4.0; i = i + 1.0) {
    irradiance += textureLoad(cascade_tex, vec2i(rc_atlas_texel(probe, i, block)), 0).rgb;
  }
  irradiance = irradiance * 0.25 * present.tone.x;
  let emitter = textureLoad(emitter_tex, texel, 0);
  let ground = present.ground.rgb;
  var lit: vec3f;
  if (present.ground.a > 0.5) {
    let strength = max(max(irradiance.r, irradiance.g), irradiance.b);
    // Far from any emitter the light is faint and its hue is noise; fade the hue in with strength.
    let hue = mix(vec3f(1.0), irradiance / max(strength, 1e-4), smoothstep(0.02, 0.25, strength));
    lit = ground * mix(vec3f(1.0), hue, (1.0 - exp(-strength * 1.6)) * 0.42);
    lit = mix(lit, min(emitter.rgb * 0.45, vec3f(1.0)), clamp(emitter.a * present.tone.y, 0.0, 1.0));
  } else {
    lit = ground + aces(irradiance);
    // Emitters show their own colour, not white-hot: the mark stays Cobalt, candles stay market.
    lit = mix(lit, aces(emitter.rgb * 0.38), clamp(emitter.a * present.tone.y, 0.0, 1.0));
  }
  return vec4f(to_srgb(lit), 1.0);
}
`;
