import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-delegate to npx tsx so TypeScript imports and type stripping work reliably across all Node environments
if (!process.env.__PHASE5_RUNNER__) {
  const currentFilePath = fileURLToPath(import.meta.url);
  const result = spawnSync('npx', ['tsx', currentFilePath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, __PHASE5_RUNNER__: '1' },
    shell: true,
  });
  process.exit(result.status ?? 0);
}

const { studioStore, normalizeContentItem } = await import('../lib/storage.ts');
const {
  exportCleanNarrationForTts,
  generateYouTubeChapters,
  generateYouTubeSeoDescription,
  generateYouTubeTags,
  generatePinnedComment,
  generateThumbnailHooks,
  formatTimestampMinutes,
} = await import('../lib/export-utils.ts');
const {
  validateTitle,
  calculateScriptEconomy,
  calculateChaptersScriptEconomy,
  TIER_DURATION_RANGES,
} = await import('../lib/validator.ts');
const { INITIAL_CONTENT_ITEMS, INITIAL_IDEAS } = await import('../lib/mock-data.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('ZEINITY CREATOR STUDIO — PHASE 5 COMPREHENSIVE VERIFICATION SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Full TypeScript compilation check (`tsc --noEmit`)
// -----------------------------------------------------------------------------
console.log('TEST 1: Full TypeScript Compilation Check (tsc --noEmit)...');
try {
  const tscOutput = execSync('npx tsc --noEmit', {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  assert.strictEqual(tscOutput.trim(), '', `Unexpected tsc output: ${tscOutput}`);
  console.log('✓ Test 1 Passed: TypeScript compilation completed with zero errors.\n');
} catch (err) {
  console.error('Test 1 Failed: tsc --noEmit returned errors:');
  console.error(err.stdout || err.message);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// TEST 2: Next.js production build check (`npm run build`)
// -----------------------------------------------------------------------------
console.log('TEST 2: Next.js Production Build Check (npm run build)...');
try {
  const buildOutput = execSync('npx next build', {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 180000,
  });
  assert(
    buildOutput.includes('Compiled successfully') || buildOutput.includes('Generating static pages'),
    'Test 2 Failed: Next.js build did not succeed'
  );
  assert(
    !buildOutput.includes('Failed to compile') && !buildOutput.includes('Type error:'),
    'Test 2 Failed: Next.js build contained fatal compilation or type errors'
  );
  console.log('✓ Test 2 Passed: Next.js production build succeeded with zero fatal errors.\n');
} catch (err) {
  console.error('Test 2 Failed: npm run build failed:');
  console.error(err.stdout || err.message);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// TEST 3: Backward compatibility verification: loading legacy items without
//         content_tier and aspect_ratio defaults them cleanly without errors
// -----------------------------------------------------------------------------
console.log('TEST 3: Backward Compatibility & Defaulting Verification...');

// 3.1 Empty item defaults
const emptyNormalized = normalizeContentItem({});
assert.strictEqual(emptyNormalized.content_tier, 'short', 'Test 3.1 Failed: Default tier should be short');
assert.strictEqual(emptyNormalized.aspect_ratio, '9:16', 'Test 3.1 Failed: Default aspect ratio should be 9:16');
assert(Array.isArray(emptyNormalized.script_chapters), 'Test 3.1 Failed: script_chapters must default to array');
assert(Array.isArray(emptyNormalized.seo_tags), 'Test 3.1 Failed: seo_tags must default to array');
assert(Array.isArray(emptyNormalized.thumbnail_hooks), 'Test 3.1 Failed: thumbnail_hooks must default to array');

// 3.2 Legacy Shorts item without content_tier & aspect_ratio
const legacyShortsItem = {
  id: 'legacy-shorts-001',
  title: 'Judul Lama Format Shorts YouTube',
  pillar: 'AI & Technology',
  format: 'Quick Breakdown',
  script_hook: 'Hook lama tanpa tier eksplisit.',
  script_context: 'Konteks lama.',
  script_payoff: 'Inti bahasan lama.',
  script_ending: 'Penutup lama.',
};
const normalizedShorts = normalizeContentItem(legacyShortsItem);
assert.strictEqual(normalizedShorts.content_tier, 'short', 'Test 3.2 Failed: Legacy item must default to short tier');
assert.strictEqual(normalizedShorts.aspect_ratio, '9:16', 'Test 3.2 Failed: Legacy item must default to 9:16');
assert.strictEqual(normalizedShorts.script_chapters.length, 0);

// 3.3 Item with long tier but omitted aspect ratio
const legacyLongItem = {
  id: 'legacy-long-001',
  title: 'Judul Panjang Tanpa Rasio',
  content_tier: 'long',
};
const normalizedLong = normalizeContentItem(legacyLongItem);
assert.strictEqual(normalizedLong.content_tier, 'long');
assert.strictEqual(normalizedLong.aspect_ratio, '16:9', 'Test 3.3 Failed: Long tier must default aspect ratio to 16:9');

// 3.4 Storage retrieval of existing mock items
const mockItem1 = studioStore.getContentById('zein-c001');
assert(mockItem1 !== undefined, 'Test 3.4 Failed: zein-c001 must exist in store');
assert.strictEqual(mockItem1?.content_tier, 'short');
assert.strictEqual(mockItem1?.aspect_ratio, '9:16');

console.log('✓ Test 3 Passed: Legacy content defaults cleanly with zero regressions.\n');

// -----------------------------------------------------------------------------
// TEST 4: Creation & persistence test for Mid-Form (1–3m) and Long-Form (5–8m)
//         items with chapters and timestamps
// -----------------------------------------------------------------------------
console.log('TEST 4: Creation & Persistence for Mid-Form and Long-Form Items...');

const midTestId = `test-p5-mid-${Date.now()}`;
const midChapters = [
  {
    id: 'ch-m1',
    chapter_number: 1,
    title: 'Konteks Pergeseran Kreatif',
    timestamp_estimate: '00:15',
    content: 'Peralihan cara kerja desainer digital di era baru.',
    word_count: 8,
  },
  {
    id: 'ch-m2',
    chapter_number: 2,
    title: 'Tantangan Hak Cipta Komersial',
    timestamp_estimate: '00:40',
    content: 'Isu dataset dan perlindungan hak cipta komersial.',
    word_count: 7,
  },
];

const savedMid = studioStore.saveContentItem({
  id: midTestId,
  title: 'Bagaimana AI Mengubah Industri Kreatif Digital?',
  type: 'content',
  pillar: 'AI & Technology',
  format: 'Deep Explainer',
  content_tier: 'mid',
  aspect_ratio: '16:9',
  script_hook: 'Pernah bayangkan satu prompt teks menggantikan alur kerja tim studio desain?',
  script_chapters: midChapters,
  script_ending: 'Apakah portofoliomu sudah siap? Tulis di komentar!',
  seo_description: 'Deskripsi SEO Mid Form',
  seo_tags: ['ai', 'kreatif', 'desain'],
  pinned_comment_prompt: 'Pertanyaan pinned Mid Form',
  thumbnail_hooks: ['HOOK A', 'HOOK B', 'HOOK C'],
});

assert.strictEqual(savedMid.id, midTestId);
assert.strictEqual(savedMid.content_tier, 'mid');
assert.strictEqual(savedMid.aspect_ratio, '16:9');
assert.strictEqual(savedMid.script_chapters.length, 2);
assert.strictEqual(savedMid.script_chapters[0].timestamp_estimate, '00:15');

const retrievedMid = studioStore.getContentById(midTestId);
assert.deepStrictEqual(retrievedMid?.script_chapters, midChapters);

// Long-form item
const longTestId = `test-p5-long-${Date.now()}`;
const longChapters = [
  { id: 'ch-l1', chapter_number: 1, title: 'Anatomi Semikonduktor', timestamp_estimate: '00:30', content: 'Bab 1 narasi silikon.', word_count: 4 },
  { id: 'ch-l2', chapter_number: 2, title: 'Chokepoint Taiwan', timestamp_estimate: '01:30', content: 'Bab 2 narasi TSMC.', word_count: 4 },
  { id: 'ch-l3', chapter_number: 3, title: 'Perang Subsidi Global', timestamp_estimate: '02:30', content: 'Bab 3 narasi subsidi.', word_count: 4 },
  { id: 'ch-l4', chapter_number: 4, title: 'Kebutuhan Komputasi AI', timestamp_estimate: '03:30', content: 'Bab 4 narasi AI.', word_count: 4 },
  { id: 'ch-l5', chapter_number: 5, title: 'Dampak Terhadap Konsumen', timestamp_estimate: '04:30', content: 'Bab 5 narasi konsumen.', word_count: 4 },
];

const savedLong = studioStore.saveContentItem({
  id: longTestId,
  title: 'Bagaimana Perang Chip Mengendalikan Masa Depan?',
  type: 'content',
  pillar: 'AI & Technology',
  format: 'Video Essay',
  content_tier: 'long',
  aspect_ratio: '16:9',
  script_hook: 'Benda sekecil kuku jempol inilah penentu geopolitik dunia.',
  script_chapters: longChapters,
  script_ending: 'Masa depan dunia diukir di wafer silikon tipis.',
});

assert.strictEqual(savedLong.content_tier, 'long');
assert.strictEqual(savedLong.aspect_ratio, '16:9');
assert.strictEqual(savedLong.script_chapters.length, 5);

// Partial update preservation test: updating only title must not reset tier, aspect ratio, or chapters
const updatedLong = studioStore.saveContentItem({
  id: longTestId,
  title: 'Bagaimana Perang Chip Mengendalikan Masa Depan Dunia? (Revisi)',
});
assert.strictEqual(updatedLong.content_tier, 'long', 'Test 4.2 Failed: Partial update reset content_tier');
assert.strictEqual(updatedLong.aspect_ratio, '16:9', 'Test 4.2 Failed: Partial update reset aspect_ratio');
assert.strictEqual(updatedLong.script_chapters.length, 5, 'Test 4.2 Failed: Partial update wiped chapters');

// Version snapshot & restoration test
const ver = studioStore.saveScriptVersion({
  content_id: longTestId,
  title: 'Snapshot Versi 1 Long Form',
  content_tier: 'long',
  script_chapters: longChapters,
});
assert.strictEqual(ver.content_tier, 'long');
assert.strictEqual(ver.script_chapters?.length, 5);

const restored = studioStore.restoreScriptVersion(ver.id);
assert(restored !== null, 'Test 4.3 Failed: restoreScriptVersion returned null');
assert.strictEqual(restored?.content_tier, 'long');
assert.strictEqual(restored?.script_chapters?.length, 5);

// Cleanup
studioStore.deleteItem(midTestId);
studioStore.deleteItem(longTestId);
assert(studioStore.getContentById(midTestId) === undefined);
assert(studioStore.getContentById(longTestId) === undefined);

console.log('✓ Test 4 Passed: Mid-Form & Long-Form creation, persistence, and version snapshots verified.\n');

// -----------------------------------------------------------------------------
// TEST 5: Kaggle TTS Clean Narration export verification across all 3 tiers
// -----------------------------------------------------------------------------
console.log('TEST 5: Kaggle TTS Clean Narration Export Across 3 Tiers...');

// 5.1 Shorts tier
const ttsShortItem = {
  id: 'tts-short-test',
  type: 'content',
  title: 'Kenapa Baterai Ponsel Cepat Habis?',
  pillar: 'AI & Technology',
  format: 'Quick Breakdown',
  content_tier: 'short',
  aspect_ratio: '9:16',
  status: 'Penulisan',
  priority: 'Sedang',
  visual_readiness: 'Siap',
  script_hook: '[STAGE 1 - HOOK] Pernah sadar bateraimu cepat habis saat sinyal satu bar?',
  script_context: '[STAGE 2] (B-roll: rekaman sinyal) Modem menaikkan daya pancar radio.',
  script_payoff: '[STAGE 3] (SFX: whoosh) Ini menyedot baterai berlipat ganda dari biasanya.',
  script_ending: '[STAGE 4] Aktifkan Airplane Mode untuk menghemat sisa bateraimu!',
};

const shortCleanTts = exportCleanNarrationForTts(ttsShortItem);
assert(!shortCleanTts.includes('[STAGE'), 'Test 5.1 Failed: Stage brackets not stripped');
assert(!shortCleanTts.includes('(B-roll'), 'Test 5.1 Failed: B-roll notes not stripped');
assert(!shortCleanTts.includes('(SFX: whoosh)'), 'Test 5.1 Failed: SFX notes not stripped');
assert(shortCleanTts.includes('Pernah sadar bateraimu'), 'Test 5.1 Failed: Missing hook text');
assert(shortCleanTts.includes('Aktifkan Airplane Mode'), 'Test 5.1 Failed: Missing ending text');

// 5.2 Mid tier
const ttsMidItem = {
  id: 'tts-mid-test',
  type: 'content',
  title: 'Bagaimana AI Mengubah Industri Desain?',
  pillar: 'AI & Technology',
  format: 'Deep Explainer',
  content_tier: 'mid',
  aspect_ratio: '16:9',
  status: 'Penulisan',
  priority: 'Tinggi',
  visual_readiness: 'Siap',
  script_hook: '[PREMIS UTAMA] Satu prompt teks bisa menggantikan alur kerja tim studio desain.',
  script_chapters: [
    {
      id: 'ch1',
      chapter_number: 1,
      title: 'Bab 1',
      content: '[BAB 1] (visual: split canvas) Model difusi membalikkan piramida produksi visual.',
      word_count: 10,
    },
    {
      id: 'ch2',
      chapter_number: 2,
      title: 'Bab 2',
      content: '[BAB 2] (b-roll: lisensi hukum) Isu hak cipta dataset komersial menjadi tantangan utama.',
      word_count: 10,
    },
  ],
  script_ending: '[OUTRO] Persiapkan portofoliomu agar tetap relevan dan memiliki nilai tambah tinggi.',
};

const midCleanTts = exportCleanNarrationForTts(ttsMidItem);
assert(!midCleanTts.includes('[PREMIS'), 'Test 5.2 Failed: Premis tag not stripped');
assert(!midCleanTts.includes('[BAB'), 'Test 5.2 Failed: Bab tags not stripped');
assert(!midCleanTts.includes('(visual:'), 'Test 5.2 Failed: Visual note not stripped');
assert(!midCleanTts.includes('(b-roll:'), 'Test 5.2 Failed: B-roll note not stripped');
assert(midCleanTts.includes('Satu prompt teks'), 'Test 5.2 Failed: Missing mid hook text');
assert(midCleanTts.includes('Model difusi membalikkan'), 'Test 5.2 Failed: Missing chapter 1 text');
assert(midCleanTts.includes('Isu hak cipta dataset'), 'Test 5.2 Failed: Missing chapter 2 text');

// 5.3 Long tier
const ttsLongItem = {
  id: 'tts-long-test',
  type: 'content',
  title: 'Bagaimana Perang Chip Mengendalikan Dunia?',
  pillar: 'AI & Technology',
  format: 'Video Essay',
  content_tier: 'long',
  aspect_ratio: '16:9',
  status: 'Penulisan',
  priority: 'Tinggi',
  visual_readiness: 'Siap',
  script_hook: '[INTRO HOOK] Benda sekecil kuku jempol inilah penentu hegemoni dunia modern.',
  script_chapters: [
    { id: 'cl1', chapter_number: 1, title: 'Bab 1', content: '[BAB 1] Mesin litografi EUV ASML seharga triliunan rupiah.', word_count: 8 },
    { id: 'cl2', chapter_number: 2, title: 'Bab 2', content: '[BAB 2] Sembilan puluh persen fabrikasi terkonsentrasi di TSMC.', word_count: 8 },
    { id: 'cl3', chapter_number: 3, title: 'Bab 3', content: '[BAB 3] Perang subsidi dan perlombaan kemandirian semikonduktor.', word_count: 7 },
  ],
  script_ending: '[OUTRO PENUTUP] Kedaulatan teknologi diukir di atas lapisan wafer silikon.',
};

const longCleanTts = exportCleanNarrationForTts(ttsLongItem);
assert(!longCleanTts.includes('[INTRO'), 'Test 5.3 Failed: Intro tag not stripped');
assert(!longCleanTts.includes('[BAB'), 'Test 5.3 Failed: Bab tags not stripped');
assert(longCleanTts.includes('Benda sekecil kuku jempol'), 'Test 5.3 Failed: Missing hook text');
assert(longCleanTts.includes('Mesin litografi EUV ASML'), 'Test 5.3 Failed: Missing chapter 1 text');
assert(longCleanTts.includes('Kedaulatan teknologi diukir'), 'Test 5.3 Failed: Missing ending text');

console.log('✓ Test 5 Passed: Kaggle TTS clean narration exporter verified across all 3 tiers.\n');

// -----------------------------------------------------------------------------
// TEST 6: YouTube Chapters & SEO description generation verification
// -----------------------------------------------------------------------------
console.log('TEST 6: YouTube Chapters & SEO Description Generation...');

// 6.1 Chapters generator
const chaptersShort = generateYouTubeChapters(ttsShortItem);
assert(chaptersShort.includes('00:00 Hook'), 'Test 6.1 Failed: Shorts chapters must start with 00:00 Hook');
assert(chaptersShort.includes('Konteks & Masalah'), 'Test 6.1 Failed: Missing context stage in chapters');

const chaptersMid = generateYouTubeChapters(ttsMidItem);
assert(chaptersMid.includes('00:00 Intro:'), 'Test 6.1b Failed: Mid chapters must start with 00:00 Intro:');
assert(chaptersMid.includes('Bab 1'), 'Test 6.1c Failed: Missing Bab 1 in mid chapters');
assert(chaptersMid.includes('Outro & Rekomendasi Video'), 'Test 6.1d Failed: Missing outro in mid chapters');

const chaptersLong = generateYouTubeChapters(ttsLongItem);
assert(chaptersLong.includes('00:00 Intro:'), 'Test 6.2 Failed: Long chapters must start with 00:00 Intro:');
assert(chaptersLong.includes('Bab 1'), 'Test 6.2 Failed: Missing Bab 1 in long chapters');
assert(chaptersLong.includes('Outro & Rekomendasi Video'), 'Test 6.2 Failed: Missing outro in long chapters');

// Verify timestamp formatting pattern (MM:SS Title)
const timestampLineRegex = /^\d{2}:\d{2}\s+.+$/m;
assert(timestampLineRegex.test(chaptersLong), 'Test 6.3 Failed: Chapters must match MM:SS Title format');

// 6.2 SEO Description generator
const seoDesc = generateYouTubeSeoDescription(ttsLongItem);
assert(seoDesc.includes('⏱️ TIMESTAMPS / CHAPTERS:'), 'Test 6.4 Failed: Missing timestamps section');
assert(seoDesc.includes('📌 RINGKASAN PEMBAHASAN:'), 'Test 6.5 Failed: Missing discussion summary section');
assert(seoDesc.includes('🔗 SUMBER & RUJUKAN:'), 'Test 6.6 Failed: Missing source references section');
assert(seoDesc.includes('#Zeinity'), 'Test 6.7 Failed: Missing #Zeinity hashtag');

// 6.3 SEO Tags generator
const tags = generateYouTubeTags(ttsLongItem);
assert(Array.isArray(tags), 'Test 6.8 Failed: Tags must be an array');
assert(tags.length >= 5 && tags.length <= 10, `Test 6.8 Failed: Tags count should be 5-10, got ${tags.length}`);
assert(tags.includes('zeinity'), 'Test 6.9 Failed: Tags must include zeinity');

// 6.4 Pinned comment prompt generator
const pinned = generatePinnedComment(ttsLongItem);
assert(pinned.includes(ttsLongItem.title), 'Test 6.10 Failed: Pinned comment prompt must include title');
assert(pinned.includes('👇'), 'Test 6.11 Failed: Pinned comment prompt must include call to comment');

// 6.5 Thumbnail Hooks generator
const hooks = generateThumbnailHooks(ttsLongItem);
assert.strictEqual(hooks.length, 3, 'Test 6.12 Failed: Expected 3 thumbnail hooks');
assert(hooks.every((h) => typeof h === 'string' && h.length > 0), 'Test 6.13 Failed: Invalid thumbnail hook');

console.log('✓ Test 6 Passed: YouTube Chapters, SEO description, tags, pinned comment & hooks verified.\n');

// -----------------------------------------------------------------------------
// TEST 7: Title validation relaxation: non-question titles with 5–10 words
//         pass validation with friendly tips
// -----------------------------------------------------------------------------
console.log('TEST 7: Title Validation Relaxation (5–10 Words Rule)...');

// 7.1 Formula question title (5–10 words, Apa..., ends with ?) -> Valid, no errors
const v1 = validateTitle('Apa Saja Fitur Baru WhatsApp Bulan Ini?');
assert.strictEqual(v1.isValid, true, 'Test 7.1 Failed: Formula question title must be valid');
assert.strictEqual(v1.errors.length, 0, 'Test 7.1 Failed: Errors must be empty');
assert.strictEqual(v1.formatPassed.startsWithQuestionWord, true);
assert.strictEqual(v1.formatPassed.validWordRange, true);
assert.strictEqual(v1.formatPassed.endsWithQuestionMark, true);

// 7.2 Non-question title with 5–10 words -> Valid, friendly suggestions present
const v2 = validateTitle('Panduan Lengkap Merakit Komputer Gaming Impian');
assert.strictEqual(v2.isValid, true, 'Test 7.2 Failed: Non-question title with 6 words MUST be valid');
assert.strictEqual(v2.errors.length, 0, 'Test 7.2 Failed: Non-question title should have zero blocking errors');
assert.strictEqual(v2.formatPassed.startsWithQuestionWord, false);
assert.strictEqual(v2.formatPassed.endsWithQuestionMark, false);
assert.strictEqual(v2.formatPassed.validWordRange, true);
assert(v2.suggestions.length >= 2, 'Test 7.2 Failed: Friendly suggestions must be provided');

// 7.3 Missing question word only (starts without Apa/Kenapa/Bagaimana, ends with ?)
const v3 = validateTitle('Update Baru Fitur WhatsApp Bulan Ini?');
assert.strictEqual(v3.isValid, true, 'Test 7.3 Failed: Title missing question word must be valid');
assert.strictEqual(v3.errors.length, 0);
assert.strictEqual(v3.formatPassed.startsWithQuestionWord, false);
assert.strictEqual(v3.formatPassed.endsWithQuestionMark, true);
assert(v3.suggestions.some((s) => s.includes('kata tanya')), 'Test 7.3 Failed: Missing question word suggestion');

// 7.4 Missing question mark only (starts with Kenapa, no ?)
const v4 = validateTitle('Kenapa Baterai Ponsel Ini Cepat Sekali Habis');
assert.strictEqual(v4.isValid, true, 'Test 7.4 Failed: Title missing question mark must be valid');
assert.strictEqual(v4.errors.length, 0);
assert.strictEqual(v4.formatPassed.startsWithQuestionWord, true);
assert.strictEqual(v4.formatPassed.endsWithQuestionMark, false);
assert(v4.suggestions.some((s) => s.includes('tanda tanya')), 'Test 7.4 Failed: Missing question mark suggestion');

// 7.5 Starts with Apakah -> recognized as question word
const vApakah = validateTitle('Apakah Benar AI Akan Menggantikan Programmer Senior?');
assert.strictEqual(vApakah.isValid, true);
assert.strictEqual(vApakah.formatPassed.startsWithQuestionWord, true);

// 7.6 Unicode question mark ？ -> recognized as valid question mark
const vUnicode = validateTitle('Bagaimana Cara Kerja Sensor Kamera Ini？');
assert.strictEqual(vUnicode.isValid, true);
assert.strictEqual(vUnicode.formatPassed.endsWithQuestionMark, true);

// 7.7 Too short title (< 5 words) -> BLOCKING ERROR
const vShort = validateTitle('Apa Fitur Baru?');
assert.strictEqual(vShort.isValid, false, 'Test 7.7 Failed: Title < 5 words must be invalid');
assert(vShort.errors.some((e) => e.includes('terlalu pendek')), 'Test 7.7 Failed: Missing too short error');

// 7.8 Too long title (> 10 words) -> BLOCKING ERROR
const vLong = validateTitle('Bagaimana Cara Kerja Kecerdasan Buatan Generatif Yang Ada Di Dalam Ponsel Pintar Modern Hari Ini?');
assert.strictEqual(vLong.isValid, false, 'Test 7.8 Failed: Title > 10 words must be invalid');
assert(vLong.errors.some((e) => e.includes('terlalu panjang')), 'Test 7.8 Failed: Missing too long error');

// 7.9 Empty title -> BLOCKING ERROR
const vEmpty = validateTitle('   ');
assert.strictEqual(vEmpty.isValid, false, 'Test 7.9 Failed: Empty title must be invalid');

console.log('✓ Test 7 Passed: Title validation relaxation and 5–10 words range rules verified.\n');

// -----------------------------------------------------------------------------
// TEST 8: Script economy calculation across short, mid, and long tiers
// -----------------------------------------------------------------------------
console.log('TEST 8: Script Economy Calculation Across All 3 Tiers & Mock Data Verification...');

// 8.1 Shorts tier (50–140 words, 20–60s)
const shortsText100 = 'Kata '.repeat(100);
const econShortOptimal = calculateScriptEconomy(shortsText100, '', '', '', 'Quick Breakdown', 145, 'short');
assert.strictEqual(econShortOptimal.tier, 'short');
assert.strictEqual(econShortOptimal.isWordCountSafe, true, 'Test 8.1 Failed: 100 words safe for shorts');
assert.strictEqual(econShortOptimal.isDurationSafe, true, 'Test 8.1 Failed: Duration safe for shorts');
assert.strictEqual(econShortOptimal.formatCompliance, 'Optimal');

const shortsText40 = 'Kata '.repeat(40);
const econShortTooShort = calculateScriptEconomy(shortsText40, '', '', '', 'Quick Breakdown', 145, 'short');
assert.strictEqual(econShortTooShort.isWordCountSafe, false);
assert.strictEqual(econShortTooShort.formatCompliance, 'Terlalu Singkat');

const shortsText220 = 'Kata '.repeat(220);
const econShortTooLong = calculateScriptEconomy(shortsText220, '', '', '', 'Quick Breakdown', 145, 'short');
assert.strictEqual(econShortTooLong.isWordCountSafe, false);
assert.strictEqual(econShortTooLong.isDurationSafe, false);
assert.strictEqual(econShortTooLong.formatCompliance, 'Terlalu Panjang');

// 8.2 Mid tier (150–450 words, 60–180s)
const midText250 = 'Kata '.repeat(250);
const econMidOptimal = calculateScriptEconomy(midText250, '', '', '', 'Deep Explainer', 145, 'mid');
assert.strictEqual(econMidOptimal.tier, 'mid');
assert.strictEqual(econMidOptimal.isWordCountSafe, true, 'Test 8.2 Failed: 250 words safe for mid');
assert.strictEqual(econMidOptimal.isDurationSafe, true, 'Test 8.2 Failed: Duration safe for mid');
assert.strictEqual(econMidOptimal.formatCompliance, 'Optimal');

const midText80 = 'Kata '.repeat(80);
const econMidTooShort = calculateScriptEconomy(midText80, '', '', '', 'Deep Explainer', 145, 'mid');
assert.strictEqual(econMidTooShort.isWordCountSafe, false);
assert.strictEqual(econMidTooShort.formatCompliance, 'Terlalu Singkat');

const midChaptersEconomy = calculateChaptersScriptEconomy(
  [
    { id: 'mc1', chapter_number: 1, title: 'Bab 1', content: 'Kata '.repeat(100), word_count: 100 },
    { id: 'mc2', chapter_number: 2, title: 'Bab 2', content: 'Kata '.repeat(120), word_count: 120 },
  ],
  'Deep Explainer',
  145,
  'mid'
);
assert.strictEqual(midChaptersEconomy.totalWords, 220);
assert.strictEqual(midChaptersEconomy.isWordCountSafe, true);
assert.strictEqual(midChaptersEconomy.isDurationSafe, true);

// 8.3 Long tier (700–1250 words, 300–480s)
const longText850 = 'Kata '.repeat(850);
const econLongOptimal = calculateScriptEconomy(longText850, '', '', '', 'Video Essay', 145, 'long');
assert.strictEqual(econLongOptimal.tier, 'long');
assert.strictEqual(econLongOptimal.isWordCountSafe, true, 'Test 8.3 Failed: 850 words safe for long');
assert.strictEqual(econLongOptimal.isDurationSafe, true, 'Test 8.3 Failed: Duration safe for long');
assert.strictEqual(econLongOptimal.formatCompliance, 'Optimal');

const longText500 = 'Kata '.repeat(500);
const econLongTooShort = calculateScriptEconomy(longText500, '', '', '', 'Video Essay', 145, 'long');
assert.strictEqual(econLongTooShort.isWordCountSafe, false);
assert.strictEqual(econLongTooShort.formatCompliance, 'Terlalu Singkat');

const longChaptersEconomy = calculateChaptersScriptEconomy(
  [
    { id: 'lc1', chapter_number: 1, title: 'Bab 1', content: 'Kata '.repeat(160), word_count: 160 },
    { id: 'lc2', chapter_number: 2, title: 'Bab 2', content: 'Kata '.repeat(160), word_count: 160 },
    { id: 'lc3', chapter_number: 3, title: 'Bab 3', content: 'Kata '.repeat(160), word_count: 160 },
    { id: 'lc4', chapter_number: 4, title: 'Bab 4', content: 'Kata '.repeat(160), word_count: 160 },
    { id: 'lc5', chapter_number: 5, title: 'Bab 5', content: 'Kata '.repeat(160), word_count: 160 },
  ],
  'Video Essay',
  145,
  'long',
  'Kata '.repeat(45), // Hook
  'Kata '.repeat(40)  // Ending
);
assert.strictEqual(longChaptersEconomy.totalWords, 885);
assert.strictEqual(longChaptersEconomy.isWordCountSafe, true);
assert.strictEqual(longChaptersEconomy.isDurationSafe, true);

// 8.4 Verification of ALL items in INITIAL_CONTENT_ITEMS from mock-data.ts
console.log('Verifying all items in INITIAL_CONTENT_ITEMS (mock-data.ts)...');
assert(INITIAL_CONTENT_ITEMS.length >= 8, `Expected at least 8 items, found ${INITIAL_CONTENT_ITEMS.length}`);

for (const item of INITIAL_CONTENT_ITEMS) {
  // Title validation
  const tVal = validateTitle(item.title);
  assert(
    tVal.isValid,
    `Mock item ${item.id} has invalid title "${item.title}": ${tVal.errors.join(', ')}`
  );

  // Content tier & aspect ratio
  assert(
    item.content_tier === 'short' || item.content_tier === 'mid' || item.content_tier === 'long',
    `Mock item ${item.id} has invalid tier ${item.content_tier}`
  );
  assert(
    item.aspect_ratio === '9:16' || item.aspect_ratio === '16:9',
    `Mock item ${item.id} has invalid aspect ratio ${item.aspect_ratio}`
  );

  // Economy validation
  if (item.script_chapters && item.script_chapters.length > 0) {
    const econ = calculateChaptersScriptEconomy(
      item.script_chapters,
      item.format,
      item.target_wpm || 145,
      item.content_tier,
      item.script_hook,
      item.script_ending
    );
    assert(
      econ.isWordCountSafe,
      `Mock item ${item.id} (${item.content_tier}) failed isWordCountSafe: ${econ.totalWords} words (format compliance: ${econ.formatCompliance})`
    );
    assert(
      econ.isDurationSafe,
      `Mock item ${item.id} (${item.content_tier}) failed isDurationSafe: ${econ.estimatedSeconds}s`
    );
  } else {
    const econ = calculateScriptEconomy(
      item.script_hook,
      item.script_context,
      item.script_payoff,
      item.script_ending,
      item.format,
      item.target_wpm || 145,
      item.content_tier
    );
    assert(
      econ.isWordCountSafe,
      `Mock item ${item.id} (${item.content_tier}) failed isWordCountSafe: ${econ.totalWords} words (format compliance: ${econ.formatCompliance})`
    );
    assert(
      econ.isDurationSafe,
      `Mock item ${item.id} (${item.content_tier}) failed isDurationSafe: ${econ.estimatedSeconds}s`
    );
  }
}

// Check specific Mid-Form (zein-c007) and Long-Form (zein-c008) samples
const midSample = INITIAL_CONTENT_ITEMS.find((it) => it.id === 'zein-c007');
assert(midSample !== undefined, 'Mid-Form sample zein-c007 missing in INITIAL_CONTENT_ITEMS');
assert.strictEqual(midSample?.content_tier, 'mid');
assert.strictEqual(midSample?.aspect_ratio, '16:9');
assert.strictEqual(midSample?.format, 'Deep Explainer');
assert.strictEqual(midSample?.script_chapters?.length, 3);
assert(midSample?.seo_description && midSample.seo_description.length > 50);
assert(Array.isArray(midSample?.seo_tags) && midSample.seo_tags.length >= 5);
assert(Array.isArray(midSample?.thumbnail_hooks) && midSample.thumbnail_hooks.length === 3);

const longSample = INITIAL_CONTENT_ITEMS.find((it) => it.id === 'zein-c008');
assert(longSample !== undefined, 'Long-Form sample zein-c008 missing in INITIAL_CONTENT_ITEMS');
assert.strictEqual(longSample?.content_tier, 'long');
assert.strictEqual(longSample?.aspect_ratio, '16:9');
assert.strictEqual(longSample?.format, 'Video Essay');
assert.strictEqual(longSample?.script_chapters?.length, 5);
assert(longSample?.seo_description && longSample.seo_description.length > 100);
assert(Array.isArray(longSample?.seo_tags) && longSample.seo_tags.length >= 8);
assert(longSample?.pinned_comment_prompt && longSample.pinned_comment_prompt.length > 20);
for (const item of INITIAL_CONTENT_ITEMS) {
  const countWords = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length;
  let actualWords = 0;
  if (item.script_chapters && item.script_chapters.length > 0) {
    actualWords =
      countWords(item.script_hook) +
      item.script_chapters.reduce((sum, ch) => sum + countWords(ch.content), 0) +
      countWords(item.script_ending);
  } else {
    actualWords =
      countWords(item.script_hook) +
      countWords(item.script_context) +
      countWords(item.script_payoff) +
      countWords(item.script_ending);
  }
  assert.strictEqual(
    item.word_count,
    actualWords,
    `Mock item ${item.id} word_count (${item.word_count}) does not match actual text words (${actualWords})`
  );
}

// 8.5 Verification of ALL items in INITIAL_IDEAS from mock-data.ts
console.log('Verifying all items in INITIAL_IDEAS (mock-data.ts)...');
assert(INITIAL_IDEAS.length >= 5, `Expected at least 5 ideas, found ${INITIAL_IDEAS.length}`);

for (const idea of INITIAL_IDEAS) {
  const tVal = validateTitle(idea.title);
  assert(
    tVal.isValid,
    `Mock idea ${idea.id} has invalid title "${idea.title}": ${tVal.errors.join(', ')}`
  );
  assert(
    idea.content_tier === 'short' || idea.content_tier === 'mid' || idea.content_tier === 'long',
    `Mock idea ${idea.id} has invalid tier ${idea.content_tier}`
  );
  assert(
    idea.aspect_ratio === '9:16' || idea.aspect_ratio === '16:9',
    `Mock idea ${idea.id} has invalid aspect ratio ${idea.aspect_ratio}`
  );
}

const midIdea = INITIAL_IDEAS.find((it) => it.id === 'zein-i004');
assert(midIdea !== undefined && midIdea.content_tier === 'mid', 'Mid-Form idea zein-i004 missing');
const longIdea = INITIAL_IDEAS.find((it) => it.id === 'zein-i005');
assert(longIdea !== undefined && longIdea.content_tier === 'long', 'Long-Form idea zein-i005 missing');

console.log('✓ Test 8 Passed: Script economy, 8 INITIAL_CONTENT_ITEMS & 5 INITIAL_IDEAS validated.\n');

console.log('================================================================');
console.log('ALL PHASE 5 VERIFICATION TESTS PASSED SUCCESSFULLY! (8/8) ✓');
console.log('================================================================');
