import React, { useState } from 'react';
import { X, Download, Copy, Check, Sparkles, FileImage, Layers } from 'lucide-react';
import type { MeshPoint, GlobalEngineSettings, ExportFormat, ExportOptions } from '../types/mesh';
import { exportImage, exportSvg, copyImageToClipboard, triggerDownload } from '../engine/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  points: MeshPoint[];
  settings: GlobalEngineSettings;
  docWidth: number;
  docHeight: number;
  projectName: string;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  points,
  settings,
  docWidth,
  docHeight,
  projectName,
  onShowToast,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<number>(1);
  const [quality, setQuality] = useState<number>(0.92);
  const [jpegBgColor, setJpegBgColor] = useState<string>('#FFFFFF');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const exportWidth = Math.round(docWidth * scale);
  const exportHeight = Math.round(docHeight * scale);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format,
        scale,
        quality,
        backgroundColor: jpegBgColor,
        includeEffects: true,
      };

      const safeName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'mesh_gradient';

      if (format === 'svg') {
        const { blob } = await exportSvg(points, settings, docWidth, docHeight, options);
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${safeName}_${exportWidth}x${exportHeight}.svg`);
        URL.revokeObjectURL(url);
      } else {
        const { blob } = await exportImage(points, settings, docWidth, docHeight, options);
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${safeName}_${exportWidth}x${exportHeight}.${format}`);
        URL.revokeObjectURL(url);
      }

      onShowToast('success', 'Exportação concluída!', `Arquivo salvo com resolução ${exportWidth} × ${exportHeight}px.`);
      onClose();
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Falha na exportação', err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = async () => {
    setIsExporting(true);
    try {
      await copyImageToClipboard(points, settings, exportWidth, exportHeight);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onShowToast('success', 'Copiado para a Área de Transferência', 'Imagem PNG pronta para colar no Figma, Photoshop ou documentos.');
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Erro ao copiar imagem', 'O navegador não permitiu a gravação de imagem na área de transferência.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Exportar Mesh Gradient</h3>
              <p className="text-xs text-zinc-400">Resolução nativa ou super amostragem de alta qualidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Format selection */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-2">Formato de Arquivo</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                  format === 'png'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <FileImage className="w-5 h-5 mb-1.5" />
                <span>PNG</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Transparência</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('jpeg')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                  format === 'jpeg'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <Layers className="w-5 h-5 mb-1.5" />
                <span>JPEG</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Compactado</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('svg')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                  format === 'svg'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <Sparkles className="w-5 h-5 mb-1.5" />
                <span>SVG</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Vetorial / Hi-Fi</span>
              </button>
            </div>
          </div>

          {/* Scale selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-300">Escala de Resolução</label>
              <span className="text-xs text-indigo-400 font-mono font-medium">
                {exportWidth} × {exportHeight} px
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition-all ${
                    scale === s
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {s}x {s === 2 ? '(2K/Retina)' : s === 4 ? '(4K UHD)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Format-specific settings */}
          {format === 'jpeg' && (
            <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">Qualidade JPEG</span>
                  <span className="font-mono text-zinc-400">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.01"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300">Cor de Fundo (Sem canal alfa)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={jpegBgColor}
                    onChange={(e) => setJpegBgColor(e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono text-zinc-400 uppercase">{jpegBgColor}</span>
                </div>
              </div>
            </div>
          )}

          {format === 'svg' && (
            <div className="p-3.5 bg-sky-950/30 border border-sky-800/40 rounded-xl text-xs text-sky-200 leading-relaxed">
              <strong>Nota sobre SVG:</strong> Para preservar a física contínua e as transições cromáticas não-lineares calculadas por shader sem distorções poligonais, o SVG gerado embute a renderização em resolução ultra-alta (lossless) com metadados estruturais completos de cada ponto de controle.
            </div>
          )}

          {/* Summary badge */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/40 border border-zinc-800 rounded-xl text-xs">
            <span className="text-zinc-400">Dimensões Finais:</span>
            <span className="font-mono font-semibold text-zinc-200">
              {exportWidth} × {exportHeight} px ({format.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950/70 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyClipboard}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium rounded-xl text-zinc-200 transition-colors disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar Imagem'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2.5 bg-transparent hover:bg-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Processando...' : 'Baixar Arquivo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
