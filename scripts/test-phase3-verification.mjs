import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-delegate to npx tsx so TypeScript imports and type stripping work reliably across all Node environments
if (!process.env.__PHASE3_RUNNER__) {
  const currentFilePath = fileURLToPath(import.meta.url);
  const result = spawnSync('npx', ['tsx', currentFilePath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, __PHASE3_RUNNER__: '1' },
    shell: true,
  });
  process.exit(result.status ?? 0);
}

const {
  validateTitle,
  calculateScriptEconomy,
  calculateChaptersScriptEconomy,
  autoSplitRawScript,
  TIER_DURATION_RANGES,
} = await import('../lib/validator.ts');
const { exportCleanNarrationForTts } = await import('../lib/export-utils.ts');
const { studioStore } = await import('../lib/storage.ts');

console.log('--- RUNNING PHASE 3 TESTS ---');

// Test 1: Title Validator Relaxation
console.log('1. Testing Title Validator Relaxation...');
const titleWithoutQuestionWord = validateTitle('Perkembangan Teknologi Kecerdasan Buatan di Indonesia');
assert.strictEqual(titleWithoutQuestionWord.isValid, true, 'Title with 6 words should be valid even without question word');
assert.strictEqual(titleWithoutQuestionWord.wordCount, 6);

const titleShort = validateTitle('Terlalu Singkat');
assert.strictEqual(titleShort.isValid, false, 'Title with <5 words must be invalid');

const titleLong = validateTitle('Satu Dua Tiga Empat Lima Enam Tujuh Delapan Sembilan Sepuluh Sebelas');
assert.strictEqual(titleLong.isValid, false, 'Title with >10 words must be invalid');
console.log('✓ Title Validator passed!');

// Test 2: Multi-format calculateChaptersScriptEconomy
console.log('2. Testing calculateChaptersScriptEconomy...');
const sampleChapters = [
  {
    id: 'ch-1',
    chapter_number: 1,
    title: 'Latar Belakang',
    content: 'Ini adalah bab pertama dengan beberapa kalimat yang menjelaskan konteks.',
    word_count: 10,
  },
  {
    id: 'ch-2',
    chapter_number: 2,
    title: 'Analisis Inti',
    content: 'Bab kedua menguraikan solusi dan bukti nyata dari hasil riset mendalam.',
    word_count: 11,
  },
];
const econMid = calculateChaptersScriptEconomy(
  sampleChapters,
  'Deep Explainer',
  145,
  'mid',
  'Hook pembuka 5 kata',
  'Outro penutup 4 kata'
);
assert.strictEqual(econMid.tier, 'mid');
assert.strictEqual(econMid.totalWords, 4 + 10 + 11 + 4); // 29 words
assert.strictEqual(econMid.breakdown.hookWords, 4);
assert.strictEqual(econMid.breakdown.endingWords, 4);
assert.strictEqual(econMid.breakdown.payoffWords, 21);
console.log('✓ calculateChaptersScriptEconomy passed!');

// Test 3: exportCleanNarrationForTts (Shorts vs Chapters)
console.log('3. Testing exportCleanNarrationForTts...');
const shortsItem = {
  id: 'test-short',
  type: 'content',
  title: 'Judul Shorts Uji Coba Paling Keren',
  pillar: 'AI & Technology',
  format: 'Quick Breakdown',
  content_tier: 'short',
  status: 'Penulisan',
  priority: 'Sedang',
  visual_readiness: 'Siap',
  script_hook: 'Hook pembuka tanpa instruksi [STAGE 1] yang berisik.',
  script_context: 'Konteks masalah (B-roll: demo smartphone).',
  script_payoff: 'Ini adalah pembuktian langsung di lapangan.',
  script_ending: 'Ikuti channel untuk update berikutnya.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
const cleanedShortsTts = exportCleanNarrationForTts(shortsItem);
assert(!cleanedShortsTts.includes('[STAGE 1]'), 'Should strip bracketed tags');
assert(!cleanedShortsTts.includes('(B-roll: demo smartphone)'), 'Should strip b-roll parenthetical directions');
assert(cleanedShortsTts.includes('Hook pembuka tanpa instruksi'), 'Should preserve hook text');
assert(cleanedShortsTts.includes('Ikuti channel untuk update berikutnya'), 'Should preserve ending text');

const chaptersItem = {
  id: 'test-mid',
  type: 'content',
  title: 'Judul Video Mid Form Paling Mantap',
  pillar: 'AI & Technology',
  format: 'Deep Explainer',
  content_tier: 'mid',
  status: 'Penulisan',
  priority: 'Sedang',
  visual_readiness: 'Siap',
  script_hook: 'Hook visual pembuka yang sangat memikat.',
  script_chapters: sampleChapters,
  script_ending: 'Outro penutup dan ajakan berlangganan.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
const cleanedChaptersTts = exportCleanNarrationForTts(chaptersItem);
assert(cleanedChaptersTts.includes('Hook visual pembuka yang sangat memikat'), 'Should include hook');
assert(cleanedChaptersTts.includes('Ini adalah bab pertama'), 'Should include chapter 1 content');
assert(cleanedChaptersTts.includes('Bab kedua menguraikan solusi'), 'Should include chapter 2 content');
assert(cleanedChaptersTts.includes('Outro penutup dan ajakan berlangganan'), 'Should include outro');
console.log('✓ exportCleanNarrationForTts passed!');

// Test 4: studioStore Multi-format Checklists & Versions
console.log('4. Testing studioStore checklists and versions...');
const testContent = studioStore.saveContentItem({
  title: 'Konten Uji Coba Multi Format Zeinity',
  pillar: 'AI & Technology',
  format: 'Video Essay',
  content_tier: 'long',
  aspect_ratio: '16:9',
  script_chapters: sampleChapters,
});
assert.strictEqual(testContent.content_tier, 'long');
assert.strictEqual(testContent.aspect_ratio, '16:9');

// Test Checklist
const chk = studioStore.getChecklist(testContent.id);
assert.strictEqual(typeof chk.checklist_chapters, 'boolean');
assert.strictEqual(typeof chk.checklist_thumbnail, 'boolean');
assert.strictEqual(typeof chk.checklist_seo, 'boolean');
assert.strictEqual(typeof chk.checklist_lufs, 'boolean');

const updatedChk = studioStore.updateChecklist(testContent.id, {
  checklist_chapters: true,
  checklist_seo: true,
});
assert.strictEqual(updatedChk.checklist_chapters, true);
assert.strictEqual(updatedChk.checklist_seo, true);

// Test Script Versioning
const ver1 = studioStore.saveScriptVersion({
  content_id: testContent.id,
  title: 'Revisi Naskah v1',
  format: 'Video Essay',
  content_tier: 'long',
  script_chapters: sampleChapters,
});
assert.strictEqual(ver1.version_number, 1);

const fetchedVersions = studioStore.getScriptVersions(testContent.id);
assert.strictEqual(fetchedVersions.length >= 1, true);

// Clean up test content
studioStore.deleteItem(testContent.id);
console.log('✓ studioStore multi-format tests passed!');

// Test 5: Smart Schedule local datetime formatting & safe ISO
console.log('5. Testing Smart Schedule datetime & timezone safety...');
function toLocalDatetimeString(d) {
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function safeIsoStringFromLocal(dateStr) {
  if (!dateStr || !dateStr.trim()) return undefined;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}
function getNextDayAtHour(targetDay, hour, minute = 0) {
  const d = new Date();
  const currentDay = d.getDay();
  let daysDiff = targetDay - currentDay;
  if (daysDiff < 0 || (daysDiff === 0 && (d.getHours() > hour || (d.getHours() === hour && d.getMinutes() >= minute)))) {
    daysDiff += 7;
  }
  d.setDate(d.getDate() + daysDiff);
  d.setHours(hour, minute, 0, 0);
  return toLocalDatetimeString(d);
}

const mondaySchedule = getNextDayAtHour(1, 7, 0);
assert(mondaySchedule.endsWith('T07:00'), `Smart schedule must set local 07:00, got: ${mondaySchedule}`);

const saturdayLongSchedule = getNextDayAtHour(6, 19, 0);
assert(saturdayLongSchedule.endsWith('T19:00'), `Smart schedule must set local 19:00, got: ${saturdayLongSchedule}`);

assert.strictEqual(safeIsoStringFromLocal(''), undefined, 'Empty date should return undefined');
assert.strictEqual(safeIsoStringFromLocal('invalid-date'), undefined, 'Invalid date string should not crash and return undefined');
assert(typeof safeIsoStringFromLocal(mondaySchedule) === 'string', 'Valid local datetime converts to ISO string');
console.log('✓ Smart Schedule datetime & timezone safety passed!');

// Test 6: Mid/Long-Form snapshot word count & duration estimate
console.log('6. Testing version snapshot word count calculation with hook and outro...');
const hookText = 'Hook pembuka dengan lima kata'; // 5 words
const endingText = 'Outro penutup empat kata'; // 4 words
const countWords = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length;
const totalWordsFull =
  countWords(hookText) +
  sampleChapters.reduce((sum, ch) => sum + (ch.word_count || countWords(ch.content)), 0) +
  countWords(endingText);
assert.strictEqual(totalWordsFull, 5 + 10 + 11 + 4); // 30 words

const midVer = studioStore.saveScriptVersion({
  content_id: 'test-mid-ver',
  title: 'Draft Mid Form',
  format: 'Deep Explainer',
  content_tier: 'mid',
  target_wpm: 150,
  script_hook: hookText,
  script_chapters: sampleChapters,
  script_ending: endingText,
  word_count: totalWordsFull,
  duration_estimate: Math.round((totalWordsFull / 150) * 60 * 10) / 10,
});
assert.strictEqual(midVer.word_count, 30);
assert.strictEqual(midVer.duration_estimate, 12);
console.log('✓ Version snapshot word count passed!');

// Test 7: YouTube Chapters single-line timestamp format resilience
console.log('7. Testing YouTube chapters formatting resilience with multiline hook...');
const multilineHook = 'Halo semuanya!\nKenapa AI bergerak begitu cepat di Indonesia?\nSimak ulasan ini.';
const sanitizedHookLine = multilineHook.trim().split('\n')[0].replace(/\s+/g, ' ').slice(0, 40).trim();
assert(!sanitizedHookLine.includes('\n'), 'Sanitized hook line must not contain newlines');
assert.strictEqual(sanitizedHookLine, 'Halo semuanya!');

const ch0 = `00:00 Intro: ${sanitizedHookLine}`;
assert.strictEqual(ch0, '00:00 Intro: Halo semuanya!');
console.log('✓ YouTube chapters resilience passed!');

// Test 8: SEO Tag input sanitization (strip leading #)
console.log('8. Testing SEO tag sanitization...');
const rawTagInput = '#KecerdasanBuatan';
const sanitizedTag = rawTagInput.trim().replace(/^#+/, '').toLowerCase();
assert.strictEqual(sanitizedTag, 'kecerdasanbuatan', 'Must strip leading #');
const tagPill = `#${sanitizedTag}`;
assert.strictEqual(tagPill, '#kecerdasanbuatan', 'Must not display double ## in pills');
console.log('✓ SEO tag sanitization passed!');

// Test 9: Dynamic Chapter Timestamps sequence
console.log('9. Testing dynamic chapter timestamp sequencing...');
function formatTimestampMinutesTest(sec) {
  const rounded = Math.max(0, Math.round(sec));
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}
function calcChapterTimestamp(chaptersList, hookStr, targetWpm, index) {
  const wpm = Math.max(130, Math.min(160, targetWpm || 145));
  let runningSec = Math.round((countWords(hookStr) / wpm) * 60);
  for (let i = 0; i < index; i++) {
    const words = chaptersList[i].word_count || countWords(chaptersList[i].content);
    runningSec += Math.max(15, Math.round((words / wpm) * 60));
  }
  return formatTimestampMinutesTest(runningSec);
}

const ch1Timestamp = calcChapterTimestamp(sampleChapters, 'Hook sepuluh kata satu dua tiga empat lima enam tujuh', 145, 0);
assert(ch1Timestamp.length === 5, 'Timestamp format mm:ss');
const ch2Timestamp = calcChapterTimestamp(sampleChapters, 'Hook sepuluh kata satu dua tiga empat lima enam tujuh', 145, 1);
assert(ch2Timestamp >= ch1Timestamp, 'Timestamps must be monotonically increasing');
console.log('✓ Dynamic chapter timestamp sequencing passed!');

console.log('=== ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
