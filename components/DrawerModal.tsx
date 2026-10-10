'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DrawerModal({ isOpen, onClose, title, subtitle, children }: DrawerModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9990] flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in-30">
      <div
        className="w-full max-w-xl bg-zpanel border-l border-zline h-full flex flex-col shadow-2xl animate-in slide-in-from-right-10 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zline/80 bg-zpanel-2/50">
          <div>
            <h2 className="text-base font-bold text-zink">{title}</h2>
            {subtitle && <p className="text-xs text-zmuted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zmuted hover:text-zink hover:bg-zline/50 transition-colors"
            aria-label="Tutup panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}
