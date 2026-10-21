import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  FolderOpen,
  Keyboard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Sliders,
} from 'lucide-react';
import type { Dimensions } from '../types/mesh';
import { DIMENSION_PRESETS } from '../presets/gradient-presets';

interface NavbarProps {
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  dimensions: Dimensions;
  onUpdateDimensions: (newDims: Partial<Dimensions>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  cleanPreview: boolean;
  onToggleCleanPreview: () => void;
  onOpenExport: () => void;
  onOpenProjects: () => void;
  onOpenShortcuts: () => void;
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  showRightSidebar: boolean;
  onToggleRightSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projectName,
  onUpdateProjectName,
  dimensions,
  onUpdateDimensions,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  cleanPreview,
  onToggleCleanPreview,
  onOpenExport,
  onOpenProjects,
  onOpenShortcuts,
  showLeftSidebar,
  onToggleLeftSidebar,
  showRightSidebar,
  onToggleRightSidebar,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  const handleWidthChange = (val: number) => {
    if (isNaN(val) || val < 64) return;
    const clamped = Math.min(8192, val);
    if (dimensions.lockAspectRatio) {
      const ratio = dimensions.height / dimensions.width;
      onUpdateDimensions({
        width: clamped,
        height: Math.round(clamped * ratio),
      });
    } else {
      onUpdateDimensions({ width: clamped });
    }
  };

  const handleHeightChange = (val: number) => {
    if (isNaN(val) || val < 64) return;
    const clamped = Math.min(8192, val);
    if (dimensions.lockAspectRatio) {
      const ratio = dimensions.width / dimensions.height;
      onUpdateDimensions({
        height: clamped,
        width: Math.round(clamped * ratio),
      });
    } else {
      onUpdateDimensions({ height: clamped });
    }
  };

  const handlePresetSelect = (preset: typeof DIMENSION_PRESETS[0]) => {
    onUpdateDimensions({
      width: preset.width,
      height: preset.height,
      presetName: preset.name,
    });
  };

  return (
    <header className="h-14 bg-zinc-900/95 border-b border-zinc-800 px-4 flex items-center justify-between gap-3 select-none z-30 shrink-0 backdrop-blur">
      {/* Left: Brand + Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
            Mesh<span className="text-indigo-400">Studio</span>
          </span>
        </div>

        <div className="h-5 w-[1px] bg-zinc-800 hidden sm:block" />

        {/* Editable Name */}
        {isEditingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={() => {
              setIsEditingName(false);
              if (tempName.trim()) onUpdateProjectName(tempName.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingName(false);
                if (tempName.trim()) onUpdateProjectName(tempName.trim());
              }
            }}
            autoFocus
            className="bg-zinc-800 border border-indigo-500/80 rounded px-2 py-0.5 text-xs text-white focus:outline-none w-36"
          />
        ) : (
          <button
            onClick={() => {
              setTempName(projectName);
              setIsEditingName(true);
            }}
            className="text-xs font-semibold text-zinc-200 hover:text-white px-2 py-1 rounded hover:bg-zinc-800/80 transition-colors truncate max-w-[140px] text-left"
            title="Clique para renomear"
          >
            {projectName}
          </button>
        )}
      </div>

      {/* Center: Dimensions & Aspect Lock */}
      <div className="hidden lg:flex items-center gap-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-2.5 py-1">
        {/* Preset dropdown */}
        <select
          value={dimensions.presetName || 'custom'}
          onChange={(e) => {
            const found = DIMENSION_PRESETS.find((p) => p.name === e.target.value);
            if (found) handlePresetSelect(found);
          }}
          className="bg-transparent text-xs text-zinc-300 font-medium focus:outline-none cursor-pointer pr-1"
        >
          <option value="custom" className="bg-zinc-900 text-zinc-300">
            Personalizado
          </option>
          {DIMENSION_PRESETS.map((p) => (
            <option key={p.name} value={p.name} className="bg-zinc-900 text-zinc-300">
              {p.name} ({p.width}×{p.height})
            </option>
          ))}
        </select>

        <div className="h-3.5 w-[1px] bg-zinc-800" />

        {/* Width input */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-500 font-mono">W</span>
          <input
            type="number"
            min="64"
            max="8192"
            value={dimensions.width}
            onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
            className="w-14 bg-transparent text-xs font-mono text-zinc-200 text-right focus:outline-none"
          />
        </div>

        <span className="text-zinc-600 text-xs">×</span>

        {/* Height input */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-500 font-mono">H</span>
          <input
            type="number"
            min="64"
            max="8192"
            value={dimensions.height}
            onChange={(e) => handleHeightChange(parseInt(e.target.value, 10))}
            className="w-14 bg-transparent text-xs font-mono text-zinc-200 text-right focus:outline-none"
          />
        </div>

        {/* Aspect Ratio Lock */}
        <button
          onClick={() => onUpdateDimensions({ lockAspectRatio: !dimensions.lockAspectRatio })}
          className={`p-1 rounded transition-colors ${
            dimensions.lockAspectRatio
              ? 'text-indigo-400 bg-indigo-500/10'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={dimensions.lockAspectRatio ? 'Proporção bloqueada' : 'Proporção livre'}
        >
          {dimensions.lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 rounded-lg transition-colors cursor-pointer"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 rounded-lg transition-colors cursor-pointer"
            title="Refazer (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Preview Toggle */}
        <button
          onClick={onToggleCleanPreview}
          className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
            cleanPreview
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-zinc-950/60 text-zinc-300 border-zinc-800 hover:border-zinc-700'
          }`}
          title="Modo Visualização Limpa (Atalho: H)"
        >
          {cleanPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="hidden md:inline text-xs">{cleanPreview ? 'Modo Apresentação' : 'Preview Limpo'}</span>
        </button>

        {/* Mobile/Toggle Sidebars */}
        <button
          onClick={onToggleLeftSidebar}
          className={`p-2 rounded-xl border transition-all md:hidden ${
            showLeftSidebar
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
              : 'bg-zinc-950/60 text-zinc-400 border-zinc-800'
          }`}
          title="Alternar Painel de Presets e Cores"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleRightSidebar}
          className={`p-2 rounded-xl border transition-all md:hidden ${
            showRightSidebar
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
              : 'bg-zinc-950/60 text-zinc-400 border-zinc-800'
          }`}
          title="Alternar Painel de Propriedades"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="p-2 text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800/80 transition-colors hidden sm:block"
          title="Atalhos de Teclado"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Projects Manager */}
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          title="Gerenciar Projetos Salvos (Ctrl+S)"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Projetos</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          title="Exportar Imagem ou Vetorial (Ctrl+E)"
        >
          <Download className="w-4 h-4" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
