'use client';

import React from 'react';
import { validateTitle } from '../lib/validator';
import { Check, AlertTriangle, Lightbulb } from 'lucide-react';

interface TitleValidatorBarProps {
  title: string;
}

export function TitleValidatorBar({ title }: TitleValidatorBarProps) {
  const result = validateTitle(title);

  return (
    <div className="rounded-xl border border-zline/60 bg-zpanel/80 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zmuted uppercase tracking-wider text-[11px]">
          Zeinity Title & Overlay Validator
        </span>
        <span
          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
            result.isValid
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}
        >
          {result.isValid ? '✓ Standar Terpenuhi' : `${result.errors.length} Perlu Perbaikan`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Rule 1: Question word */}
        <div
          className={`flex items-center gap-2 p-2 rounded-lg border ${
            result.formatPassed.startsWithQuestionWord
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : 'border-zline bg-zpanel-2/50 text-zmuted'
          }`}
        >
          {result.formatPassed.startsWithQuestionWord ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span>Awalan: <strong>Apa / Kenapa / Bagaimana</strong></span>
        </div>

        {/* Rule 2: 5-10 words */}
        <div
          className={`flex items-center gap-2 p-2 rounded-lg border ${
            result.formatPassed.validWordRange
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : 'border-zline bg-zpanel-2/50 text-zmuted'
          }`}
        >
          {result.formatPassed.validWordRange ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span>Panjang: <strong>5–10 Kata</strong> ({result.wordCount} kata)</span>
        </div>

        {/* Rule 3: Question mark */}
        <div
          className={`flex items-center gap-2 p-2 rounded-lg border ${
            result.formatPassed.endsWithQuestionMark
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : 'border-zline bg-zpanel-2/50 text-zmuted'
          }`}
        >
          {result.formatPassed.endsWithQuestionMark ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span>Akhiran tanda tanya <strong>(&quot;?&quot;)</strong></span>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="pt-1 text-xs text-amber-300/90 space-y-1">
          {result.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-amber-400">•</span>
              <span>{err}</span>
            </div>
          ))}
          {result.suggestions.length > 0 && (
            <div className="flex items-start gap-1.5 text-zcyan pt-1">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Saran: {result.suggestions[0]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
