import type { MeshPoint } from '../types/mesh';
import { getRandomColor, generateHarmony, hexToHsla, hslaToHex } from './color-utils';

// Mulberry32 seeded random number generator
export function createSeededRandom(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate a completely new random composition
export function generateRandomComposition(
  count = 6,
  seed = Date.now()
): { points: MeshPoint[]; settingsSeed: number } {
  const rng = createSeededRandom(seed);
  const baseHue = Math.floor(rng() * 360);
  const harmonyTypes: Array<'vibrant' | 'analogous' | 'complementary' | 'triadic'> = [
    'vibrant',
    'analogous',
    'complementary',
    'triadic',
  ];
  const selectedHarmony = harmonyTypes[Math.floor(rng() * harmonyTypes.length)];
  const baseColor = hslaToHex({
    h: baseHue,
    s: 70 + Math.floor(rng() * 25),
    l: 50 + Math.floor(rng() * 20),
    a: 1,
  });

  const palette = generateHarmony(baseColor, selectedHarmony);
  while (palette.length < count) {
    palette.push(getRandomColor());
  }

  const points: MeshPoint[] = [];

  for (let i = 0; i < count; i++) {
    // Generate organic positions (spread well across the canvas with border proximity)
    const margin = 0.08;
    const x = margin + rng() * (1 - 2 * margin);
    const y = margin + rng() * (1 - 2 * margin);
    const color = palette[i % palette.length];
    const radius = 0.8 + rng() * 0.7; // 0.8 .. 1.5
    const intensity = 0.9 + rng() * 0.6; // 0.9 .. 1.5

    points.push({
      id: `pt-${Date.now()}-${i}-${Math.floor(rng() * 1000)}`,
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      color,
      alpha: 1,
      radius: Math.round(radius * 10) / 10,
      intensity: Math.round(intensity * 10) / 10,
      locked: false,
    });
  }

  return { points, settingsSeed: seed };
}

// Randomize only colors while preserving point geometry
export function randomizeColorsOnly(points: MeshPoint[], seed = Date.now()): MeshPoint[] {
  const rng = createSeededRandom(seed);
  const baseHue = Math.floor(rng() * 360);
  const baseColor = hslaToHex({
    h: baseHue,
    s: 70 + Math.floor(rng() * 25),
    l: 50 + Math.floor(rng() * 20),
    a: 1,
  });

  const palette = generateHarmony(baseColor, 'vibrant');
  while (palette.length < points.length) {
    const h = Math.floor(rng() * 360);
    palette.push(hslaToHex({ h, s: 70 + rng() * 25, l: 45 + rng() * 25, a: 1 }));
  }

  return points.map((p, idx) => ({
    ...p,
    color: palette[idx % palette.length],
  }));
}

// Randomize only geometry while preserving color palette
export function randomizeGeometryOnly(points: MeshPoint[], seed = Date.now()): MeshPoint[] {
  const rng = createSeededRandom(seed);
  const margin = 0.08;

  return points.map((p) => {
    if (p.locked) return p;
    return {
      ...p,
      x: Math.round((margin + rng() * (1 - 2 * margin)) * 1000) / 1000,
      y: Math.round((margin + rng() * (1 - 2 * margin)) * 1000) / 1000,
      radius: Math.round((0.8 + rng() * 0.7) * 10) / 10,
      intensity: Math.round((0.9 + rng() * 0.6) * 10) / 10,
    };
  });
}

// Subtle organic variation
export function subtleVariation(points: MeshPoint[], seed = Date.now()): MeshPoint[] {
  const rng = createSeededRandom(seed);

  return points.map((p) => {
    if (p.locked) return p;

    // Small position jitter (+/- 0.06)
    const jitterX = (rng() - 0.5) * 0.12;
    const jitterY = (rng() - 0.5) * 0.12;
    const newX = Math.max(0.02, Math.min(0.98, p.x + jitterX));
    const newY = Math.max(0.02, Math.min(0.98, p.y + jitterY));

    // Slight color hue and lightness variation
    const hsla = hexToHsla(p.color);
    const newH = (hsla.h + Math.round((rng() - 0.5) * 24) + 360) % 360;
    const newS = Math.max(20, Math.min(100, hsla.s + Math.round((rng() - 0.5) * 12)));
    const newL = Math.max(20, Math.min(90, hsla.l + Math.round((rng() - 0.5) * 10)));
    const newColor = hslaToHex({ ...hsla, h: newH, s: newS, l: newL });

    return {
      ...p,
      x: Math.round(newX * 1000) / 1000,
      y: Math.round(newY * 1000) / 1000,
      color: newColor,
    };
  });
}
