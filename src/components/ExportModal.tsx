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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#E7E7F0] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-[#17172A]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E7F0]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EEF2FF] rounded-lg text-[#7655D9]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#17172A]">Exportar Mesh Gradient</h3>
              <p className="text-xs text-[#62647A]">Resolução nativa ou super amostragem de alta qualidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#85869A] hover:text-[#17172A] rounded-lg hover:bg-[#F5F2FF] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Format selection */}
          <div>
            <label className="text-xs font-medium text-[#17172A] block mb-2">Formato de Arquivo</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  format === 'png'
                    ? 'bg-[#7655D9] text-white border-[#7655D9] shadow-sm shadow-[#7655D9]/20'
                    : 'bg-[#F4F5FA] border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A]'
                }`}
              >
                <FileImage className="w-5 h-5 mb-1.5" />
                <span>PNG</span>
                <span className={`text-[10px] mt-0.5 ${format === 'png' ? 'text-white/80' : 'text-[#85869A]'}`}>Transparência</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('jpeg')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  format === 'jpeg'
                    ? 'bg-[#7655D9] text-white border-[#7655D9] shadow-sm shadow-[#7655D9]/20'
                    : 'bg-[#F4F5FA] border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A]'
                }`}
              >
                <Layers className="w-5 h-5 mb-1.5" />
                <span>JPEG</span>
                <span className={`text-[10px] mt-0.5 ${format === 'jpeg' ? 'text-white/80' : 'text-[#85869A]'}`}>Compactado</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('svg')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  format === 'svg'
                    ? 'bg-[#7655D9] text-white border-[#7655D9] shadow-sm shadow-[#7655D9]/20'
                    : 'bg-[#F4F5FA] border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A]'
                }`}
              >
                <Sparkles className="w-5 h-5 mb-1.5" />
                <span>SVG</span>
                <span className={`text-[10px] mt-0.5 ${format === 'svg' ? 'text-white/80' : 'text-[#85869A]'}`}>Vetorial / Hi-Fi</span>
              </button>
            </div>
          </div>

          {/* Scale selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#17172A]">Escala de Resolução</label>
              <span className="text-xs text-[#7655D9] font-mono font-medium">
                {exportWidth} × {exportHeight} px
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
                    scale === s
                      ? 'bg-[#7655D9] text-white border-[#7655D9] shadow-sm shadow-[#7655D9]/20'
                      : 'bg-[#F4F5FA] border-[#E7E7F0] text-[#17172A] hover:border-[#D6D1F3]'
                  }`}
                >
                  {s}x {s === 2 ? '(2K/Retina)' : s === 4 ? '(4K UHD)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Format-specific settings */}
          {format === 'jpeg' && (
            <div className="p-4 bg-[#F4F5FA] border border-[#E7E7F0] rounded-xl space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#17172A] font-medium">Qualidade JPEG</span>
                  <span className="font-mono text-[#85869A]">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.01"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-[#7655D9] bg-[#E7E7F0] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#17172A] font-medium">Cor de Fundo (Sem canal alfa)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={jpegBgColor}
                    onChange={(e) => setJpegBgColor(e.target.value)}
                    className="w-7 h-7 rounded border border-[#E7E7F0] cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono text-[#62647A] uppercase">{jpegBgColor}</span>
                </div>
              </div>
            </div>
          )}

          {format === 'svg' && (
            <div className="p-3.5 bg-[#EEF2FF] border border-[#D6D1F3] rounded-xl text-xs text-[#5B3DB5] leading-relaxed">
              <strong>Nota sobre SVG:</strong> Para preservar a física contínua e as transições cromáticas não-lineares calculadas por shader sem distorções poligonais, o SVG gerado embute a renderização em resolução ultra-alta (lossless) com metadados estruturais completos de cada ponto de controle.
            </div>
          )}

          {/* Summary badge */}
          <div className="flex items-center justify-between p-3 bg-[#F4F5FA] border border-[#E7E7F0] rounded-xl text-xs">
            <span className="text-[#62647A]">Dimensões Finais:</span>
            <span className="font-mono font-semibold text-[#17172A]">
              {exportWidth} × {exportHeight} px ({format.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#FBFBFE] border-t border-[#E7E7F0] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyClipboard}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F5F2FF] border border-[#E7E7F0] text-xs font-medium rounded-lg text-[#17172A] transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar Imagem'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-3.5 py-2 text-xs text-[#62647A] hover:text-[#17172A] rounded-lg hover:bg-[#F5F2FF] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2 bg-[#7655D9] hover:bg-[#5B3DB5] text-white text-xs font-medium rounded-lg transition-colors shadow-sm shadow-[#7655D9]/20 disabled:opacity-50 cursor-pointer"
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
