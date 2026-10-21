import type { MeshPoint } from '../types/mesh';

/**
 * Reads a File and returns an HTMLImageElement
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Samples spatial color regions from an image file and generates MeshPoint array
 */
export async function sampleMeshPointsFromImage(
  file: File,
  pointCount = 7
): Promise<{ points: MeshPoint[]; imagePreviewUrl: string }> {
  const img = await loadImageFromFile(file);

  const canvas = document.createElement('canvas');
  // Scale down for fast sampling and natural color averaging
  const sampleWidth = 320;
  const sampleHeight = Math.round((img.height / img.width) * 320);
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível inicializar contexto 2D');

  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
  const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;

  // Spatial sampling points grid (normalized positions)
  const defaultPositions = [
    { x: 0.18, y: 0.2 },
    { x: 0.82, y: 0.18 },
    { x: 0.5, y: 0.45 },
    { x: 0.22, y: 0.78 },
    { x: 0.78, y: 0.82 },
    { x: 0.5, y: 0.15 },
    { x: 0.5, y: 0.85 },
    { x: 0.15, y: 0.5 },
    { x: 0.85, y: 0.5 },
  ];

  const positions = defaultPositions.slice(0, pointCount);
  const patchRadius = 14; // Average a small neighborhood around each coordinate

  const points: MeshPoint[] = positions.map((pos, idx) => {
    const px = Math.round(pos.x * sampleWidth);
    const py = Math.round(pos.y * sampleHeight);

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let count = 0;

    for (let dy = -patchRadius; dy <= patchRadius; dy += 2) {
      for (let dx = -patchRadius; dx <= patchRadius; dx += 2) {
        const x = Math.max(0, Math.min(sampleWidth - 1, px + dx));
        const y = Math.max(0, Math.min(sampleHeight - 1, py + dy));
        const offset = (y * sampleWidth + x) * 4;

        totalR += imgData[offset];
        totalG += imgData[offset + 1];
        totalB += imgData[offset + 2];
        count++;
      }
    }

    const hex = rgbToHex(totalR / count, totalG / count, totalB / count);

    return {
      id: `img-pt-${Date.now()}-${idx}`,
      x: pos.x,
      y: pos.y,
      color: hex,
      alpha: 1,
      radius: 1.1 + (idx % 3) * 0.15,
      intensity: 1.2 + (idx % 2) * 0.2,
      locked: false,
    };
  });

  return { points, imagePreviewUrl: img.src };
}

/**
 * Extracts a harmonic array of prominent colors from an image file
 */
export async function extractPaletteFromImage(
  file: File,
  count = 5
): Promise<string[]> {
  const result = await sampleMeshPointsFromImage(file, count);
  return result.points.map((p) => p.color);
}
