import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  Copy,
  Shuffle,
} from 'lucide-react';
import { useChromalab } from '../../context/ChromalabContext';

type PatternType =
  | 'dots'
  | 'grid'
  | 'lines'
  | 'stripes'
  | 'checkerboard'
  | 'circles'
  | 'geometry'
  | 'organic-blobs';

export const PatternShapeStudio: React.FC = () => {
  const { navigateToTool, consumePendingPatternColors, showToast } = useChromalab();

  // Document dimensions
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(800);

  // Pattern parameters
  const [patternType, setPatternType] = useState<PatternType>('organic-blobs');
  const [bgColor, setBgColor] = useState<string>('#0F172A');
  const [primaryColor, setPrimaryColor] = useState<string>('#38BDF8');
  const [secondaryColor, setSecondaryColor] = useState<string>('#EC4899');
  const [transparentBg, setTransparentBg] = useState<boolean>(false);

  const [spacing, setSpacing] = useState<number>(48);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [opacity, setOpacity] = useState<number>(0.9);
  const [density, setDensity] = useState<number>(12);
  const [seed, setSeed] = useState<number>(42);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check incoming palette from Color Palette Studio
  useEffect(() => {
    const incoming = consumePendingPatternColors();
    if (incoming) {
      setBgColor(incoming.background);
      setPrimaryColor(incoming.primary);
      setSecondaryColor(incoming.secondary);
    }
  }, [consumePendingPatternColors]);

  // Seeded PRNG
  const seededRandom = useCallback((s: number) => {
    let t = s + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }, []);

  // Generate SVG String
  const generateSvgString = useCallback(() => {
    const bgFill = transparentBg ? 'none' : bgColor;
    let patternElements = '';

    const cols = Math.ceil(width / spacing) + 2;
    const rows = Math.ceil(height / spacing) + 2;

    switch (patternType) {
      case 'dots': {
        const radius = (spacing / 5) * scale;
        const dots: string[] = [];
        for (let r = -1; r < rows; r++) {
          for (let c = -1; c < cols; c++) {
            const cx = c * spacing + (r % 2 === 1 ? spacing / 2 : 0);
            const cy = r * spacing;
            const col = (r + c) % 2 === 0 ? primaryColor : secondaryColor;
            dots.push(
              `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${col}" fill-opacity="${opacity}"/>`
            );
          }
        }
        patternElements = dots.join('\n');
        break;
      }

      case 'grid': {
        const lines: string[] = [];
        for (let x = 0; x <= width; x += spacing) {
          lines.push(
            `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${primaryColor}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}"/>`
          );
        }
        for (let y = 0; y <= height; y += spacing) {
          lines.push(
            `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${secondaryColor}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}"/>`
          );
        }
        patternElements = lines.join('\n');
        break;
      }

      case 'lines': {
        const lines: string[] = [];
        for (let y = 0; y <= height; y += spacing) {
          lines.push(
            `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${primaryColor}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}"/>`
          );
        }
        patternElements = lines.join('\n');
        break;
      }

      case 'stripes': {
        const count = Math.ceil((width + height) / spacing) * 2;
        const stripes: string[] = [];
        for (let i = -count; i <= count; i++) {
          const offset = i * spacing;
          const col = i % 2 === 0 ? primaryColor : secondaryColor;
          stripes.push(
            `<line x1="${offset}" y1="-500" x2="${offset}" y2="${height + 500}" stroke="${col}" stroke-width="${strokeWidth * 2}" stroke-opacity="${opacity}" transform="rotate(${rotation} ${width / 2} ${height / 2})"/>`
          );
        }
        patternElements = stripes.join('\n');
        break;
      }

      case 'checkerboard': {
        const squares: string[] = [];
        const size = spacing * scale;
        for (let r = 0; r < Math.ceil(height / size); r++) {
          for (let c = 0; c < Math.ceil(width / size); c++) {
            if ((r + c) % 2 === 0) {
              squares.push(
                `<rect x="${c * size}" y="${r * size}" width="${size}" height="${size}" fill="${primaryColor}" fill-opacity="${opacity}"/>`
              );
            }
          }
        }
        patternElements = squares.join('\n');
        break;
      }

      case 'circles': {
        const rings: string[] = [];
        for (let r = -1; r < rows; r++) {
          for (let c = -1; c < cols; c++) {
            const cx = c * spacing;
            const cy = r * spacing;
            const rad = (spacing / 2.2) * scale;
            rings.push(
              `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${primaryColor}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}"/>`,
              `<circle cx="${cx}" cy="${cy}" r="${rad * 0.5}" fill="${secondaryColor}" fill-opacity="${opacity * 0.7}"/>`
            );
          }
        }
        patternElements = rings.join('\n');
        break;
      }

      case 'geometry': {
        const polys: string[] = [];
        const s = spacing * scale;
        for (let r = -1; r < rows; r++) {
          for (let c = -1; c < cols; c++) {
            const cx = c * spacing + (r % 2 === 1 ? spacing / 2 : 0);
            const cy = r * spacing;
            const p1 = `${cx},${cy - s / 2}`;
            const p2 = `${cx + s / 2},${cy + s / 2}`;
            const p3 = `${cx - s / 2},${cy + s / 2}`;
            const col = (r + c) % 2 === 0 ? primaryColor : secondaryColor;
            polys.push(
              `<polygon points="${p1} ${p2} ${p3}" fill="${col}" fill-opacity="${opacity}" transform="rotate(${rotation} ${cx} ${cy})"/>`
            );
          }
        }
        patternElements = polys.join('\n');
        break;
      }

      case 'organic-blobs':
      default: {
        const blobs: string[] = [];
        for (let i = 0; i < density; i++) {
          const r1 = seededRandom(seed + i * 11);
          const r2 = seededRandom(seed + i * 23);
          const r3 = seededRandom(seed + i * 37);
          const r4 = seededRandom(seed + i * 49);

          const cx = r1 * width;
          const cy = r2 * height;
          const blobRadius = (80 + r3 * 160) * scale;
          const col = i % 2 === 0 ? primaryColor : secondaryColor;

          // Generate cubic bezier organic blob path
          const p1x = cx - blobRadius * 0.8;
          const p1y = cy;
          const c1x = cx - blobRadius * 0.7;
          const c1y = cy - blobRadius * (0.8 + r4 * 0.4);
          const c2x = cx + blobRadius * 0.7;
          const c2y = cy - blobRadius * (0.8 - r4 * 0.4);
          const p2x = cx + blobRadius * 0.9;
          const p2y = cy;
          const c3x = cx + blobRadius * (0.8 - r3 * 0.3);
          const c3y = cy + blobRadius * (0.9 + r1 * 0.2);
          const c4x = cx - blobRadius * (0.8 + r2 * 0.2);
          const c4y = cy + blobRadius * 0.8;

          blobs.push(
            `<path d="M ${p1x} ${p1y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2x} ${p2y} C ${c3x} ${c3y}, ${c4x} ${c4y}, ${p1x} ${p1y} Z" fill="${col}" fill-opacity="${opacity * 0.75}" transform="rotate(${rotation + i * 15} ${cx} ${cy})"/>`
          );
        }
        patternElements = blobs.join('\n');
        break;
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${transparentBg ? '' : `<rect width="${width}" height="${height}" fill="${bgFill}"/>`}
  ${patternElements}
</svg>`;
  }, [
    bgColor,
    density,
    height,
    opacity,
    patternType,
    primaryColor,
    rotation,
    scale,
    secondaryColor,
    seed,
    seededRandom,
    spacing,
    strokeWidth,
    transparentBg,
    width,
  ]);

  // Render on canvas for high-resolution preview and PNG export
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const svgString = generateSvgString();
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [generateSvgString, width, height]);

  // Export handlers
  const handleExportSvg = () => {
    const svgStr = generateSvgString();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattern_${patternType}_${width}x${height}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'SVG Vetorial Baixado', 'Arquivo vetorial pronto para edição no Figma.');
  };

  const handleCopySvgCode = () => {
    const svgStr = generateSvgString();
    navigator.clipboard.writeText(svgStr);
    showToast('success', 'Código SVG Copiado', 'Markup SVG pronto para colar em código.');
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pattern_${patternType}_${width}x${height}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'PNG Baixado com Sucesso');
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
              Pattern & Shape Studio
              <span className="text-[10px] bg-pink-50 text-pink-600 font-semibold px-2 py-0.5 rounded-full border border-pink-100">
                Módulo 03
              </span>
            </h1>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySvgCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Copiar SVG</span>
          </button>

          <button
            onClick={handleExportSvg}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-600" />
            <span>Baixar SVG</span>
          </button>

          <button
            onClick={handleExportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar PNG</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Controls Panel */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-zinc-200/80 p-5 overflow-y-auto space-y-4 shrink-0">
          {/* Pattern Type */}
          <div>
            <label className="text-xs font-semibold text-zinc-800 block mb-1.5">
              Tipo de Padrão
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'organic-blobs', label: 'Blobs Orgânicos' },
                { id: 'dots', label: 'Pontos (Dots)' },
                { id: 'grid', label: 'Grade Ortogonal' },
                { id: 'lines', label: 'Linhas Horizontais' },
                { id: 'stripes', label: 'Listras Diagonais' },
                { id: 'checkerboard', label: 'Xadrez' },
                { id: 'circles', label: 'Círculos' },
                { id: 'geometry', label: 'Geometria' },
              ].map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => setPatternType(pt.id as PatternType)}
                  className={`py-2 px-2.5 rounded-lg border text-left text-[11px] font-medium transition-all ${
                    patternType === pt.id
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-800 block">Cores do Padrão</span>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">Cor Primária</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-6 h-6 rounded border border-zinc-200 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono uppercase text-zinc-800">{primaryColor}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">Cor Secundária</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-6 h-6 rounded border border-zinc-200 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono uppercase text-zinc-800">{secondaryColor}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">Fundo Transparente</span>
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {!transparentBg && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600">Cor de Fundo</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-200 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono uppercase text-zinc-800">{bgColor}</span>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Sliders */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Espaçamento / Passo</span>
                <span className="font-mono text-zinc-900 font-semibold">{spacing}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="128"
                value={spacing}
                onChange={(e) => setSpacing(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Escala</span>
                <span className="font-mono text-zinc-900 font-semibold">{scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="3.0"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Rotação</span>
                <span className="font-mono text-zinc-900 font-semibold">{rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Espessura do Traço</span>
                <span className="font-mono text-zinc-900 font-semibold">{strokeWidth}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
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

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-zinc-500 font-medium block mb-1">Largura (px)</span>
                <input
                  type="number"
                  min="300"
                  max="2400"
                  step="50"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value, 10) || 800)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-800"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-medium block mb-1">Altura (px)</span>
                <input
                  type="number"
                  min="300"
                  max="2400"
                  step="50"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value, 10) || 800)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-800"
                />
              </div>
            </div>

            {patternType === 'organic-blobs' && (
              <div>
                <div className="flex justify-between text-xs text-zinc-700 mb-1">
                  <span>Densidade de Blobs</span>
                  <span className="font-mono text-zinc-900 font-semibold">{density}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={density}
                  onChange={(e) => setDensity(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Random Variation */}
          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
            className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Nova Variação (Seed)</span>
          </button>
        </aside>

        {/* Pattern Canvas Preview */}
        <main className="flex-1 p-6 md:p-10 flex items-center justify-center overflow-auto bg-zinc-100/70">
          <div
            className="relative shadow-2xl rounded-2xl overflow-hidden border border-zinc-200 transition-all max-w-full max-h-full"
            style={{
              width: `${Math.min(width, 700)}px`,
              aspectRatio: `${width} / ${height}`,
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
