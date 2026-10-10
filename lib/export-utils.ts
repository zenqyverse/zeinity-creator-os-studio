import { ContentItem } from './types';
import { calculateScriptEconomy } from './validator';

export function exportToPlainText(item: ContentItem): string {
  const econ = calculateScriptEconomy(
    item.script_hook || '',
    item.script_context || '',
    item.script_payoff || '',
    item.script_ending || '',
    item.format,
    item.target_wpm || 145
  );

  return `========================================================
ZEINITY CREATOR STUDIO — PRODUCTION SCRIPT
Channel: @ZeinityShorts (Paham Dunia Digital dalam 60 Detik)
========================================================

JUDUL (ON-SCREEN TEXT DETIK 0-3):
${item.title}

PILAR: ${item.pillar}
FORMAT: ${item.format} (${econ.formatTargetSeconds.label})
TEMPO VOICEOVER: ${econ.wpm} WPM
TOTAL KATA: ${econ.totalWords} kata (Batas: 90–140 kata)
ESTIMASI DURASI: ${econ.estimatedSeconds} detik
STATUS EDITORIAL: ${item.status}

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
