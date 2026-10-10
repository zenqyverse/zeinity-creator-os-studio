import { VideoFormat } from './types';

export interface TitleValidationResult {
  isValid: boolean;
  wordCount: number;
  errors: string[];
  suggestions: string[];
  formatPassed: {
    startsWithQuestionWord: boolean;
    validWordRange: boolean;
    endsWithQuestionMark: boolean;
  };
}

export function validateTitle(title?: string | null): TitleValidationResult {
  const trimmed = (title || '').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const startsWithQuestionWord = /^(Apa|Kenapa|Bagaimana)\b/i.test(trimmed);
  const validWordRange = wordCount >= 5 && wordCount <= 10;
  const endsWithQuestionMark = /\?\s*$/.test(trimmed);

  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!trimmed) {
    errors.push('Judul tidak boleh kosong.');
    suggestions.push('Gunakan formula: Kata tanya ("Apa"/"Kenapa"/"Bagaimana") + subjek + tanda tanya (?)');
  } else {
    if (!startsWithQuestionWord) {
      errors.push('Wajib diawali kata tanya: "Apa", "Kenapa", atau "Bagaimana".');
      suggestions.push(`Coba: "Apa Dampak ${trimmed}?" atau "Kenapa ${trimmed}?"`);
    }

    if (wordCount < 5) {
      errors.push(`Judul terlalu pendek (${wordCount} kata). Batas ideal: 5–10 kata.`);
      suggestions.push('Tambahkan konteks platform atau subjek spesifik agar mencapai minimal 5 kata.');
    } else if (wordCount > 10) {
      errors.push(`Judul terlalu panjang (${wordCount} kata). Batas ideal: 5–10 kata.`);
      suggestions.push('Pangkas kata sambung atau keterangan yang tidak esensial untuk layar mobile.');
    }

    if (!endsWithQuestionMark) {
      errors.push('Wajib diakhiri tanda tanya ("?").');
      suggestions.push('Tambahkan tanda tanya di akhir kalimat.');
    }
  }

  return {
    isValid: errors.length === 0,
    wordCount,
    errors,
    suggestions,
    formatPassed: {
      startsWithQuestionWord,
      validWordRange,
      endsWithQuestionMark,
    },
  };
}

export interface ScriptEconomyResult {
  totalWords: number;
  estimatedSeconds: number;
  wpm: number;
  isWordCountSafe: boolean; // 90 - 140 words
  isDurationSafe: boolean;  // <= 60 seconds
  formatTargetSeconds: { min: number; max: number; label: string };
  formatCompliance: 'Optimal' | 'Terlalu Singkat' | 'Terlalu Panjang';
  breakdown: {
    hookWords: number;
    contextWords: number;
    payoffWords: number;
    endingWords: number;
  };
}

export const FORMAT_DURATION_RANGES: Record<VideoFormat, { min: number; max: number; label: string }> = {
  'Flash News': { min: 20, max: 30, label: '20–30 detik' },
  'Quick Breakdown': { min: 30, max: 45, label: '30–45 detik' },
  'Actionable Tip': { min: 45, max: 60, label: '45–60 detik' },
  'Myth Buster': { min: 30, max: 45, label: '30–45 detik' },
};

export function calculateScriptEconomy(
  hook?: string | null,
  context?: string | null,
  payoff?: string | null,
  ending?: string | null,
  format: VideoFormat = 'Quick Breakdown',
  targetWpm: number = 145
): ScriptEconomyResult {
  const countWords = (t?: string | null) => (t || '').trim().split(/\s+/).filter(Boolean).length;

  const hookWords = countWords(hook);
  const contextWords = countWords(context);
  const payoffWords = countWords(payoff);
  const endingWords = countWords(ending);

  const totalWords = hookWords + contextWords + payoffWords + endingWords;
  const wpm = Math.max(130, Math.min(160, targetWpm || 145));
  const estimatedSeconds = Math.round((totalWords / wpm) * 60 * 10) / 10;

  const isWordCountSafe = totalWords >= 90 && totalWords <= 140;
  const isDurationSafe = estimatedSeconds <= 60;

  const formatRange = FORMAT_DURATION_RANGES[format] || { min: 20, max: 60, label: '20–60 detik' };

  let formatCompliance: 'Optimal' | 'Terlalu Singkat' | 'Terlalu Panjang' = 'Optimal';
  if (estimatedSeconds < formatRange.min) {
    formatCompliance = 'Terlalu Singkat';
  } else if (estimatedSeconds > formatRange.max) {
    formatCompliance = 'Terlalu Panjang';
  }

  return {
    totalWords,
    estimatedSeconds,
    wpm,
    isWordCountSafe,
    isDurationSafe,
    formatTargetSeconds: formatRange,
    formatCompliance,
    breakdown: {
      hookWords,
      contextWords,
      payoffWords,
      endingWords,
    },
  };
}

export interface AutoSplitResult {
  hook: string;
  context: string;
  payoff: string;
  ending: string;
}

/**
 * Intelligent parser that splits full unformatted script text into 4 stages:
 * 1. Stage 1 / Hook (0-3s)
 * 2. Stage 2 / Context (4-10s)
 * 3. Stage 3 / Payoff (11-45s)
 * 4. Stage 4 / Ending (46-60s)
 */
export function autoSplitRawScript(rawText?: string | null): AutoSplitResult {
  if (!rawText || !rawText.trim()) {
    return { hook: '', context: '', payoff: '', ending: '' };
  }

  const text = rawText.trim();

  // Pattern A: Look for explicit markers (STAGE 1, Stage 2, Hook:, Konteks:, etc.)
  const stage1Match = text.match(/(?:(?:\[?(?:stage\s*1|hook)\]?[:\s\-]*)|\b(?:stage\s*1|hook)[:\s\-]+)([\s\S]*?)(?=(?:\[?(?:stage\s*2|context|konteks)\]?[:\s\-]*|\b(?:stage\s*2|context|konteks)[:\s\-]+)|$)/i);
  const stage2Match = text.match(/(?:(?:\[?(?:stage\s*2|context|konteks)\]?[:\s\-]*)|\b(?:stage\s*2|context|konteks)[:\s\-]+)([\s\S]*?)(?=(?:\[?(?:stage\s*3|payoff|daging|inti)\]?[:\s\-]*|\b(?:stage\s*3|payoff|daging|inti)[:\s\-]+)|$)/i);
  const stage3Match = text.match(/(?:(?:\[?(?:stage\s*3|payoff|daging|inti)\]?[:\s\-]*)|\b(?:stage\s*3|payoff|daging|inti)[:\s\-]+)([\s\S]*?)(?=(?:\[?(?:stage\s*4|ending|loop|cta|penutup)\]?[:\s\-]*|\b(?:stage\s*4|ending|loop|cta|penutup)[:\s\-]+)|$)/i);
  const stage4Match = text.match(/(?:(?:\[?(?:stage\s*4|ending|loop|cta|penutup)\]?[:\s\-]*)|\b(?:stage\s*4|ending|loop|cta|penutup)[:\s\-]+)([\s\S]*?)$/i);

  if (stage1Match && stage2Match && stage3Match) {
    return {
      hook: (stage1Match[1] || '').trim(),
      context: (stage2Match[1] || '').trim(),
      payoff: (stage3Match[1] || '').trim(),
      ending: (stage4Match ? stage4Match[1] : '').trim(),
    };
  }

  // Pattern B: Paragraph-based split (if 3-4 paragraphs exist)
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length >= 4) {
    return {
      hook: paragraphs[0],
      context: paragraphs[1],
      payoff: paragraphs.slice(2, paragraphs.length - 1).join('\n\n'),
      ending: paragraphs[paragraphs.length - 1],
    };
  } else if (paragraphs.length === 3) {
    return {
      hook: paragraphs[0],
      context: paragraphs[1],
      payoff: paragraphs[2],
      ending: '',
    };
  }

  // Pattern C: Sentence distribution split based on rhythmic lengths
  // Hook ~1 sentence, Context ~1-2 sentences, Ending ~last sentence, Payoff ~middle sentences
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return { hook: text, context: '', payoff: '', ending: '' };
  } else if (sentences.length === 2) {
    return { hook: sentences[0], context: sentences[1], payoff: '', ending: '' };
  } else if (sentences.length === 3) {
    return { hook: sentences[0], context: sentences[1], payoff: sentences[2], ending: '' };
  } else {
    const hook = sentences[0];
    const context = sentences[1];
    const ending = sentences[sentences.length - 1];
    const payoff = sentences.slice(2, sentences.length - 1).join(' ');
    return { hook, context, payoff, ending };
  }
}
