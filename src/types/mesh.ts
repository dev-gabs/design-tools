export interface MeshPoint {
  id: string;
  x: number; // Normalized 0..1 (relative to canvas width)
  y: number; // Normalized 0..1 (relative to canvas height)
  color: string; // Hex color (#RRGGBB or #RRGGBBAA)
  alpha: number; // 0..1
  radius: number; // Influence radius (0.1 .. 3.0, default 1.0)
  intensity: number; // Influence weight/intensity (0.1 .. 5.0, default 1.0)
  locked?: boolean;
  label?: string;
}

export interface Dimensions {
  width: number;
  height: number;
  lockAspectRatio: boolean;
  presetName?: string;
}

export interface GlobalEngineSettings {
  smoothness: number; // Blend exponent / power (1.0 .. 6.0, default 2.2)
  colorSpace: 'oklab' | 'linear' | 'srgb';
  contrast: number; // 0.5 .. 2.0, default 1.0
  saturation: number; // 0.0 .. 2.0, default 1.0
  brightness: number; // 0.5 .. 1.5, default 1.0
  hueShift: number; // -180 .. 180 degrees, default 0
  noiseIntensity: number; // 0.0 .. 0.5, default 0.0 (off by default)
  noiseScale: number; // 0.5 .. 4.0, default 1.5
  vignetteIntensity: number; // 0.0 .. 1.0, default 0.0
  vignetteRadius: number; // 0.2 .. 1.5, default 0.8
  backgroundColor: string; // Hex or 'transparent'
  transparentBackground: boolean;
  seed: number;
}

export interface MeshGradientDocument {
  id: string;
  name: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  dimensions: Dimensions;
  points: MeshPoint[];
  settings: GlobalEngineSettings;
  presetOrigin?: string;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  description: string;
  points: Omit<MeshPoint, 'id'>[];
  settings?: Partial<GlobalEngineSettings>;
  previewGradient?: string;
}

export type ExportFormat = 'png' | 'jpeg' | 'svg';

export interface ExportOptions {
  format: ExportFormat;
  scale: number; // 1, 2, 3, 4
  quality: number; // 0.1 .. 1.0 for JPEG
  backgroundColor: string;
  includeEffects: boolean;
}

export interface HistorySnapshot {
  points: MeshPoint[];
  dimensions: Dimensions;
  settings: GlobalEngineSettings;
  timestamp: number;
}
