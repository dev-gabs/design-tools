import { useState } from 'react';
import {
  Search,
  Sparkles,
  ArrowRight,
  Bookmark,
  Download,
  Copy,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { useChromalab } from '../context/ChromalabContext';
import type { ToolMetadata } from '../types/chromalab';

export const TOOLS: ToolMetadata[] = [
  {
    id: 'mesh',
    name: 'Mesh Gradient Studio',
    tagline: 'Gradientes orgânicos e complexos com controle ponto a ponto acelerado por WebGL.',
    description: 'Motor de malha cromática com interpolação contínua e exportação em até 8K.',
    category: 'Gradientes',
    badge: 'WebGL GPU',
  },
  {
    id: 'palette',
    name: 'Color Palette Studio',
    tagline: 'Gerador inteligente de paletas com critérios harmônicos e perceptuais.',
    description: 'Crie esquemas cromáticos, trave cores, explore modos harmônicos e envie para o Mesh Lab.',
    category: 'Cores',
  },
  {
    id: 'pattern',
    name: 'Pattern & Shape Studio',
    tagline: 'Padrões repetíveis, malhas geométricas e composição de blobs orgânicos.',
    description: 'Exporte padrões matemáticos vetoriais em SVG limpo e PNG de alta resolução.',
    category: 'Padrões',
  },
  {
    id: 'texture',
    name: 'Texture Lab',
    tagline: 'Texturas analógicas finas, film grain, halftones e ruído estocástico.',
    description: 'Adicione acabamento tátil e profundidade editorial aos seus projetos de design.',
    category: 'Texturas',
  },
  {
    id: 'type',
    name: 'Type System',
    tagline: 'Playground tipográfico editorial e gerador de escalas modulares responsivas.',
    description: 'Calcule proporções de escala harmônicas e gere tokens CSS modernos com clamp().',
    category: 'Tipografia',
  },
  {
    id: 'glass',
    name: 'Glass Studio',
    tagline: 'Efeitos de vidro translúcido, difração e glassmorphism contemporâneo.',
    description: 'Ajuste desfoque de fundo, reflexos especulares e gere CSS limpo com backdrop-filter.',
    category: 'Interface',
  },
];

interface ChromalabHubProps {
  onOpenAbout?: () => void;
  onOpenCommandPalette?: () => void;
}

export const ChromalabHub: React.FC<ChromalabHubProps> = ({
  onOpenAbout,
  onOpenCommandPalette,
}) => {
  const { navigateToTool, savedPalettes, isInstallable, promptInstall, deletePalette, renamePalette, duplicatePalette } = useChromalab();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const filteredTools = TOOLS.filter((tool) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      tool.name.toLowerCase().includes(q) ||
      tool.tagline.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen overflow-y-auto w-full bg-[#FBFBFE] text-[#17172A] flex flex-col selection:bg-[#DCD4FF] selection:text-[#5B3DB5] relative">
      {/* Ambient background decoration */}
      <div className="absolute top-0 inset-x-0 h-96 ambient-hero-glow pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-dotted-grid opacity-60 pointer-events-none" />

      {/* Top Header */}
      <header className="h-16 shrink-0 border-b border-[#E7E7F0] bg-white/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5B3DB5] to-[#7655D9] text-white flex items-center justify-center font-bold tracking-tighter text-sm shadow-sm shadow-[#7655D9]/20">
            Ch
          </div>
          <span className="font-bold text-base tracking-tight text-[#17172A]">
            Chroma<span className="text-[#7655D9] font-semibold">lab</span>
          </span>
          <span className="text-[10px] font-mono text-[#7655D9] bg-[#EEF2FF] border border-[#D6D1F3] px-2 py-0.5 rounded-full hidden sm:inline">
            v2.0
          </span>
        </div>

        {/* Search & Actions Header */}
        <div className="flex items-center gap-2 max-w-lg w-full justify-end">
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-[#85869A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 bg-[#F4F5FA] hover:bg-white focus:bg-white border border-[#E7E7F0] focus:border-[#7655D9] rounded-xl pl-8 pr-3 text-xs text-[#17172A] placeholder:text-[#85869A] focus:outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Quick Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="h-8 flex items-center gap-1.5 px-2.5 bg-[#F4F5FA] hover:bg-[#F5F2FF] border border-[#E7E7F0] hover:border-[#D6D1F3] rounded-xl text-xs text-[#62647A] transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Abrir Paleta de Comandos (Ctrl+K)"
          >
            <span className="hidden md:inline">Comandos</span>
            <kbd className="px-1.5 font-mono text-[10px] leading-5 text-[#7655D9] bg-white border border-[#D6D1F3] rounded">
              Ctrl K
            </kbd>
          </button>

          {/* Install PWA Button if available */}
          {isInstallable && (
            <button
              onClick={promptInstall}
              className="h-8 flex items-center gap-1.5 px-3 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-xl text-xs font-semibold shadow-sm shadow-[#7655D9]/20 transition-all cursor-pointer animate-fade-in whitespace-nowrap shrink-0"
              title="Instalar Chromalab no Computador"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Instalar App</span>
            </button>
          )}

          {/* Author Showcase Pill */}
          <button
            onClick={onOpenAbout}
            className="h-8 flex items-center gap-1.5 px-3 bg-[#EEF2FF] hover:bg-[#DCD4FF]/50 border border-[#D6D1F3] rounded-xl text-xs font-semibold text-[#7655D9] transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Gabriel</span>
            <span className="text-[10px] font-mono opacity-70 hidden md:inline">@dev-gabs</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 md:px-12 pt-14 pb-10 max-w-5xl mx-auto w-full text-center md:text-left relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#D6D1F3] text-[11px] font-medium text-[#7655D9] mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#7655D9]" />
          <span>Suíte de Ferramentas Visuais</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#17172A] leading-[1.15]">
          Design, sem complicação.
        </h1>
        <p className="text-base md:text-lg text-[#62647A] mt-2.5 max-w-2xl font-normal leading-relaxed">
          Ferramentas visuais para criar cores, formas, texturas e interfaces.
        </p>
      </section>

      {/* Tools Catalog Grid */}
      <main className="px-6 md:px-12 pb-12 max-w-5xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => navigateToTool(tool.id)}
              className="group bg-white rounded-2xl border border-[#E7E7F0] overflow-hidden shadow-sm hover:shadow-lg hover:shadow-[#7655D9]/5 hover:border-[#D6D1F3] transition-all duration-200 flex flex-col cursor-pointer"
            >
              {/* Tool Preview Graphic */}
              <div className="h-44 w-full relative overflow-hidden bg-[#F4F5FA] flex items-center justify-center border-b border-[#E7E7F0]">
                {/* 1. Mesh Gradient Preview */}
                {tool.id === 'mesh' && (
                  <div
                    className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                    style={{
                      background: `
                        radial-gradient(circle at 20% 25%, #05FFA1 0%, transparent 45%),
                        radial-gradient(circle at 80% 20%, #00E5FF 0%, transparent 50%),
                        radial-gradient(circle at 50% 60%, #7928CA 0%, transparent 50%),
                        radial-gradient(circle at 20% 85%, #0B0F19 0%, transparent 60%),
                        radial-gradient(circle at 85% 85%, #1B1464 0%, transparent 55%) #111`,
                    }}
                  />
                )}

                {/* 2. Color Palette Preview */}
                {tool.id === 'palette' && (
                  <div className="w-full h-full flex transition-transform duration-500 group-hover:scale-105">
                    {['#7655D9', '#8EA5FF', '#10B981', '#F59E0B', '#EC4899'].map((c, i) => (
                      <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                )}

                {/* 3. Pattern & Shape Preview */}
                {tool.id === 'pattern' && (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden transition-transform duration-500 group-hover:scale-105">
                    <svg className="w-full h-full" viewBox="0 0 200 120">
                      <defs>
                        <pattern id="hub-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="10" cy="10" r="3" fill="#8EA5FF" fillOpacity="0.8" />
                          <circle cx="20" cy="20" r="1.5" fill="#A99AEF" fillOpacity="0.7" />
                        </pattern>
                      </defs>
                      <rect width="200" height="120" fill="url(#hub-grid)" />
                      <circle cx="100" cy="60" r="35" fill="#7655D9" fillOpacity="0.35" />
                      <circle cx="100" cy="60" r="20" fill="#8EA5FF" fillOpacity="0.6" />
                    </svg>
                  </div>
                )}

                {/* 4. Texture Lab Preview */}
                {tool.id === 'texture' && (
                  <div
                    className="w-full h-full bg-zinc-900 transition-transform duration-500 group-hover:scale-105 relative flex items-center justify-center"
                    style={{
                      backgroundImage: `
                        radial-gradient(circle at 50% 50%, #7655D9 0%, #5B3DB5 60%, #17172A 100%)`,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-40 mix-blend-overlay"
                      style={{
                        backgroundImage: `radial-gradient(#FFF 1px, transparent 1px)`,
                        backgroundSize: '4px 4px',
                      }}
                    />
                    <div className="w-12 h-12 rounded-xl border border-white/40 backdrop-blur-xs flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-white tracking-widest">GRAIN</span>
                    </div>
                  </div>
                )}

                {/* 5. Type System Preview */}
                {tool.id === 'type' && (
                  <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-center px-6 transition-transform duration-500 group-hover:scale-105">
                    <span className="text-2xl font-black text-[#17172A] tracking-tight leading-none">
                      Aa Bb Gg
                    </span>
                    <span className="text-xs text-[#62647A] font-medium mt-1">
                      Modular Typographic Scale
                    </span>
                    <div className="flex gap-1.5 mt-2 font-mono text-[9px] text-[#85869A]">
                      <span>48px</span>
                      <span>•</span>
                      <span>32px</span>
                      <span>•</span>
                      <span>24px</span>
                      <span>•</span>
                      <span>16px</span>
                    </div>
                  </div>
                )}

                {/* 6. Glass Studio Preview */}
                {tool.id === 'glass' && (
                  <div
                    className="w-full h-full relative flex items-center justify-center p-6 overflow-hidden transition-transform duration-500 group-hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #7655D9 0%, #8EA5FF 50%, #DCD4FF 100%)',
                    }}
                  >
                    <div className="w-36 h-20 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 shadow-lg p-2.5 flex flex-col justify-between">
                      <div className="w-5 h-5 rounded-md bg-white/30" />
                      <div className="w-16 h-2 rounded bg-white/40" />
                    </div>
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-[#E7E7F0] rounded-lg px-2 py-0.5 text-[10px] font-semibold text-[#62647A] shadow-2xs">
                  {tool.category}
                </div>

                {tool.badge && (
                  <div className="absolute top-3 right-3 bg-[#EEF2FF] border border-[#D6D1F3] rounded-lg px-2 py-0.5 text-[10px] font-semibold text-[#7655D9] shadow-2xs">
                    {tool.badge}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#17172A] group-hover:text-[#7655D9] transition-colors flex items-center justify-between">
                    <span>{tool.name}</span>
                    <ArrowRight className="w-4 h-4 text-[#85869A] group-hover:text-[#7655D9] group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-xs text-[#62647A] mt-1.5 leading-relaxed line-clamp-2">
                    {tool.tagline}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E7E7F0] flex items-center justify-between text-xs text-[#85869A]">
                  <span className="text-[11px] font-medium text-[#85869A]">Disponível localmente</span>
                  <span className="text-xs font-semibold text-[#7655D9] group-hover:underline">
                    Abrir ferramenta
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state when searching */}
        {filteredTools.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E7E7F0]">
            <p className="text-sm font-semibold text-[#17172A]">Nenhuma ferramenta encontrada</p>
            <p className="text-xs text-[#85869A] mt-1">Tente pesquisar por outro termo como "Cores" ou "Gradientes".</p>
          </div>
        )}

        {/* Saved Palettes Section */}
        {savedPalettes.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl border border-[#E7E7F0] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#7655D9]" />
                <h3 className="text-sm font-bold text-[#17172A]">Paletas Guardadas</h3>
                <span className="text-[10px] bg-[#EEF2FF] text-[#7655D9] font-mono px-2 py-0.5 rounded-full border border-[#D6D1F3]">
                  {savedPalettes.length}
                </span>
              </div>
              <button
                onClick={() => navigateToTool('palette')}
                className="text-xs text-[#7655D9] hover:text-[#5B3DB5] font-semibold transition-colors cursor-pointer"
              >
                Ver todas →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {savedPalettes.map((pal) => (
                <div
                  key={pal.id}
                  className="p-3 bg-[#F4F5FA] hover:bg-[#F5F2FF] rounded-xl border border-[#E7E7F0] hover:border-[#D6D1F3] transition-all group"
                >
                  {/* Color strip */}
                  <div
                    className="h-8 rounded-lg overflow-hidden flex mb-2.5 border border-[#E7E7F0] cursor-pointer"
                    onClick={() => navigateToTool('palette')}
                  >
                    {pal.colors.map((c, i) => (
                      <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  {/* Name row — inline edit or display */}
                  {editingId === pal.id ? (
                    <div className="flex items-center gap-1 mb-1">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { renamePalette(pal.id, editingName); setEditingId(null); }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 text-xs font-semibold text-[#17172A] bg-white border border-[#D6D1F3] rounded-md px-2 py-1 focus:outline-none focus:border-[#7655D9]"
                      />
                      <button onClick={() => { renamePalette(pal.id, editingName); setEditingId(null); }} className="p-1 text-[#7655D9] hover:bg-[#EEF2FF] rounded cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-[#85869A] hover:bg-[#F4F5FA] rounded cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="text-xs font-semibold text-[#17172A] truncate flex-1">{pal.name}</div>
                      {/* Action buttons — visible on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => { setEditingId(pal.id); setEditingName(pal.name); }}
                          className="p-1 text-[#85869A] hover:text-[#7655D9] hover:bg-[#EEF2FF] rounded cursor-pointer"
                          title="Renomear"
                        ><Pencil className="w-3 h-3" /></button>
                        <button
                          onClick={() => duplicatePalette(pal.id)}
                          className="p-1 text-[#85869A] hover:text-[#7655D9] hover:bg-[#EEF2FF] rounded cursor-pointer"
                          title="Duplicar"
                        ><Copy className="w-3 h-3" /></button>
                        <button
                          onClick={() => deletePalette(pal.id)}
                          className="p-1 text-[#85869A] hover:text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          title="Excluir"
                        ><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-[#85869A]">{new Date(pal.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E7E7F0] py-8 px-6 text-center text-xs text-[#85869A] bg-white/50 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto w-full gap-3">
        <div>
          Chromalab — Suíte Aberta de Ferramentas Visuais de Design. 100% Client-Side.
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenAbout}
            className="text-[#62647A] hover:text-[#7655D9] transition-colors cursor-pointer"
          >
            Sobre o Projeto
          </button>
          <span>•</span>
          <a
            href="https://github.com/dev-gabs/design-tools"
            target="_blank"
            rel="noreferrer"
            className="text-[#7655D9] hover:text-[#5B3DB5] font-semibold transition-colors"
          >
            GitHub (dev-gabs)
          </a>
        </div>
      </footer>
    </div>
  );
};
