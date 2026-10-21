import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Maximize2,
  Sparkles,
  ArrowRight,
  Palette,
  Grid,
  Disc,
  Type,
  Square,
  Home,
  Info,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { useChromalab } from '../context/ChromalabContext';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Navegação' | 'Ações Rápidas' | 'Informações';
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAbout: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenAbout,
}) => {
  const { navigateToTool, showToast } = useChromalab();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      showToast('info', 'Tela Cheia', 'Pressione Esc para sair.');
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const commands: CommandItem[] = [
    {
      id: 'nav-hub',
      title: 'Ir para o Hub Chromalab',
      subtitle: 'Visão geral com catálogo de todas as 6 ferramentas de design',
      category: 'Navegação',
      icon: <Home className="w-4 h-4 text-[#7655D9]" />,
      action: () => navigateToTool('hub'),
    },
    {
      id: 'nav-mesh',
      title: 'Mesh Gradient Studio',
      subtitle: 'Gradientes de malha cromática com controle por pontos e WebGL',
      category: 'Navegação',
      icon: <Disc className="w-4 h-4 text-[#7655D9]" />,
      badge: 'Módulo 01',
      action: () => navigateToTool('mesh'),
    },
    {
      id: 'nav-palette',
      title: 'Color Palette Studio',
      subtitle: 'Gerador harmônico, bloqueio de cores e exportação multi-formato',
      category: 'Navegação',
      icon: <Palette className="w-4 h-4 text-[#7655D9]" />,
      badge: 'Módulo 02',
      action: () => navigateToTool('palette'),
    },
    {
      id: 'nav-pattern',
      title: 'Pattern & Shape Studio',
      subtitle: 'Padrões repetíveis, malhas geométricas e vetores SVG',
      category: 'Navegação',
      icon: <Grid className="w-4 h-4 text-[#7655D9]" />,
      badge: 'Módulo 03',
      action: () => navigateToTool('pattern'),
    },
    {
      id: 'nav-texture',
      title: 'Texture Lab',
      subtitle: 'Film grain, ruído estocástico, halftone e texturas analógicas',
      category: 'Navegação',
      icon: <Sparkles className="w-4 h-4 text-[#7655D9]" />,
      badge: 'Módulo 04',
      action: () => navigateToTool('texture'),
    },
    {
      id: 'nav-type',
      title: 'Type System',
      subtitle: 'Escala tipográfica modular harmônica e tokens clamp() CSS',
      category: 'Navegação',
      icon: <Type className="w-4 h-4 text-[#7655D9]" />,
      badge: 'Módulo 05',
      action: () => navigateToTool('type'),
    },
    {
      id: 'nav-glass',
      title: 'Glass Studio',
      subtitle: 'Vidro translúcido, desfoque de fundo e CSS glassmorphism',
      category: 'Navegação',
      icon: <Square className="w-4 h-4 text-[#7655D9]" />,
      badge: 'Módulo 06',
      action: () => navigateToTool('glass'),
    },
    {
      id: 'action-fullscreen',
      title: 'Alternar Tela Cheia',
      subtitle: 'Expandir o ambiente de trabalho sem bordas do navegador',
      category: 'Ações Rápidas',
      icon: <Maximize2 className="w-4 h-4 text-[#8EA5FF]" />,
      badge: 'F11',
      action: toggleFullscreen,
    },
    {
      id: 'action-export-css',
      title: 'Ir para Tokens CSS / Tipografia',
      subtitle: 'Copiar variáveis :root e clamp() responsivo',
      category: 'Ações Rápidas',
      icon: <Code2 className="w-4 h-4 text-[#8EA5FF]" />,
      action: () => navigateToTool('type'),
    },
    {
      id: 'action-about',
      title: 'Sobre o Chromalab & Criador',
      subtitle: 'Conheça o autor Gabriel (@dev-gabs), stack e tecnologias',
      category: 'Informações',
      icon: <Info className="w-4 h-4 text-[#5B3DB5]" />,
      action: onOpenAbout,
    },
    {
      id: 'action-github',
      title: 'Abrir Repositório no GitHub',
      subtitle: 'dev-gabs/design-tools • Código aberto e documentação',
      category: 'Informações',
      icon: <ExternalLink className="w-4 h-4 text-[#5B3DB5]" />,
      action: () => window.open('https://github.com/dev-gabs/design-tools', '_blank'),
    },
  ];

  // Filter commands by query
  const filtered = commands.filter((c) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  });

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 md:pt-28 p-4 bg-[#17172A]/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl border border-[#D6D1F3] shadow-2xl overflow-hidden flex flex-col text-[#17172A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#E7E7F0] flex items-center gap-3 bg-white">
          <Search className="w-4 h-4 text-[#7655D9] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite um comando ou ferramenta... (ex: 'mesh', 'cores', 'exportar')"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-[#17172A] placeholder:text-[#85869A] focus:outline-none"
          />
          <kbd className="hidden sm:inline px-2 py-0.5 text-[10px] font-mono text-[#85869A] bg-[#F4F5FA] border border-[#E7E7F0] rounded-md">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#85869A]">
              Nenhum comando encontrado para "{query}".
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EEF2FF] text-[#17172A] border-l-2 border-[#7655D9]'
                      : 'hover:bg-[#F5F2FF] text-[#62647A]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? 'bg-white border-[#D6D1F3] shadow-2xs'
                          : 'bg-[#F4F5FA] border-[#E7E7F0]'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="truncate">
                      <div
                        className={`text-xs font-semibold flex items-center gap-2 truncate ${
                          isSelected ? 'text-[#7655D9]' : 'text-[#17172A]'
                        }`}
                      >
                        <span>{cmd.title}</span>
                        {cmd.badge && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#EEF2FF] text-[#7655D9] border border-[#D6D1F3] rounded">
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#85869A] truncate">{cmd.subtitle}</div>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isSelected ? 'text-[#7655D9] translate-x-0.5' : 'text-transparent'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-3 bg-[#F4F5FA] border-t border-[#E7E7F0] flex items-center justify-between text-[11px] text-[#85869A]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E7E7F0] rounded text-[10px] mr-1">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E7E7F0] rounded text-[10px] mr-1">↓</kbd>
              Navegar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E7E7F0] rounded text-[10px] mr-1">↵</kbd>
              Selecionar
            </span>
          </div>
          <span className="font-medium text-[#7655D9]">Chromalab Command</span>
        </div>
      </div>
    </div>
  );
};
