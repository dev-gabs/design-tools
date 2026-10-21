import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl / ⌘ + Z', desc: 'Desfazer última alteração' },
    { key: 'Ctrl / ⌘ + Shift + Z', desc: 'Refazer alteração' },
    { key: 'Ctrl / ⌘ + S', desc: 'Salvar projeto atual' },
    { key: 'Ctrl / ⌘ + E', desc: 'Abrir janela de exportação' },
    { key: 'Ctrl / ⌘ + D', desc: 'Duplicar ponto selecionado' },
    { key: 'Delete / Backspace', desc: 'Remover ponto(s) selecionado(s)' },
    { key: 'H', desc: 'Alternar visualização limpa (ocultar pontos e guias)' },
    { key: 'Shift + Clique', desc: 'Adicionar à seleção múltipla de pontos' },
    { key: 'Setas direcionais', desc: 'Mover ponto selecionado em 1px' },
    { key: 'Shift + Setas', desc: 'Mover ponto selecionado em 10px' },
    { key: 'Espaço + Arrastar', desc: 'Mover tela (Pan canvas)' },
    { key: 'Roda do Mouse', desc: 'Zoom no canvas (aproximar / afastar)' },
    { key: 'Esc', desc: 'Desmarcar seleção ou fechar janelas' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#E7E7F0] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-[#17172A]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E7F0]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EEF2FF] rounded-lg text-[#7655D9]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#17172A]">Atalhos de Teclado</h3>
              <p className="text-xs text-[#62647A]">Comandos rápidos para produtividade profissional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#85869A] hover:text-[#17172A] rounded-lg hover:bg-[#F5F2FF] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh] divide-y divide-[#E7E7F0]">
          {shortcuts.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2.5 text-xs">
              <span className="text-[#17172A]">{item.desc}</span>
              <kbd className="px-2.5 py-1 bg-[#EEF2FF] border border-[#D6D1F3] rounded-md font-mono text-[11px] text-[#7655D9] font-medium tracking-tight shadow-xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-[#FBFBFE] border-t border-[#E7E7F0] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#7655D9] hover:bg-[#5B3DB5] text-white text-xs font-medium rounded-lg transition-colors shadow-sm shadow-[#7655D9]/20 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
