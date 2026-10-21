import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  Shuffle,
} from 'lucide-react';
import { useChromalab } from '../../context/ChromalabContext';

type TextureType =
  | 'film-grain'
  | 'digital-noise'
  | 'subtle-paper'
  | 'halftone'
  | 'stippling'
  | 'micro-grid';

export const TextureLabStudio: React.FC = () => {
  const { navigateToTool, showToast } = useChromalab();

  const [textureType, setTextureType] = useState<TextureType>('film-grain');
  const [resolution, setResolution] = useState<number>(1024);
  const [intensity, setIntensity] = useState<number>(0.55);
  const [scale, setScale] = useState<number>(1.2);
  const [contrast, setContrast] = useState<number>(1.1);
  const [opacity, setOpacity] = useState<number>(0.9);
  const [grainColor, setGrainColor] = useState<string>('#FFFFFF');
  const [bgColor, setBgColor] = useState<string>('#18181B');
  const [transparentBg, setTransparentBg] = useState<boolean>(false);
  const [seed, setSeed] = useState<number>(1337);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fast PRNG
  const createRng = useCallback((s: number) => {
    let t = s | 0;
    return () => {
      t = (t + 0x6d2b79f5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }, []);

  // Render texture to canvas
  const renderTexture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = resolution;
    canvas.height = resolution;

    const rng = createRng(seed);

    if (transparentBg) {
      ctx.clearRect(0, 0, resolution, resolution);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, resolution, resolution);
    }

    const imgData = ctx.getImageData(0, 0, resolution, resolution);
    const data = imgData.data;

    // Parse grain color RGB
    const rMatch = parseInt(grainColor.slice(1, 3), 16) || 255;
    const gMatch = parseInt(grainColor.slice(3, 5), 16) || 255;
    const bMatch = parseInt(grainColor.slice(5, 7), 16) || 255;

    switch (textureType) {
      case 'film-grain': {
        // Multi-frequency analog film grain simulation
        const step = Math.max(1, Math.round(scale));
        for (let y = 0; y < resolution; y += step) {
          for (let x = 0; x < resolution; x += step) {
            const rawNoise = (rng() + rng() + rng()) / 3 - 0.5; // Gaussian approximation
            const finalVal = Math.max(0, Math.min(1, 0.5 + rawNoise * intensity * contrast));
            const alpha = Math.round(finalVal * opacity * 255);

            for (let dy = 0; dy < step && y + dy < resolution; dy++) {
              for (let dx = 0; dx < step && x + dx < resolution; dx++) {
                const idx = ((y + dy) * resolution + (x + dx)) * 4;
                data[idx] = rMatch;
                data[idx + 1] = gMatch;
                data[idx + 2] = bMatch;
                data[idx + 3] = alpha;
              }
            }
          }
        }
        break;
      }

      case 'digital-noise': {
        // High frequency uniform white noise
        const step = Math.max(1, Math.round(scale));
        for (let i = 0; i < data.length; i += 4 * step) {
          const n = rng();
          const val = Math.max(0, Math.min(255, Math.round((n * 255 - 128) * contrast + 128)));
          const a = Math.round(n * intensity * opacity * 255);

          data[i] = Math.round((rMatch * val) / 255);
          data[i + 1] = Math.round((gMatch * val) / 255);
          data[i + 2] = Math.round((bMatch * val) / 255);
          data[i + 3] = a;
        }
        break;
      }

      case 'subtle-paper': {
        // Fibers and subtle low frequency organic gradients
        for (let y = 0; y < resolution; y++) {
          for (let x = 0; x < resolution; x++) {
            const idx = (y * resolution + x) * 4;
            const wave = Math.sin(x * 0.05 * scale) * Math.cos(y * 0.05 * scale);
            const fiber = rng() > 0.985 ? 0.35 : 0;
            const noise = (rng() - 0.5) * 0.15 + wave * 0.08 + fiber;
            const a = Math.round(Math.max(0, Math.min(1, 0.5 + noise * intensity)) * opacity * 160);

            data[idx] = rMatch;
            data[idx + 1] = gMatch;
            data[idx + 2] = bMatch;
            data[idx + 3] = a;
          }
        }
        break;
      }

      case 'halftone': {
        // Halftone dot screen pattern
        ctx.putImageData(imgData, 0, 0);
        const dotSpacing = Math.round(18 * scale);
        ctx.fillStyle = grainColor;
        ctx.globalAlpha = opacity;

        for (let y = 0; y < resolution; y += dotSpacing) {
          for (let x = 0; x < resolution; x += dotSpacing) {
            const distFromCenter = Math.hypot(x - resolution / 2, y - resolution / 2) / (resolution * 0.7);
            const dotRadius = Math.max(0.5, (dotSpacing / 2) * intensity * (1 - distFromCenter * 0.4));
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1.0;
        return;
      }

      case 'stippling': {
        // Point stippling density distribution
        const pointsCount = Math.round(20000 * intensity * (1 / Math.max(0.2, scale)));
        for (let i = 0; i < pointsCount; i++) {
          const x = Math.floor(rng() * resolution);
          const y = Math.floor(rng() * resolution);
          const idx = (y * resolution + x) * 4;
          data[idx] = rMatch;
          data[idx + 1] = gMatch;
          data[idx + 2] = bMatch;
          data[idx + 3] = Math.round(opacity * 255);
        }
        break;
      }

      case 'micro-grid': {
        // Technical woven mesh
        const gridSize = Math.round(8 * scale);
        for (let y = 0; y < resolution; y++) {
          for (let x = 0; x < resolution; x++) {
            const idx = (y * resolution + x) * 4;
            const isLine = x % gridSize === 0 || y % gridSize === 0;
            const a = isLine ? Math.round(intensity * opacity * 255) : 0;
            data[idx] = rMatch;
            data[idx + 1] = gMatch;
            data[idx + 2] = bMatch;
            data[idx + 3] = a;
          }
        }
        break;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [
    resolution,
    createRng,
    seed,
    transparentBg,
    bgColor,
    grainColor,
    textureType,
    scale,
    intensity,
    contrast,
    opacity,
  ]);

  useEffect(() => {
    renderTexture();
  }, [renderTexture]);

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `texture_${textureType}_${resolution}x${resolution}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Textura Exportada', `Arquivo PNG (${resolution}×${resolution}px) baixado.`);
    }, 'image/png');
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-zinc-50 text-zinc-900 select-none">
      {/* Top Chromalab Bar */}
      <header className="h-14 bg-white border-b border-zinc-200/80 px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateToTool('hub')}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chromalab</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-200" />

          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              Texture Lab
              <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200/80">
                Módulo 04
              </span>
            </h1>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportPng}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar PNG</span>
        </button>
      </header>

      {/* Main Studio Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Controls Sidebar */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-zinc-200/80 p-5 overflow-y-auto space-y-4 shrink-0">
          <div>
            <label className="text-xs font-semibold text-zinc-800 block mb-1.5">
              Tipo de Textura
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'film-grain', label: 'Film Grain' },
                { id: 'digital-noise', label: 'Ruído Digital' },
                { id: 'subtle-paper', label: 'Papel Sutil' },
                { id: 'halftone', label: 'Halftone (Retícula)' },
                { id: 'stippling', label: 'Pontilhado' },
                { id: 'micro-grid', label: 'Micro-Grid' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTextureType(t.id as TextureType)}
                  className={`py-2 px-2.5 rounded-lg border text-left text-[11px] font-medium transition-all ${
                    textureType === t.id
                      ? 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-xs font-semibold text-zinc-800 block mb-1.5">
              Resolução de Exportação
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[512, 1024, 2048].map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`py-1.5 px-2 rounded-lg border text-xs text-center font-mono ${
                    resolution === res
                      ? 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {res}px
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Intensidade</span>
                <span className="font-mono text-zinc-900 font-semibold">{Math.round(intensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.02"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Escala da Granulação</span>
                <span className="font-mono text-zinc-900 font-semibold">{scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Contraste</span>
                <span className="font-mono text-zinc-900 font-semibold">{scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Opacidade</span>
                <span className="font-mono text-zinc-900 font-semibold">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Color & Transparency */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Cor da Textura</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={grainColor}
                  onChange={(e) => setGrainColor(e.target.value)}
                  className="w-6 h-6 rounded border border-zinc-200 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-zinc-800">{grainColor}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Fundo Transparente</span>
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {!transparentBg && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Cor de Fundo</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-200 cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-zinc-800">{bgColor}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
            className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Nova Amostragem (Seed)</span>
          </button>
        </aside>

        {/* Live Canvas Viewport */}
        <main className="flex-1 p-6 md:p-10 flex items-center justify-center overflow-auto bg-zinc-100/70">
          <div
            className="relative shadow-2xl rounded-2xl overflow-hidden border border-zinc-300 transition-all max-w-full max-h-full"
            style={{
              width: '560px',
              height: '560px',
              backgroundImage: transparentBg
                ? 'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)'
                : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          >
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </main>
      </div>
    </div>
  );
};
