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
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in-30 p-4">
      <div
        className="w-full max-w-xl bg-zpanel border border-zline rounded-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zline/80 bg-zpanel-2/50 rounded-t-2xl">
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 rounded-b-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
