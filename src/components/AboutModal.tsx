import React from 'react';
import { X, ExternalLink, Sparkles, Layers, Cpu, ShieldCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17172A]/40 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-[#D6D1F3] shadow-2xl overflow-hidden flex flex-col text-[#17172A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E7E7F0] flex items-center justify-between bg-gradient-to-r from-white to-[#F5F2FF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5B3DB5] to-[#7655D9] text-white flex items-center justify-center font-black tracking-tight text-base shadow-sm shadow-[#7655D9]/25">
              Ch
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#17172A] flex items-center gap-2">
                Chromalab
                <span className="text-[10px] bg-[#EEF2FF] text-[#7655D9] font-mono px-2 py-0.5 rounded-full border border-[#D6D1F3]">
                  v2.0
                </span>
              </h2>
              <p className="text-xs text-[#62647A]">Suíte Aberta de Ferramentas Visuais de Design</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#85869A] hover:text-[#17172A] hover:bg-[#F4F5FA] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Creator Profile Box */}
          <div className="p-4 rounded-xl bg-[#F4F5FA] border border-[#E7E7F0] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#7655D9] font-semibold block">
                Autor & Desenvolvedor
              </span>
              <h3 className="text-sm font-bold text-[#17172A] mt-0.5">Gabriel (@dev-gabs)</h3>
              <p className="text-xs text-[#62647A] mt-0.5">Criador do Chromalab & Design Tools</p>
            </div>
            <a
              href="https://github.com/dev-gabs"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7655D9] hover:bg-[#5B3DB5] text-white rounded-lg text-xs font-semibold shadow-sm shadow-[#7655D9]/20 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-[#E7E7F0] bg-white">
              <div className="flex items-center gap-2 text-[#7655D9] font-semibold mb-1">
                <Cpu className="w-4 h-4" />
                <span>WebGL GPU Shader</span>
              </div>
              <p className="text-[11px] text-[#62647A] leading-relaxed">
                Renderização de gradientes em tempo real com OKLab e interpolação orgânica contínua.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[#E7E7F0] bg-white">
              <div className="flex items-center gap-2 text-[#7655D9] font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Client-Side</span>
              </div>
              <p className="text-[11px] text-[#62647A] leading-relaxed">
                Sem telemetria, cookies ou servidores. Funciona localmente e offline como PWA.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[#E7E7F0] bg-white">
              <div className="flex items-center gap-2 text-[#7655D9] font-semibold mb-1">
                <Layers className="w-4 h-4" />
                <span>6 Módulos Integrados</span>
              </div>
              <p className="text-[11px] text-[#62647A] leading-relaxed">
                Mesh Gradients, Paletas, Padrões Matemáticos, Texturas, Tipografia e Glass Studio.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[#E7E7F0] bg-white">
              <div className="flex items-center gap-2 text-[#7655D9] font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Exportação até 8K</span>
              </div>
              <p className="text-[11px] text-[#62647A] leading-relaxed">
                Geração em alta resolução para telas Retina, impressos, vetores SVG e código CSS/clamp().
              </p>
            </div>
          </div>

          {/* Repository Link Box */}
          <div className="pt-2 border-t border-[#E7E7F0] flex items-center justify-between text-xs">
            <span className="text-[#85869A]">Código aberto sob licença MIT</span>
            <a
              href="https://github.com/dev-gabs/design-tools"
              target="_blank"
              rel="noreferrer"
              className="text-[#7655D9] hover:text-[#5B3DB5] font-semibold flex items-center gap-1 hover:underline"
            >
              <span>Ver repositório no GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F4F5FA] border-t border-[#E7E7F0] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#E7E7F0] hover:border-[#D6D1F3] text-[#17172A] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
