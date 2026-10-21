import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-slide-in bg-white ${
            toast.type === 'success'
              ? 'border-emerald-200 text-zinc-900'
              : toast.type === 'error'
              ? 'border-rose-200 text-zinc-900'
              : 'border-zinc-200 text-zinc-900'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold tracking-tight text-zinc-900">{toast.title}</h4>
            {toast.message && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{toast.message}</p>}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md transition-colors"
            title="Fechar notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
