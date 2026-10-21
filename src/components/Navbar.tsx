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
    <header className="h-14 bg-white border-b border-[#E7E7F0] px-4 md:px-6 flex items-center justify-between gap-3 select-none z-30 shrink-0">
      {/* Left: Hub Return + Tool Title + Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-1.5 text-xs font-medium text-[#62647A] hover:text-[#7655D9] transition-colors py-1.5 px-2.5 rounded-lg hover:bg-[#F5F2FF] cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chromalab</span>
        </button>

        <div className="h-4 w-[1px] bg-[#E7E7F0] shrink-0" />

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-bold tracking-tight text-[#17172A] flex items-center gap-2 whitespace-nowrap">
            Mesh Gradient Studio
            <span className="text-[10px] bg-[#EEF2FF] text-[#7655D9] font-semibold px-2 py-0.5 rounded-full border border-[#D6D1F3] hidden sm:inline">
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
              className="bg-[#FBFBFE] border border-[#7655D9] rounded-lg px-2 py-0.5 text-xs text-[#17172A] focus:outline-none w-28 ml-1"
            />
          ) : (
            <button
              onClick={() => {
                setTempName(projectName);
                setIsEditingName(true);
              }}
              className="text-[11px] font-medium text-[#62647A] hover:text-[#17172A] px-2 py-0.5 rounded-md hover:bg-[#F5F2FF] transition-colors truncate max-w-[120px] text-left hidden md:inline border border-[#E7E7F0]"
              title="Clique para renomear"
            >
              {projectName}
            </button>
          )}
        </div>
      </div>

      {/* Center: Dimensions & Aspect Lock */}
      <div className="hidden lg:flex items-center gap-2 bg-[#F4F5FA] border border-[#E7E7F0] rounded-xl px-2.5 py-1">
        <select
          value={dimensions.presetName || 'custom'}
          onChange={(e) => {
            const found = DIMENSION_PRESETS.find((p) => p.name === e.target.value);
            if (found) handlePresetSelect(found);
          }}
          className="bg-transparent text-xs text-[#17172A] font-medium focus:outline-none cursor-pointer pr-1"
        >
          <option value="custom" className="bg-white text-[#17172A]">
            Personalizado
          </option>
          {DIMENSION_PRESETS.map((p) => (
            <option key={p.name} value={p.name} className="bg-white text-[#17172A]">
              {p.name} ({p.width}×{p.height})
            </option>
          ))}
        </select>

        <div className="h-3.5 w-[1px] bg-[#E7E7F0]" />

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#85869A] font-mono">W</span>
          <input
            type="number"
            min="64"
            max="8192"
            value={dimensions.width}
            onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
            className="w-14 bg-transparent text-xs font-mono text-[#17172A] text-right focus:outline-none"
          />
        </div>

        <span className="text-[#85869A] text-xs">×</span>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#85869A] font-mono">H</span>
          <input
            type="number"
            min="64"
            max="8192"
            value={dimensions.height}
            onChange={(e) => handleHeightChange(parseInt(e.target.value, 10))}
            className="w-14 bg-transparent text-xs font-mono text-[#17172A] text-right focus:outline-none"
          />
        </div>

        <button
          onClick={() => onUpdateDimensions({ lockAspectRatio: !dimensions.lockAspectRatio })}
          className={`p-1 rounded transition-colors ${
            dimensions.lockAspectRatio
              ? 'text-[#7655D9] bg-[#EEF2FF]'
              : 'text-[#85869A] hover:text-[#17172A]'
          }`}
          title={dimensions.lockAspectRatio ? 'Proporção bloqueada' : 'Proporção livre'}
        >
          {dimensions.lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#F4F5FA] rounded-lg p-0.5 border border-[#E7E7F0]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-[#62647A] hover:text-[#7655D9] disabled:opacity-30 disabled:hover:text-[#62647A] rounded transition-colors cursor-pointer"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-[#62647A] hover:text-[#7655D9] disabled:opacity-30 disabled:hover:text-[#62647A] rounded transition-colors cursor-pointer"
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
              ? 'bg-[#EEF2FF] text-[#7655D9] border-[#D6D1F3]'
              : 'bg-[#F4F5FA] text-[#62647A] border-[#E7E7F0] hover:border-[#D6D1F3] hover:text-[#7655D9]'
          }`}
          title="Modo Visualização Limpa (Atalho: H)"
        >
          {cleanPreview ? <EyeOff className="w-3.5 h-3.5 text-[#7655D9]" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden xl:inline text-xs">{cleanPreview ? 'Apresentação' : 'Preview Limpo'}</span>
        </button>

        {/* Mobile/Toggle Sidebars */}
        <button
          onClick={onToggleLeftSidebar}
          className={`p-1.5 rounded-lg border transition-all md:hidden ${
            showLeftSidebar
              ? 'bg-[#EEF2FF] text-[#7655D9] border-[#D6D1F3]'
              : 'bg-[#F4F5FA] text-[#62647A] border-[#E7E7F0]'
          }`}
          title="Alternar Painel de Presets"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleRightSidebar}
          className={`p-1.5 rounded-lg border transition-all md:hidden ${
            showRightSidebar
              ? 'bg-[#EEF2FF] text-[#7655D9] border-[#D6D1F3]'
              : 'bg-[#F4F5FA] text-[#62647A] border-[#E7E7F0]'
          }`}
          title="Alternar Painel de Propriedades"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 text-[#62647A] hover:text-[#7655D9] rounded-lg hover:bg-[#F5F2FF] transition-colors hidden sm:block"
          title="Atalhos de Teclado"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Projects Manager */}
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F5FA] hover:bg-[#F5F2FF] text-[#17172A] border border-[#E7E7F0] hover:border-[#D6D1F3] rounded-lg text-xs font-medium transition-colors cursor-pointer"
          title="Projetos Salvos"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#7655D9]" />
          <span className="hidden sm:inline">Projetos</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold shadow-sm shadow-[#7655D9]/20 transition-all cursor-pointer"
          title="Exportar Imagem ou Vetorial (Ctrl+E)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
