import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { useChromalab } from '../../context/ChromalabContext';
import { hexToRgba } from '../../engine/color-utils';

type PreviewComponent = 'card' | 'button' | 'panel' | 'badge';
type BackgroundType = 'mesh-gradient' | 'geometric' | 'vibrant' | 'dark-scenery';

export const GlassStudio: React.FC = () => {
  const { navigateToTool, showToast } = useChromalab();

  // Glass properties
  const [blur, setBlur] = useState<number>(16);
  const [fillColor, setFillColor] = useState<string>('#FFFFFF');
  const [fillOpacity, setFillOpacity] = useState<number>(0.2);
  const [useGradientHighlight, setUseGradientHighlight] = useState<boolean>(true);

  const [borderColor, setBorderColor] = useState<string>('#FFFFFF');
  const [borderOpacity, setBorderOpacity] = useState<number>(0.35);
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [borderRadius, setBorderRadius] = useState<number>(20);

  const [shadowBlur, setShadowBlur] = useState<number>(30);
  const [shadowY, setShadowY] = useState<number>(10);
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.15);

  const [previewComp, setPreviewComp] = useState<PreviewComponent>('card');
  const [bgType, setBgType] = useState<BackgroundType>('mesh-gradient');
  const [copiedCss, setCopiedCss] = useState(false);

  // Generate CSS code
  const generateGlassCss = () => {
    const fillRgba = hexToRgba(fillColor, fillOpacity);
    const borderRgba = hexToRgba(borderColor, borderOpacity);

    const backgroundVal = useGradientHighlight
      ? `linear-gradient(135deg, rgba(${fillRgba.r}, ${fillRgba.g}, ${fillRgba.b}, ${Math.min(1, fillOpacity + 0.15)}), rgba(${fillRgba.r}, ${fillRgba.g}, ${fillRgba.b}, ${Math.max(0, fillOpacity - 0.1)}))`
      : `rgba(${fillRgba.r}, ${fillRgba.g}, ${fillRgba.b}, ${fillOpacity})`;

    return `/* Chromalab Glassmorphism UI */
.glass-effect {
  background: ${backgroundVal};
  backdrop-filter: blur(${blur}px);
  -webkit-backdrop-filter: blur(${blur}px);
  border: ${borderWidth}px solid rgba(${borderRgba.r}, ${borderRgba.g}, ${borderRgba.b}, ${borderOpacity});
  border-radius: ${borderRadius}px;
  box-shadow: 0 ${shadowY}px ${shadowBlur}px 0 rgba(0, 0, 0, ${shadowOpacity});
}`;
  };

  const copyCss = () => {
    navigator.clipboard.writeText(generateGlassCss());
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
    showToast('success', 'CSS Copiado', 'Estilos de vidro translúcido prontos para uso.');
  };

  // Background styling
  const getBackgroundStyle = () => {
    switch (bgType) {
      case 'vibrant':
        return {
          background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #556270 100%)',
        };
      case 'geometric':
        return {
          backgroundColor: '#0F172A',
          backgroundImage:
            'radial-gradient(#38BDF8 1.5px, transparent 1.5px), radial-gradient(#EC4899 1.5px, #0F172A 1.5px)',
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0, 18px 18px',
        };
      case 'dark-scenery':
        return {
          background: 'radial-gradient(circle at 20% 30%, #7C3AED 0%, #1E1B4B 60%, #030712 100%)',
        };
      case 'mesh-gradient':
      default:
        return {
          background:
            'radial-gradient(circle at 15% 20%, #4F46E5 0%, transparent 40%), radial-gradient(circle at 85% 30%, #EC4899 0%, transparent 45%), radial-gradient(circle at 50% 85%, #06B6D4 0%, transparent 50%), radial-gradient(circle at 20% 80%, #F59E0B 0%, transparent 40%) #09090B',
        };
    }
  };

  const fillRgba = hexToRgba(fillColor, fillOpacity);
  const borderRgba = hexToRgba(borderColor, borderOpacity);

  const glassStyle: React.CSSProperties = {
    background: useGradientHighlight
      ? `linear-gradient(135deg, rgba(${fillRgba.r}, ${fillRgba.g}, ${fillRgba.b}, ${Math.min(1, fillOpacity + 0.15)}), rgba(${fillRgba.r}, ${fillRgba.g}, ${fillRgba.b}, ${Math.max(0, fillOpacity - 0.1)}))`
      : `rgba(${fillRgba.r}, ${fillRgba.g}, ${fillRgba.b}, ${fillOpacity})`,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    border: `${borderWidth}px solid rgba(${borderRgba.r}, ${borderRgba.g}, ${borderRgba.b}, ${borderOpacity})`,
    borderRadius: `${borderRadius}px`,
    boxShadow: `0 ${shadowY}px ${shadowBlur}px 0 rgba(0, 0, 0, ${shadowOpacity})`,
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-zinc-50 text-zinc-900 select-none">
      {/* Top Chromalab Bar */}
      <header className="h-14 bg-white border-b border-zinc-200/80 px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateToTool('hub')}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chromalab</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-200" />

          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              Glass Studio
              <span className="text-[10px] bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded-full border border-sky-200/80">
                Módulo 06
              </span>
            </h1>
          </div>
        </div>

        {/* Copy CSS Button */}
        <button
          onClick={copyCss}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          {copiedCss ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>Copiar CSS</span>
        </button>
      </header>

      {/* Main Studio Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Controls Sidebar */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-zinc-200/80 p-5 overflow-y-auto space-y-4 shrink-0">
          {/* Component Type Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-800 block mb-1.5">
              Componente de Demonstração
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'card', label: 'Cartão (Card)' },
                { id: 'button', label: 'Botão' },
                { id: 'panel', label: 'Painel / Modal' },
                { id: 'badge', label: 'Badge / Tag' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPreviewComp(c.id as PreviewComponent)}
                  className={`py-1.5 px-2 rounded-lg border text-xs text-center font-medium ${
                    previewComp === c.id
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-800 block mb-1.5">
              Plano de Fundo (Backdrop)
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'mesh-gradient', label: 'Mesh Cósmico' },
                { id: 'vibrant', label: 'Gradiente Suave' },
                { id: 'geometric', label: 'Padrão Geométrico' },
                { id: 'dark-scenery', label: 'Cenário Noturno' },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBgType(b.id as BackgroundType)}
                  className={`py-1.5 px-2 rounded-lg border text-xs text-center font-medium ${
                    bgType === b.id
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blur & Opacity */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Intensidade do Desfoque (Blur)</span>
                <span className="font-mono text-zinc-900 font-semibold">{blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={blur}
                onChange={(e) => setBlur(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Transparência do Fundo</span>
                <span className="font-mono text-zinc-900 font-semibold">{Math.round(fillOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.8"
                step="0.02"
                value={fillOpacity}
                onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">Cor do Preenchimento</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-6 h-6 rounded border border-zinc-200 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-zinc-800">{fillColor}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="gradHighlight"
                checked={useGradientHighlight}
                onChange={(e) => setUseGradientHighlight(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
              <label htmlFor="gradHighlight" className="text-xs text-zinc-600 cursor-pointer">
                Reflexo especular suave (Gradiente)
              </label>
            </div>
          </div>

          {/* Border Controls */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-800 block">Borda & Contorno</span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">Cor da Borda</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="w-6 h-6 rounded border border-zinc-200 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-zinc-800">{borderColor}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Opacidade da Borda</span>
                <span className="font-mono text-zinc-900 font-semibold">{Math.round(borderOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={borderOpacity}
                onChange={(e) => setBorderOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Espessura da Borda</span>
                <span className="font-mono text-zinc-900 font-semibold">{borderWidth}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                value={borderWidth}
                onChange={(e) => setBorderWidth(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Raio dos Cantos</span>
                <span className="font-mono text-zinc-900 font-semibold">{borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={borderRadius}
                onChange={(e) => setBorderRadius(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Shadow Controls */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-800 block">Sombra (Drop Shadow)</span>
            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Desfoque da Sombra</span>
                <span className="font-mono text-zinc-900 font-semibold">{shadowBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={shadowBlur}
                onChange={(e) => setShadowBlur(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Deslocamento Y da Sombra</span>
                <span className="font-mono text-zinc-900 font-semibold">{shadowY}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={shadowY}
                onChange={(e) => setShadowY(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Opacidade da Sombra</span>
                <span className="font-mono text-zinc-900 font-semibold">{Math.round(shadowOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.02"
                value={shadowOpacity}
                onChange={(e) => setShadowOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Accessibility Note */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Atenção ao Contraste:</strong> O efeito translúcido exige validação do contraste de texto sobre fotos ou fundos dinâmicos para conformidade WCAG AA.
            </span>
          </div>
        </aside>

        {/* Live Preview Canvas */}
        <main
          style={getBackgroundStyle()}
          className="flex-1 p-6 md:p-12 flex items-center justify-center overflow-auto transition-all duration-300 relative"
        >
          {previewComp === 'card' && (
            <div style={glassStyle} className="w-full max-w-md p-6 text-white space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full border border-white/20">
                  Glassmorphism
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">Superfície Translúcida</h3>
                <p className="text-xs opacity-80 mt-1 leading-relaxed">
                  Desfoque de fundo em tempo real com difração de luz e bordas destacadas.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between border-t border-white/20">
                <span className="text-xs font-mono font-semibold">chromalab.design</span>
                <button className="px-3.5 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-bold hover:bg-white/90 transition-all cursor-pointer shadow-md">
                  Ação
                </button>
              </div>
            </div>
          )}

          {previewComp === 'button' && (
            <div className="space-y-4 flex flex-col items-center">
              <button
                style={glassStyle}
                className="px-8 py-3.5 text-white font-semibold text-sm tracking-wide transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Botão Translúcido Interativo
              </button>
            </div>
          )}

          {previewComp === 'panel' && (
            <div style={glassStyle} className="w-full max-w-lg p-6 text-white space-y-3 animate-fade-in">
              <h4 className="text-base font-bold">Painel de Configurações</h4>
              <p className="text-xs opacity-80">
                Uma camada elevada de interface que deixa visível a rica paleta ou textura de fundo.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-3 rounded-lg bg-white/10 border border-white/10 text-xs">
                  <div className="font-bold">Estatística 01</div>
                  <div className="text-lg font-mono font-bold mt-1">98.4%</div>
                </div>
                <div className="p-3 rounded-lg bg-white/10 border border-white/10 text-xs">
                  <div className="font-bold">Estatística 02</div>
                  <div className="text-lg font-mono font-bold mt-1">2.4ms</div>
                </div>
              </div>
            </div>
          )}

          {previewComp === 'badge' && (
            <div style={glassStyle} className="px-4 py-2 text-white flex items-center gap-2 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold font-mono">STATUS: OPERACIONAL (BLUR: {blur}PX)</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
