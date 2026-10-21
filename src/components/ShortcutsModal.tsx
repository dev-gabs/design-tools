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
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-zinc-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-100 rounded-lg text-zinc-800">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-zinc-900">Atalhos de Teclado</h3>
              <p className="text-xs text-zinc-500">Comandos rápidos para produtividade profissional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh] divide-y divide-zinc-100">
          {shortcuts.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2.5 text-xs">
              <span className="text-zinc-700">{item.desc}</span>
              <kbd className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded-md font-mono text-[11px] text-zinc-800 font-medium tracking-tight shadow-xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-zinc-50/80 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
