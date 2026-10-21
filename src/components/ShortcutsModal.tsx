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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Atalhos de Teclado</h3>
              <p className="text-xs text-zinc-400">Comandos rápidos para produtividade profissional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh] divide-y divide-zinc-800/60">
          {shortcuts.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2.5 text-xs">
              <span className="text-zinc-300">{item.desc}</span>
              <kbd className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-md font-mono text-[11px] text-indigo-300 font-medium tracking-tight shadow-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
