import { ContentItem } from './types';
import { calculateScriptEconomy } from './validator';

export function exportToPlainText(item: ContentItem): string {
  const econ = calculateScriptEconomy(
    item.script_hook || '',
    item.script_context || '',
    item.script_payoff || '',
    item.script_ending || '',
    item.format,
    item.target_wpm || 145,
    item.content_tier
  );

  const wordMin = econ.formatTargetSeconds.wordMin || econ.tierTarget?.wordMin || 50;
  const wordMax = econ.formatTargetSeconds.wordMax || econ.tierTarget?.wordMax || 140;

  let chaptersSection = '';
  if (item.script_chapters && item.script_chapters.length > 0) {
    chaptersSection = item.script_chapters
      .map(
        (ch) => `--------------------------------------------------------
[CHAPTER ${ch.chapter_number} — ${ch.title}] (${ch.timestamp_estimate || ''})
${ch.content}
`
      )
      .join('\n');
  }

  return `========================================================
ZEINITY CREATOR STUDIO — PRODUCTION SCRIPT
Channel: @ZeinityShorts (Paham Dunia Digital dalam 60 Detik)
========================================================

JUDUL (ON-SCREEN TEXT DETIK 0-3):
${item.title}

PILAR: ${item.pillar}
FORMAT: ${item.format} (${econ.formatTargetSeconds.label})
TIER: ${item.content_tier || econ.tier || 'short'}
TEMPO VOICEOVER: ${econ.wpm} WPM
TOTAL KATA: ${econ.totalWords} kata (Batas: ${wordMin}–${wordMax} kata)
ESTIMASI DURASI: ${econ.estimatedSeconds} detik
STATUS EDITORIAL: ${item.status}
${chaptersSection ? '\n' + chaptersSection : ''}

--------------------------------------------------------
[STAGE 1 — 0-3s: THE VISUAL & AUDIO HOOK]
(Zero dead air, selaras dengan teks layar)
${item.script_hook || '(Belum diisi)'}

--------------------------------------------------------
[STAGE 2 — 4-10s: CONTEXT ACCELERATION]
(Mengapa penonton harus peduli sekarang juga)
${item.script_context || '(Belum diisi)'}

--------------------------------------------------------
[STAGE 3 — 11-45s: CORE VALUE / PAYOFF]
(Bukti visual, demonstrasi, potong dead air)
${item.script_payoff || '(Belum diisi)'}

--------------------------------------------------------
[STAGE 4 — 46-60s: SEAMLESS LOOP / SMART CTA]
(Menyambung kembali ke pembuka atau ajakan spesifik)
${item.script_ending || '(Belum diisi)'}

--------------------------------------------------------
CATATAN RISET & SUMBER:
${item.source_url || '(Tidak ada URL terlampir)'}
${item.notes || ''}
`;
}

export function exportToTeleprompter(item: ContentItem): string {
  const parts = [
    { label: 'STAGE 1 (HOOK)', text: item.script_hook },
    { label: 'STAGE 2 (CONTEXT)', text: item.script_context },
    { label: 'STAGE 3 (PAYOFF)', text: item.script_payoff },
    { label: 'STAGE 4 (LOOP/CTA)', text: item.script_ending },
  ];

  let output = `[${item.title.toUpperCase()}]\n\n`;

  for (const part of parts) {
    if (!part.text) continue;
    output += `--- ${part.label} ---\n`;
    // Split into sentences for rhythmic pacing
    const sentences = part.text
      .replace(/([.?!])\s+/g, '$1\n\n')
      .trim();
    output += `${sentences}\n\n`;
  }

  return output.trim();
}

export function formatTimecode(sec: number): string {
  const rounded = Math.max(0, Math.round(sec));
  const hours = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = Math.floor(rounded % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function exportToCapCutSegments(item: ContentItem): string {
  const econ = calculateScriptEconomy(
    item.script_hook || '',
    item.script_context || '',
    item.script_payoff || '',
    item.script_ending || '',
    item.format,
    item.target_wpm || 145
  );

  const totalDur = Math.min(60, Math.max(econ.formatTargetSeconds.min, Math.round(econ.estimatedSeconds || 50)));
  const s1End = Math.min(3, Math.max(2, Math.round(totalDur * 0.08)));
  const s2End = Math.min(10, Math.max(s1End + 2, Math.round(totalDur * 0.22)));
  const s3End = Math.min(Math.max(s2End + 5, totalDur - 5), Math.round(totalDur * 0.85));
  const s4End = totalDur;

  return JSON.stringify(
    {
      project_title: item.title,
      aspect_ratio: '9:16',
      target_resolution: '1080x1920',
      fps: 60,
      total_duration_seconds: totalDur,
      segments: [
        {
          index: 1,
          stage: `Hook (0–${s1End}s)`,
          time_in: formatTimecode(0),
          time_out: formatTimecode(s1End),
          narration: item.script_hook || '',
          overlay_title: item.title,
          visual_note: 'On-screen bold text in center 60% safe zone, UI demo zoom',
          safe_zone_restricted: ['Top 15%', 'Bottom 25%'],
        },
        {
          index: 2,
          stage: `Context (${s1End}–${s2End}s)`,
          time_in: formatTimecode(s1End),
          time_out: formatTimecode(s2End),
          narration: item.script_context || '',
          overlay_title: '',
          visual_note: 'Highlight relevant platform UI / official statement snippet',
          safe_zone_restricted: ['Top 15%', 'Bottom 25%'],
        },
        {
          index: 3,
          stage: `Payoff (${s2End}–${s3End}s)`,
          time_in: formatTimecode(s2End),
          time_out: formatTimecode(s3End),
          narration: item.script_payoff || '',
          overlay_title: '',
          visual_note: 'B-roll screen recordings, red circle zoom, pan across proof',
          safe_zone_restricted: ['Top 15%', 'Bottom 25%'],
        },
        {
          index: 4,
          stage: `Loop / CTA (${s3End}–${s4End}s)`,
          time_in: formatTimecode(s3End),
          time_out: formatTimecode(s4End),
          narration: item.script_ending || '',
          overlay_title: '',
          visual_note: 'Clean finish wrapping back to opening sentence for endless replay',
          safe_zone_restricted: ['Top 15%', 'Bottom 25%'],
        },
      ],
    },
    null,
    2
  );
}

export function exportToSrt(item: ContentItem): string {
  const econ = calculateScriptEconomy(
    item.script_hook || '',
    item.script_context || '',
    item.script_payoff || '',
    item.script_ending || '',
    item.format,
    item.target_wpm || 145
  );

  const dur = Math.max(30, econ.estimatedSeconds || 50);

  // Time formatting helper
  const formatSrtTime = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  const s1End = Math.min(3, dur * 0.1);
  const s2End = Math.min(10, dur * 0.25);
  const s3End = Math.min(45, dur * 0.85);
  const s4End = dur;

  return `1
${formatSrtTime(0)} --> ${formatSrtTime(s1End)}
${item.script_hook || item.title}

2
${formatSrtTime(s1End)} --> ${formatSrtTime(s2End)}
${item.script_context || 'Konteks perubahan penting yang perlu kamu ketahui.'}

3
${formatSrtTime(s2End)} --> ${formatSrtTime(s3End)}
${item.script_payoff || 'Inilah bukti dan cara kerja fitur resminya.'}

4
${formatSrtTime(s3End)} --> ${formatSrtTime(s4End)}
${item.script_ending || 'Coba cek sekarang dan lihat perubahannya.'}
`;
}

/**
 * Generates a clean narrative text ready for AI Voice Cloning (Kaggle TTS Notebook).
 * Strips out bracketed director instructions, stage tags, and timecodes.
 */
export function exportCleanNarrationForTts(item: Partial<ContentItem>): string {
  let rawSections: string[] = [];

  if (item.script_chapters && item.script_chapters.length > 0) {
    const parts: string[] = [];
    if (item.script_hook && item.script_hook.trim()) {
      parts.push(item.script_hook.trim());
    }
    item.script_chapters.forEach((ch) => {
      if (ch.content && ch.content.trim()) {
        parts.push(ch.content.trim());
      }
    });
    if (item.script_ending && item.script_ending.trim()) {
      parts.push(item.script_ending.trim());
    }
    rawSections = parts;
  } else {
    rawSections = [
      item.script_hook || '',
      item.script_context || '',
      item.script_payoff || '',
      item.script_ending || '',
    ];
  }

  const combined = rawSections
    .filter((text) => text && text.trim().length > 0)
    .join('\n\n');

  // Strip bracketed instructions, e.g. [STAGE 1], [Visual: ...], (SFX: ...)
  const cleaned = combined
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^\)]*(?:b-roll|sfx|visual|suara|efek|cut)[^\)]*\)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

export function formatTimestampMinutes(sec: number): string {
  const rounded = Math.max(0, Math.round(sec));
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Generates YouTube Timestamps / Video Chapters formatted string
 * based on tier, chapters, and target WPM pacing.
 */
export function generateYouTubeChapters(item: Partial<ContentItem>): string {
  const tier = item.content_tier || 'short';
  const targetWpm = item.target_wpm || 145;
  const wpm = Math.max(130, Math.min(160, targetWpm));
  const countWords = (t?: string) => (t || '').trim().split(/\s+/).filter(Boolean).length;

  const hook = item.script_hook || item.hook || '';
  const context = item.script_context || '';
  const payoff = item.script_payoff || '';
  const ending = item.script_ending || '';
  const chapters = item.script_chapters || [];

  if (tier === 'short') {
    const hSec = Math.round((countWords(hook) / wpm) * 60);
    const cSec = Math.round((countWords(context) / wpm) * 60);
    const pSec = Math.round((countWords(payoff) / wpm) * 60);
    const t0 = '00:00 Hook';
    const t1 = `${formatTimestampMinutes(Math.max(2, hSec))} Konteks & Masalah`;
    const t2 = `${formatTimestampMinutes(Math.max(4, hSec + cSec))} Inti & Solusi (Payoff)`;
    const t3 = `${formatTimestampMinutes(Math.max(6, hSec + cSec + pSec))} Seamless Loop / Ending`;
    return `${t0}\n${t1}\n${t2}\n${t3}`;
  }

  let runningSec = 0;
  const lines: string[] = [];

  // Hook
  let hookTitle = 'Visual Hook & Premis';
  if (hook.trim()) {
    const firstLine = hook.trim().split('\n')[0].replace(/\s+/g, ' ').trim();
    if (firstLine.length > 40) {
      const sliced = firstLine.slice(0, 40);
      const lastSpace = sliced.lastIndexOf(' ');
      hookTitle = `Intro: ${lastSpace > 15 ? sliced.slice(0, lastSpace) : sliced}`;
    } else {
      hookTitle = `Intro: ${firstLine}`;
    }
  }
  lines.push(`00:00 ${hookTitle}`);
  runningSec += Math.round((countWords(hook) / wpm) * 60);

  // Chapters
  chapters.forEach((ch, idx) => {
    const words = ch.content && ch.content.trim() ? countWords(ch.content) : (ch.word_count || 0);
    const startStamp = formatTimestampMinutes(runningSec);
    const chTitle = (ch.title || `Bab ${idx + 1}`).trim().replace(/\n+/g, ' ');
    lines.push(`${startStamp} ${chTitle}`);
    runningSec += Math.max(15, Math.round((words / wpm) * 60));
  });

  // Outro
  if (ending.trim().length > 0) {
    lines.push(`${formatTimestampMinutes(runningSec)} Outro & Rekomendasi Video`);
  }

  return lines.join('\n');
}

/**
 * Generates an SEO-optimized YouTube Description draft including
 * opening hook paragraph, auto chapters, discussion summary, and references.
 */
export function generateYouTubeSeoDescription(item: Partial<ContentItem>): string {
  const hook = item.script_hook || item.hook || '';
  const cleanHook = hook.trim().replace(/\n+/g, ' ');
  const firstLine = cleanHook
    ? cleanHook
    : `Dalam video ini kita akan membedah secara tuntas tentang ${item.title || 'topik ini'}.`;

  const chaptersText = generateYouTubeChapters(item);
  const pillarTag = (item.pillar || 'Teknologi').replace(/[^a-zA-Z0-9]/g, '');

  return `${firstLine}

⏱️ TIMESTAMPS / CHAPTERS:
${chaptersText}

📌 RINGKASAN PEMBAHASAN:
• Memahami konteks mendalam mengenai ${item.title || 'topik ini'}.
• Fakta berbasis riset dan dampaknya bagi industri digital.
• Insight dan kesimpulan yang bisa langsung kamu terapkan.

🔗 SUMBER & RUJUKAN:
${item.source_url ? `- ${item.source_url}` : '- Sumber riset resmi diverifikasi oleh tim Zeinity.'}

Tentang Channel:
Zeinity membahas literasi digital, AI, teknologi, dan ekonomi modern secara tajam dan berbasis fakta. Langganan untuk insight terbaru: @ZeinityShorts

#Zeinity #${pillarTag} #Teknologi`;
}

/**
 * Generates 5-10 relevant YouTube keywords and tags.
 */
export function generateYouTubeTags(item: Partial<ContentItem>): string[] {
  const titleWords = (item.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const baseTags = [
    'zeinity',
    'teknologi',
    'digital literacy',
    (item.pillar || '').toLowerCase(),
    (item.format || '').toLowerCase(),
  ];

  return Array.from(new Set([...titleWords, ...baseTags])).filter(Boolean).slice(0, 10);
}

/**
 * Generates high-converting Pinned Comment prompt for community engagement.
 */
export function generatePinnedComment(item: Partial<ContentItem>): string {
  return `Menurut kamu, apakah fenomena "${item.title || 'topik ini'}" ini bakal membawa dampak positif jangka panjang atau justru sebaliknya? Tulis pandanganmu di kolom komentar di bawah! 👇`;
}

/**
 * Generates 3 A/B test thumbnail hook concepts.
 */
export function generateThumbnailHooks(item: Partial<ContentItem>): string[] {
  const words = (item.title || '')
    .replace(/^(Apa|Kenapa|Bagaimana|Apakah)\s+/i, '')
    .replace(/[?？!]$/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const core = (words.slice(0, 3).join(' ') || 'TOPIK KONTEN').toUpperCase();
  return [
    `RAHASIA ${core}!`,
    `JANGAN SALAH: ${core}`,
    `FAKTA ${core}?!`,
  ];
}

