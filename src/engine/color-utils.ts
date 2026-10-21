// Color utility functions for Mesh Gradient Studio

export interface RGBA {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  a: number; // 0..1
}

export interface HSLA {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
  a: number; // 0..1
}

export function hexToRgba(hex: string, defaultAlpha = 1): RGBA {
  let cleanHex = hex.replace('#', '').trim();
  
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    return { r, g, b, a: defaultAlpha };
  }
  
  if (cleanHex.length === 8) {
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    const a = (parseInt(cleanHex.substring(6, 8), 16) || 255) / 255;
    return { r, g, b, a };
  }
  
  return { r: 100, g: 100, b: 200, a: defaultAlpha };
}

export function rgbaToHex(rgba: RGBA, includeAlpha = false): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0').toUpperCase();
  };
  
  let hex = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
  if (includeAlpha && rgba.a !== undefined && rgba.a < 1) {
    hex += toHex(Math.round(rgba.a * 255));
  }
  return hex;
}

export function rgbaToHsla(rgba: RGBA): HSLA {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: rgba.a,
  };
}

export function hslaToRgba(hsla: HSLA): RGBA {
  const h = (hsla.h % 360 + 360) % 360 / 360;
  const s = Math.max(0, Math.min(100, hsla.s)) / 100;
  const l = Math.max(0, Math.min(100, hsla.l)) / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val, a: hsla.a };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return { r, g, b, a: hsla.a };
}

export function hexToHsla(hex: string, alpha = 1): HSLA {
  return rgbaToHsla(hexToRgba(hex, alpha));
}

export function hslaToHex(hsla: HSLA): string {
  return rgbaToHex(hslaToRgba(hsla));
}

// Generate random aesthetic color
export function getRandomColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 65 + Math.floor(Math.random() * 30); // 65-95%
  const l = 45 + Math.floor(Math.random() * 30); // 45-75%
  return hslaToHex({ h, s, l, a: 1 });
}

// Generate color harmonies based on a base hex
export function generateHarmony(baseHex: string, type: 'analogous' | 'complementary' | 'triadic' | 'monochrome' | 'vibrant'): string[] {
  const hsla = hexToHsla(baseHex);
  const colors: string[] = [baseHex];

  switch (type) {
    case 'complementary': {
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 180) % 360 }));
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 30) % 360, l: Math.min(85, hsla.l + 15) }));
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 210) % 360, l: Math.max(25, hsla.l - 15) }));
      break;
    }
    case 'triadic': {
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 120) % 360 }));
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 240) % 360 }));
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 60) % 360, s: Math.min(100, hsla.s + 10) }));
      break;
    }
    case 'analogous': {
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 30) % 360 }));
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 60) % 360 }));
      colors.push(hslaToHex({ ...hsla, h: (hsla.h - 30 + 360) % 360 }));
      break;
    }
    case 'monochrome': {
      colors.push(hslaToHex({ ...hsla, l: Math.max(15, hsla.l - 25), s: Math.min(100, hsla.s + 10) }));
      colors.push(hslaToHex({ ...hsla, l: Math.min(90, hsla.l + 25), s: Math.max(20, hsla.s - 20) }));
      colors.push(hslaToHex({ ...hsla, l: Math.min(80, hsla.l + 10) }));
      break;
    }
    case 'vibrant': {
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 90) % 360, s: 95, l: 55 }));
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 180) % 360, s: 90, l: 60 }));
      colors.push(hslaToHex({ ...hsla, h: (hsla.h + 270) % 360, s: 85, l: 50 }));
      break;
    }
  }

  return colors;
}

// Adjust a list of colors with global HSL delta
export function adjustPaletteHSL(colors: string[], deltaH: number, deltaS: number, deltaL: number): string[] {
  return colors.map(hex => {
    const hsla = hexToHsla(hex);
    const h = (hsla.h + deltaH + 360) % 360;
    const s = Math.max(0, Math.min(100, hsla.s + deltaS));
    const l = Math.max(0, Math.min(100, hsla.l + deltaL));
    return hslaToHex({ ...hsla, h, s, l });
  });
}

// Extract a clean hex array from user input string (comma, newline, or space separated)
export function parseHexPalette(input: string): string[] {
  const matches = input.match(/#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g);
  if (!matches) return [];
  return matches.map(m => m.startsWith('#') ? m.toUpperCase() : `#${m.toUpperCase()}`);
}
