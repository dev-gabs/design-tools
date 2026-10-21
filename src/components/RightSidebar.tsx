import React, { useState } from 'react';
import {
  Sliders,
  Maximize,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Sparkles,
  Contrast,
  Sun,
  Eye,
  Check,
} from 'lucide-react';
import type { MeshPoint, Dimensions, GlobalEngineSettings } from '../types/mesh';
import { hexToRgba, rgbaToHex, hexToHsla, hslaToHex, type RGBA, type HSLA } from '../engine/color-utils';

interface RightSidebarProps {
  points: MeshPoint[];
  selectedPointIds: string[];
  dimensions: Dimensions;
  settings: GlobalEngineSettings;
  onUpdatePoint: (id: string, updates: Partial<MeshPoint>) => void;
  onUpdateMultiplePoints: (ids: string[], updates: Partial<MeshPoint>) => void;
  onUpdateSettings: (newSettings: Partial<GlobalEngineSettings>) => void;
  onDuplicatePoint: (id: string) => void;
  onDeletePoint: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  points,
  selectedPointIds,
  dimensions,
  settings,
  onUpdatePoint,
  onUpdateMultiplePoints,
  onUpdateSettings,
  onDuplicatePoint,
  onDeletePoint,
  isOpen,
}) => {
  const [colorMode, setColorMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [copiedHex, setCopiedHex] = useState(false);

  if (!isOpen) return null;

  const selectedPoints = points.filter((p) => selectedPointIds.includes(p.id));
  const primaryPoint = selectedPoints[0];

  const handleHexChange = (hex: string) => {
    if (!primaryPoint) return;
    const clean = hex.startsWith('#') ? hex : `#${hex}`;
    if (selectedPoints.length > 1) {
      onUpdateMultiplePoints(selectedPointIds, { color: clean });
    } else {
      onUpdatePoint(primaryPoint.id, { color: clean });
    }
  };

  const handleRgbChange = (rgba: Partial<RGBA>) => {
    if (!primaryPoint) return;
    const current = hexToRgba(primaryPoint.color, primaryPoint.alpha);
    const updated = { ...current, ...rgba };
    const hex = rgbaToHex(updated);
    if (rgba.a !== undefined) {
      onUpdatePoint(primaryPoint.id, { color: hex, alpha: rgba.a });
    } else {
      onUpdatePoint(primaryPoint.id, { color: hex });
    }
  };

  const handleHslChange = (hsla: Partial<HSLA>) => {
    if (!primaryPoint) return;
    const current = hexToHsla(primaryPoint.color, primaryPoint.alpha);
    const updated = { ...current, ...hsla };
    const hex = hslaToHex(updated);
    if (hsla.a !== undefined) {
      onUpdatePoint(primaryPoint.id, { color: hex, alpha: hsla.a });
    } else {
      onUpdatePoint(primaryPoint.id, { color: hex });
    }
  };

  const currentRgba = primaryPoint ? hexToRgba(primaryPoint.color, primaryPoint.alpha) : { r: 0, g: 0, b: 0, a: 1 };
  const currentHsla = primaryPoint ? hexToHsla(primaryPoint.color, primaryPoint.alpha) : { h: 0, s: 0, l: 0, a: 1 };

  return (
    <aside className="w-80 h-full bg-white border-l border-zinc-200/80 flex flex-col shrink-0 select-none z-20 text-zinc-900 overflow-y-auto">
      {/* Section 1: Selected Point Inspector */}
      {selectedPoints.length > 0 && primaryPoint ? (
        <div className="p-4 border-b border-zinc-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full border border-black/15"
                style={{ backgroundColor: primaryPoint.color }}
              />
              <span className="text-xs font-bold text-zinc-900">
                {selectedPoints.length > 1
                  ? `${selectedPoints.length} Pontos Selecionados`
                  : 'Propriedades do Ponto'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onUpdatePoint(primaryPoint.id, { locked: !primaryPoint.locked })
                }
                className={`p-1 rounded transition-colors ${
                  primaryPoint.locked ? 'text-amber-600 bg-amber-50' : 'text-zinc-400 hover:text-zinc-800'
                }`}
                title={primaryPoint.locked ? 'Desbloquear Ponto' : 'Bloquear Ponto'}
              >
                {primaryPoint.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => onDuplicatePoint(primaryPoint.id)}
                className="p-1 text-zinc-400 hover:text-zinc-800 rounded transition-colors"
                title="Duplicar Ponto (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onDeletePoint(primaryPoint.id)}
                disabled={points.length <= 1}
                className="p-1 text-zinc-400 hover:text-rose-500 disabled:opacity-30 rounded transition-colors"
                title="Excluir Ponto (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Color Section */}
          <div className="space-y-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-700">Cor do Ponto</span>
              <div className="flex items-center gap-1 bg-white rounded-md p-0.5 border border-zinc-200">
                {(['hex', 'rgb', 'hsl'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setColorMode(m)}
                    className={`px-2 py-0.5 text-[9px] uppercase font-mono rounded ${
                      colorMode === m ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Color Input and Hex field */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryPoint.color.substring(0, 7)}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-10 h-10 rounded-xl border border-zinc-200 cursor-pointer bg-transparent p-0.5 shrink-0"
              />

              <div className="flex-1 flex items-center bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-500">
                <input
                  type="text"
                  value={primaryPoint.color.toUpperCase()}
                  onChange={(e) => handleHexChange(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono text-zinc-900 uppercase focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(primaryPoint.color);
                    setCopiedHex(true);
                    setTimeout(() => setCopiedHex(false), 2000);
                  }}
                  className="text-zinc-400 hover:text-zinc-700 p-0.5"
                  title="Copiar HEX"
                >
                  {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* RGB Mode */}
            {colorMode === 'rgb' && (
              <div className="space-y-2 pt-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 text-red-500 font-mono font-bold">R</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={currentRgba.r}
                    onChange={(e) => handleRgbChange({ r: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-red-500 bg-zinc-200 h-1 rounded appearance-none cursor-pointer"
                  />
                  <span className="w-8 font-mono text-right text-zinc-600">{currentRgba.r}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 text-emerald-500 font-mono font-bold">G</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={currentRgba.g}
                    onChange={(e) => handleRgbChange({ g: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-emerald-500 bg-zinc-200 h-1 rounded appearance-none cursor-pointer"
                  />
                  <span className="w-8 font-mono text-right text-zinc-600">{currentRgba.g}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 text-blue-500 font-mono font-bold">B</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={currentRgba.b}
                    onChange={(e) => handleRgbChange({ b: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-blue-500 bg-zinc-200 h-1 rounded appearance-none cursor-pointer"
                  />
                  <span className="w-8 font-mono text-right text-zinc-600">{currentRgba.b}</span>
                </div>
              </div>
            )}

            {/* HSL Mode */}
            {colorMode === 'hsl' && (
              <div className="space-y-2 pt-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 text-indigo-500 font-mono font-bold">H</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={currentHsla.h}
                    onChange={(e) => handleHslChange({ h: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-indigo-500 bg-zinc-200 h-1 rounded appearance-none cursor-pointer"
                  />
                  <span className="w-8 font-mono text-right text-zinc-600">{currentHsla.h}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 text-pink-500 font-mono font-bold">S</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentHsla.s}
                    onChange={(e) => handleHslChange({ s: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-pink-500 bg-zinc-200 h-1 rounded appearance-none cursor-pointer"
                  />
                  <span className="w-8 font-mono text-right text-zinc-600">{currentHsla.s}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 text-amber-500 font-mono font-bold">L</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentHsla.l}
                    onChange={(e) => handleHslChange({ l: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-amber-500 bg-zinc-200 h-1 rounded appearance-none cursor-pointer"
                  />
                  <span className="w-8 font-mono text-right text-zinc-600">{currentHsla.l}%</span>
                </div>
              </div>
            )}

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-[11px] text-zinc-600 mb-1">
                <span>Opacidade (Canal Alfa)</span>
                <span className="font-mono text-zinc-800 font-semibold">{Math.round(primaryPoint.alpha * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={primaryPoint.alpha}
                onChange={(e) => onUpdatePoint(primaryPoint.id, { alpha: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Coordinates X & Y */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
            <div>
              <span className="text-[10px] text-zinc-500 font-medium block mb-1">Posição X (%)</span>
              <div className="flex items-center bg-white border border-zinc-200 rounded px-2 py-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(primaryPoint.x * 100)}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                    onUpdatePoint(primaryPoint.id, { x: val / 100 });
                  }}
                  className="w-full bg-transparent text-xs font-mono text-zinc-800 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400">%</span>
              </div>
              <span className="text-[9px] text-zinc-400 mt-1 block">
                {Math.round(primaryPoint.x * dimensions.width)} px
              </span>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500 font-medium block mb-1">Posição Y (%)</span>
              <div className="flex items-center bg-white border border-zinc-200 rounded px-2 py-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(primaryPoint.y * 100)}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                    onUpdatePoint(primaryPoint.id, { y: val / 100 });
                  }}
                  className="w-full bg-transparent text-xs font-mono text-zinc-800 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400">%</span>
              </div>
              <span className="text-[9px] text-zinc-400 mt-1 block">
                {Math.round(primaryPoint.y * dimensions.height)} px
              </span>
            </div>
          </div>

          {/* Influence Radius & Intensity */}
          <div className="space-y-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
            <div>
              <div className="flex justify-between text-[11px] text-zinc-600 mb-1">
                <span>Raio de Influência</span>
                <span className="font-mono text-indigo-600 font-semibold">{primaryPoint.radius.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={primaryPoint.radius}
                onChange={(e) => onUpdatePoint(primaryPoint.id, { radius: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-zinc-600 mb-1">
                <span>Intensidade / Peso</span>
                <span className="font-mono text-indigo-600 font-semibold">{primaryPoint.intensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={primaryPoint.intensity}
                onChange={(e) => onUpdatePoint(primaryPoint.id, { intensity: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 border-b border-zinc-200/80 text-center py-8">
          <Maximize className="w-7 h-7 text-zinc-400 mx-auto mb-2 opacity-60" />
          <p className="text-xs text-zinc-600 font-semibold">Nenhum ponto selecionado</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Clique em um ponto de cor no canvas para editar propriedades.
          </p>
        </div>
      )}

      {/* Section 2: Global Engine & Shader Finishing */}
      <div className="p-4 space-y-4 flex-1">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Motor & Pós-Processamento
          </h3>
        </div>

        {/* Blend Smoothness */}
        <div>
          <div className="flex justify-between text-xs text-zinc-700 mb-1">
            <span>Suavidade da Mistura</span>
            <span className="font-mono text-indigo-600 font-semibold">{settings.smoothness.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="1.2"
            max="4.5"
            step="0.1"
            value={settings.smoothness}
            onChange={(e) => onUpdateSettings({ smoothness: parseFloat(e.target.value) })}
            className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Color Space Selection */}
        <div>
          <label className="text-xs font-semibold text-zinc-700 block mb-1.5">Espaço Cromático</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'oklab', label: 'OKLab', desc: 'Perceptual' },
              { id: 'linear', label: 'Linear', desc: 'sRGB' },
              { id: 'srgb', label: 'sRGB', desc: 'Padrão' },
            ].map((cs) => (
              <button
                key={cs.id}
                onClick={() => onUpdateSettings({ colorSpace: cs.id as 'oklab' | 'linear' | 'srgb' })}
                className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-all ${
                  settings.colorSpace === cs.id
                    ? 'bg-zinc-900 border-zinc-900 text-white font-semibold'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <div className="text-[11px] font-bold">{cs.label}</div>
                <div className="text-[9px] opacity-80">{cs.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Film Grain Noise */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Granulação Estocástica
            </span>
            <span className="font-mono text-xs text-zinc-600">
              {Math.round(settings.noiseIntensity * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="0.0"
            max="0.4"
            step="0.01"
            value={settings.noiseIntensity}
            onChange={(e) => onUpdateSettings({ noiseIntensity: parseFloat(e.target.value) })}
            className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
          />

          {settings.noiseIntensity > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>Escala</span>
                <span className="font-mono">{settings.noiseScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.1"
                value={settings.noiseScale}
                onChange={(e) => onUpdateSettings({ noiseScale: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 bg-zinc-200 h-1 rounded appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Contrast & Saturation */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-zinc-700 mb-1">
              <span className="flex items-center gap-1">
                <Contrast className="w-3.5 h-3.5 text-zinc-500" />
                Contraste
              </span>
              <span className="font-mono text-zinc-800 font-semibold">{Math.round(settings.contrast * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.02"
              value={settings.contrast}
              onChange={(e) => onUpdateSettings({ contrast: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-zinc-700 mb-1">
              <span className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-zinc-500" />
                Saturação
              </span>
              <span className="font-mono text-zinc-800 font-semibold">{Math.round(settings.saturation * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.02"
              value={settings.saturation}
              onChange={(e) => onUpdateSettings({ saturation: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-zinc-700 mb-1">
              <span>Girar Matiz (Hue Shift)</span>
              <span className="font-mono text-zinc-800 font-semibold">{settings.hueShift}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={settings.hueShift}
              onChange={(e) => onUpdateSettings({ hueShift: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Vignette */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800">Vinheta Periférica</span>
            <span className="font-mono text-xs text-zinc-600">
              {Math.round(settings.vignetteIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="0.8"
            step="0.02"
            value={settings.vignetteIntensity}
            onChange={(e) => onUpdateSettings({ vignetteIntensity: parseFloat(e.target.value) })}
            className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Background mode */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-zinc-500" />
              Fundo Transparente
            </span>
            <input
              type="checkbox"
              checked={settings.transparentBackground}
              onChange={(e) => onUpdateSettings({ transparentBackground: e.target.checked })}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </div>

          {!settings.transparentBackground && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-600">Cor de Fundo</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => onUpdateSettings({ backgroundColor: e.target.value })}
                  className="w-6 h-6 rounded border border-zinc-200 bg-transparent cursor-pointer"
                />
                <span className="text-[11px] font-mono text-zinc-800 uppercase">
                  {settings.backgroundColor}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
