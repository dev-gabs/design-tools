// Product recolor engine: region selection, edge matting and OKLab recoloring that preserves shading.
//
// Selection is a color-distance flood fill in OKLab, where lightness counts less than chroma/hue
// so shadows and highlights of the same surface stay inside the region.
//
// Edges are matted: in a thin band around the selection each pixel is treated as a mix of the
// object color and the local background, so only the object's share is recolored and no fringe
// of the old color is left behind.
//
// Recoloring models a material change: shading scales lightness multiplicatively (as reflected
// light does when the albedo changes), strong highlights keep their brightness, and the original
// hue variation is compressed so it does not turn into visible bands in the new color.

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
  tolerance?: number; // per-click tolerance; falls back to SelectionOptions.tolerance
}

export interface SelectionOptions {
  tolerance: number; // OKLab distance, ~0.02..0.4, for seeds without their own
  contiguous: boolean;
  fillHoles: boolean;
  closeRadius: number; // px at working resolution, fills small holes
  edge: number; // px at working resolution, width of the matted edge band
}

// Object coverage per pixel plus the estimated background color behind edge pixels
export interface Matte {
  width: number;
  height: number;
  alpha: Float32Array; // 0..1
  background: Float32Array; // sRGB 0..255, 3 per pixel
  foreground: Float32Array; // sRGB 0..255, 3 per pixel: local object color near edges
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
  lightness: number; // 0 keeps original lightness, 1 follows the target's lightness fully
  highlights: number; // 0..1 how much bright highlights keep their original brightness
  hueVariation: number; // 0..1 share of the original hue variation kept
  contrast: number; // 1 keeps the original light/shadow spread; above 1 reads glossier
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

// Same conversion for fractional 0..255 input (matted edge colors are not integers)
function srgbToLinear(v: number): number {
  const c = Math.max(0, Math.min(1, v / 255));
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
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
  oklabToLinear(L, a, b, lin);
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

// Picks a tolerance for a click by growing it until the region suddenly leaks into the
// surroundings, then settling in the middle of the stable range before the leak. Run it on a
// small copy of the image: it does one flood fill per step.
//
// With an existing selection (`selected`, at the same resolution as `img`) the click is a
// touch-up, so it measures how much the whole selection grows and stops right before it jumps.
export function suggestTolerance(img: LabImage, seed: SelectionSeed, selected?: Float32Array): number | null {
  const steps: number[] = [];
  for (let t = 0.02; t <= 0.3001; t += 0.01) steps.push(Number(t.toFixed(2)));
  const coverage = steps.map((t) => {
    const region = regionFromSeed(img, seed, t, true);
    let n = 0;
    for (let i = 0; i < region.length; i++) n += (region[i] || (selected && selected[i] > 0.5)) ? 1 : 0;
    return n / region.length;
  });

  if (selected) {
    for (let k = 0; k < steps.length - 1; k++) {
      const gain = coverage[k + 1] - coverage[k];
      if (gain > 0.02 && gain > coverage[k] * 0.15) return steps[k];
    }
    return steps[steps.length - 1];
  }

  // Coverage first grows while the fill spreads over the object, then flattens once the whole
  // object is in, then jumps when it leaks. Only a jump after a flat stretch counts as a leak.
  let stableStart = -1;
  let biggestJump = -1;
  let biggestGain = 0;
  for (let k = 0; k < steps.length - 1; k++) {
    const c = coverage[k];
    if (c <= 0) continue;
    const gain = coverage[k + 1] - c;
    const growth = gain / c;
    if (gain > biggestGain && coverage[k + 1] > c * 1.8) {
      biggestGain = gain;
      biggestJump = k;
    }
    if (stableStart < 0) {
      if (growth < 0.1) stableStart = k;
    } else if (growth > 0.3 && gain > 0.02) {
      return Number(((steps[stableStart] + steps[k]) / 2).toFixed(3));
    }
  }
  // Unevenly lit objects may never flatten out: stop right before the biggest leak instead
  return biggestJump >= 0 ? steps[biggestJump] : null;
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

function dilate(mask: Float32Array, w: number, h: number, r: number): Float32Array {
  const sum = boxSum(mask, w, h, r);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = sum[i] > 0.5 ? 1 : 0;
  return out;
}

function erode(mask: Float32Array, w: number, h: number, r: number): Float32Array {
  const sum = boxSum(mask, w, h, r);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      out[i] = sum[i] >= boxArea(w, h, x, y, r) - 0.5 ? 1 : 0;
    }
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

// Estimates object coverage in a band around the selection edge. Each band pixel is projected
// onto the line between the local object color F and the local background color B (both
// averaged from pixels that are certainly inside / outside), giving alpha = |p - B| / |F - B|.
function matteEdges(img: LabImage, hard: Float32Array, r: number): Matte {
  const { width: w, height: h, rgba } = img;
  const size = w * h;
  const alpha = new Float32Array(size);
  const background = new Float32Array(size * 3);
  for (let i = 0; i < size; i++) {
    alpha[i] = hard[i];
    background[i * 3] = rgba[i * 4];
    background[i * 3 + 1] = rgba[i * 4 + 1];
    background[i * 3 + 2] = rgba[i * 4 + 2];
  }
  const foreground = new Float32Array(background);
  if (r <= 0) return { width: w, height: h, alpha, background, foreground };

  const inner = erode(hard, w, h, r);
  const outer = dilate(hard, w, h, r);
  const definiteBg = new Float32Array(size);
  for (let i = 0; i < size; i++) definiteBg[i] = 1 - outer[i];

  // Local color means of the certain object / background pixels around each band pixel
  const R = 2 * r + 2;
  const channel = (weights: Float32Array, c: number) => {
    const values = new Float32Array(size);
    for (let i = 0; i < size; i++) values[i] = rgba[i * 4 + c] * weights[i];
    return boxSum(values, w, h, R);
  };
  const countF = boxSum(inner, w, h, R);
  const countB = boxSum(definiteBg, w, h, R);
  const sumF = [channel(inner, 0), channel(inner, 1), channel(inner, 2)];
  const sumB = [channel(definiteBg, 0), channel(definiteBg, 1), channel(definiteBg, 2)];

  for (let i = 0; i < size; i++) {
    if (inner[i]) { alpha[i] = 1; continue; }
    if (!outer[i]) { alpha[i] = 0; continue; }
    if (countF[i] < 1 || countB[i] < 1) continue; // image border or tiny region: keep the hard edge

    const p = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]];
    const F = [sumF[0][i] / countF[i], sumF[1][i] / countF[i], sumF[2][i] / countF[i]];
    const B = [sumB[0][i] / countB[i], sumB[1][i] / countB[i], sumB[2][i] / countB[i]];
    const d = [F[0] - B[0], F[1] - B[1], F[2] - B[2]];
    const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    background[i * 3] = B[0];
    background[i * 3 + 1] = B[1];
    background[i * 3 + 2] = B[2];
    foreground[i * 3] = F[0];
    foreground[i * 3 + 1] = F[1];
    foreground[i * 3 + 2] = F[2];
    // Object and background too similar to separate: keep the hard edge
    if (dd < 300) continue;
    const t = ((p[0] - B[0]) * d[0] + (p[1] - B[1]) * d[1] + (p[2] - B[2]) * d[2]) / dd;
    alpha[i] = Math.max(0, Math.min(1, t));
  }
  return { width: w, height: h, alpha, background, foreground };
}

export function buildMatte(img: LabImage, seeds: SelectionSeed[], options: SelectionOptions): Matte {
  const size = img.width * img.height;
  let hard: Float32Array = new Float32Array(size);
  for (const seed of seeds) {
    const region = regionFromSeed(img, seed, seed.tolerance ?? options.tolerance, options.contiguous);
    const value = seed.mode === 'add' ? 1 : 0;
    for (let i = 0; i < size; i++) if (region[i]) hard[i] = value;
  }
  return finishMatte(img, hard, options);
}

// Same clean-up and edge matting for a mask that came from elsewhere (the AI segmenter),
// given at the working image resolution as 0/1 values.
export function matteFromMask(img: LabImage, mask: Uint8Array, options: SelectionOptions): Matte {
  const hard = new Float32Array(img.width * img.height);
  for (let i = 0; i < hard.length; i++) hard[i] = mask[i] ? 1 : 0;
  return finishMatte(img, hard, options);
}

function finishMatte(img: LabImage, mask: Float32Array, options: SelectionOptions): Matte {
  let hard = mask;
  if (options.fillHoles) hard = fillHoles(hard, img.width, img.height);
  const close = Math.round(options.closeRadius);
  if (close > 0) hard = erode(dilate(hard, img.width, img.height, close), img.width, img.height, close);
  return matteEdges(img, hard, Math.round(options.edge));
}

export function regionStats(img: LabImage, matte: Matte): RegionStats | null {
  let L = 0, a = 0, b = 0, C = 0, weight = 0;
  for (let i = 0; i < matte.alpha.length; i++) {
    if (matte.alpha[i] < 0.99) continue;
    const p = i * 3;
    L += img.lab[p];
    a += img.lab[p + 1];
    b += img.lab[p + 2];
    C += Math.hypot(img.lab[p + 1], img.lab[p + 2]);
    weight++;
  }
  if (weight === 0) return null;
  L /= weight; a /= weight; b /= weight; C /= weight;
  return { L, C, h: Math.atan2(b, a), hex: oklabToHex(L, a, b), coverage: weight / matte.alpha.length };
}

// ─── Recolor ───────────────────────────────────────────────────────────────────

// Bilinear lookup so a matte built at preview resolution can drive a full-resolution export.
function sampleBilinear(values: Float32Array, mw: number, mh: number, u: number, v: number): number {
  const x = Math.max(0, Math.min(mw - 1, u * mw - 0.5));
  const y = Math.max(0, Math.min(mh - 1, v * mh - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(mw - 1, x0 + 1);
  const y1 = Math.min(mh - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const top = values[y0 * mw + x0] * (1 - fx) + values[y0 * mw + x1] * fx;
  const bottom = values[y1 * mw + x0] * (1 - fx) + values[y1 * mw + x1] * fx;
  return top * (1 - fy) + bottom * fy;
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface RecolorInput {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  matte: Matte;
  stats: RegionStats;
  transparentBackground?: boolean;
}

export function recolorPixels(input: RecolorInput, options: RecolorOptions): Uint8ClampedArray<ArrayBuffer> {
  const { rgba, width: w, height: h, matte, stats } = input;
  const { width: mw, height: mh } = matte;
  const out = new Uint8ClampedArray(rgba);
  const target = hexToOklch(options.targetHex);
  const Lr = Math.max(0.02, stats.L);
  const Lt = target.L;
  const darkening = Lt <= Lr;
  // A grey source has no reliable chroma or hue to scale from
  const greySource = stats.C < 0.03;
  const sameSize = mw === w && mh === h;
  const CHROMA_STEPS = 256;
  const maxChroma = maxChromaTable(target.h, CHROMA_STEPS);
  const lab = [0, 0, 0];
  const lin = [0, 0, 0];
  const src = [0, 0, 0];
  const bg = [0, 0, 0];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      let mi = i;
      let a: number;
      if (sameSize) {
        a = matte.alpha[i];
      } else {
        const u = (x + 0.5) / w;
        const v = (y + 0.5) / h;
        a = sampleBilinear(matte.alpha, mw, mh, u, v);
        mi = Math.min(mh - 1, Math.floor(v * mh)) * mw + Math.min(mw - 1, Math.floor(u * mw));
      }
      if (input.transparentBackground) out[o + 3] = Math.round(rgba[o + 3] * a);
      if (a <= 0.002) continue;

      // Edge pixels: separate the object's share from the background behind it
      if (a >= 0.998) {
        src[0] = rgba[o]; src[1] = rgba[o + 1]; src[2] = rgba[o + 2];
      } else {
        bg[0] = matte.background[mi * 3];
        bg[1] = matte.background[mi * 3 + 1];
        bg[2] = matte.background[mi * 3 + 2];
        // Unmixing divides by alpha, which amplifies noise on mostly-background pixels, so those
        // lean on the local object color instead
        const trust = Math.max(0, Math.min(1, (a - 0.15) / 0.6));
        for (let c = 0; c < 3; c++) {
          const unmixed = Math.max(0, Math.min(255, (rgba[o + c] - (1 - a) * bg[c]) / a));
          src[c] = matte.foreground[mi * 3 + c] + (unmixed - matte.foreground[mi * 3 + c]) * trust;
        }
      }

      linearToOklab(srgbToLinear(src[0]), srgbToLinear(src[1]), srgbToLinear(src[2]), lab, 0);
      const L = lab[0];
      const C = Math.hypot(lab[1], lab[2]);
      const shade = L / Lr;

      // Lightness: multiply when darkening, mirror (screen-like) when lightening
      let mapped: number;
      let highlight = 0;
      if (darkening) {
        mapped = L * (Lt / Lr);
        const hl = Math.max(0, Math.min(1, (L - Lr) / Math.max(0.05, 1 - Lr)));
        highlight = hl * hl * options.highlights;
        mapped += (L - mapped) * highlight;
      } else {
        mapped = 1 - (1 - L) * ((1 - Lt) / Math.max(0.02, 1 - Lr));
      }
      let newL = L + (mapped - L) * options.lightness;
      // Contrast spreads lightness around the region's new average, which reads as more sheen
      // (both mappings send the region's average Lr exactly to Lt)
      const center = Lr + (Lt - Lr) * options.lightness;
      newL = Math.max(0, Math.min(1, center + (newL - center) * options.contrast));

      // Chroma follows the shading; the source's own chroma ratio adds texture when it is reliable
      const chromaRatio = greySource ? shade : 0.5 * (C / stats.C) + 0.5 * shade;
      const wantedC = target.C * Math.min(1.4, chromaRatio) * (1 - highlight);
      const newC = Math.min(wantedC, maxChroma[Math.round(newL * CHROMA_STEPS)]);
      const newH = greySource
        ? target.h
        : target.h + wrapAngle(Math.atan2(lab[2], lab[1]) - stats.h) * options.hueVariation;
      oklabToLinear(newL, newC * Math.cos(newH), newC * Math.sin(newH), lin);

      for (let c = 0; c < 3; c++) {
        const recolored = linearToSrgb8(lin[c]);
        // Transparent export keeps only the object, so edges get the pure recolored color
        const composed = input.transparentBackground || a >= 0.998
          ? recolored
          : a * recolored + (1 - a) * bg[c];
        const base = input.transparentBackground ? src[c] : rgba[o + c];
        out[o + c] = base + (composed - base) * options.intensity;
      }
    }
  }
  return out;
}
