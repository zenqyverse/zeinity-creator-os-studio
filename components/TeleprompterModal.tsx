'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ContentItem } from '../lib/types';
import { exportToTeleprompter } from '../lib/export-utils';
import { Play, Pause, RotateCcw, FlipHorizontal, Copy, Check, X, Type } from 'lucide-react';
import { useToast } from './ToastContainer';

interface TeleprompterModalProps {
  item: ContentItem;
  isOpen: boolean;
  onClose: () => void;
}

export function TeleprompterModal({ item, isOpen, onClose }: TeleprompterModalProps) {
  const { showToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // 1 - 5
  const [fontSize, setFontSize] = useState(36); // px
  const [isMirrored, setIsMirrored] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const text = exportToTeleprompter(item);

  // Auto-scroll loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += speed;
        // Auto stop at bottom
        if (
          scrollRef.current.scrollTop + scrollRef.current.clientHeight >=
          scrollRef.current.scrollHeight - 5
        ) {
          setIsPlaying(false);
        }
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  // Keyboard shortcut Esc / Spacebar
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Teks teleprompter disalin ke clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setIsPlaying(false);
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black/95 flex flex-col backdrop-blur-sm select-none">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-zpanel-2/80 border-b border-zline/60">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-zcyan/20 text-zcyan border border-zcyan/40">
            TELEPROMPTER MODE
          </span>
          <h2 className="text-sm font-semibold text-zink truncate max-w-sm">
            {item.title}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                : 'bg-zcyan hover:bg-zcyan-hover text-black'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Jeda (Space)' : 'Mulai (Space)'}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-zline/50 hover:bg-zline text-zink"
            title="Kembali ke awal"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed slider */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zpanel border border-zline text-xs">
            <span className="text-zmuted">Kecepatan:</span>
            <input
              type="range"
              min={1}
              max={6}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-20 accent-zcyan"
            />
            <span className="font-bold text-zcyan w-3">{speed}x</span>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-zpanel border border-zline">
            <Type className="w-3.5 h-3.5 text-zmuted ml-1" />
            <button
              onClick={() => setFontSize((s) => Math.max(22, s - 4))}
              className="px-2 py-1 text-xs font-bold text-zmuted hover:text-zink"
            >
              A-
            </button>
            <span className="text-xs font-mono text-zcyan">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(64, s + 4))}
              className="px-2 py-1 text-xs font-bold text-zmuted hover:text-zink"
            >
              A+
            </button>
          </div>

          {/* Mirror Rig Toggle */}
          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1 ${
              isMirrored
                ? 'bg-zaccent/20 border-zaccent text-zaccent'
                : 'bg-zpanel border-zline text-zmuted hover:text-zink'
            }`}
            title="Mirror Mode untuk Kaca Teleprompter"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-zpanel border border-zline text-zmuted hover:text-zink"
            title="Salin Naskah"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zline/50 hover:bg-zline text-zmuted hover:text-zink ml-2"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prompter Visual Area */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-8 sm:px-24 py-20 text-center transition-transform ${
          isMirrored ? 'scale-x-[-1]' : ''
        }`}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-4xl mx-auto space-y-12">
          {text.split('\n\n').map((paragraph, index) => {
            const isHeader = paragraph.startsWith('---') || paragraph.startsWith('[');
            return (
              <p
                key={index}
                style={{ fontSize: isHeader ? `${Math.round(fontSize * 0.55)}px` : `${fontSize}px` }}
                className={`font-bold leading-relaxed transition-all ${
                  isHeader
                    ? 'text-zcyan uppercase tracking-widest'
                    : 'text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]'
                }`}
              >
                {paragraph.replace(/---/g, '')}
              </p>
            );
          })}
          <div className="h-96"></div> {/* Extra scroll padding */}
        </div>
      </div>
    </div>
  );
}
