import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { useChromalab } from '../../context/ChromalabContext';

interface TypeScaleRatio {
  name: string;
  ratio: number;
}

const RATIOS: TypeScaleRatio[] = [
  { name: 'Minor Second (1.067)', ratio: 1.067 },
  { name: 'Major Second (1.125)', ratio: 1.125 },
  { name: 'Minor Third (1.200)', ratio: 1.2 },
  { name: 'Major Third (1.250)', ratio: 1.25 },
  { name: 'Perfect Fourth (1.333)', ratio: 1.333 },
  { name: 'Augmented Fourth (1.414)', ratio: 1.414 },
  { name: 'Perfect Fifth (1.500)', ratio: 1.5 },
  { name: 'Golden Ratio (1.618)', ratio: 1.618 },
];

export const TypeSystemStudio: React.FC = () => {
  const { navigateToTool, showToast } = useChromalab();

  // Scale parameters
  const [baseSize, setBaseSize] = useState<number>(16);
  const [selectedRatio, setSelectedRatio] = useState<number>(1.25);
  const [fontFamily, setFontFamily] = useState<string>('Plus Jakarta Sans, sans-serif');
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [letterSpacing, setLetterSpacing] = useState<number>(-0.02);
  const [fontWeight, setFontWeight] = useState<number>(500);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Preview editable texts
  const [titleText, setTitleText] = useState<string>('Design, sem complicação.');
  const [subtitleText, setSubtitleText] = useState<string>('Construa sistemas visuais com clareza matemática e proporções harmônicas.');
  const [bodyText, setBodyText] = useState<string>(
    'Uma boa tipografia guia o olhar, estabelece hierarquias instantâneas e transforma conteúdo textual em uma experiência estética e funcional agradável.'
  );

  // Active view tab
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'scale' | 'code'>('hierarchy');
  const [copiedCode, setCopiedCode] = useState(false);

  // Calculate scale steps
  const steps = [
    { label: 'Display', exp: 4, tag: 'h1' },
    { label: 'H1', exp: 3, tag: 'h1' },
    { label: 'H2', exp: 2, tag: 'h2' },
    { label: 'H3', exp: 1, tag: 'h3' },
    { label: 'Base / Body', exp: 0, tag: 'p' },
    { label: 'Small', exp: -1, tag: 'small' },
    { label: 'Caption', exp: -2, tag: 'span' },
  ];

  const calculateSize = (exp: number) => {
    return Math.round(baseSize * Math.pow(selectedRatio, exp) * 10) / 10;
  };

  // Generate CSS Tokens
  const generateCssVariables = () => {
    const lines = steps.map((s) => {
      const px = calculateSize(s.exp);
      const rem = (px / 16).toFixed(3);
      return `  --text-${s.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}: ${rem}rem; /* ${px}px */`;
    });
    return `:root {\n  --font-family-base: ${fontFamily};\n  --font-size-base: ${baseSize}px;\n  --line-height-base: ${lineHeight};\n${lines.join('\n')}\n}`;
  };

  // Generate responsive clamp() rules
  const generateClampCss = () => {
    return steps
      .map((s) => {
        const desktopPx = calculateSize(s.exp);
        const mobilePx = Math.max(12, Math.round(desktopPx * 0.78));
        const preferredVw = (desktopPx / 12).toFixed(2);
        return `.text-${s.label.toLowerCase().replace(/[^a-z0-9]/g, '-')} {\n  font-size: clamp(${mobilePx}px, ${preferredVw}vw, ${desktopPx}px);\n  line-height: ${s.exp > 0 ? (lineHeight * 0.85).toFixed(2) : lineHeight};\n}`;
      })
      .join('\n\n');
  };

  const copyText = (text: string, title = 'Copiado!') => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast('success', title);
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
              Type System
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200/80">
                Módulo 05
              </span>
            </h1>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => copyText(generateCssVariables(), 'Variáveis CSS Copiadas!')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>Copiar Variáveis CSS</span>
        </button>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Controls Sidebar */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-zinc-200/80 p-5 overflow-y-auto space-y-4 shrink-0">
          <div>
            <label className="text-xs font-semibold text-zinc-800 block mb-1.5">
              Razão da Escala Modular
            </label>
            <select
              value={selectedRatio}
              onChange={(e) => setSelectedRatio(parseFloat(e.target.value))}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {RATIOS.map((r) => (
                <option key={r.name} value={r.ratio}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-zinc-800 font-semibold mb-1">
              <span>Tamanho Base</span>
              <span className="font-mono text-indigo-600">{baseSize}px</span>
            </div>
            <input
              type="range"
              min="12"
              max="24"
              value={baseSize}
              onChange={(e) => setBaseSize(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-800 block mb-1.5">
              Família Tipográfica
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="'Plus Jakarta Sans', system-ui, sans-serif">Plus Jakarta Sans (Display / Sans)</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono (Monospace)</option>
              <option value="Georgia, serif">Georgia (Serif Elegante)</option>
              <option value="system-ui, -apple-system, sans-serif">System UI / Apple</option>
            </select>
          </div>

          {/* Sliders: Weight, Line-height, Letter-spacing */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Peso Tipográfico</span>
                <span className="font-mono text-zinc-900 font-semibold">{fontWeight}</span>
              </div>
              <input
                type="range"
                min="300"
                max="800"
                step="100"
                value={fontWeight}
                onChange={(e) => setFontWeight(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Altura da Linha (Line-height)</span>
                <span className="font-mono text-zinc-900 font-semibold">{lineHeight}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.05"
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-700 mb-1">
                <span>Letter Spacing</span>
                <span className="font-mono text-zinc-900 font-semibold">{letterSpacing}em</span>
              </div>
              <input
                type="range"
                min="-0.08"
                max="0.15"
                step="0.01"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-zinc-200 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <span className="text-xs text-zinc-700 block mb-1">Alinhamento</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setTextAlign(a)}
                    className={`py-1.5 rounded-lg border text-xs flex items-center justify-center transition-all ${
                      textAlign === a
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                    }`}
                  >
                    {a === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                    {a === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                    {a === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Interactive Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Navigation tabs inside viewport */}
          <div className="border-b border-zinc-200/80 px-6 pt-3 flex items-center gap-4 bg-zinc-50/50">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'hierarchy'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Playground Editorial
            </button>
            <button
              onClick={() => setActiveTab('scale')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'scale'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Degraus da Escala (Níveis)
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'code'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Exportar Código CSS
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {activeTab === 'hierarchy' && (
              <div
                style={{
                  fontFamily,
                  textAlign,
                  letterSpacing: `${letterSpacing}em`,
                }}
                className="max-w-3xl mx-auto space-y-6"
              >
                {/* Display Title */}
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">
                    Display ({calculateSize(4)}px)
                  </span>
                  <input
                    type="text"
                    value={titleText}
                    onChange={(e) => setTitleText(e.target.value)}
                    style={{
                      fontSize: `${calculateSize(4)}px`,
                      lineHeight: lineHeight * 0.85,
                      fontWeight,
                    }}
                    className="w-full bg-transparent text-zinc-900 border-b border-dashed border-zinc-300 focus:border-indigo-500 focus:outline-none tracking-tight pb-1"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">
                    H2 / Subtítulo ({calculateSize(2)}px)
                  </span>
                  <textarea
                    rows={2}
                    value={subtitleText}
                    onChange={(e) => setSubtitleText(e.target.value)}
                    style={{
                      fontSize: `${calculateSize(2)}px`,
                      lineHeight: lineHeight * 0.95,
                      fontWeight: Math.max(400, fontWeight - 100),
                    }}
                    className="w-full bg-transparent text-zinc-700 border-b border-dashed border-zinc-300 focus:border-indigo-500 focus:outline-none tracking-tight"
                  />
                </div>

                {/* Body paragraph */}
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">
                    Body Paragraph ({calculateSize(0)}px)
                  </span>
                  <textarea
                    rows={4}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    style={{
                      fontSize: `${calculateSize(0)}px`,
                      lineHeight,
                    }}
                    className="w-full bg-transparent text-zinc-600 border-b border-dashed border-zinc-300 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'scale' && (
              <div className="max-w-3xl mx-auto space-y-4">
                {steps.map((s) => {
                  const size = calculateSize(s.exp);
                  return (
                    <div
                      key={s.label}
                      className="p-4 rounded-xl border border-zinc-200/80 hover:border-indigo-400 transition-all bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-20 font-mono text-xs font-semibold text-indigo-600">
                          {s.label}
                        </span>
                        <div
                          style={{
                            fontFamily,
                            fontSize: `${size}px`,
                            fontWeight,
                            letterSpacing: `${letterSpacing}em`,
                          }}
                          className="text-zinc-900 truncate"
                        >
                          Tipografia Harmônica
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-zinc-700">{size}px</span>
                        <span className="text-[10px] text-zinc-400 block">{(size / 16).toFixed(3)}rem</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'code' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-800">
                      CSS Custom Properties (Design Tokens)
                    </span>
                    <button
                      onClick={() => copyText(generateCssVariables())}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Tokens</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
                    {generateCssVariables()}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-800">
                      Regras Responsivas com clamp()
                    </span>
                    <button
                      onClick={() => copyText(generateClampCss())}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar clamp()</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
                    {generateClampCss()}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
