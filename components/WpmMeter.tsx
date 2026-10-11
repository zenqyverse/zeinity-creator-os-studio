'use client';

import React from 'react';
import { ContentTier, VideoFormat } from '../lib/types';
import { calculateScriptEconomy } from '../lib/validator';
import { Gauge, Clock, FileText, AlertTriangle } from 'lucide-react';

interface WpmMeterProps {
  hook: string;
  context: string;
  payoff: string;
  ending: string;
  format: VideoFormat;
  targetWpm: number;
  tier?: ContentTier;
  onWpmChange?: (wpm: number) => void;
}

export function WpmMeter({
  hook,
  context,
  payoff,
  ending,
  format,
  targetWpm,
  tier,
  onWpmChange,
}: WpmMeterProps) {
  const econ = calculateScriptEconomy(hook, context, payoff, ending, format, targetWpm, tier);

  const minWords = econ.formatTargetSeconds.wordMin ?? econ.tierTarget?.wordMin ?? 50;
  const maxWords = econ.formatTargetSeconds.wordMax ?? econ.tierTarget?.wordMax ?? 140;

  // Word count styling
  let wordColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let wordLabel = `Ideal (${minWords}–${maxWords} kata)`;
  if (econ.totalWords < minWords) {
    wordColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    wordLabel = `Kurang ${minWords - econ.totalWords} kata`;
  } else if (econ.totalWords > maxWords) {
    wordColor = 'text-red-400 bg-red-500/10 border-red-500/30';
    wordLabel = `Kelebihan ${econ.totalWords - maxWords} kata`;
  }

  // Duration styling
  let durColor = 'text-emerald-400';
  if (econ.formatCompliance === 'Terlalu Singkat') {
    durColor = 'text-amber-400';
  } else if (econ.formatCompliance === 'Terlalu Panjang') {
    durColor = 'text-red-400';
  }

  const maxSec = econ.tierTarget?.max || 60;
  const tierName =
    econ.tier === 'mid' ? 'Mid-Form (180 Detik)' : econ.tier === 'long' ? 'Long-Form (480 Detik)' : 'YouTube Shorts (60 Detik)';

  return (
    <div className="rounded-xl border border-zline/60 bg-zpanel/80 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-zcyan" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zmuted">
            Script Economy & Pace Calculator
          </h3>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${wordColor}`}>
          {wordLabel}
        </span>
      </div>

      {!econ.isDurationSafe && (
        <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 flex items-start gap-2 text-[11px] text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong>Peringatan Batas Maksimal {maxSec} Detik:</strong> Estimasi durasi ({econ.estimatedSeconds}s) melebihi batas {tierName}! Pangkas kata agar tidak terpotong saat tayang.
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Total Words */}
        <div className="rounded-lg bg-zpanel-2/60 border border-zline p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-zmuted mb-1">
            <FileText className="w-3.5 h-3.5 text-zaccent" />
            <span>Total Kata</span>
          </div>
          <div className="text-2xl font-extrabold text-zink">
            {econ.totalWords}
            <span className="text-xs font-normal text-zmuted ml-1">/ {minWords}-{maxWords}</span>
          </div>
        </div>

        {/* Estimated Duration */}
        <div className="rounded-lg bg-zpanel-2/60 border border-zline p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-zmuted mb-1">
            <Clock className="w-3.5 h-3.5 text-zcyan" />
            <span>Estimasi Durasi</span>
          </div>
          <div className={`text-2xl font-extrabold ${durColor}`}>
            {econ.estimatedSeconds}s
            <span className="text-xs font-normal text-zmuted ml-1">
              (Target: {econ.formatTargetSeconds.label})
            </span>
          </div>
        </div>

        {/* Pace WPM */}
        <div className="rounded-lg bg-zpanel-2/60 border border-zline p-2.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-zmuted mb-1">
            <span>Tempo VO</span>
            <strong className="text-zcyan">{econ.wpm} WPM</strong>
          </div>
          {onWpmChange && (
            <input
              type="range"
              min={130}
              max={160}
              value={targetWpm}
              onChange={(e) => onWpmChange(Number(e.target.value))}
              className="w-full h-1.5 bg-zline rounded-lg appearance-none cursor-pointer accent-zcyan mt-2"
            />
          )}
          <div className="flex justify-between text-[10px] text-zmuted mt-1">
            <span>130 WPM</span>
            <span>145 (Ideal)</span>
            <span>160 WPM</span>
          </div>
        </div>
      </div>

      {/* 4-Stage Distribution */}
      <div className="space-y-1.5 pt-1 border-t border-zline/40">
        <div className="flex justify-between text-xs text-zmuted font-medium">
          <span>Distribusi Kata per Tahap</span>
          <span>Target durasi: {econ.formatTargetSeconds.label}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-[11px] text-center">
          <div className="p-1.5 rounded bg-zpanel-2 border border-zline">
            <div className="text-zmuted text-[10px]">0–3s Hook</div>
            <div className="font-bold text-zcyan">{econ.breakdown.hookWords} kata</div>
          </div>
          <div className="p-1.5 rounded bg-zpanel-2 border border-zline">
            <div className="text-zmuted text-[10px]">4–10s Context</div>
            <div className="font-bold text-zaccent">{econ.breakdown.contextWords} kata</div>
          </div>
          <div className="p-1.5 rounded bg-zpanel-2 border border-zline">
            <div className="text-zmuted text-[10px]">11–45s Payoff</div>
            <div className="font-bold text-emerald-400">{econ.breakdown.payoffWords} kata</div>
          </div>
          <div className="p-1.5 rounded bg-zpanel-2 border border-zline">
            <div className="text-zmuted text-[10px]">46–60s Loop/CTA</div>
            <div className="font-bold text-zpink">{econ.breakdown.endingWords} kata</div>
          </div>
        </div>
      </div>
    </div>
  );
}
