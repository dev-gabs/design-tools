// Product recolor engine: region selection + OKLab recoloring that preserves shading.
//
// The selection is a color-distance flood fill in OKLab, where lightness counts less than
// chroma/hue so shadows and highlights of the same surface stay inside the region.
// Recoloring keeps each pixel's lightness offset, relative chroma and hue offset from the
// region's average color, and moves that average to the target color.

export interface LabImage {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  lab: Float32Array; // L, a, b per pixel
}

export interface SelectionSeed {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  mode: 'add' | 'subtract';
}

export interface SelectionOptions {
  tolerance: number; // OKLab distance, ~0.02..0.4
  contiguous: boolean;
  fillHoles: boolean;
  closeRadius: number; // px at working resolution, fills small holes
  feather: number; // px at working resolution, softens edges
}

export interface RegionStats {
  L: number;
  C: number;
  h: number; // radians
  hex: string;
  coverage: number; // 0..1 share of the image
}

export interface RecolorOptions {
  targetHex: string;
  lightness: number; // 0 keeps original lightness, 1 moves it fully to the target
  intensity: number; // 0..1 blend with the original
}

const LIGHTNESS_WEIGHT = 0.3;
const MIN_ALPHA = 8;

// ─── Color conversion ──────────────────────────────────────────────────────────

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Linear → 8-bit sRGB through a lookup table: the per-pixel pow() dominated recolor time
const LINEAR_LUT_SIZE = 8192;
const LINEAR_TO_SRGB = new Uint8Array(LINEAR_LUT_SIZE + 1);
for (let i = 0; i <= LINEAR_LUT_SIZE; i++) {
  const x = i / LINEAR_LUT_SIZE;
  const c = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  LINEAR_TO_SRGB[i] = Math.max(0, Math.min(255, Math.round(c * 255)));
}

function linearToSrgb8(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 255;
  return LINEAR_TO_SRGB[Math.round(x * LINEAR_LUT_SIZE)];
}

function linearToOklab(r: number, g: number, b: number, out: Float32Array | number[], o: number) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  out[o] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[o + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[o + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
}

function oklabToLinear(L: number, a: number, b: number, out: number[]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  out[0] = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  out[1] = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  out[2] = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
}

const inGamut = (c: number[]) =>
  c[0] >= -1e-4 && c[0] <= 1.0001 && c[1] >= -1e-4 && c[1] <= 1.0001 && c[2] >= -1e-4 && c[2] <= 1.0001;

// Converts OKLCh to linear sRGB, reducing chroma until the color fits the sRGB gamut.
function oklchToLinearInGamut(L: number, C: number, h: number, out: number[]) {
  const cosH = Math.cos(h);
  const sinH = Math.sin(h);
  oklabToLinear(L, C * cosH, C * sinH, out);
  if (inGamut(out)) return;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    oklabToLinear(L, mid * cosH, mid * sinH, out);
    if (inGamut(out)) lo = mid;
    else hi = mid;
  }
  oklabToLinear(L, lo * cosH, lo * sinH, out);
}

// Largest in-gamut chroma for each lightness step at a fixed hue, so the per-pixel loop can
// clamp chroma with a table lookup instead of a binary search.
function maxChromaTable(h: number, steps: number): Float32Array {
  const table = new Float32Array(steps + 1);
  const cosH = Math.cos(h);
  const sinH = Math.sin(h);
  const lin = [0, 0, 0];
  for (let i = 0; i <= steps; i++) {
    const L = i / steps;
    let lo = 0;
    let hi = 0.4;
    for (let k = 0; k < 14; k++) {
      const mid = (lo + hi) / 2;
      oklabToLinear(L, mid * cosH, mid * sinH, lin);
      if (inGamut(lin)) lo = mid;
      else hi = mid;
    }
    table[i] = lo;
  }
  return table;
}

export function hexToOklch(hex: string): { L: number; C: number; h: number } {
  const clean = hex.replace('#', '');
  const lab = [0, 0, 0];
  linearToOklab(
    SRGB_TO_LINEAR[parseInt(clean.slice(0, 2), 16) || 0],
    SRGB_TO_LINEAR[parseInt(clean.slice(2, 4), 16) || 0],
    SRGB_TO_LINEAR[parseInt(clean.slice(4, 6), 16) || 0],
    lab,
    0,
  );
  return { L: lab[0], C: Math.hypot(lab[1], lab[2]), h: Math.atan2(lab[2], lab[1]) };
}

function oklabToHex(L: number, a: number, b: number): string {
  const lin = [0, 0, 0];
  oklchToLinearInGamut(L, Math.hypot(a, b), Math.atan2(b, a), lin);
  return `#${lin.map((v) => linearToSrgb8(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// ─── Working image ─────────────────────────────────────────────────────────────

export function imageToLab(img: CanvasImageSource, width: number, height: number): LabImage {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const lab = new Float32Array(width * height * 3);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p += 3) {
    linearToOklab(SRGB_TO_LINEAR[rgba[i]], SRGB_TO_LINEAR[rgba[i + 1]], SRGB_TO_LINEAR[rgba[i + 2]], lab, p);
  }
  return { width, height, rgba, lab };
}

// ─── Selection ─────────────────────────────────────────────────────────────────

// Average OKLab color in a small patch around (px, py), so a click on noise still picks the surface.
function seedReference(img: LabImage, px: number, py: number): [number, number, number] {
  const r = 2;
  let L = 0, a = 0, b = 0, n = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = px + dx;
      const y = py + dy;
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const p = (y * img.width + x) * 3;
      L += img.lab[p]; a += img.lab[p + 1]; b += img.lab[p + 2]; n++;
    }
  }
  return [L / n, a / n, b / n];
}

function regionFromSeed(img: LabImage, seed: SelectionSeed, tolerance: number, contiguous: boolean): Uint8Array {
  const { width: w, height: h, lab, rgba } = img;
  const region = new Uint8Array(w * h);
  const sx = Math.min(w - 1, Math.max(0, Math.floor(seed.x * w)));
  const sy = Math.min(h - 1, Math.max(0, Math.floor(seed.y * h)));
  const [rL, ra, rb] = seedReference(img, sx, sy);
  const tol2 = tolerance * tolerance;

  const matches = (i: number) => {
    if (rgba[i * 4 + 3] < MIN_ALPHA) return false;
    const p = i * 3;
    const dL = (lab[p] - rL) * LIGHTNESS_WEIGHT;
    const da = lab[p + 1] - ra;
    const db = lab[p + 2] - rb;
    return dL * dL + da * da + db * db <= tol2;
  };

  if (!contiguous) {
    for (let i = 0; i < w * h; i++) if (matches(i)) region[i] = 1;
    return region;
  }

  const start = sy * w + sx;
  if (!matches(start)) return region;
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const visit = (n: number) => {
    if (region[n] || !matches(n)) return;
    region[n] = 1;
    queue[tail++] = n;
  };
  queue[tail++] = start;
  region[start] = 1;
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    if (x > 0) visit(i - 1);
    if (x < w - 1) visit(i + 1);
    if (i >= w) visit(i - w);
    if (i < w * (h - 1)) visit(i + w);
  }
  return region;
}

// Sum of `src` over a (2r+1)² box around every pixel, via an integral image.
function boxSum(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += src[y * w + x];
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      out[y * w + x] =
        integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
    }
  }
  return out;
}

function boxArea(w: number, h: number, x: number, y: number, r: number) {
  return (Math.min(w, x + r + 1) - Math.max(0, x - r)) * (Math.min(h, y + r + 1) - Math.max(0, y - r));
}

// Morphological close (dilate then erode) fills specular holes and thin gaps in the region.
function closeMask(mask: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return mask;
  const dilatedSum = boxSum(mask, w, h, r);
  const dilated = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) dilated[i] = dilatedSum[i] > 0.5 ? 1 : 0;
  const erodedSum = boxSum(dilated, w, h, r);
  const closed = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      closed[i] = erodedSum[i] >= boxArea(w, h, x, y, r) - 0.5 ? 1 : 0;
    }
  }
  return closed;
}

function featherMask(mask: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return mask;
  let out = mask;
  // Two box passes approximate a gaussian falloff
  for (let pass = 0; pass < 2; pass++) {
    const sum = boxSum(out, w, h, r);
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) next[y * w + x] = sum[y * w + x] / boxArea(w, h, x, y, r);
    }
    out = next;
  }
  return out;
}

// Adds every unselected area that is fully enclosed by the selection (highlights, eye holes,
// printed details). Recoloring keeps relative chroma, so near-white and near-black parts stay so.
function fillHoles(mask: Float32Array, w: number, h: number): Float32Array {
  const outside = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let tail = 0;
  const visit = (i: number) => {
    if (outside[i] || mask[i] > 0.5) return;
    outside[i] = 1;
    queue[tail++] = i;
  };
  for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
  for (let head = 0; head < tail; head++) {
    const i = queue[head];
    const x = i % w;
    if (x > 0) visit(i - 1);
    if (x < w - 1) visit(i + 1);
    if (i >= w) visit(i - w);
    if (i < w * (h - 1)) visit(i + w);
  }
  const filled = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) filled[i] = outside[i] ? 0 : 1;
  return filled;
}

// Returns a soft mask (0..1 per pixel) at the working image resolution.
export function buildMask(img: LabImage, seeds: SelectionSeed[], options: SelectionOptions): Float32Array {
  const size = img.width * img.height;
  let mask: Float32Array = new Float32Array(size);
  for (const seed of seeds) {
    const region = regionFromSeed(img, seed, options.tolerance, options.contiguous);
    const value = seed.mode === 'add' ? 1 : 0;
    for (let i = 0; i < size; i++) if (region[i]) mask[i] = value;
  }
  if (options.fillHoles) mask = fillHoles(mask, img.width, img.height);
  mask = closeMask(mask, img.width, img.height, Math.round(options.closeRadius));
  return featherMask(mask, img.width, img.height, Math.round(options.feather));
}

export function regionStats(img: LabImage, mask: Float32Array): RegionStats | null {
  let L = 0, a = 0, b = 0, C = 0, weight = 0;
  for (let i = 0; i < mask.length; i++) {
    const m = mask[i];
    if (m <= 0.5) continue;
    const p = i * 3;
    L += img.lab[p] * m;
    a += img.lab[p + 1] * m;
    b += img.lab[p + 2] * m;
    C += Math.hypot(img.lab[p + 1], img.lab[p + 2]) * m;
    weight += m;
  }
  if (weight === 0) return null;
  L /= weight; a /= weight; b /= weight; C /= weight;
  return { L, C, h: Math.atan2(b, a), hex: oklabToHex(L, a, b), coverage: weight / mask.length };
}

// ─── Recolor ───────────────────────────────────────────────────────────────────

// Bilinear lookup so a mask built at preview resolution can drive a full-resolution export.
function sampleMask(mask: Float32Array, mw: number, mh: number, u: number, v: number): number {
  const x = Math.max(0, Math.min(mw - 1, u * mw - 0.5));
  const y = Math.max(0, Math.min(mh - 1, v * mh - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(mw - 1, x0 + 1);
  const y1 = Math.min(mh - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const top = mask[y0 * mw + x0] * (1 - fx) + mask[y0 * mw + x1] * fx;
  const bottom = mask[y1 * mw + x0] * (1 - fx) + mask[y1 * mw + x1] * fx;
  return top * (1 - fy) + bottom * fy;
}

export interface RecolorInput {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  mask: Float32Array;
  maskWidth: number;
  maskHeight: number;
  stats: RegionStats;
  transparentBackground?: boolean;
}

export function recolorPixels(input: RecolorInput, options: RecolorOptions): Uint8ClampedArray<ArrayBuffer> {
  const { rgba, width: w, height: h, mask, maskWidth: mw, maskHeight: mh, stats } = input;
  const out = new Uint8ClampedArray(rgba);
  const target = hexToOklch(options.targetHex);
  const dL = (target.L - stats.L) * options.lightness;
  const dh = target.h - stats.h;
  // A grey source has no reliable chroma to scale from, so it gets the target chroma directly
  const greySource = stats.C < 0.03;
  const sameSize = mw === w && mh === h;
  const CHROMA_STEPS = 256;
  const maxChroma = maxChromaTable(target.h, CHROMA_STEPS);
  const lab = [0, 0, 0];
  const lin = [0, 0, 0];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const m = sameSize ? mask[i] : sampleMask(mask, mw, mh, (x + 0.5) / w, (y + 0.5) / h);
      const o = i * 4;
      if (input.transparentBackground) out[o + 3] = Math.round(rgba[o + 3] * Math.min(1, m));
      const k = m * options.intensity;
      if (k <= 0.002) continue;

      linearToOklab(SRGB_TO_LINEAR[rgba[o]], SRGB_TO_LINEAR[rgba[o + 1]], SRGB_TO_LINEAR[rgba[o + 2]], lab, 0);
      const C = Math.hypot(lab[1], lab[2]);
      const newL = Math.max(0, Math.min(1, lab[0] + dL));
      const wantedC = greySource ? target.C : target.C * Math.min(1.6, C / stats.C);
      const newC = Math.min(wantedC, maxChroma[Math.round(newL * CHROMA_STEPS)]);
      const newH = greySource ? target.h : Math.atan2(lab[2], lab[1]) + dh;
      // Pixel hues sit close to the target hue, so the table clamp is near-exact; channel
      // clamping in linearToSrgb8 absorbs what is left
      oklabToLinear(newL, newC * Math.cos(newH), newC * Math.sin(newH), lin);

      out[o] = rgba[o] + (linearToSrgb8(lin[0]) - rgba[o]) * k;
      out[o + 1] = rgba[o + 1] + (linearToSrgb8(lin[1]) - rgba[o + 1]) * k;
      out[o + 2] = rgba[o + 2] + (linearToSrgb8(lin[2]) - rgba[o + 2]) * k;
    }
  }
  return out;
}
