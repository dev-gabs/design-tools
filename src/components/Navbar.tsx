import React, { useState } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  FolderOpen,
  Keyboard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  Sliders,
} from 'lucide-react';
import type { Dimensions } from '../types/mesh';
import { DIMENSION_PRESETS } from '../presets/gradient-presets';

interface NavbarProps {
  onBackToHub: () => void;
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
  onBackToHub,
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
    <header className="h-14 bg-white border-b border-zinc-200/80 px-4 md:px-6 flex items-center justify-between gap-3 select-none z-30 shrink-0">
      {/* Left: Hub Return + Tool Title + Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-zinc-100 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chromalab</span>
        </button>

        <div className="h-4 w-[1px] bg-zinc-200 shrink-0" />

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-bold tracking-tight text-zinc-900 flex items-center gap-2 whitespace-nowrap">
            Mesh Gradient Studio
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full border border-indigo-100 hidden sm:inline">
              Módulo 01
            </span>
          </h1>

          {/* Project Name editable pill */}
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
              className="bg-zinc-50 border border-indigo-500 rounded-lg px-2 py-0.5 text-xs text-zinc-800 focus:outline-none w-28 ml-1"
            />
          ) : (
            <button
              onClick={() => {
                setTempName(projectName);
                setIsEditingName(true);
              }}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 px-2 py-0.5 rounded-md hover:bg-zinc-100 transition-colors truncate max-w-[120px] text-left hidden md:inline border border-zinc-200/60"
              title="Clique para renomear"
            >
              {projectName}
            </button>
          )}
        </div>
      </div>

      {/* Center: Dimensions & Aspect Lock */}
      <div className="hidden lg:flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1">
        <select
          value={dimensions.presetName || 'custom'}
          onChange={(e) => {
            const found = DIMENSION_PRESETS.find((p) => p.name === e.target.value);
            if (found) handlePresetSelect(found);
          }}
          className="bg-transparent text-xs text-zinc-700 font-medium focus:outline-none cursor-pointer pr-1"
        >
          <option value="custom" className="bg-white text-zinc-800">
            Personalizado
          </option>
          {DIMENSION_PRESETS.map((p) => (
            <option key={p.name} value={p.name} className="bg-white text-zinc-800">
              {p.name} ({p.width}×{p.height})
            </option>
          ))}
        </select>

        <div className="h-3.5 w-[1px] bg-zinc-200" />

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-400 font-mono">W</span>
          <input
            type="number"
            min="64"
            max="8192"
            value={dimensions.width}
            onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
            className="w-14 bg-transparent text-xs font-mono text-zinc-800 text-right focus:outline-none"
          />
        </div>

        <span className="text-zinc-400 text-xs">×</span>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-400 font-mono">H</span>
          <input
            type="number"
            min="64"
            max="8192"
            value={dimensions.height}
            onChange={(e) => handleHeightChange(parseInt(e.target.value, 10))}
            className="w-14 bg-transparent text-xs font-mono text-zinc-800 text-right focus:outline-none"
          />
        </div>

        <button
          onClick={() => onUpdateDimensions({ lockAspectRatio: !dimensions.lockAspectRatio })}
          className={`p-1 rounded transition-colors ${
            dimensions.lockAspectRatio
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
          title={dimensions.lockAspectRatio ? 'Proporção bloqueada' : 'Proporção livre'}
        >
          {dimensions.lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center bg-zinc-100 rounded-lg p-0.5 border border-zinc-200/60">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:hover:text-zinc-500 rounded transition-colors cursor-pointer"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:hover:text-zinc-500 rounded transition-colors cursor-pointer"
            title="Refazer (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clean Preview Toggle */}
        <button
          onClick={onToggleCleanPreview}
          className={`p-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
            cleanPreview
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300'
          }`}
          title="Modo Visualização Limpa (Atalho: H)"
        >
          {cleanPreview ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden xl:inline text-xs">{cleanPreview ? 'Apresentação' : 'Preview Limpo'}</span>
        </button>

        {/* Mobile/Toggle Sidebars */}
        <button
          onClick={onToggleLeftSidebar}
          className={`p-1.5 rounded-lg border transition-all md:hidden ${
            showLeftSidebar
              ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
              : 'bg-zinc-50 text-zinc-500 border-zinc-200'
          }`}
          title="Alternar Painel de Presets"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleRightSidebar}
          className={`p-1.5 rounded-lg border transition-all md:hidden ${
            showRightSidebar
              ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
              : 'bg-zinc-50 text-zinc-500 border-zinc-200'
          }`}
          title="Alternar Painel de Propriedades"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors hidden sm:block"
          title="Atalhos de Teclado"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Projects Manager */}
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          title="Projetos Salvos"
        >
          <FolderOpen className="w-3.5 h-3.5 text-zinc-600" />
          <span className="hidden sm:inline">Projetos</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
          title="Exportar Imagem ou Vetorial (Ctrl+E)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
