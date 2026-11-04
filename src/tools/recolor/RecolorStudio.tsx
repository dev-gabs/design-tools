import React, { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import {
  ArrowLeft,
  Download,
  ImagePlus,
  X,
  Plus,
  Trash2,
  Undo2,
  Eraser,
  MousePointerClick,
  Palette,
  Archive,
  AlertTriangle,
  Sparkles,
  Brush,
} from 'lucide-react';
import { useChromalab } from '../../context/ChromalabContext';
import {
  imageToLab,
  buildMatte,
  matteFromMask,
  regionStats,
  suggestTolerance,
  recolorPixels,
  type LabImage,
  type SelectionSeed,
  type BrushStroke,
  type SelectionOptions,
  type RecolorOptions,
} from '../../engine/recolor';
import { createZip } from '../../engine/zip';
import { SamClient, type SamMasks } from '../../engine/sam';

interface Variant {
  id: string;
  name: string;
  hex: string;
}

type ViewMode = 'result' | 'original' | 'mask';
type AiStatus = 'off' | 'loading' | 'ready' | 'error';
type SelectTool = 'click' | 'brush';
type ExportSize = 'original' | '1200' | '2000';

// Working resolution for selection and live preview; exports run at the image's native size
const PREVIEW_MAX = 1200;
const THUMB_MAX = 200;
// Auto tolerance needs enough detail to keep thin parts (rims, arms) connected
const ANALYSIS_MAX = 400;

const DEFAULT_VARIANTS: Variant[] = [
  { id: 'v-red', name: 'Vermelho', hex: '#D62839' },
  { id: 'v-green', name: 'Verde', hex: '#2F9E44' },
  { id: 'v-yellow', name: 'Amarelo', hex: '#F2B705' },
  { id: 'v-black', name: 'Preto', hex: '#1E1E24' },
];

const EXPORT_SIZES: { id: ExportSize; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: '1200', label: '1200²' },
  { id: '2000', label: '2000²' },
];

const fitSize = (w: number, h: number, max: number) => {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
};

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'variante';

const randomHex = () =>
  `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
};

export const RecolorStudio: React.FC = () => {
  const { navigateToTool, showToast, activePalette, consumePendingRecolorColors } = useChromalab();

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [seeds, setSeeds] = useState<SelectionSeed[]>([]);
  // Brush strokes refine the selection by hand; history keeps clicks and strokes in order for undo
  const [tool, setTool] = useState<SelectTool>('click');
  const [brushSize, setBrushSize] = useState(24); // radius in px of the working image
  const [strokes, setStrokes] = useState<BrushStroke[]>([]);
  const [history, setHistory] = useState<('seed' | 'stroke')[]>([]);
  const strokeRef = useRef<BrushStroke | null>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const brushCursorRef = useRef<HTMLDivElement>(null);
  const [clickMode, setClickMode] = useState<'add' | 'subtract'>('add');
  const [tolerance, setTolerance] = useState(0.06);
  const [autoTolerance, setAutoTolerance] = useState(true);
  const [contiguous, setContiguous] = useState(true);
  const [fillHoles, setFillHoles] = useState(true);
  const [closeRadius, setCloseRadius] = useState(2);
  const [edge, setEdge] = useState(2);

  const [variants, setVariants] = useState<Variant[]>(DEFAULT_VARIANTS);
  const [activeId, setActiveId] = useState(DEFAULT_VARIANTS[0].id);
  const [lightness, setLightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [highlights, setHighlights] = useState(0.5);
  const [hueVariation, setHueVariation] = useState(0.3);
  const [intensity, setIntensity] = useState(1);

  const [view, setView] = useState<ViewMode>('result');
  const [exportSize, setExportSize] = useState<ExportSize>('original');
  const [transparentBg, setTransparentBg] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // AI selection (SlimSAM): the model loads on demand, analyzes each image once, then answers clicks
  const [aiStatus, setAiStatus] = useState<AiStatus>('off');
  const [aiProgress, setAiProgress] = useState(0);
  const [aiDevice, setAiDevice] = useState<'webgpu' | 'wasm' | null>(null);
  const [embedded, setEmbedded] = useState<LabImage | null>(null);
  const [aiResult, setAiResult] = useState<SamMasks | null>(null);
  const [aiChoice, setAiChoice] = useState<number | null>(null); // null = the model's best guess
  const samRef = useRef<SamClient | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Palette sent from Color Palette Studio becomes the variant list
  useEffect(() => {
    const incoming = consumePendingRecolorColors();
    if (incoming && incoming.length > 0) {
      const next = incoming.map((hex, i) => ({ id: `v-${Date.now()}-${i}`, name: `Cor ${i + 1}`, hex }));
      setVariants(next);
      setActiveId(next[0].id);
    }
  }, [consumePendingRecolorColors]);

  const working = useMemo(() => {
    if (!image) return null;
    const { width, height } = fitSize(image.naturalWidth, image.naturalHeight, PREVIEW_MAX);
    return imageToLab(image, width, height);
  }, [image]);

  const thumbSource = useMemo(() => {
    if (!image) return null;
    const { width, height } = fitSize(image.naturalWidth, image.naturalHeight, THUMB_MAX);
    return imageToLab(image, width, height);
  }, [image]);

  const analysisSource = useMemo(() => {
    if (!image) return null;
    const { width, height } = fitSize(image.naturalWidth, image.naturalHeight, ANALYSIS_MAX);
    return imageToLab(image, width, height);
  }, [image]);

  const selectionOptions = useMemo<SelectionOptions>(
    () => ({ tolerance, contiguous, fillHoles, closeRadius, edge }),
    [tolerance, contiguous, fillHoles, closeRadius, edge],
  );
  const deferredOptions = useDeferredValue(selectionOptions);

  // Everything but the target color, shared by preview, thumbnails and export
  const toneOptions = useMemo<Omit<RecolorOptions, 'targetHex'>>(
    () => ({ lightness, contrast, highlights, hueVariation, intensity }),
    [lightness, contrast, highlights, hueVariation, intensity],
  );
  const previewTone = useDeferredValue(toneOptions);

  const aiActive = aiStatus === 'loading' || aiStatus === 'ready';
  const aiReady = aiStatus === 'ready' && !!working && embedded === working;
  const aiAnalyzing = aiStatus === 'ready' && !!working && embedded !== working;

  useEffect(() => () => samRef.current?.dispose(), []);

  // Encode each new image once; clicks then only run the fast decoder
  useEffect(() => {
    const client = samRef.current;
    if (!client || aiStatus !== 'ready' || !working || embedded === working) return;
    let cancelled = false;
    client
      .embed(working.rgba, working.width, working.height)
      .then((device) => {
        if (cancelled) return;
        setAiDevice(device);
        setEmbedded(working);
      })
      .catch((err) => { if (!cancelled) showToast('error', 'Erro ao analisar a imagem', err.message); });
    return () => { cancelled = true; };
  }, [aiStatus, working, embedded, showToast]);

  useEffect(() => {
    const client = samRef.current;
    if (!client || !aiReady || seeds.length === 0) return;
    let cancelled = false;
    client
      .decode(seeds.map((s) => ({ x: s.x, y: s.y, label: s.mode === 'add' ? 1 : 0 })))
      .then((result) => { if (!cancelled) setAiResult(result); })
      .catch((err) => { if (!cancelled) showToast('error', 'Erro na seleção com IA', err.message); });
    return () => { cancelled = true; };
  }, [aiReady, seeds, showToast]);

  // The previous result stays on screen while the next click is decoded, avoiding a flicker
  const aiMasks = aiActive && aiReady && seeds.length > 0 && aiResult && aiResult.width === working?.width
    && aiResult.height === working?.height ? aiResult : null;

  // SAM answers with three nested candidates; list them from smallest to largest
  const aiCandidates = useMemo(() => {
    if (!aiMasks) return [];
    return aiMasks.masks
      .map((mask, index) => {
        let area = 0;
        for (let i = 0; i < mask.length; i++) area += mask[i];
        return { index, area: area / mask.length, score: aiMasks.scores[index] };
      })
      .sort((a, b) => a.area - b.area);
  }, [aiMasks]);
  const bestCandidate = aiCandidates.length
    ? aiCandidates.reduce((best, c) => (c.score > best.score ? c : best)).index
    : null;
  const chosenCandidate = aiChoice ?? bestCandidate;

  const matte = useMemo(() => {
    if (!working || (seeds.length === 0 && strokes.length === 0)) return null;
    if (aiActive) {
      if (seeds.length > 0 && (!aiMasks || chosenCandidate === null)) return null;
      const mask = seeds.length > 0 && aiMasks && chosenCandidate !== null ? aiMasks.masks[chosenCandidate] : null;
      return matteFromMask(working, mask, deferredOptions, strokes);
    }
    return buildMatte(working, seeds, deferredOptions, strokes);
  }, [working, seeds, strokes, deferredOptions, aiActive, aiMasks, chosenCandidate]);

  const resetSelection = () => {
    setSeeds([]);
    setStrokes([]);
    setHistory([]);
  };

  const undoLast = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(history.slice(0, -1));
    if (last === 'stroke') {
      setStrokes(strokes.slice(0, -1));
      return;
    }
    const next = seeds.slice(0, -1);
    setSeeds(next);
    if (next.length > 0) setTolerance(next[next.length - 1].tolerance ?? tolerance);
  };

  // The brush shows the selection itself, so it switches to the selection view
  const selectTool = (next: SelectTool) => {
    setTool(next);
    if (next === 'brush' && view === 'result') setView('mask');
    if (next === 'click' && view === 'mask') setView('result');
  };

  useEffect(() => {
    if (tool !== 'brush') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '[') setBrushSize((size) => Math.max(2, Math.round(size / 1.25)));
      if (e.key === ']') setBrushSize((size) => Math.min(120, Math.round(size * 1.25)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  // The stroke being drawn lives on an overlay until the selection catches up with it
  useEffect(() => {
    const overlay = overlayRef.current;
    if (overlay && !strokeRef.current) overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
  }, [matte]);

  const drawStrokePreview = () => {
    const overlay = overlayRef.current;
    const stroke = strokeRef.current;
    if (!overlay || !working || !stroke) return;
    overlay.width = working.width;
    overlay.height = working.height;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    const color = stroke.mode === 'add' ? 'rgba(118, 85, 217, 0.55)' : 'rgba(239, 68, 68, 0.55)';
    const r = stroke.radius * working.width;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (stroke.points.length === 1) {
      ctx.arc(stroke.points[0].x * working.width, stroke.points[0].y * working.height, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    stroke.points.forEach((pt, i) => {
      const px = pt.x * working.width;
      const py = pt.y * working.height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  };

  const moveBrushCursor = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cursor = brushCursorRef.current;
    if (!cursor || !working) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const d = (brushSize * 2 * rect.width) / working.width;
    // Updated directly on the element: re-rendering the studio on every mouse move would be wasteful
    cursor.style.display = 'block';
    cursor.style.width = `${d}px`;
    cursor.style.height = `${d}px`;
    cursor.style.left = `${e.clientX - rect.left - d / 2}px`;
    cursor.style.top = `${e.clientY - rect.top - d / 2}px`;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'brush' || !working || e.button !== 0) return;
    // Keeps the stroke going when the pointer leaves the canvas mid-drag
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer already released: the stroke still works, it just ends at the canvas edge
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const opposite = clickMode === 'add' ? 'subtract' : 'add';
    strokeRef.current = {
      mode: e.altKey ? opposite : clickMode,
      radius: brushSize / working.width,
      points: [{ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }],
    };
    drawStrokePreview();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'brush' || !working) return;
    moveBrushCursor(e);
    const stroke = strokeRef.current;
    if (!stroke) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const last = stroke.points[stroke.points.length - 1];
    if (Math.hypot((x - last.x) * working.width, (y - last.y) * working.height) < Math.max(1, brushSize * 0.25)) return;
    stroke.points.push({ x, y });
    drawStrokePreview();
  };

  const finishStroke = () => {
    const stroke = strokeRef.current;
    if (!stroke) return;
    strokeRef.current = null;
    setStrokes((prev) => [...prev, stroke]);
    setHistory((prev) => [...prev, 'stroke']);
  };

  const enableAi = async () => {
    resetSelection();
    if (samRef.current) {
      setAiStatus('ready');
      return;
    }
    setAiStatus('loading');
    setAiProgress(0);
    // Total size grows as each model file is discovered, so never let the bar move backwards
    const client = new SamClient((fraction) => setAiProgress((prev) => Math.max(prev, fraction)));
    samRef.current = client;
    try {
      setAiDevice(await client.whenReady());
      setAiStatus('ready');
    } catch (err) {
      client.dispose();
      samRef.current = null;
      setAiStatus('error');
      showToast('error', 'IA indisponível', err instanceof Error ? err.message : undefined);
    }
  };

  const disableAi = () => {
    setAiStatus('off');
    resetSelection();
  };

  const stats = useMemo(() => (working && matte ? regionStats(working, matte) : null), [working, matte]);

  const activeVariant = variants.find((v) => v.id === activeId) ?? variants[0];

  // Live preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !working) return;
    canvas.width = working.width;
    canvas.height = working.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height, rgba } = working;

    if (!matte || !stats || view === 'original' || !activeVariant) {
      ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
      return;
    }

    if (view === 'mask') {
      // Tint the selected area with the Chromalab purple (#7655D9)
      const out = new Uint8ClampedArray(rgba);
      for (let i = 0; i < matte.alpha.length; i++) {
        const o = i * 4;
        const k = matte.alpha[i] * 0.65;
        out[o] = out[o] * (1 - k) + 118 * k;
        out[o + 1] = out[o + 1] * (1 - k) + 85 * k;
        out[o + 2] = out[o + 2] * (1 - k) + 217 * k;
      }
      ctx.putImageData(new ImageData(out, width, height), 0, 0);
      return;
    }

    const pixels = recolorPixels(
      { rgba, width, height, matte, stats, transparentBackground: transparentBg },
      { targetHex: activeVariant.hex, ...previewTone },
    );
    ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
  }, [working, matte, stats, view, activeVariant, previewTone, transparentBg]);

  // Small previews of every variant for the sidebar
  const thumbnails = useMemo(() => {
    const result: Record<string, string> = {};
    if (!thumbSource || !matte || !stats) return result;
    const canvas = document.createElement('canvas');
    canvas.width = thumbSource.width;
    canvas.height = thumbSource.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return result;
    for (const variant of variants) {
      const pixels = recolorPixels(
        {
          rgba: thumbSource.rgba,
          width: thumbSource.width,
          height: thumbSource.height,
          matte,
          stats,
        },
        { targetHex: variant.hex, ...previewTone },
      );
      ctx.putImageData(new ImageData(pixels, thumbSource.width, thumbSource.height), 0, 0);
      result[variant.id] = canvas.toDataURL('image/png');
    }
    return result;
  }, [thumbSource, matte, stats, variants, previewTone]);

  const loadImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Arquivo inválido', 'Selecione uma imagem (PNG, JPG, WebP, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setFileName(file.name);
        resetSelection();
        setView('result');
        showToast('info', 'Imagem carregada', 'Clique no produto para selecioná-lo.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const mode = e.altKey ? 'subtract' : e.shiftKey ? 'add' : clickMode;
    if (aiActive) {
      setAiChoice(null);
      setSeeds((prev) => [...prev, { x, y, mode }]);
      setHistory((prev) => [...prev, 'seed']);
      if (view === 'original') setView('result');
      return;
    }
    // Each click keeps its own tolerance, so tuning one area never makes another leak
    let seedTolerance = tolerance;
    if (autoTolerance && mode === 'add' && analysisSource) {
      // Touch-up clicks are measured against what is already selected, so they stop before leaking
      const selected = seeds.length > 0
        ? buildMatte(analysisSource, seeds, { ...selectionOptions, edge: 0 }).alpha
        : undefined;
      seedTolerance = suggestTolerance(analysisSource, { x, y, mode }, selected) ?? tolerance;
    }
    setTolerance(seedTolerance);
    setSeeds((prev) => [...prev, { x, y, mode, tolerance: seedTolerance }]);
    setHistory((prev) => [...prev, 'seed']);
    if (view === 'original') setView('result');
  };

  const updateVariant = (id: string, patch: Partial<Variant>) =>
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const addVariant = () => {
    const variant = { id: `v-${Date.now()}`, name: `Cor ${variants.length + 1}`, hex: randomHex() };
    setVariants((prev) => [...prev, variant]);
    setActiveId(variant.id);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 1) return;
    const next = variants.filter((v) => v.id !== id);
    setVariants(next);
    if (activeId === id) setActiveId(next[0].id);
  };

  const useActivePalette = () => {
    const next = activePalette.map((hex, i) => ({ id: `v-${Date.now()}-${i}`, name: `Cor ${i + 1}`, hex }));
    if (next.length === 0) return;
    setVariants(next);
    setActiveId(next[0].id);
    showToast('success', 'Paleta aplicada', `${next.length} variantes criadas a partir da paleta ativa.`);
  };

  const baseName = slug(fileName.replace(/\.[^.]+$/, '')) || 'produto';
  const variantFileName = (v: Variant) => `${baseName}_${slug(v.name)}_${v.hex.slice(1).toLowerCase()}.png`;

  // Renders a variant at the image's native resolution, then fits it to the chosen export size
  const renderVariant = (source: Uint8ClampedArray, variant: Variant): Promise<Blob> => {
    if (!image || !matte || !stats) return Promise.reject(new Error('Nada selecionado'));
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const pixels = recolorPixels(
      {
        rgba: source,
        width: w,
        height: h,
        matte,
        stats,
        transparentBackground: transparentBg,
      },
      { targetHex: variant.hex, ...toneOptions },
    );
    let out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    out.getContext('2d')!.putImageData(new ImageData(pixels, w, h), 0, 0);

    if (exportSize !== 'original') {
      const size = Number(exportSize);
      const square = document.createElement('canvas');
      square.width = size;
      square.height = size;
      const ctx = square.getContext('2d')!;
      if (!transparentBg) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
      }
      const scale = Math.min(size / w, size / h);
      const dw = Math.round(w * scale);
      const dh = Math.round(h * scale);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(out, Math.round((size - dw) / 2), Math.round((size - dh) / 2), dw, dh);
      out = square;
    }

    return new Promise((resolve, reject) =>
      out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar PNG'))), 'image/png'),
    );
  };

  const readSourcePixels = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image!.naturalWidth;
    canvas.height = image!.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(image!, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  };

  const exportCurrent = async () => {
    if (!activeVariant || !stats) return;
    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 0));
      const blob = await renderVariant(readSourcePixels(), activeVariant);
      downloadBlob(blob, variantFileName(activeVariant));
      showToast('success', 'Variante exportada', `"${activeVariant.name}" baixada em PNG.`);
    } catch (err) {
      showToast('error', 'Erro na exportação', err instanceof Error ? err.message : undefined);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAll = async () => {
    if (!stats) return;
    setIsExporting(true);
    try {
      const source = readSourcePixels();
      const entries = [];
      for (const variant of variants) {
        await new Promise((r) => setTimeout(r, 0)); // let the UI breathe between variants
        const blob = await renderVariant(source, variant);
        entries.push({ name: variantFileName(variant), data: new Uint8Array(await blob.arrayBuffer()) });
      }
      downloadBlob(createZip(entries), `${baseName}_variantes.zip`);
      showToast('success', 'Variantes exportadas', `${entries.length} imagens em um arquivo ZIP.`);
    } catch (err) {
      showToast('error', 'Erro na exportação', err instanceof Error ? err.message : undefined);
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = !!stats && !isExporting;
  const isNeutralSource = !!stats && stats.C < 0.03;

  const segmentedButton = (active: boolean) =>
    `py-1.5 px-2 rounded-lg border text-[11px] font-medium text-center transition-all cursor-pointer ${
      active
        ? 'bg-[#7655D9] border-[#7655D9] text-white font-semibold shadow-xs'
        : 'bg-[#F4F5FA] border-[#E7E7F0] text-[#62647A] hover:text-[#17172A] hover:bg-[#F5F2FF]'
    }`;

  const sliders = [
    // Dragging the slider means the user wants to control it, so auto mode steps aside
    { label: seeds.length > 0 ? 'Tolerância do último clique' : 'Tolerância de cor', val: tolerance, set: (v: number) => {
      setTolerance(v);
      setAutoTolerance(false);
      setSeeds((prev) => prev.map((seed, i) => (i === prev.length - 1 ? { ...seed, tolerance: v } : seed)));
    }, min: 0.02, max: 0.4, step: 0.01, fmt: (v: number) => `${Math.round(v * 100)}` },
    { label: 'Preencher buracos', val: closeRadius, set: setCloseRadius, min: 0, max: 8, step: 1, fmt: (v: number) => `${v}px` },
    { label: 'Recorte da borda', val: edge, set: setEdge, min: 0, max: 6, step: 1, fmt: (v: number) => `${v}px` },
  ];

  const colorSliders = [
    { label: 'Luminosidade da cor alvo', val: lightness, set: setLightness, min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
    { label: 'Contraste (brilho acetinado)', val: contrast, set: setContrast, min: 0.5, max: 2.5, step: 0.05, fmt: (v: number) => `${v.toFixed(2)}x` },
    { label: 'Preservar reflexos', val: highlights, set: setHighlights, min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
    { label: 'Variação de tom original', val: hueVariation, set: setHueVariation, min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
    { label: 'Intensidade', val: intensity, set: setIntensity, min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
  ];

  const renderSlider = ({ label, val, set, min, max, step, fmt }: (typeof sliders)[number]) => (
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
  );

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
          <h1 className="text-sm font-bold tracking-tight text-[#17172A] flex items-center gap-2 whitespace-nowrap">
            Recolor Studio
            <span className="hidden sm:inline text-[10px] bg-[#EEF2FF] text-[#7655D9] font-semibold px-2 py-0.5 rounded-full border border-[#D6D1F3]">
              Módulo 07
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCurrent}
            disabled={!canExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F5FA] hover:bg-[#F5F2FF] text-[#17172A] border border-[#E7E7F0] hover:border-[#D6D1F3] rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Baixar a variante selecionada em PNG"
          >
            <Download className="w-3.5 h-3.5 text-[#7655D9]" />
            <span className="hidden md:inline">Exportar atual</span>
          </button>
          <button
            onClick={exportAll}
            disabled={!canExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold shadow-sm shadow-[#7655D9]/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Baixar todas as variantes em um arquivo ZIP"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exportando…' : `Exportar ${variants.length} (ZIP)`}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Controls Sidebar */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-[#E7E7F0] p-5 overflow-y-auto space-y-4 shrink-0 max-h-[45vh] md:max-h-none">
          {/* Image */}
          <div>
            <label className="text-xs font-semibold text-[#17172A] block mb-1.5">Foto do Produto</label>
            {image ? (
              <div className="flex items-center gap-2 p-2 bg-[#F4F5FA] rounded-xl border border-[#E7E7F0]">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#E7E7F0] shrink-0 bg-white">
                  <img src={image.src} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#17172A] truncate">{fileName}</div>
                  <div className="text-[10px] text-[#85869A]">{image.naturalWidth}×{image.naturalHeight}px</div>
                </div>
                <button
                  onClick={() => imageFileRef.current?.click()}
                  className="text-[10px] font-semibold text-[#7655D9] hover:underline cursor-pointer shrink-0"
                >Trocar</button>
                <button
                  onClick={() => { setImage(null); setFileName(''); resetSelection(); }}
                  className="p-1 text-[#85869A] hover:text-red-500 rounded cursor-pointer shrink-0"
                ><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button
                onClick={() => imageFileRef.current?.click()}
                className="w-full border-2 border-dashed border-[#E7E7F0] hover:border-[#D6D1F3] hover:bg-[#F5F2FF] rounded-xl p-3 text-xs text-[#62647A] font-medium cursor-pointer flex items-center justify-center gap-2"
              >
                <ImagePlus className="w-4 h-4 text-[#A99AEF]" /> Importar foto
              </button>
            )}
            <input
              ref={imageFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImageFile(f); e.target.value = ''; }}
            />
          </div>

          {/* Selection */}
          <div className="space-y-3 pt-2 border-t border-[#E7E7F0]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#17172A]">Seleção do Objeto</span>
              <div className="flex gap-1">
                <button
                  onClick={undoLast}
                  disabled={history.length === 0}
                  title="Desfazer último clique ou pincelada"
                  className="p-1.5 rounded-lg text-[#62647A] hover:bg-[#F5F2FF] hover:text-[#7655D9] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                ><Undo2 className="w-3.5 h-3.5" /></button>
                <button
                  onClick={resetSelection}
                  disabled={history.length === 0}
                  title="Limpar seleção"
                  className="p-1.5 rounded-lg text-[#62647A] hover:bg-[#F5F2FF] hover:text-red-500 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                ><Eraser className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => selectTool('click')} className={`${segmentedButton(tool === 'click')} flex items-center justify-center gap-1`}>
                <MousePointerClick className="w-3 h-3" /> Clique
              </button>
              <button onClick={() => selectTool('brush')} className={`${segmentedButton(tool === 'brush')} flex items-center justify-center gap-1`}>
                <Brush className="w-3 h-3" /> Pincel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setClickMode('add')} className={segmentedButton(clickMode === 'add')}>+ Adicionar</button>
              <button onClick={() => setClickMode('subtract')} className={segmentedButton(clickMode === 'subtract')}>− Remover</button>
            </div>
            {tool === 'brush' && (
              <>
                {renderSlider({ label: 'Tamanho do pincel', val: brushSize, set: setBrushSize, min: 2, max: 120, step: 1, fmt: (v: number) => `${v}px` })}
                <p className="text-[10px] text-[#85869A] leading-relaxed">
                  Pinte sobre a imagem para somar ou tirar áreas da seleção; o pincel vale por cima dos cliques e da IA.
                  Alt inverte o modo, [ e ] mudam o tamanho.
                </p>
              </>
            )}
            {/* AI selection */}
            <div className="p-2.5 rounded-xl border border-[#D6D1F3] bg-[#F5F2FF] space-y-2">
              {aiStatus === 'off' || aiStatus === 'error' ? (
                <>
                  <button
                    onClick={enableAi}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiStatus === 'error' ? 'Tentar ativar a IA de novo' : 'Ativar seleção com IA'}
                    <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded">BETA</span>
                  </button>
                  <p className="text-[10px] text-[#62647A] leading-relaxed">
                    Entende a forma do objeto, não só a cor: ideal para fundos parecidos com o produto.
                    Baixa ~20 MB na primeira vez e roda no seu computador.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-semibold text-[#5B3DB5]">
                      <Sparkles className="w-3.5 h-3.5" />
                      {aiStatus === 'loading'
                        ? `Baixando modelo… ${Math.round(aiProgress * 100)}%`
                        : aiAnalyzing
                          ? 'Analisando a imagem…'
                          : `IA ativa · ${aiDevice === 'webgpu' ? 'GPU' : 'CPU'}`}
                    </span>
                    <button onClick={disableAi} className="text-[10px] font-semibold text-[#7655D9] hover:underline cursor-pointer">
                      Usar seleção por cor
                    </button>
                  </div>
                  {aiAnalyzing && (
                    <p className="text-[10px] text-[#62647A] leading-relaxed">
                      Feito uma vez por foto. Depois disso, cada clique responde rápido.
                    </p>
                  )}
                  {aiStatus === 'loading' && (
                    <div className="h-1.5 bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-[#7655D9] transition-all" style={{ width: `${Math.round(aiProgress * 100)}%` }} />
                    </div>
                  )}
                  {aiCandidates.length > 1 && (
                    <div className="grid grid-cols-3 gap-1">
                      {aiCandidates.map((c, i) => (
                        <button
                          key={c.index}
                          onClick={() => setAiChoice(c.index)}
                          title={`${Math.round(c.area * 100)}% da imagem · confiança ${Math.round(c.score * 100)}%`}
                          className={segmentedButton(c.index === chosenCandidate)}
                        >
                          {['Menor', 'Média', 'Maior'][i] ?? `#${i + 1}`}{c.index === bestCandidate ? ' ★' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-[10px] text-[#85869A] leading-relaxed">
              {aiActive
                ? 'Clique no produto. Clique nas partes que faltaram para somar, ou use Remover no que entrou sem querer. ★ é a sugestão da IA.'
                : 'Clique no produto para selecioná-lo. Clique em sombras ou partes que ficaram de fora para somar. Atalhos: Shift+clique adiciona, Alt+clique remove.'}
            </p>
            {(aiActive ? sliders.slice(1) : sliders).map(renderSlider)}
            {!aiActive && (
              <label className="flex items-center justify-between text-xs text-[#62647A] cursor-pointer">
                <span>Tolerância automática a cada clique</span>
                <input
                  type="checkbox" checked={autoTolerance} onChange={(e) => setAutoTolerance(e.target.checked)}
                  className="w-4 h-4 accent-[#7655D9] rounded cursor-pointer"
                />
              </label>
            )}
            <label className="flex items-center justify-between text-xs text-[#62647A] cursor-pointer">
              <span>Incluir áreas internas (brilhos, furos)</span>
              <input
                type="checkbox" checked={fillHoles} onChange={(e) => setFillHoles(e.target.checked)}
                className="w-4 h-4 accent-[#7655D9] rounded cursor-pointer"
              />
            </label>
            {!aiActive && (
              <label className="flex items-center justify-between text-xs text-[#62647A] cursor-pointer">
                <span>Só áreas conectadas ao clique</span>
                <input
                  type="checkbox" checked={contiguous} onChange={(e) => setContiguous(e.target.checked)}
                  className="w-4 h-4 accent-[#7655D9] rounded cursor-pointer"
                />
              </label>
            )}
            {stats && (
              <div className="flex items-center gap-2.5 p-2.5 bg-[#F4F5FA] rounded-xl border border-[#E7E7F0]">
                <div className="w-7 h-7 rounded-lg border border-[#E7E7F0] shrink-0" style={{ backgroundColor: stats.hex }} />
                <div className="text-[11px] leading-tight">
                  <div className="text-[#62647A]">Cor original detectada</div>
                  <div className="font-mono font-semibold text-[#17172A]">
                    {stats.hex} <span className="font-sans font-normal text-[#85869A]">· {Math.round(stats.coverage * 100)}% da imagem</span>
                  </div>
                </div>
              </div>
            )}
            {isNeutralSource && (
              <div className="flex gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Produto em tom neutro (branco, preto ou cinza). Funciona, mas a cor fica mais uniforme:
                  ajuste a luminosidade e confira com a peça real.
                </span>
              </div>
            )}
          </div>

          {/* Variants */}
          <div className="space-y-2.5 pt-2 border-t border-[#E7E7F0]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#17172A]">Variantes de Cor</span>
              <button
                onClick={useActivePalette}
                className="flex items-center gap-1 text-[10px] font-semibold text-[#7655D9] hover:underline cursor-pointer"
                title="Substituir pelas cores da paleta ativa"
              >
                <Palette className="w-3 h-3" /> Usar paleta ativa
              </button>
            </div>
            <div className="space-y-1.5">
              {variants.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setActiveId(v.id)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl border cursor-pointer transition-all ${
                    v.id === activeVariant?.id
                      ? 'border-[#7655D9] bg-[#F5F2FF] shadow-xs'
                      : 'border-[#E7E7F0] bg-white hover:border-[#D6D1F3]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#E7E7F0] shrink-0 bg-[#F4F5FA]">
                    {thumbnails[v.id] ? (
                      <img src={thumbnails[v.id]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: v.hex }} />
                    )}
                  </div>
                  <input
                    type="color" value={v.hex}
                    onChange={(e) => updateVariant(v.id, { hex: e.target.value.toUpperCase() })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 rounded border border-[#E7E7F0] cursor-pointer bg-transparent shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text" value={v.name}
                      onChange={(e) => updateVariant(v.id, { name: e.target.value })}
                      className="w-full bg-transparent text-xs font-medium text-[#17172A] focus:outline-none focus:bg-white rounded px-1"
                    />
                    <div className="font-mono text-[10px] text-[#85869A] px-1">{v.hex}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeVariant(v.id); }}
                    disabled={variants.length <= 1}
                    className="p-1 text-[#85869A] hover:text-red-500 rounded cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <button
              onClick={addVariant}
              className="w-full py-2 bg-[#F4F5FA] hover:bg-[#F5F2FF] border border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A] rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar cor
            </button>
            {colorSliders.map(renderSlider)}
          </div>

          {/* Export */}
          <div className="space-y-2.5 pt-2 border-t border-[#E7E7F0]">
            <span className="text-xs font-semibold text-[#17172A] block">Exportação</span>
            <div className="grid grid-cols-3 gap-1.5">
              {EXPORT_SIZES.map((s) => (
                <button key={s.id} onClick={() => setExportSize(s.id)} className={`${segmentedButton(exportSize === s.id)} font-mono`}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#85869A] leading-relaxed">
              Tamanhos quadrados centralizam o produto, prontos para marketplaces.
            </p>
            <label className="flex items-center justify-between text-xs text-[#62647A] cursor-pointer">
              <span>Fundo transparente (só o objeto)</span>
              <input
                type="checkbox" checked={transparentBg} onChange={(e) => setTransparentBg(e.target.checked)}
                className="w-4 h-4 accent-[#7655D9] rounded cursor-pointer"
              />
            </label>
          </div>
        </aside>

        {/* Viewport */}
        <main
          className={`flex-1 p-6 md:p-10 flex flex-col items-center justify-center gap-4 overflow-auto bg-[#FBFBFE] bg-dotted-grid-subtle relative ${
            isDraggingOver ? 'ring-2 ring-inset ring-[#7655D9]' : ''
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            const file = e.dataTransfer.files[0];
            if (file) loadImageFile(file);
          }}
        >
          {working ? (
            <>
              <div className="flex gap-1 bg-white border border-[#E7E7F0] rounded-xl p-1 shadow-2xs">
                {([
                  { id: 'result', label: 'Resultado' },
                  { id: 'original', label: 'Original' },
                  { id: 'mask', label: 'Seleção' },
                ] as { id: ViewMode; label: string }[]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setView(m.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      view === m.id ? 'bg-[#7655D9] text-white' : 'text-[#62647A] hover:bg-[#F5F2FF]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div
                className="relative shadow-xl shadow-purple-900/5 rounded-2xl overflow-hidden border border-[#D6D1F3] bg-white"
                style={{
                  width: working.width >= working.height
                    ? 'min(720px, 100%)'
                    : `min(${Math.round((640 * working.width) / working.height)}px, 100%)`,
                  aspectRatio: `${working.width} / ${working.height}`,
                  ...(transparentBg && view === 'result' ? CHECKERBOARD : {}),
                }}
              >
                <canvas
                  ref={canvasRef}
                  onClick={tool === 'click' ? handleCanvasClick : undefined}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishStroke}
                  onPointerCancel={finishStroke}
                  onPointerLeave={() => { if (brushCursorRef.current) brushCursorRef.current.style.display = 'none'; }}
                  className={`w-full h-full block ${tool === 'brush' ? 'cursor-none touch-none' : 'cursor-crosshair'}`}
                />
                <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                {tool === 'brush' && (
                  <div
                    ref={brushCursorRef}
                    className="absolute rounded-full border-2 border-white pointer-events-none hidden"
                    style={{ boxShadow: '0 0 0 1px rgba(23, 23, 42, 0.6)' }}
                  />
                )}
                {tool === 'click' && history.length === 0 && (
                  <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
                    <div className="flex items-center gap-2 bg-[#17172A]/85 text-white text-xs font-medium px-3.5 py-2 rounded-full backdrop-blur-sm">
                      <MousePointerClick className="w-3.5 h-3.5" /> Clique no produto para selecioná-lo
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => imageFileRef.current?.click()}
              className="w-full max-w-lg border-2 border-dashed border-[#D6D1F3] hover:border-[#7655D9] bg-white hover:bg-[#F5F2FF] rounded-2xl p-10 text-center cursor-pointer transition-all"
            >
              <ImagePlus className="w-8 h-8 text-[#A99AEF] mx-auto mb-3" />
              <div className="text-sm font-semibold text-[#17172A]">Solte a foto do produto aqui</div>
              <div className="text-xs text-[#62647A] mt-1">
                ou clique para escolher. A imagem não sai do seu computador.
              </div>
              <div className="text-[10px] text-[#85869A] mt-3">
                Melhor resultado: produto de cor única sobre fundo liso
              </div>
            </button>
          )}
        </main>
      </div>
    </div>
  );
};
