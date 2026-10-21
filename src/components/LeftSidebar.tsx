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
    <aside className="w-80 h-full bg-white border-r border-[#E7E7F0] flex flex-col shrink-0 select-none z-20 text-[#17172A]">
      {/* Tabs Header */}
      <div className="flex border-b border-[#E7E7F0] px-3 pt-2 bg-[#FBFBFE]">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'presets'
              ? 'border-[#7655D9] text-[#7655D9]'
              : 'border-transparent text-[#62647A] hover:text-[#17172A]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Presets</span>
        </button>

        <button
          onClick={() => setActiveTab('palette')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'palette'
              ? 'border-[#7655D9] text-[#7655D9]'
              : 'border-transparent text-[#62647A] hover:text-[#17172A]'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Paleta</span>
        </button>

        <button
          onClick={() => setActiveTab('points')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'points'
              ? 'border-[#7655D9] text-[#7655D9]'
              : 'border-transparent text-[#62647A] hover:text-[#17172A]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Pontos ({points.length})</span>
        </button>
      </div>

      {/* Tab 1: Presets & Randomizer */}
      {activeTab === 'presets' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Generator Section */}
          <div className="bg-[#F4F5FA] border border-[#E7E7F0] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17172A] flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-[#7655D9]" />
                Gerador Aleatório
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#85869A] font-mono">Seed:</span>
                <input
                  type="number"
                  value={settings.seed}
                  onChange={(e) => onUpdateSettings({ seed: parseInt(e.target.value, 10) || 0 })}
                  className="w-14 bg-white border border-[#E7E7F0] rounded px-1.5 text-[10px] font-mono text-[#17172A] text-right focus:outline-none focus:border-[#7655D9]"
                />
              </div>
            </div>

            {/* Points count slider */}
            <div>
              <div className="flex justify-between text-[11px] text-[#62647A] mb-1">
                <span>Quantidade de Pontos</span>
                <span className="font-mono text-[#7655D9] font-semibold">{randomCount}</span>
              </div>
              <input
                type="range"
                min="4"
                max="16"
                value={randomCount}
                onChange={(e) => setRandomCount(parseInt(e.target.value, 10))}
                className="w-full accent-[#7655D9] bg-[#E7E7F0] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Randomizer Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleGenerateAll}
                className="flex items-center justify-center gap-1.5 p-2 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold shadow-sm shadow-[#7655D9]/20 transition-colors cursor-pointer col-span-2"
              >
                <Dice5 className="w-4 h-4" />
                <span>Nova Composição</span>
              </button>

              <button
                onClick={handleRandomizeColors}
                className="p-2 bg-white hover:bg-[#F5F2FF] border border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A] rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer shadow-2xs"
                title="Preserva posições dos pontos"
              >
                Só Cores
              </button>

              <button
                onClick={handleRandomizeGeometry}
                className="p-2 bg-white hover:bg-[#F5F2FF] border border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A] rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer shadow-2xs"
                title="Preserva paleta atual"
              >
                Só Geometria
              </button>

              <button
                onClick={handleSubtleVariation}
                className="p-2 bg-white hover:bg-[#F5F2FF] border border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A] rounded-lg text-[11px] font-medium transition-colors col-span-2 text-center cursor-pointer shadow-2xs"
                title="Modificação suave e orgânica"
              >
                Variação Sutil
              </button>
            </div>
          </div>

          {/* Presets Gallery */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#17172A] block">Estilos Curados</span>

            {/* Category pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#7655D9] text-white'
                      : 'bg-[#F4F5FA] text-[#62647A] hover:text-[#17172A] hover:bg-[#F5F2FF]'
                  }`}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {filteredPresets.map((preset) => {
                const colors = preset.points.slice(0, 4).map((p) => p.color);
                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    className="group flex flex-col rounded-xl overflow-hidden border border-[#E7E7F0] bg-white hover:border-[#7655D9] hover:shadow-md transition-all text-left cursor-pointer"
                  >
                    <div
                      className="h-16 w-full relative transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `radial-gradient(circle at 20% 20%, ${colors[0] || '#FFF'}, transparent 60%),
                                     radial-gradient(circle at 80% 20%, ${colors[1] || '#FFF'}, transparent 60%),
                                     radial-gradient(circle at 30% 80%, ${colors[2] || '#FFF'}, transparent 60%),
                                     radial-gradient(circle at 80% 80%, ${colors[3] || '#FFF'}, transparent 60%) #111`,
                      }}
                    />
                    <div className="p-2 border-t border-[#E7E7F0] bg-white">
                      <div className="text-xs font-bold text-[#17172A] group-hover:text-[#7655D9] truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-[#85869A] truncate mt-0.5">{preset.category}</div>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#17172A]">Cores da Composição ({points.length})</span>
              <button
                onClick={handleReversePalette}
                className="text-[11px] text-[#62647A] hover:text-[#7655D9] flex items-center gap-1 transition-colors cursor-pointer"
                title="Inverter ordem das cores"
              >
                <ArrowRightLeft className="w-3 h-3" />
                Inverter
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 bg-[#F4F5FA] border border-[#E7E7F0] rounded-xl">
              {points.map((pt, idx) => (
                <button
                  key={pt.id}
                  onClick={() => onSelectPoint(pt.id)}
                  style={{ backgroundColor: pt.color }}
                  className={`w-7 h-7 rounded-lg border transition-transform hover:scale-110 shadow-xs cursor-pointer ${
                    selectedPointIds.includes(pt.id)
                      ? 'border-[#7655D9] ring-2 ring-[#7655D9]/40 scale-105'
                      : 'border-black/10'
                  }`}
                  title={`Ponto ${idx + 1}: ${pt.color}`}
                />
              ))}
            </div>
          </div>

          {/* Color Harmonies */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#17172A] block">Gerar Harmonias</span>
            <div className="grid grid-cols-2 gap-2">
              {(['vibrant', 'analogous', 'complementary', 'triadic', 'monochrome'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleApplyHarmony(type)}
                  className="px-2.5 py-2 bg-white hover:bg-[#F5F2FF] border border-[#E7E7F0] hover:border-[#D6D1F3] rounded-lg text-[11px] font-medium text-[#17172A] capitalize transition-colors text-center cursor-pointer shadow-2xs"
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
          <div className="bg-[#F4F5FA] border border-[#E7E7F0] rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-[#17172A] flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-[#7655D9]" />
              Ajustes Globais HSL
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#62647A]">Matiz (Hue)</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustHSL(-15, 0, 0)}
                    className="px-2 py-0.5 bg-white border border-[#E7E7F0] hover:bg-[#F5F2FF] rounded text-[#17172A] font-mono text-[11px] cursor-pointer"
                  >
                    -15°
                  </button>
                  <button
                    onClick={() => handleAdjustHSL(15, 0, 0)}
                    className="px-2 py-0.5 bg-white border border-[#E7E7F0] hover:bg-[#F5F2FF] rounded text-[#17172A] font-mono text-[11px] cursor-pointer"
                  >
                    +15°
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#62647A]">Saturação</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustHSL(0, -10, 0)}
                    className="px-2 py-0.5 bg-white border border-[#E7E7F0] hover:bg-[#F5F2FF] rounded text-[#17172A] font-mono text-[11px] cursor-pointer"
                  >
                    -10%
                  </button>
                  <button
                    onClick={() => handleAdjustHSL(0, 10, 0)}
                    className="px-2 py-0.5 bg-white border border-[#E7E7F0] hover:bg-[#F5F2FF] rounded text-[#17172A] font-mono text-[11px] cursor-pointer"
                  >
                    +10%
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#62647A]">Luminosidade</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustHSL(0, 0, -10)}
                    className="px-2 py-0.5 bg-white border border-[#E7E7F0] hover:bg-[#F5F2FF] rounded text-[#17172A] text-[11px] cursor-pointer"
                  >
                    Mais Escuro
                  </button>
                  <button
                    onClick={() => handleAdjustHSL(0, 0, 10)}
                    className="px-2 py-0.5 bg-white border border-[#E7E7F0] hover:bg-[#F5F2FF] rounded text-[#17172A] text-[11px] cursor-pointer"
                  >
                    Mais Claro
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Import Hex Codes */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#17172A] block">Importar HEX</span>
            <textarea
              rows={2}
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="#FF5733, #33FF57, #3357FF..."
              className="w-full bg-white border border-[#E7E7F0] rounded-lg p-2 text-xs font-mono text-[#17172A] focus:outline-none focus:border-[#7655D9]"
            />
            <button
              onClick={handleImportHex}
              className="w-full py-1.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm shadow-[#7655D9]/20"
            >
              Aplicar Paleta
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Points List */}
      {activeTab === 'points' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[#17172A]">Camadas de Pontos</span>
            <button
              onClick={onAddPoint}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm shadow-[#7655D9]/20"
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
                      ? 'bg-[#F3EEFF] border-[#7655D9]'
                      : 'bg-[#F4F5FA] border-[#E7E7F0] hover:border-[#D6D1F3] hover:bg-[#F5F2FF]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-5 h-5 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: pt.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#17172A] truncate">
                        Ponto {idx + 1}
                      </div>
                      <div className="text-[10px] font-mono text-[#85869A]">
                        {Math.round(pt.x * 100)}%, {Math.round(pt.y * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLockPoint(pt.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        pt.locked ? 'text-[#7655D9]' : 'text-[#85869A] hover:text-[#17172A]'
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
                      className="p-1 text-[#85869A] hover:text-[#7655D9] rounded transition-colors"
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
                      className="p-1 text-[#85869A] hover:text-rose-500 disabled:opacity-30 rounded transition-colors"
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
