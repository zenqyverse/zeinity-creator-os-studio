'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Layers, ThumbsUp, ThumbsDown, MessageSquare, Share2, Disc3 } from 'lucide-react';

export interface ProjectedShotInfo {
  shotIndex: number;
  timeRange: string;
  onScreenText: string;
  narrationText?: string;
  visualDirection?: string;
}

interface SafeZoneCanvasProps {
  title: string;
  hookText?: string;
  bgUrl?: string;
  authorHandle?: string;
  projectedShot?: ProjectedShotInfo | null;
}

export function SafeZoneCanvas({
  title,
  hookText,
  bgUrl,
  authorHandle = '@ZeinityShorts',
  projectedShot,
}: SafeZoneCanvasProps) {
  const [showZones, setShowZones] = useState(true);
  const [showUiMock, setShowUiMock] = useState(true);
  const [textColor, setTextColor] = useState<'yellow' | 'cyan' | 'white'>('yellow');

  const textColorClass = {
    yellow: 'text-[#ffe600] drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]',
    cyan: 'text-[#62dce9] drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]',
    white: 'text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]',
  }[textColor];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Canvas Viewport 9:16 */}
      <div className="relative w-[300px] sm:w-[320px] aspect-[9/16] rounded-3xl overflow-hidden border-4 border-zline/80 shadow-2xl bg-gradient-to-b from-[#181d38] via-[#0b1326] to-[#041a24] select-none">
        {/* Background Image / Video Mock if available */}
        {bgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgUrl}
            alt="Asset Preview"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <Layers className="w-32 h-32 text-zcyan" />
          </div>
        )}

        {/* 1. TOP 15% RESTRICTED ZONE */}
        <div
          className={`absolute top-0 left-0 right-0 h-[15%] flex flex-col items-center justify-center transition-all ${
            showZones
              ? 'bg-rose-500/25 border-b border-rose-500/50 backdrop-blur-[1px]'
              : 'pointer-events-none'
          }`}
        >
          {showZones && (
            <div className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-[10px] font-bold text-rose-300 tracking-wider">
              AREA TERHALANG · 15% (Header/Search)
            </div>
          )}
        </div>

        {/* 2. CENTER 60% SAFE ZONE */}
        <div
          className={`absolute top-[15%] bottom-[25%] left-0 right-0 flex flex-col items-center justify-center p-6 text-center transition-all ${
            showZones ? 'border-2 border-dashed border-zcyan/60' : ''
          }`}
        >
          {showZones && (
            <span className="absolute top-2 px-2 py-0.5 rounded bg-zpanel-2/80 border border-zcyan/40 text-[9px] font-bold text-zcyan tracking-widest uppercase">
              Area Aman Visual & Teks 60%
            </span>
          )}

          {/* Title / On-Screen Hook Overlay or Projected Shot */}
          <div className="z-10 max-w-[90%] space-y-2">
            {projectedShot ? (
              <div className="space-y-1.5 animate-in fade-in">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-zcyan/25 text-zcyan border border-zcyan/50 tracking-wider">
                  SHOT {projectedShot.shotIndex} ({projectedShot.timeRange})
                </span>
                <h2 className={`text-lg sm:text-xl font-black uppercase tracking-tight leading-snug ${textColorClass}`}>
                  {projectedShot.onScreenText || '(Teks Layar Kosong)'}
                </h2>
                {projectedShot.narrationText && (
                  <p className="text-xs italic text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-3">
                    &quot;{projectedShot.narrationText}&quot;
                  </p>
                )}
              </div>
            ) : (
              <>
                <h2 className={`text-xl sm:text-2xl font-black uppercase tracking-tight leading-snug ${textColorClass}`}>
                  {title || 'Judul Pertanyaan Shorts?'}
                </h2>
                {hookText && (
                  <p className="text-xs font-semibold text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2">
                    {hookText}
                  </p>
                )}
              </>
            )}
          </div>

          {showZones && (
            <span className="absolute bottom-2 text-[9px] text-zmuted/80">
              1080 × 1920 px (Target Canvas)
            </span>
          )}
        </div>

        {/* 3. BOTTOM 25% RESTRICTED ZONE */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[25%] flex flex-col justify-end transition-all ${
            showZones
              ? 'bg-rose-500/25 border-t border-rose-500/50 backdrop-blur-[1px]'
              : 'pointer-events-none'
          }`}
        >
          {showZones && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-[10px] font-bold text-rose-300 tracking-wider whitespace-nowrap">
              AREA TERHALANG UI SHORTS · 25%
            </div>
          )}
        </div>

        {/* YOUTUBE SHORTS UI OVERLAY MOCKUP */}
        {showUiMock && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
            {/* Top Bar Mockup */}
            <div className="flex items-center justify-between text-white/90 text-xs px-1 pt-1">
              <span className="font-semibold tracking-wide">YouTube Shorts</span>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full border border-white/60"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              </div>
            </div>

            {/* Bottom Content & Right Floating Actions */}
            <div className="flex items-end justify-between w-full pb-2">
              {/* Left Channel Metadata */}
              <div className="max-w-[75%] space-y-1.5 text-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zaccent to-zcyan flex items-center justify-center text-[10px] font-black text-black">
                    Z
                  </div>
                  <span className="text-xs font-bold">{authorHandle}</span>
                  <span className="px-2 py-0.5 bg-red-600 rounded-full text-[9px] font-bold">
                    Subscribe
                  </span>
                </div>
                <p className="text-[11px] text-white/95 line-clamp-2 leading-tight">
                  {title} #Shorts #Tech #{authorHandle.replace('@', '')}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                  <Disc3 className="w-3 h-3 animate-spin" />
                  <span className="truncate">Suara Asli · @ZeinityShorts Official</span>
                </div>
              </div>

              {/* Right Side Shorts Buttons */}
              <div className="flex flex-col items-center gap-3 text-white text-[10px] font-bold pb-1">
                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/40">
                    <ThumbsUp className="w-4 h-4" />
                  </div>
                  <span>4.2K</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/40">
                    <ThumbsDown className="w-4 h-4" />
                  </div>
                  <span>Dislike</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/40">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span>128</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/40">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span>Share</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Controls Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <button
          onClick={() => setShowZones(!showZones)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
            showZones
              ? 'bg-zcyan/20 border-zcyan text-zcyan'
              : 'bg-zpanel border-zline text-zmuted hover:text-zink'
          }`}
        >
          {showZones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Safe Zone (15 / 60 / 25)
        </button>

        <button
          onClick={() => setShowUiMock(!showUiMock)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
            showUiMock
              ? 'bg-zaccent/20 border-zaccent text-zaccent'
              : 'bg-zpanel border-zline text-zmuted hover:text-zink'
          }`}
        >
          {showUiMock ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          UI Mockup Shorts
        </button>

        {/* Color picker */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zpanel border border-zline">
          <span className="text-[10px] text-zmuted mr-1">Teks:</span>
          {(['yellow', 'cyan', 'white'] as const).map((color, idx) => (
            <button
              key={`${color}-${idx}`}
              onClick={() => setTextColor(color)}
              className={`w-4 h-4 rounded-full border transition-all ${
                color === 'yellow' ? 'bg-[#ffe600]' : color === 'cyan' ? 'bg-[#62dce9]' : 'bg-white'
              } ${textColor === color ? 'scale-125 border-zcyan ring-2 ring-zcyan/40' : 'border-transparent opacity-60'}`}
              title={`Warna ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
