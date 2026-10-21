import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Lock,
  Unlock,
  Copy,
  Check,
  BookmarkPlus,
  RefreshCw,
  Layers,
  Grid,
  SlidersHorizontal,
  Code2,
  X,
} from 'lucide-react';
import { useChromalab } from '../../context/ChromalabContext';
import {
  hexToHsla,
  hslaToHex,
} from '../../engine/color-utils';

type HarmonyMode =
  | 'balanced'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triad'
  | 'tetrad'
  | 'monochrome'
  | 'neutral';

type PersonalityMode =
  | 'vibrant'
  | 'pastel'
  | 'soft'
  | 'muted'
  | 'earthy'
  | 'high-contrast';

interface PaletteSlot {
  id: string;
  hex: string;
  locked: boolean;
}

export const ColorPaletteStudio: React.FC = () => {
  const {
    navigateToTool,
    activePalette,
    setActivePalette,
    savePalette,
    savedPalettes,
    sendPaletteToMesh,
    sendPaletteToPattern,
    showToast,
  } = useChromalab();

  const [colorCount, setColorCount] = useState<number>(5);
  const [harmony, setHarmony] = useState<HarmonyMode>('balanced');
  const [personality, setPersonality] = useState<PersonalityMode>('vibrant');
  const [baseColor, setBaseColor] = useState<string>('#4F46E5');
  const [useBaseColor, setUseBaseColor] = useState<boolean>(true);
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [paletteName, setPaletteName] = useState<string>('Nova Paleta');

  // Initialize slots
  const [slots, setSlots] = useState<PaletteSlot[]>(() => {
    return activePalette.slice(0, 5).map((hex, idx) => ({
      id: `slot-${idx}-${Date.now()}`,
      hex,
      locked: false,
    }));
  });

  // Color generator with real perceptual and harmonic criteria
  const generatePalette = useCallback(() => {
    const baseHsla = hexToHsla(baseColor);
    const result: PaletteSlot[] = [];

    // Personality saturation/lightness curves
    let getSat: (idx: number) => number;
    let getLight: (idx: number) => number;

    switch (personality) {
      case 'pastel':
        getSat = () => 65 + Math.random() * 20;
        getLight = (i) => 78 + (i % 2) * 8;
        break;
      case 'soft':
        getSat = () => 45 + Math.random() * 25;
        getLight = (i) => 55 + (i % 3) * 12;
        break;
      case 'muted':
        getSat = () => 25 + Math.random() * 20;
        getLight = (i) => 40 + i * 8;
        break;
      case 'earthy':
        getSat = () => 35 + Math.random() * 30;
        getLight = (i) => 35 + (i % 3) * 15;
        break;
      case 'high-contrast':
        getSat = () => 85 + Math.random() * 15;
        getLight = (i) => (i % 2 === 0 ? 25 + Math.random() * 15 : 75 + Math.random() * 15);
        break;
      case 'vibrant':
      default:
        getSat = () => 80 + Math.random() * 20;
        getLight = (i) => 48 + ((i * 7) % 22);
        break;
    }

    // Determine hues based on harmony
    const baseH = useBaseColor ? baseHsla.h : Math.floor(Math.random() * 360);
    const hues: number[] = [];

    for (let i = 0; i < colorCount; i++) {
      let h = baseH;
      switch (harmony) {
        case 'analogous':
          h = (baseH + (i - Math.floor(colorCount / 2)) * 28 + 360) % 360;
          break;
        case 'complementary':
          h = i % 2 === 0 ? baseH : (baseH + 180) % 360;
          if (i >= 2) h = (h + (i > 3 ? 30 : -30) + 360) % 360;
          break;
        case 'split-complementary':
          if (i === 0) h = baseH;
          else if (i % 2 === 1) h = (baseH + 150) % 360;
          else h = (baseH + 210) % 360;
          break;
        case 'triad':
          h = (baseH + (i % 3) * 120 + Math.floor(i / 3) * 20) % 360;
          break;
        case 'tetrad':
          h = (baseH + (i % 4) * 90) % 360;
          break;
        case 'monochrome':
          h = baseH;
          break;
        case 'neutral':
          h = (baseH + i * 40) % 360;
          break;
        case 'balanced':
        default:
          // Golden ratio hue stepping
          h = (baseH + i * 137.5) % 360;
          break;
      }
      hues.push(Math.round(h));
    }

    // Populate slots respecting locked ones
    for (let i = 0; i < colorCount; i++) {
      const existing = slots[i];
      if (existing && existing.locked) {
        result.push(existing);
      } else {
        const sat = harmony === 'neutral' ? 15 + Math.random() * 15 : getSat(i);
        const light = harmony === 'monochrome' ? Math.max(15, Math.min(88, 20 + (i * 70) / colorCount)) : getLight(i);
        const newHex = hslaToHex({
          h: hues[i],
          s: Math.max(0, Math.min(100, Math.round(sat))),
          l: Math.max(0, Math.min(100, Math.round(light))),
          a: 1,
        });

        result.push({
          id: existing ? existing.id : `slot-${i}-${Date.now()}`,
          hex: newHex,
          locked: false,
        });
      }
    }

    setSlots(result);
    setActivePalette(result.map((s) => s.hex));
  }, [baseColor, colorCount, harmony, personality, slots, useBaseColor, setActivePalette]);

  // Adjust slot count without losing existing locked colors
  const handleColorCountChange = (newCount: number) => {
    setColorCount(newCount);
    if (newCount > slots.length) {
      const addedCount = newCount - slots.length;
      const newSlots = [...slots];
      for (let i = 0; i < addedCount; i++) {
        const h = Math.floor(Math.random() * 360);
        newSlots.push({
          id: `slot-${slots.length + i}-${Date.now()}`,
          hex: hslaToHex({ h, s: 75, l: 55, a: 1 }),
          locked: false,
        });
      }
      setSlots(newSlots);
      setActivePalette(newSlots.map((s) => s.hex));
    } else {
      const trimmed = slots.slice(0, newCount);
      setSlots(trimmed);
      setActivePalette(trimmed.map((s) => s.hex));
    }
  };

  const toggleLock = (id: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s))
    );
  };

  const updateSlotColor = (id: string, newHex: string) => {
    const clean = newHex.startsWith('#') ? newHex.toUpperCase() : `#${newHex.toUpperCase()}`;
    const updated = slots.map((s) => (s.id === id ? { ...s, hex: clean } : s));
    setSlots(updated);
    setActivePalette(updated.map((s) => s.hex));
  };

  const copyHex = (hex: string, id: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedSlotId(id);
    setTimeout(() => setCopiedSlotId(null), 1800);
    showToast('info', 'Cor Copiada', `${hex} copiado para a área de transferência.`);
  };

  const copyAllHex = () => {
    const text = slots.map((s) => s.hex).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    showToast('success', 'Paleta Copiada', text);
  };

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'css' | 'tailwind' | 'figma' | 'scss' | 'array'>('css');
  const [copiedExport, setCopiedExport] = useState(false);

  const getExportCode = () => {
    switch (exportFormat) {
      case 'css': {
        const lines = slots.map((s, i) => `  --color-${i + 1}: ${s.hex};`).join('\n');
        return `/* CSS Custom Properties */\n:root {\n${lines}\n}`;
      }
      case 'tailwind': {
        const entries = slots
          .map((s, i) => `        '${(i + 1) * 100}': '${s.hex}',`)
          .join('\n');
        return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        brand: {\n${entries}\n        }\n      }\n    }\n  }\n};`;
      }
      case 'figma': {
        const tokens: Record<string, { value: string; type: string }> = {};
        slots.forEach((s, i) => {
          tokens[`color-${i + 1}`] = { value: s.hex, type: 'color' };
        });
        return JSON.stringify({ color: tokens }, null, 2);
      }
      case 'scss': {
        return slots.map((s, i) => `$color-${i + 1}: ${s.hex};`).join('\n');
      }
      case 'array': {
        return JSON.stringify(slots.map((s) => s.hex), null, 2);
      }
    }
  };

  const copyExportCode = () => {
    navigator.clipboard.writeText(getExportCode());
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
    showToast('success', 'Código Copiado', `Formato ${exportFormat.toUpperCase()} copiado com sucesso.`);
  };

  const copyCssVars = () => {
    const css = slots.map((s, i) => `  --color-${i + 1}: ${s.hex};`).join('\n');
    const full = `:root {\n${css}\n}`;
    navigator.clipboard.writeText(full);
    showToast('success', 'CSS Copiado', 'Variáveis customizadas salvas na área de transferência.');
  };

  // Keyboard shortcut: Spacebar to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.code === 'Space' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        generatePalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generatePalette]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#FBFBFE] text-[#17172A] select-none">
      {/* Top Chromalab Navigation Bar */}
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
              Color Palette Studio
              <span className="text-[10px] bg-[#EEF2FF] text-[#7655D9] font-semibold px-2 py-0.5 rounded-full border border-[#D6D1F3]">
                Módulo 02
              </span>
            </h1>
          </div>
        </div>

        {/* Right actions: Export / Share to other tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendPaletteToMesh(slots.map((s) => s.hex))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F5FA] hover:bg-[#F5F2FF] text-[#17172A] border border-[#E7E7F0] hover:border-[#D6D1F3] rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Enviar paleta para o Mesh Gradient Studio"
          >
            <Layers className="w-3.5 h-3.5 text-[#7655D9]" />
            <span className="hidden md:inline">Enviar para Mesh Lab</span>
          </button>

          <button
            onClick={() => sendPaletteToPattern(slots.map((s) => s.hex))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F5FA] hover:bg-[#F5F2FF] text-[#17172A] border border-[#E7E7F0] hover:border-[#D6D1F3] rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Enviar paleta para o Pattern & Shape Studio"
          >
            <Grid className="w-3.5 h-3.5 text-[#8EA5FF]" />
            <span className="hidden md:inline">Enviar para Patterns</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F5FA] hover:bg-[#F5F2FF] text-[#17172A] border border-[#E7E7F0] hover:border-[#D6D1F3] rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Exportar código da paleta em múltiplos formatos (CSS, Tailwind, Figma)"
          >
            <Code2 className="w-3.5 h-3.5 text-[#7655D9]" />
            <span className="hidden md:inline">Exportar Código</span>
          </button>

          <input
            type="text"
            value={paletteName}
            onChange={(e) => setPaletteName(e.target.value)}
            className="hidden lg:block bg-[#F4F5FA] border border-[#E7E7F0] rounded-lg px-2.5 py-1 text-xs text-[#17172A] w-32 focus:outline-none focus:border-[#7655D9]"
            placeholder="Nome da paleta..."
          />

          <button
            onClick={() => savePalette(paletteName, slots.map((s) => s.hex))}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold shadow-sm shadow-[#7655D9]/20 transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Salvar</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Controls Panel (Left) */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-[#E7E7F0] p-5 overflow-y-auto space-y-5 shrink-0">
          <div>
            <label className="text-xs font-semibold text-[#17172A] block mb-1.5">
              Cor de Referência (Base)
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={baseColor}
                onChange={(e) => setBaseColor(e.target.value.toUpperCase())}
                className="w-10 h-10 rounded-xl border border-[#E7E7F0] cursor-pointer bg-transparent p-0.5"
              />
              <div className="flex-1 flex items-center bg-[#F4F5FA] border border-[#E7E7F0] focus-within:border-[#7655D9] rounded-xl px-2.5 py-2">
                <input
                  type="text"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono uppercase text-[#17172A] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="useBase"
                checked={useBaseColor}
                onChange={(e) => setUseBaseColor(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#7655D9] rounded cursor-pointer"
              />
              <label htmlFor="useBase" className="text-xs text-[#62647A] cursor-pointer">
                Fixar cor-base como âncora
              </label>
            </div>
          </div>

          {/* Harmony Mode */}
          <div>
            <label className="text-xs font-semibold text-[#17172A] block mb-1.5">
              Modo de Harmonia
            </label>
            <select
              value={harmony}
              onChange={(e) => setHarmony(e.target.value as HarmonyMode)}
              className="w-full bg-[#F4F5FA] border border-[#E7E7F0] rounded-xl px-3 py-2 text-xs font-medium text-[#17172A] focus:outline-none focus:border-[#7655D9] cursor-pointer"
            >
              <option value="balanced">Equilibrada / Harmônica</option>
              <option value="analogous">Análoga</option>
              <option value="complementary">Complementar</option>
              <option value="split-complementary">Complementar Dividida</option>
              <option value="triad">Tríade</option>
              <option value="tetrad">Tétrade</option>
              <option value="monochrome">Monocromática</option>
              <option value="neutral">Neutra & Contida</option>
            </select>
          </div>

          {/* Personality Mode */}
          <div>
            <label className="text-xs font-semibold text-[#17172A] block mb-1.5">
              Personalidade Cromática
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'vibrant', label: 'Vibrante' },
                { id: 'pastel', label: 'Pastel' },
                { id: 'soft', label: 'Suave' },
                { id: 'muted', label: 'Sóbria' },
                { id: 'earthy', label: 'Terrosa' },
                { id: 'high-contrast', label: 'Alto Contraste' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersonality(p.id as PersonalityMode)}
                  className={`py-1.5 px-2.5 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                    personality === p.id
                      ? 'bg-[#7655D9] border-[#7655D9] text-white font-semibold shadow-xs'
                      : 'bg-[#F4F5FA] border-[#E7E7F0] text-[#62647A] hover:text-[#17172A] hover:bg-[#F5F2FF]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Colors */}
          <div>
            <div className="flex justify-between text-xs text-[#17172A] font-semibold mb-1.5">
              <span>Quantidade de Cores</span>
              <span className="font-mono text-[#7655D9]">{colorCount}</span>
            </div>
            <input
              type="range"
              min="3"
              max="8"
              value={colorCount}
              onChange={(e) => handleColorCountChange(parseInt(e.target.value, 10))}
              className="w-full accent-[#7655D9] bg-[#E7E7F0] h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Big Generate Button */}
          <button
            onClick={generatePalette}
            className="w-full py-2.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#7655D9]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Gerar Paleta (Espaço)</span>
          </button>

          {/* Export & Copy Helpers */}
          <div className="pt-2 border-t border-[#E7E7F0] space-y-2">
            <label className="text-[11px] font-semibold text-[#85869A] uppercase tracking-wider block">
              Copiar & Exportar
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyAllHex}
                className="py-1.5 px-2 bg-[#F4F5FA] hover:bg-[#F5F2FF] border border-[#E7E7F0] text-[#17172A] rounded-lg text-xs font-medium transition-colors text-center cursor-pointer shadow-xs"
              >
                {copiedAll ? 'Copiado!' : 'Copiar Todos HEX'}
              </button>
              <button
                onClick={copyCssVars}
                className="py-1.5 px-2 bg-[#F4F5FA] hover:bg-[#F5F2FF] border border-[#E7E7F0] text-[#17172A] rounded-lg text-xs font-medium transition-colors text-center cursor-pointer shadow-xs"
              >
                Copiar CSS
              </button>
            </div>
          </div>

          {/* Saved Palettes — load into editor */}
          {savedPalettes.length > 0 && (
            <div className="pt-3 border-t border-[#E7E7F0]">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-semibold text-[#17172A]">Paletas Salvas</label>
                <span className="text-[10px] bg-[#EEF2FF] text-[#7655D9] font-mono px-1.5 py-0.5 rounded-full border border-[#D6D1F3]">{savedPalettes.length}</span>
              </div>
              <div className="space-y-1.5">
                {savedPalettes.map((pal) => (
                  <button
                    key={pal.id}
                    onClick={() => {
                      setSlots(pal.colors.map((hex, i) => ({ id: `slot-loaded-${i}`, hex, locked: false })));
                      setColorCount(pal.colors.length);
                      showToast('success', 'Paleta Carregada', `"${pal.name}" aplicada ao editor.`);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F2FF] border border-transparent hover:border-[#D6D1F3] transition-all cursor-pointer group text-left"
                  >
                    <div className="h-5 w-16 rounded flex overflow-hidden border border-[#E7E7F0] shrink-0">
                      {pal.colors.map((c, i) => (
                        <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="text-xs text-[#62647A] group-hover:text-[#17172A] font-medium truncate flex-1">{pal.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Large Swatches Canvas (Center / Right) */}
        <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto bg-[#FBFBFE] justify-center relative">
          <div className="absolute inset-0 pointer-events-none bg-dotted-grid-subtle opacity-60" />
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center relative z-10">
            {/* Swatches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 lg:grid-flow-col auto-cols-fr gap-3.5 h-[52vh] min-h-[300px]">
              {slots.map((slot) => {
                const isCopied = copiedSlotId === slot.id;
                const hsla = hexToHsla(slot.hex);
                const isDark = hsla.l < 55;

                return (
                  <div
                    key={slot.id}
                    className="relative group rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all duration-200 hover:shadow-lg border border-black/5"
                    style={{ backgroundColor: slot.hex }}
                  >
                    {/* Top actions: Lock button */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleLock(slot.id)}
                        className={`p-1.5 rounded-lg transition-colors backdrop-blur-sm ${
                          slot.locked
                            ? 'bg-black/30 text-white'
                            : isDark
                            ? 'bg-white/10 text-white/70 hover:text-white'
                            : 'bg-black/10 text-black/70 hover:text-black'
                        }`}
                        title={slot.locked ? 'Cor bloqueada' : 'Travar cor ao gerar'}
                      >
                        {slot.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Native Color Picker Trigger */}
                      <label className="cursor-pointer">
                        <input
                          type="color"
                          value={slot.hex.substring(0, 7)}
                          onChange={(e) => updateSlotColor(slot.id, e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={`p-1.5 rounded-lg transition-colors backdrop-blur-sm ${
                            isDark ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-black/10 text-black/70 hover:text-black'
                          }`}
                          title="Editar cor individual"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </div>
                      </label>
                    </div>

                    {/* Bottom Info: Hex & Copy click */}
                    <div className="space-y-1">
                      <button
                        onClick={() => copyHex(slot.hex, slot.id)}
                        className={`w-full py-2 px-2.5 rounded-xl text-left flex items-center justify-between backdrop-blur-md transition-all ${
                          isDark
                            ? 'bg-black/20 text-white hover:bg-black/30'
                            : 'bg-white/40 text-zinc-900 hover:bg-white/60'
                        }`}
                      >
                        <span className="font-mono text-xs font-bold tracking-wider">{slot.hex}</span>
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick helper tip */}
            <p className="text-center text-xs text-zinc-500 mt-4">
              Pressione <kbd className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-800 font-mono text-[11px] shadow-sm">Espaço</kbd> para gerar nova paleta. Clique em qualquer amostra para copiar o código HEX.
            </p>
          </div>
        </main>
      </div>

      {/* Multi-Format Export Modal */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17172A]/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-[#D6D1F3] shadow-2xl overflow-hidden flex flex-col text-[#17172A]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-[#E7E7F0] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-[#17172A] flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#7655D9]" />
                  Exportar Paleta de Cores
                </h3>
                <p className="text-xs text-[#62647A] mt-0.5">
                  Snippets prontos para Tailwind, CSS, SCSS e Design Tokens.
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-[#85869A] hover:text-[#17172A] hover:bg-[#F4F5FA] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Palette Preview Strip */}
              <div className="h-8 rounded-xl overflow-hidden flex border border-[#E7E7F0] shadow-2xs">
                {slots.map((s, i) => (
                  <div key={i} className="flex-1 h-full" style={{ backgroundColor: s.hex }} title={s.hex} />
                ))}
              </div>

              {/* Format Switcher */}
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'css', label: 'CSS' },
                  { id: 'tailwind', label: 'Tailwind' },
                  { id: 'figma', label: 'Tokens' },
                  { id: 'scss', label: 'SCSS' },
                  { id: 'array', label: 'Array' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id as typeof exportFormat)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      exportFormat === f.id
                        ? 'bg-[#7655D9] border-[#7655D9] text-white shadow-xs'
                        : 'bg-[#F4F5FA] border-[#E7E7F0] text-[#62647A] hover:text-[#17172A] hover:bg-[#F5F2FF]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Code Snippet Box */}
              <pre className="p-4 bg-[#17172A] text-[#F4F5FA] rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-[#E7E7F0] max-h-60 select-all">
                {getExportCode()}
              </pre>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-[#F4F5FA] border-t border-[#E7E7F0] flex items-center justify-between">
              <span className="text-[11px] text-[#85869A]">
                {slots.length} cores exportadas
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={copyExportCode}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold shadow-sm shadow-[#7655D9]/20 transition-all cursor-pointer"
                >
                  {copiedExport ? <Check className="w-3.5 h-3.5 text-[#DCD4FF]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedExport ? 'Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
