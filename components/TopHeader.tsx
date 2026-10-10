'use client';

import React from 'react';
import { Search, Plus, CheckCircle, RefreshCw, AlertCircle, Sun, Moon, Bell, Terminal } from 'lucide-react';
import { AutosaveStatus } from '../lib/storage';

interface TopHeaderProps {
  autosaveStatus: AutosaveStatus;
  onOpenSearch: () => void;
  onCreateContent: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function TopHeader({
  autosaveStatus,
  onOpenSearch,
  onCreateContent,
  isDarkMode,
  onToggleTheme,
}: TopHeaderProps) {
  return (
    <header className="h-16 border-b border-zline/60 bg-zpanel px-6 flex items-center justify-between gap-4 z-20">
      {/* Search trigger bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-zpanel-2 border border-zline/70 hover:border-zcyan/50 text-zmuted text-xs transition-colors group cursor-text"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-zmuted group-hover:text-zcyan transition-colors" />
            <span>Cari di workspace...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-zline/70 text-[10px] font-mono text-zink">
            /
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Autosave Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zpanel-2/60 border border-zline/50 text-xs">
          {autosaveStatus === 'Tersimpan' ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          ) : autosaveStatus === 'Menyimpan...' ? (
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className="text-[11px] text-zmuted">{autosaveStatus}</span>
        </div>

        {/* Terminal toggle */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mac-terminal'))}
          className="p-2 rounded-xl bg-zpanel-2 border border-zline/70 text-zmuted hover:text-zink transition-colors"
          title="Buka Diagnostic Terminal (Ctrl+\`)"
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl bg-zpanel-2 border border-zline/70 text-zmuted hover:text-zink transition-colors"
          title="Ganti Tema Dark / Light"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenSearch}
          className="p-2 rounded-xl bg-zpanel-2 border border-zline/70 text-zmuted hover:text-zink transition-colors relative"
          title="Notifikasi & Pembaruan"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-zcyan"></span>
        </button>

        {/* Primary "+ Create Content" Button */}
        <button
          onClick={onCreateContent}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black text-xs font-bold shadow-md shadow-zaccent/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Content</span>
        </button>
      </div>
    </header>
  );
}
