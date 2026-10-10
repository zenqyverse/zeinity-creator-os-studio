'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, RotateCcw, X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  undoable?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', undoable?: boolean) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', undoable = false) => {
    toastCounter = (toastCounter + 1) % 100000;
    const id = `toast-${Date.now()}-${toastCounter}`;
    setToasts((prev) => [...prev, { id, message, type, undoable }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleUndo = async (id: string) => {
    try {
      const { studioStore } = await import('../lib/storage');
      const ok = studioStore.undo();
      setToasts((prev) => prev.filter((t) => t.id !== id));
      if (ok) {
        showToast('Aksi berhasil dibatalkan (Undo)', 'success');
      }
    } catch (err) {
      console.error('Failed to undo action:', err);
    }
  };

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map((toast, idx) => (
          <div
            key={`${toast.id}-${idx}`}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 ${
              toast.type === 'success'
                ? 'bg-zpanel-2/95 border-zcyan text-zink'
                : toast.type === 'error'
                ? 'bg-zpanel-2/95 border-red-500/80 text-zink'
                : 'bg-zpanel-2/95 border-zline text-zink'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-zcyan shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-zaccent shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {toast.undoable && (
                <button
                  onClick={() => handleUndo(toast.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-zline/60 hover:bg-zline text-zcyan hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Batal
                </button>
              )}
              <button
                onClick={() => handleDismiss(toast.id)}
                className="p-1 rounded-md text-zmuted hover:text-zink hover:bg-zline/50 transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
