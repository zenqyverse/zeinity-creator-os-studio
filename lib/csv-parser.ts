import { AnalyticsMetric, ContentTier, Pillar, VideoFormat } from './types';

/**
 * Parses time formats such as "0:44", "00:00:44", "1:15", "44", "44.5s" into seconds (numeric).
 */
export function parseDurationToSeconds(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const str = String(val).trim().replace(/[sS]$/, '');
  if (!str) return 0;

  if (str.includes(':')) {
    const parts = str.split(':').map((p) => parseFloat(p.trim()) || 0);
    if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses percentage strings like "73.8%", "73,8%", "0.738" into a 0-100 percentage number.
 */
export function parsePercentage(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  let num: number;
  if (typeof val === 'number') {
    num = isNaN(val) ? 0 : val;
  } else {
    const str = String(val).trim().replace('%', '').replace(',', '.');
    num = parseFloat(str);
    if (isNaN(num)) return 0;
  }

  // If exported as decimal ratio <= 1.0 (e.g. 0.738 for 73.8%), convert to %
  if (num > 0 && num <= 1.0) {
    return Math.round(num * 1000) / 10;
  }
  return Math.round(num * 10) / 10;
}

/**
 * Intelligent Pillar detection from title content.
 */
function inferPillar(title: string): Pillar {
  const lower = title.toLowerCase();
  if (/\bai\b|artificial|gemini|gpt|claude|deepseek|\bnpu\b|\bllm\b|algoritma|\bbot\b|robot/i.test(lower)) {
    return 'AI & Technology';
  }
  if (/game|gaming|steam|playstation|xbox|esport|gta|roblox|genshin/i.test(lower)) {
    return 'Gaming & Digital Entertainment';
  }
  if (/uang|gaji|fintech|kripto|crypto|saham|belanja|e-commerce|tarif|ekonomi|monetisasi/i.test(lower)) {
    return 'Digital Economy & Consumer Culture';
  }
  if (/whatsapp|wa|instagram|ig|tiktok|youtube|yt|twitter|x|medsos|viral|fitur|update/i.test(lower)) {
    return 'Internet & Social Media';
  }
  return 'Modern Life & Human Behavior';
}

/**
 * Intelligent Format detection from duration across 11 formats.
 */
function inferFormat(durationSeconds: number): VideoFormat {
  if (durationSeconds <= 60) {
    if (durationSeconds > 0 && durationSeconds <= 30) return 'Flash News';
    if (durationSeconds > 45 && durationSeconds <= 60) return 'Actionable Tip';
    return 'Quick Breakdown';
  } else if (durationSeconds <= 300) {
    if (durationSeconds <= 120) return 'Deep Explainer';
    if (durationSeconds <= 200) return 'Mini Tutorial';
    return 'Case Breakdown';
  } else {
    if (durationSeconds <= 420) return 'Video Essay';
    if (durationSeconds <= 540) return 'Masterclass';
    return 'Case Investigation';
  }
}

/**
 * Robust CSV line tokenizer that respects quotes and delimiters (, ; \t).
 */
export function tokenizeCsvLine(line: string, delimiter: string = ','): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim());
  return tokens;
}

/**
 * Comprehensive parser for YouTube Studio Analytics CSV export files.
 * Supports Indonesian and English header terminology across all YouTube Studio report types.
 */
export function parseYouTubeAnalyticsCsv(csvText: string): Partial<AnalyticsMetric>[] {
  if (!csvText || !csvText.trim()) return [];

  // Remove BOM if present and normalize line breaks
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  const rawLines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length <= 1) return [];

  // Determine delimiter (, or ; or \t)
  const headerLine = rawLines[0];
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

  const rawHeaders = tokenizeCsvLine(headerLine, delimiter);
  const normalizedHeaders = rawHeaders.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  // Column index resolver
  const findIndex = (patterns: string[]): number => {
    return normalizedHeaders.findIndex((h) =>
      patterns.some((p) => h === p || h.includes(p))
    );
  };

  const titleIdx = findIndex(['content', 'videotitle', 'video', 'judulvideo', 'judul', 'title', 'nama']);
  const viewsIdx = findIndex(['views', 'penayangan', 'tontonan', 'viewcount']);
  const feedIdx = findIndex(['showninfeed', 'ditampilkandifeed', 'feedimpressions', 'impresi', 'feed']);
  const stayedIdx = findIndex(['viewedvsswipedaway', 'dilihatvsdigeser', 'viewed', 'persentasedilihat', 'stayedtowatch']);
  const avgDurIdx = findIndex(['averageviewduration', 'rataratadurasitonton', 'avgviewduration', 'durasi', 'duration']);
  const apvIdx = findIndex(['averagepercentageviewed', 'rataratapersentasepenayangan', 'apv', 'percentageviewed']);
  const likesIdx = findIndex(['likes', 'suka', 'jumlahsuka']);
  const subsIdx = findIndex(['subscribers', 'pelanggan', 'subscribersgained']);
  const dateIdx = findIndex(['videopublishtime', 'waktupublikasi', 'publishdate', 'date', 'tanggal']);
  const ctrIdx = findIndex([
    'rasiokliktayangtayangan',
    'clickthroughrate',
    'ctr',
    'thumbnailctr',
    'rasiokliktayang',
    'impressionsctr',
  ]);

  const results: Partial<AnalyticsMetric>[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const row = tokenizeCsvLine(rawLines[i], delimiter);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    // Check if row is a "Total" summary line
    const firstCell = (row[0] || '').toLowerCase();
    if (firstCell === 'total' || firstCell === 'jumlah' || firstCell === 'ringkasan') {
      continue;
    }

    const title = titleIdx >= 0 && row[titleIdx] ? row[titleIdx] : `Video Baris #${i}`;
    if (!title || title.trim() === '') continue;

    const views = viewsIdx >= 0 ? parseInt(row[viewsIdx]?.replace(/[^0-9]/g, '') || '0', 10) : 0;
    const feed = feedIdx >= 0 ? parseInt(row[feedIdx]?.replace(/[^0-9]/g, '') || '0', 10) : Math.round(views * 1.35);
    const stayed = stayedIdx >= 0 ? parsePercentage(row[stayedIdx]) : 70.0;
    const avgDur = avgDurIdx >= 0 ? parseDurationToSeconds(row[avgDurIdx]) : 40.0;
    const apv = apvIdx >= 0 ? parsePercentage(row[apvIdx]) : 95.0;
    const likes = likesIdx >= 0 ? parseInt(row[likesIdx]?.replace(/[^0-9]/g, '') || '0', 10) : Math.round(views * 0.06);
    const subs = subsIdx >= 0 ? parseInt(row[subsIdx]?.replace(/[^0-9]/g, '') || '0', 10) : Math.round(views * 0.005);
    const recordedAt = dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : new Date().toISOString();
    const thumbnailCtr = ctrIdx >= 0 && row[ctrIdx] ? parsePercentage(row[ctrIdx]) : undefined;

    const pillar = inferPillar(title);
    const format = inferFormat(avgDur);
    const contentTier: ContentTier = avgDur <= 60 ? 'Shorts' : avgDur <= 300 ? 'Mid-Form' : 'Long-Form';
    const trafficSource = avgDur > 60 ? 'YouTube Browse / Search' : 'Shorts Feed (Diimpor CSV)';

    results.push({
      title,
      pillar,
      format,
      content_tier: contentTier,
      thumbnail_ctr: thumbnailCtr,
      views,
      shown_in_feed: feed,
      stayed_to_watch: stayed,
      avg_view_duration: avgDur,
      apv,
      likes,
      subscribers: subs,
      traffic_source: trafficSource,
      experiment_hypothesis: `Diimpor dari data riil YouTube Studio Analytics (${title})`,
      recorded_at: recordedAt,
    });
  }

  return results;
}
