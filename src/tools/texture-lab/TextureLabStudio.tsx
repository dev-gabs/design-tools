import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  Shuffle,
  ImagePlus,
  X,
} from 'lucide-react';
import { useChromalab } from '../../context/ChromalabContext';

type TextureType =
  | 'film-grain'
  | 'digital-noise'
  | 'subtle-paper'
  | 'halftone'
  | 'stippling'
  | 'micro-grid';

type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'color-dodge'
  | 'color-burn'
  | 'difference'
  | 'exclusion'
  | 'luminosity';

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
  const [blendMode, setBlendMode] = useState<BlendMode>('overlay');

  // Imported image state
  const [importedImage, setImportedImage] = useState<HTMLImageElement | null>(null);
  const [importedImageName, setImportedImageName] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);   // texture layer
  const imageFileRef = useRef<HTMLInputElement>(null);

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

  // Load image from file
  const loadImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Arquivo inválido', 'Selecione uma imagem (PNG, JPG, WebP, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImportedImage(img);
        setImportedImageName(file.name);
        setTransparentBg(false);
        showToast('success', 'Imagem importada', `"${file.name}" carregada como camada de fundo.`);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Render texture to canvas
  const renderTexture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use image's natural size when imported, otherwise use selected resolution (square)
    const w = importedImage ? importedImage.naturalWidth : resolution;
    const h = importedImage ? importedImage.naturalHeight : resolution;
    canvas.width = w;
    canvas.height = h;

    const rng = createRng(seed);

    // Draw background (image at native size or solid color)
    if (importedImage) {
      ctx.drawImage(importedImage, 0, 0, w, h);
    } else if (transparentBg) {
      ctx.clearRect(0, 0, w, h);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Create texture layer on a temp canvas then composite with blend mode
    const texCanvas = document.createElement('canvas');
    texCanvas.width = w;
    texCanvas.height = h;
    const texCtx = texCanvas.getContext('2d')!;
    const imgData = texCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Parse grain color RGB
    const rMatch = parseInt(grainColor.slice(1, 3), 16) || 255;
    const gMatch = parseInt(grainColor.slice(3, 5), 16) || 255;
    const bMatch = parseInt(grainColor.slice(5, 7), 16) || 255;

    switch (textureType) {
      case 'film-grain': {
        const step = Math.max(1, Math.round(scale));
        for (let py = 0; py < h; py += step) {
          for (let px = 0; px < w; px += step) {
            const rawNoise = (rng() + rng() + rng()) / 3 - 0.5;
            const finalVal = Math.max(0, Math.min(1, 0.5 + rawNoise * intensity * contrast));
            const alpha = Math.round(finalVal * opacity * 255);
            for (let dy = 0; dy < step && py + dy < h; dy++) {
              for (let dx = 0; dx < step && px + dx < w; dx++) {
                const idx = ((py + dy) * w + (px + dx)) * 4;
                data[idx] = rMatch; data[idx + 1] = gMatch; data[idx + 2] = bMatch; data[idx + 3] = alpha;
              }
            }
          }
        }
        break;
      }
      case 'digital-noise': {
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
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const idx = (py * w + px) * 4;
            const wave = Math.sin(px * 0.05 * scale) * Math.cos(py * 0.05 * scale);
            const fiber = rng() > 0.985 ? 0.35 : 0;
            const noise = (rng() - 0.5) * 0.15 + wave * 0.08 + fiber;
            const a = Math.round(Math.max(0, Math.min(1, 0.5 + noise * intensity)) * opacity * 160);
            data[idx] = rMatch; data[idx + 1] = gMatch; data[idx + 2] = bMatch; data[idx + 3] = a;
          }
        }
        break;
      }
      case 'halftone': {
        texCtx.putImageData(imgData, 0, 0);
        const dotSpacing = Math.round(18 * scale);
        texCtx.fillStyle = grainColor;
        texCtx.globalAlpha = opacity;
        for (let py = 0; py < h; py += dotSpacing) {
          for (let px = 0; px < w; px += dotSpacing) {
            const distFromCenter = Math.hypot(px - w / 2, py - h / 2) / (Math.max(w, h) * 0.7);
            const dotRadius = Math.max(0.5, (dotSpacing / 2) * intensity * (1 - distFromCenter * 0.4));
            texCtx.beginPath(); texCtx.arc(px, py, dotRadius, 0, Math.PI * 2); texCtx.fill();
          }
        }
        texCtx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
        ctx.drawImage(texCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        return;
      }
      case 'stippling': {
        const pointsCount = Math.round(20000 * intensity * (1 / Math.max(0.2, scale)));
        for (let i = 0; i < pointsCount; i++) {
          const px = Math.floor(rng() * w);
          const py = Math.floor(rng() * h);
          const idx = (py * w + px) * 4;
          data[idx] = rMatch; data[idx + 1] = gMatch; data[idx + 2] = bMatch; data[idx + 3] = Math.round(opacity * 255);
        }
        break;
      }
      case 'micro-grid': {
        const gridSize = Math.round(8 * scale);
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const idx = (py * w + px) * 4;
            const isLine = px % gridSize === 0 || py % gridSize === 0;
            const a = isLine ? Math.round(intensity * opacity * 255) : 0;
            data[idx] = rMatch; data[idx + 1] = gMatch; data[idx + 2] = bMatch; data[idx + 3] = a;
          }
        }
        break;
      }
    }

    texCtx.putImageData(imgData, 0, 0);
    ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
    ctx.drawImage(texCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }, [
    resolution, createRng, seed, transparentBg, bgColor, grainColor,
    textureType, scale, intensity, contrast, opacity, blendMode, importedImage,
  ]);

  useEffect(() => {
    renderTexture();
  }, [renderTexture]);

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const ch = canvas.height;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `texture_${textureType}_${cw}x${ch}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Textura Exportada', `Arquivo PNG (${cw}×${ch}px) baixado.`);
    }, 'image/png');
  };

  const BLEND_MODES: { value: BlendMode; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'screen', label: 'Screen' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'soft-light', label: 'Soft Light' },
    { value: 'hard-light', label: 'Hard Light' },
    { value: 'color-dodge', label: 'Color Dodge' },
    { value: 'color-burn', label: 'Color Burn' },
    { value: 'difference', label: 'Difference' },
    { value: 'exclusion', label: 'Exclusion' },
    { value: 'luminosity', label: 'Luminosity' },
  ];

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#FBFBFE] text-[#17172A] select-none">
      {/* Top Chromalab Bar */}
      <header className="h-14 bg-white border-b border-[#E7E7F0] px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateToTool('hub')}
            className="flex items-center gap-1.5 text-xs font-medium text-[#62647A] hover:text-[#7655D9] transition-colors py-1.5 px-2.5 rounded-lg hover:bg-[#F5F2FF] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chromalab</span>
          </button>
          <div className="h-4 w-[1px] bg-[#E7E7F0]" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#17172A] flex items-center gap-2">
              Texture Lab
              <span className="text-[10px] bg-[#EEF2FF] text-[#7655D9] font-semibold px-2 py-0.5 rounded-full border border-[#D6D1F3]">
                Módulo 04
              </span>
            </h1>
          </div>
        </div>
        <button
          onClick={handleExportPng}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold shadow-sm shadow-[#7655D9]/20 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar PNG</span>
        </button>
      </header>

      {/* Main Studio Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Controls Sidebar */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-[#E7E7F0] p-5 overflow-y-auto space-y-4 shrink-0">

          {/* Image Import */}
          <div>
            <label className="text-xs font-semibold text-[#17172A] block mb-1.5">
              Imagem de Fundo
            </label>
            {importedImage ? (
              <div className="flex items-center gap-2 p-2 bg-[#F4F5FA] rounded-xl border border-[#E7E7F0]">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#E7E7F0] shrink-0">
                  <img
                    src={canvasRef.current?.toDataURL() ?? ''}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#17172A] truncate">{importedImageName}</div>
                  <div className="text-[10px] text-[#85869A]">{importedImage.width}×{importedImage.height}px</div>
                </div>
                <button
                  onClick={() => { setImportedImage(null); setImportedImageName(''); }}
                  className="p-1 text-[#85869A] hover:text-red-500 rounded cursor-pointer shrink-0"
                ><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isDraggingOver
                    ? 'border-[#7655D9] bg-[#F3EEFF]'
                    : 'border-[#E7E7F0] hover:border-[#D6D1F3] hover:bg-[#F5F2FF]'
                }`}
                onClick={() => imageFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) loadImageFile(file);
                }}
              >
                <ImagePlus className="w-5 h-5 text-[#A99AEF] mx-auto mb-1" />
                <div className="text-xs text-[#62647A] font-medium">Solte ou clique para importar</div>
                <div className="text-[10px] text-[#85869A] mt-0.5">PNG, JPG, WebP, SVG</div>
              </div>
            )}
            <input
              ref={imageFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImageFile(f); e.target.value = ''; }}
            />
          </div>

          {/* Texture Type */}
          <div>
            <label className="text-xs font-semibold text-[#17172A] block mb-1.5">
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
                  className={`py-2 px-2.5 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer ${
                    textureType === t.id
                      ? 'bg-[#7655D9] border-[#7655D9] text-white font-semibold shadow-xs'
                      : 'bg-[#F4F5FA] border-[#E7E7F0] text-[#62647A] hover:text-[#17172A] hover:bg-[#F5F2FF]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blend Mode */}
          <div>
            <label className="text-xs font-semibold text-[#17172A] block mb-1.5">
              Modo de Mesclagem
            </label>
            <select
              value={blendMode}
              onChange={(e) => setBlendMode(e.target.value as BlendMode)}
              className="w-full bg-[#F4F5FA] border border-[#E7E7F0] focus:border-[#7655D9] rounded-xl px-3 py-2 text-xs text-[#17172A] focus:outline-none cursor-pointer"
            >
              {BLEND_MODES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* Resolution — hidden when image is imported (uses image native size) */}
          {importedImage ? (
            <div className="flex items-center justify-between p-3 bg-[#EEF2FF] rounded-xl border border-[#D6D1F3]">
              <span className="text-xs font-semibold text-[#17172A]">Resolução da Imagem</span>
              <span className="text-xs font-mono text-[#7655D9] font-bold">
                {importedImage.naturalWidth}×{importedImage.naturalHeight}px
              </span>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-[#17172A] block mb-1.5">
                Resolução de Exportação
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[512, 1024, 2048].map((res) => (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`py-1.5 px-2 rounded-lg border text-xs text-center font-mono cursor-pointer transition-all ${
                      resolution === res
                        ? 'bg-[#7655D9] border-[#7655D9] text-white font-semibold shadow-xs'
                        : 'bg-[#F4F5FA] border-[#E7E7F0] text-[#62647A] hover:text-[#17172A] hover:bg-[#F5F2FF]'
                    }`}
                  >
                    {res}px
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sliders */}
          <div className="space-y-3 pt-2 border-t border-[#E7E7F0]">
            {[
              { label: 'Intensidade', val: intensity, set: setIntensity, min: 0.05, max: 1.0, step: 0.02, fmt: (v: number) => `${Math.round(v * 100)}%` },
              { label: 'Escala da Granulação', val: scale, set: setScale, min: 0.5, max: 4.0, step: 0.1, fmt: (v: number) => `${v.toFixed(1)}x` },
              { label: 'Contraste', val: contrast, set: setContrast, min: 0.5, max: 2.5, step: 0.1, fmt: (v: number) => `${v.toFixed(1)}x` },
              { label: 'Opacidade da Textura', val: opacity, set: setOpacity, min: 0.05, max: 1.0, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
            ].map(({ label, val, set, min, max, step, fmt }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-[#62647A] mb-1">
                  <span>{label}</span>
                  <span className="font-mono text-[#7655D9] font-semibold">{fmt(val)}</span>
                </div>
                <input
                  type="range" min={min} max={max} step={step} value={val}
                  onChange={(e) => set(parseFloat(e.target.value))}
                  className="w-full accent-[#7655D9] bg-[#E7E7F0] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Color & Transparency */}
          <div className="space-y-2.5 pt-2 border-t border-[#E7E7F0] text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#62647A]">Cor da Textura</span>
              <div className="flex items-center gap-2">
                <input
                  type="color" value={grainColor} onChange={(e) => setGrainColor(e.target.value)}
                  className="w-6 h-6 rounded border border-[#E7E7F0] cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[#17172A]">{grainColor}</span>
              </div>
            </div>

            {!importedImage && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[#62647A]">Fundo Transparente</span>
                  <input
                    type="checkbox" checked={transparentBg} onChange={(e) => setTransparentBg(e.target.checked)}
                    className="w-4 h-4 accent-[#7655D9] rounded cursor-pointer"
                  />
                </div>
                {!transparentBg && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#62647A]">Cor de Fundo</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                        className="w-6 h-6 rounded border border-[#E7E7F0] cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[#17172A]">{bgColor}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
            className="w-full py-2 bg-[#F4F5FA] hover:bg-[#F5F2FF] border border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A] rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Nova Amostragem (Seed)</span>
          </button>
        </aside>

        {/* Live Canvas Viewport */}
        <main className="flex-1 p-6 md:p-10 flex items-center justify-center overflow-auto bg-[#FBFBFE] bg-dotted-grid-subtle relative">
          <div
            className="relative shadow-xl shadow-purple-900/5 rounded-2xl overflow-hidden border border-[#D6D1F3] bg-white transition-all"
            style={importedImage ? {
              // Match image aspect ratio, capped at 720px on longest side
              width: importedImage.naturalWidth >= importedImage.naturalHeight
                ? `min(720px, 100%)`
                : `min(${Math.round(720 * importedImage.naturalWidth / importedImage.naturalHeight)}px, 100%)`,
              aspectRatio: `${importedImage.naturalWidth} / ${importedImage.naturalHeight}`,
            } : {
              width: '560px',
              height: '560px',
              backgroundImage: (transparentBg && !importedImage)
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
