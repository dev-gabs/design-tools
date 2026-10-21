import React, { useState } from 'react';
import {
  Sparkles,
  Palette,
  Layers,
  Shuffle,
  Dice5,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Plus,
  ArrowRightLeft,
  SunMedium,
} from 'lucide-react';
import type { MeshPoint, Preset, GlobalEngineSettings } from '../types/mesh';
import { GRADIENT_PRESETS } from '../presets/gradient-presets';
import {
  generateRandomComposition,
  randomizeColorsOnly,
  randomizeGeometryOnly,
  subtleVariation,
} from '../engine/generators';
import {
  parseHexPalette,
  generateHarmony,
  adjustPaletteHSL,
} from '../engine/color-utils';

interface LeftSidebarProps {
  points: MeshPoint[];
  settings: GlobalEngineSettings;
  selectedPointIds: string[];
  onApplyPreset: (preset: Preset) => void;
  onUpdatePoints: (newPoints: MeshPoint[]) => void;
  onUpdateSettings: (newSettings: Partial<GlobalEngineSettings>) => void;
  onSelectPoint: (id: string, multiSelect?: boolean) => void;
  onDeletePoint: (id: string) => void;
  onDuplicatePoint: (id: string) => void;
  onToggleLockPoint: (id: string) => void;
  onAddPoint: () => void;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  points,
  settings,
  selectedPointIds,
  onApplyPreset,
  onUpdatePoints,
  onUpdateSettings,
  onSelectPoint,
  onDeletePoint,
  onDuplicatePoint,
  onToggleLockPoint,
  onAddPoint,
  isOpen,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'palette' | 'points'>('presets');
  const [hexInput, setHexInput] = useState<string>('');
  const [randomCount, setRandomCount] = useState<number>(6);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Vibrante', 'Natureza', 'Pastel', 'Editorial', 'Minimal', 'Artístico'];

  const filteredPresets =
    selectedCategory === 'all'
      ? GRADIENT_PRESETS
      : GRADIENT_PRESETS.filter((p) => p.category === selectedCategory);

  // Randomizer actions
  const handleGenerateAll = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    const result = generateRandomComposition(randomCount, newSeed);
    onUpdatePoints(result.points);
    onUpdateSettings({ seed: newSeed });
    onShowToast('success', 'Nova Composição Gerada', `Criados ${randomCount} pontos orgânicos.`);
  };

  const handleRandomizeColors = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    const updated = randomizeColorsOnly(points, newSeed);
    onUpdatePoints(updated);
    onShowToast('info', 'Cores Aleatorizadas', 'Geometria dos pontos preservada.');
  };

  const handleRandomizeGeometry = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    const updated = randomizeGeometryOnly(points, newSeed);
    onUpdatePoints(updated);
    onShowToast('info', 'Geometria Aleatorizada', 'Paleta de cores original mantida.');
  };

  const handleSubtleVariation = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    const updated = subtleVariation(points, newSeed);
    onUpdatePoints(updated);
    onShowToast('info', 'Variação Sutil Aplicada');
  };

  // Palette actions
  const handleImportHex = () => {
    const colors = parseHexPalette(hexInput);
    if (colors.length === 0) {
      onShowToast('error', 'Nenhum código HEX válido encontrado');
      return;
    }

    const updated = points.map((p, idx) => ({
      ...p,
      color: colors[idx % colors.length],
    }));

    onUpdatePoints(updated);
    setHexInput('');
    onShowToast('success', 'Paleta Aplicada', `${colors.length} cores importadas com sucesso.`);
  };

  const handleReversePalette = () => {
    const colors = points.map((p) => p.color).reverse();
    const updated = points.map((p, idx) => ({
      ...p,
      color: colors[idx],
    }));
    onUpdatePoints(updated);
    onShowToast('info', 'Ordem da Paleta Invertida');
  };

  const handleApplyHarmony = (type: 'analogous' | 'complementary' | 'triadic' | 'monochrome' | 'vibrant') => {
    const baseColor = points[0]?.color || '#6366F1';
    const harmonyColors = generateHarmony(baseColor, type);
    const updated = points.map((p, idx) => ({
      ...p,
      color: harmonyColors[idx % harmonyColors.length],
    }));
    onUpdatePoints(updated);
    onShowToast('success', `Harmonia ${type} aplicada`);
  };

  const handleAdjustHSL = (deltaH: number, deltaS: number, deltaL: number) => {
    const currentColors = points.map((p) => p.color);
    const adjusted = adjustPaletteHSL(currentColors, deltaH, deltaS, deltaL);
    const updated = points.map((p, idx) => ({
      ...p,
      color: adjusted[idx],
    }));
    onUpdatePoints(updated);
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 h-full bg-zinc-900/95 border-r border-zinc-800 flex flex-col shrink-0 select-none z-20 backdrop-blur">
      {/* Tabs Header */}
      <div className="flex border-b border-zinc-800 px-3 pt-2 bg-zinc-950/40">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'presets'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Presets</span>
        </button>

        <button
          onClick={() => setActiveTab('palette')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'palette'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Paleta</span>
        </button>

        <button
          onClick={() => setActiveTab('points')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'points'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Pontos ({points.length})</span>
        </button>
      </div>

      {/* Tab 1: Presets & Randomizer */}
      {activeTab === 'presets' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Generator Section */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                Gerador Criativo
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-500 font-mono">Seed:</span>
                <input
                  type="number"
                  value={settings.seed}
                  onChange={(e) => onUpdateSettings({ seed: parseInt(e.target.value, 10) || 0 })}
                  className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1 text-[10px] font-mono text-zinc-300 text-right"
                />
              </div>
            </div>

            {/* Points count slider */}
            <div>
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                <span>Quantidade de Pontos</span>
                <span className="font-mono text-indigo-400 font-medium">{randomCount}</span>
              </div>
              <input
                type="range"
                min="4"
                max="16"
                value={randomCount}
                onChange={(e) => setRandomCount(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Randomizer Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleGenerateAll}
                className="flex items-center justify-center gap-1.5 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer col-span-2"
              >
                <Dice5 className="w-4 h-4" />
                <span>Nova Composição</span>
              </button>

              <button
                onClick={handleRandomizeColors}
                className="p-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 rounded-lg text-[11px] font-medium transition-colors text-center"
                title="Preserva posições dos pontos"
              >
                Só Cores
              </button>

              <button
                onClick={handleRandomizeGeometry}
                className="p-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 rounded-lg text-[11px] font-medium transition-colors text-center"
                title="Preserva paleta atual"
              >
                Só Geometria
              </button>

              <button
                onClick={handleSubtleVariation}
                className="p-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 rounded-lg text-[11px] font-medium transition-colors col-span-2 text-center"
                title="Modificação suave e orgânica"
              >
                Variação Sutil
              </button>
            </div>
          </div>

          {/* Presets Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Galeria de Estilos</span>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-zinc-700 text-white'
                      : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>

            {/* Presets List */}
            <div className="grid grid-cols-2 gap-2.5">
              {filteredPresets.map((preset) => {
                const colors = preset.points.slice(0, 4).map((p) => p.color);
                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    className="group flex flex-col rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/40 hover:border-indigo-500/80 transition-all text-left cursor-pointer"
                  >
                    {/* Gradient Miniature */}
                    <div
                      className="h-16 w-full relative transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `radial-gradient(circle at 20% 20%, ${colors[0] || '#FFF'}, transparent 60%),
                                     radial-gradient(circle at 80% 20%, ${colors[1] || '#FFF'}, transparent 60%),
                                     radial-gradient(circle at 30% 80%, ${colors[2] || '#FFF'}, transparent 60%),
                                     radial-gradient(circle at 80% 80%, ${colors[3] || '#FFF'}, transparent 60%) #111`,
                      }}
                    />
                    <div className="p-2 bg-zinc-900/90 border-t border-zinc-800/60">
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">{preset.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Color Palette */}
      {activeTab === 'palette' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Active Colors Swatches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-200">Cores Ativas ({points.length})</span>
              <button
                onClick={handleReversePalette}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                title="Inverter ordem das cores"
              >
                <ArrowRightLeft className="w-3 h-3" />
                Inverter
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl">
              {points.map((pt, idx) => (
                <button
                  key={pt.id}
                  onClick={() => onSelectPoint(pt.id)}
                  style={{ backgroundColor: pt.color }}
                  className={`w-7 h-7 rounded-lg border transition-transform hover:scale-110 shadow-sm ${
                    selectedPointIds.includes(pt.id)
                      ? 'border-white ring-2 ring-indigo-500 scale-105'
                      : 'border-white/20'
                  }`}
                  title={`Ponto ${idx + 1}: ${pt.color}`}
                />
              ))}
            </div>
          </div>

          {/* Color Harmonies */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-200">Gerar Harmonias Cromáticas</span>
            <div className="grid grid-cols-2 gap-2">
              {(['vibrant', 'analogous', 'complementary', 'triadic', 'monochrome'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleApplyHarmony(type)}
                  className="px-2.5 py-2 bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-lg text-[11px] font-medium text-zinc-200 capitalize transition-colors text-center"
                >
                  {type === 'vibrant'
                    ? 'Vibrante'
                    : type === 'analogous'
                    ? 'Análoga'
                    : type === 'complementary'
                    ? 'Complementar'
                    : type === 'triadic'
                    ? 'Triádica'
                    : 'Monocromática'}
                </button>
              ))}
            </div>
          </div>

          {/* Global HSL Quick Adjustment */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-amber-400" />
              Ajustes Globais HSL
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Girar Matiz (Hue)</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustHSL(-15, 0, 0)}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  >
                    -15°
                  </button>
                  <button
                    onClick={() => handleAdjustHSL(15, 0, 0)}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  >
                    +15°
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Saturação</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustHSL(0, -10, 0)}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  >
                    -10%
                  </button>
                  <button
                    onClick={() => handleAdjustHSL(0, 10, 0)}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  >
                    +10%
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Luminosidade</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustHSL(0, 0, -10)}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  >
                    Mais Escuro
                  </button>
                  <button
                    onClick={() => handleAdjustHSL(0, 0, 10)}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  >
                    Mais Claro
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Import Hex Codes */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-200">Importar Paleta HEX</span>
            <p className="text-[10px] text-zinc-400">Cole múltiplos códigos separados por vírgula ou espaço</p>
            <textarea
              rows={2}
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="#FF5733, #33FF57, #3357FF..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleImportHex}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 transition-colors"
            >
              Aplicar Paleta
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Points / Layers List */}
      {activeTab === 'points' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-zinc-200">Lista de Pontos</span>
            <button
              onClick={onAddPoint}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>

          <div className="space-y-2">
            {points.map((pt, idx) => {
              const isSelected = selectedPointIds.includes(pt.id);

              return (
                <div
                  key={pt.id}
                  onClick={() => onSelectPoint(pt.id)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80'
                      : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-5 h-5 rounded-full border border-white/30 shrink-0"
                      style={{ backgroundColor: pt.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200 truncate">
                        Ponto {idx + 1}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        {Math.round(pt.x * 100)}%, {Math.round(pt.y * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLockPoint(pt.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        pt.locked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title={pt.locked ? 'Desbloquear Ponto' : 'Bloquear Ponto'}
                    >
                      {pt.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePoint(pt.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
                      title="Duplicar Ponto (Ctrl+D)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePoint(pt.id);
                      }}
                      disabled={points.length <= 1}
                      className="p-1 text-zinc-500 hover:text-rose-400 disabled:opacity-30 rounded transition-colors"
                      title="Excluir Ponto (Del)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
