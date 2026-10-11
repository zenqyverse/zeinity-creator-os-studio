import { ContentTier, VideoFormat, ScriptChapter } from './types';

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

  const startsWithQuestionWord = /^(Apa(kah)?|Kenapa|Bagaimana)\b/i.test(trimmed);
  const validWordRange = wordCount >= 5 && wordCount <= 10;
  const endsWithQuestionMark = /[?？]\s*$/.test(trimmed);

  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!trimmed) {
    errors.push('Judul tidak boleh kosong.');
    suggestions.push('Gunakan formula: Kata tanya ("Apa"/"Kenapa"/"Bagaimana") + subjek + tanda tanya (?)');
  } else {
    // Word count is strictly 5–10 words (blocking error)
    if (wordCount < 5) {
      errors.push(`Judul terlalu pendek (${wordCount} kata). Batas ideal: 5–10 kata.`);
      suggestions.push('Tambahkan konteks platform atau subjek spesifik agar mencapai minimal 5 kata.');
    } else if (wordCount > 10) {
      errors.push(`Judul terlalu panjang (${wordCount} kata). Batas ideal: 5–10 kata.`);
      suggestions.push('Pangkas kata sambung atau keterangan yang tidak esensial untuk layar mobile.');
    }

    // Question word is a friendly suggestion/tip (non-blocking)
    if (!startsWithQuestionWord) {
      suggestions.push(`Disarankan diawali kata tanya ("Apa", "Kenapa", atau "Bagaimana") untuk memancing rasa penasaran.`);
    }

    // Trailing question mark is a friendly suggestion/tip (non-blocking)
    if (!endsWithQuestionMark) {
      suggestions.push('Disarankan diakhiri tanda tanya ("?") jika menggunakan formula pertanyaan.');
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

export interface TierDurationRange {
  min: number;
  max: number;
  wordMin: number;
  wordMax: number;
  minDuration?: number;
  maxDuration?: number;
  minWords?: number;
  maxWords?: number;
  label: string;
}

export const TIER_DURATION_RANGES: Record<ContentTier, TierDurationRange> = {
  short: {
    min: 20,
    max: 60,
    wordMin: 50,
    wordMax: 140,
    minDuration: 20,
    maxDuration: 60,
    minWords: 50,
    maxWords: 140,
    label: '20–60 detik (Shorts)',
  },
  mid: {
    min: 60,
    max: 180,
    wordMin: 150,
    wordMax: 450,
    minDuration: 60,
    maxDuration: 180,
    minWords: 150,
    maxWords: 450,
    label: '1–3 menit (Mid-Form)',
  },
  long: {
    min: 300,
    max: 480,
    wordMin: 700,
    wordMax: 1250,
    minDuration: 300,
    maxDuration: 480,
    minWords: 700,
    maxWords: 1250,
    label: '5–8 menit (Long-Form)',
  },
  'Shorts': {
    min: 20,
    max: 60,
    wordMin: 50,
    wordMax: 140,
    minDuration: 20,
    maxDuration: 60,
    minWords: 50,
    maxWords: 140,
    label: '20–60 detik (Shorts)',
  },
  'Mid-Form': {
    min: 60,
    max: 180,
    wordMin: 150,
    wordMax: 450,
    minDuration: 60,
    maxDuration: 180,
    minWords: 150,
    maxWords: 450,
    label: '1–3 menit (Mid-Form)',
  },
  'Long-Form': {
    min: 300,
    max: 480,
    wordMin: 700,
    wordMax: 1250,
    minDuration: 300,
    maxDuration: 480,
    minWords: 700,
    maxWords: 1250,
    label: '5–8 menit (Long-Form)',
  },
};

export const FORMAT_DURATION_RANGES: Record<string, { min: number; max: number; label: string; wordMin: number; wordMax: number }> = {
  'Flash News': { min: 20, max: 30, label: '20–30 detik', wordMin: 50, wordMax: 75 },
  'Quick Breakdown': { min: 30, max: 45, label: '30–45 detik', wordMin: 75, wordMax: 110 },
  'Myth Buster': { min: 30, max: 45, label: '30–45 detik', wordMin: 75, wordMax: 110 },
  'Actionable Tip': { min: 45, max: 60, label: '45–60 detik', wordMin: 110, wordMax: 140 },
  'Deep Explainer': { min: 60, max: 180, label: '1–3 menit', wordMin: 150, wordMax: 450 },
  'Mini Tutorial': { min: 60, max: 180, label: '1–3 menit', wordMin: 150, wordMax: 450 },
  'Case Breakdown': { min: 60, max: 180, label: '1–3 menit', wordMin: 150, wordMax: 450 },
  'Video Essay': { min: 300, max: 480, label: '5–8 menit', wordMin: 700, wordMax: 1250 },
  'Masterclass': { min: 300, max: 480, label: '5–8 menit', wordMin: 700, wordMax: 1250 },
  'Case Investigation': { min: 300, max: 480, label: '5–8 menit', wordMin: 700, wordMax: 1250 },
  'Ecosystem Review': { min: 300, max: 480, label: '5–8 menit', wordMin: 700, wordMax: 1250 },
};

export function inferTierFromFormat(format?: string): ContentTier {
  if (!format) return 'short';
  const f = format.toLowerCase();
  if (
    f.includes('essay') ||
    f.includes('masterclass') ||
    f.includes('investigation') ||
    f.includes('ecosystem') ||
    f.includes('long')
  ) {
    return 'long';
  }
  if (
    f.includes('explainer') ||
    f.includes('tutorial') ||
    f.includes('case') ||
    f.includes('mid')
  ) {
    return 'mid';
  }
  return 'short';
}

export interface ScriptEconomyResult {
  totalWords: number;
  estimatedSeconds: number;
  wpm: number;
  isWordCountSafe: boolean;
  isDurationSafe: boolean;
  tier?: ContentTier;
  tierTarget?: TierDurationRange;
  formatTargetSeconds: { min: number; max: number; label: string; wordMin?: number; wordMax?: number };
  formatCompliance: 'Optimal' | 'Terlalu Singkat' | 'Terlalu Panjang';
  breakdown: {
    hookWords: number;
    contextWords: number;
    payoffWords: number;
    endingWords: number;
  };
}

export function calculateScriptEconomy(
  hook?: string | null,
  context?: string | null,
  payoff?: string | null,
  ending?: string | null,
  format: VideoFormat = 'Quick Breakdown',
  targetWpm: number = 145,
  tier?: ContentTier
): ScriptEconomyResult {
  const countWords = (t?: string | null) => (t || '').trim().split(/\s+/).filter(Boolean).length;

  const hookWords = countWords(hook);
  const contextWords = countWords(context);
  const payoffWords = countWords(payoff);
  const endingWords = countWords(ending);

  const totalWords = hookWords + contextWords + payoffWords + endingWords;
  const wpm = Math.max(130, Math.min(160, targetWpm || 145));
  const estimatedSeconds = Math.round((totalWords / wpm) * 60 * 10) / 10;

  const activeTier: ContentTier = tier || inferTierFromFormat(format);
  const tierTarget = TIER_DURATION_RANGES[activeTier] || TIER_DURATION_RANGES.short;

  const matchedFormatRange = format ? FORMAT_DURATION_RANGES[format] : undefined;
  const isFormatCompatibleWithTier = matchedFormatRange && inferTierFromFormat(format) === activeTier;

  const formatRange = isFormatCompatibleWithTier
    ? matchedFormatRange
    : {
        min: tierTarget.min,
        max: tierTarget.max,
        label: tierTarget.label,
        wordMin: tierTarget.wordMin,
        wordMax: tierTarget.wordMax,
      };

  const isWordCountSafe = totalWords >= formatRange.wordMin && totalWords <= formatRange.wordMax;
  const isDurationSafe = estimatedSeconds <= tierTarget.max;

  let formatCompliance: 'Optimal' | 'Terlalu Singkat' | 'Terlalu Panjang' = 'Optimal';
  if (totalWords < formatRange.wordMin) {
    formatCompliance = 'Terlalu Singkat';
  } else if (totalWords > formatRange.wordMax) {
    formatCompliance = 'Terlalu Panjang';
  }

  return {
    totalWords,
    estimatedSeconds,
    wpm,
    isWordCountSafe,
    isDurationSafe,
    tier: activeTier,
    tierTarget,
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

export function calculateChaptersScriptEconomy(
  chapters: ScriptChapter[] = [],
  format: VideoFormat = 'Deep Explainer',
  targetWpm: number = 145,
  tier?: ContentTier,
  hook?: string | null,
  ending?: string | null
): ScriptEconomyResult {
  const countWords = (t?: string | null) => (t || '').trim().split(/\s+/).filter(Boolean).length;
  const hookWords = countWords(hook);
  const endingWords = countWords(ending);
  const chaptersWords = chapters.reduce((sum, ch) => sum + (ch.word_count || countWords(ch.content)), 0);
  const totalWords = hookWords + chaptersWords + endingWords;

  const wpm = Math.max(130, Math.min(160, targetWpm || 145));
  const estimatedSeconds = Math.round((totalWords / wpm) * 60 * 10) / 10;

  const activeTier: ContentTier = tier || inferTierFromFormat(format);
  const tierTarget = TIER_DURATION_RANGES[activeTier] || TIER_DURATION_RANGES.mid;

  const matchedFormatRange = format ? FORMAT_DURATION_RANGES[format] : undefined;
  const isFormatCompatibleWithTier = matchedFormatRange && inferTierFromFormat(format) === activeTier;

  const formatRange = isFormatCompatibleWithTier
    ? matchedFormatRange
    : {
        min: tierTarget.min,
        max: tierTarget.max,
        label: tierTarget.label,
        wordMin: tierTarget.wordMin,
        wordMax: tierTarget.wordMax,
      };

  const isWordCountSafe = totalWords >= formatRange.wordMin && totalWords <= formatRange.wordMax;
  const isDurationSafe = estimatedSeconds <= tierTarget.max;

  let formatCompliance: 'Optimal' | 'Terlalu Singkat' | 'Terlalu Panjang' = 'Optimal';
  if (totalWords < formatRange.wordMin) {
    formatCompliance = 'Terlalu Singkat';
  } else if (totalWords > formatRange.wordMax) {
    formatCompliance = 'Terlalu Panjang';
  }

  return {
    totalWords,
    estimatedSeconds,
    wpm,
    isWordCountSafe,
    isDurationSafe,
    tier: activeTier,
    tierTarget,
    formatTargetSeconds: formatRange,
    formatCompliance,
    breakdown: {
      hookWords,
      contextWords: 0,
      payoffWords: chaptersWords,
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
