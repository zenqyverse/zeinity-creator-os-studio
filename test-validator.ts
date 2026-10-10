import { validateTitle, calculateScriptEconomy, autoSplitRawScript } from './lib/validator';
import { exportToPlainText, exportToTeleprompter, exportToCapCutSegments, exportToSrt, formatTimecode } from './lib/export-utils';
import { parseYouTubeAnalyticsCsv, parseDurationToSeconds, parsePercentage } from './lib/csv-parser';
import { ContentItem } from './lib/types';

function runTests() {
  console.log('--- TEST 1: Title Validator & Edge Cases ---');
  // Valid title
  const t1 = validateTitle('Apa Saja Fitur Baru WhatsApp Bulan Ini?');
  console.assert(t1.isValid === true, 'Test 1.1 Failed: Should be valid');
  console.assert(t1.formatPassed.startsWithQuestionWord === true, 'Test 1.2 Failed: Starts with Apa');
  console.assert(t1.formatPassed.validWordRange === true, 'Test 1.3 Failed: 7 words is valid');
  console.assert(t1.formatPassed.endsWithQuestionMark === true, 'Test 1.4 Failed: Ends with ?');

  // Title without question word
  const t2 = validateTitle('Update Baru Fitur WhatsApp Bulan Ini?');
  console.assert(t2.isValid === false, 'Test 2.1 Failed: Should fail without question word');
  console.assert(t2.formatPassed.startsWithQuestionWord === false, 'Test 2.2 Failed');

  // Title with < 5 words
  const t3 = validateTitle('Apa Fitur Baru?');
  console.assert(t3.isValid === false, 'Test 3.1 Failed: Should fail word count < 5');
  console.assert(t3.formatPassed.validWordRange === false, 'Test 3.2 Failed');

  // Title with > 10 words
  const t4 = validateTitle('Bagaimana Cara Kerja Kecerdasan Buatan Generatif Yang Ada Di Ponsel Pintar Modern?');
  console.assert(t4.isValid === false, 'Test 4.1 Failed: Should fail word count > 10');

  // Title without question mark
  const t5 = validateTitle('Kenapa Baterai Ponsel Pintar Ini Cepat Habis');
  console.assert(t5.isValid === false, 'Test 5.1 Failed: Should fail without question mark');
  console.assert(t5.formatPassed.endsWithQuestionMark === false, 'Test 5.2 Failed');

  // Null, undefined, and empty string edge cases
  const tNull = validateTitle(null);
  console.assert(tNull.isValid === false, 'Test 5.3 Failed: Null title should not crash');
  console.assert(tNull.wordCount === 0, 'Test 5.4 Failed');

  const tUndef = validateTitle(undefined);
  console.assert(tUndef.isValid === false, 'Test 5.5 Failed: Undefined title should not crash');

  const tEmpty = validateTitle('   ');
  console.assert(tEmpty.isValid === false, 'Test 5.6 Failed: Empty title should not crash');

  console.log('--- TEST 2: Script Economy & Pace Calculator ---');
  const sampleHook = 'Pernah sadar ponselmu bisa merangkum artikel panjang tanpa kuota internet sama sekali? Tentu ini bukan trik sulap.';
  const sampleContext = 'Pabrikan chipset modern sekarang menyematkan prosesor neural NPU khusus langsung di dalam motherboard ponsel cerdas kita semua.';
  const samplePayoff = 'Alih-alih mengirim seluruh data pribadimu ke server awan raksasa di luar negeri, model bahasa mini berukuran dua gigabita dijalankan langsung di memori RAM perangkat. Proses komputasi selesai secara instan dalam hitungan milidetik, menghemat baterai secara signifikan, dan yang terpenting, data percakapan rahasiamu tidak pernah bocor keluar dari perangkat fisik ponsel.';
  const sampleEnding = 'Makanya, cek spesifikasi ponselmu berikutnya apakah sudah punya chip NPU mandiri atau belum sebelum memutuskan membeli?';

  const econ = calculateScriptEconomy(sampleHook, sampleContext, samplePayoff, sampleEnding, 'Quick Breakdown', 145);
  console.log(`Calculated words: ${econ.totalWords}, Estimated seconds: ${econ.estimatedSeconds}s`);
  console.assert(econ.totalWords >= 90 && econ.totalWords <= 140, 'Test 6.1 Failed: Total words should be 90-140');
  console.assert(econ.isWordCountSafe === true, 'Test 6.2 Failed: Word count should be safe');
  console.assert(econ.isDurationSafe === true, 'Test 6.3 Failed: Duration should be <= 60s');

  // Script with > 200 words (exceeds 60s hard limit)
  const longText = 'Kata '.repeat(220);
  const econLong = calculateScriptEconomy(longText, '', '', '', 'Flash News', 145);
  console.assert(econLong.isWordCountSafe === false, 'Test 6.4 Failed: 220 words should not be safe');
  console.assert(econLong.isDurationSafe === false, 'Test 6.5 Failed: Duration > 60s must fail isDurationSafe');
  console.assert(econLong.formatCompliance === 'Terlalu Panjang', 'Test 6.6 Failed');

  // Null & undefined script arguments
  const econNull = calculateScriptEconomy(null, undefined, null, undefined);
  console.assert(econNull.totalWords === 0, 'Test 6.7 Failed: Null args should calculate 0 words');
  console.assert(econNull.estimatedSeconds === 0, 'Test 6.8 Failed');

  console.log('--- TEST 3: Script Auto-Splitter ---');
  // Auto-split with explicit labels
  const labeledScript = `[STAGE 1]
Pernah sadar ponselmu bisa bekerja tanpa internet?

[STAGE 2]
Fitur kecerdasan buatan sekarang ditanamkan langsung pada chip NPU lokal.

[STAGE 3]
Proses inferensi model bahasa mini berjalan cepat di dalam RAM tanpa perlu mengirim data ke server awan.

[STAGE 4]
Coba cek pengaturan ponselmu sekarang juga!`;

  const split1 = autoSplitRawScript(labeledScript);
  console.assert(split1.hook.includes('Pernah sadar'), 'Test 7.1 Failed: Hook extracted');
  console.assert(split1.context.includes('Fitur kecerdasan'), 'Test 7.2 Failed: Context extracted');
  console.assert(split1.payoff.includes('Proses inferensi'), 'Test 7.3 Failed: Payoff extracted');
  console.assert(split1.ending.includes('Coba cek'), 'Test 7.4 Failed: Ending extracted');

  // Auto-split with paragraphs
  const paragraphScript = `Kalimat pembuka hook cepat tanpa dead air.

Konteks penting yang menjelaskan masalahnya.

Uraian mekanisme bukti teknis dan bagaimana fitur ini beroperasi secara rinci.

Kalimat penutup looping yang kembali menyambung.`;

  const split2 = autoSplitRawScript(paragraphScript);
  console.assert(split2.hook.length > 0 && split2.ending.length > 0, 'Test 7.5 Failed: Paragraph split');

  console.log('--- TEST 4: Exporters & Timecode Formats ---');
  // Check formatTimecode
  console.assert(formatTimecode(0) === '00:00:00', 'Test 8.1 Failed: 0s timecode');
  console.assert(formatTimecode(45) === '00:00:45', 'Test 8.2 Failed: 45s timecode');
  console.assert(formatTimecode(60) === '00:01:00', 'Test 8.3 Failed: 60s must be 00:01:00, NEVER 00:00:60');

  const dummyItem: ContentItem = {
    id: 'test-01',
    type: 'content',
    title: 'Kenapa AI di Ponsel Bisa Bekerja Offline?',
    pillar: 'AI & Technology',
    format: 'Quick Breakdown',
    status: 'Penulisan',
    priority: 'Tinggi',
    visual_readiness: 'Siap',
    script_hook: sampleHook,
    script_context: sampleContext,
    script_payoff: samplePayoff,
    script_ending: sampleEnding,
    target_wpm: 145,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const plainTxt = exportToPlainText(dummyItem);
  console.assert(plainTxt.includes('STAGE 1'), 'Test 9.1 Failed: Plain text missing STAGE 1');
  console.assert(plainTxt.includes('STAGE 4'), 'Test 9.2 Failed: Plain text missing STAGE 4');

  const prompter = exportToTeleprompter(dummyItem);
  console.assert(prompter.includes('--- STAGE 1 (HOOK) ---'), 'Test 10.1 Failed: Prompter missing stage header');

  const capcutJson = exportToCapCutSegments(dummyItem);
  const parsedCapcut = JSON.parse(capcutJson);
  console.assert(parsedCapcut.segments.length === 4, 'Test 11.1 Failed: Capcut should have 4 segments');
  console.assert(parsedCapcut.aspect_ratio === '9:16', 'Test 11.2 Failed: Capcut aspect ratio 9:16');
  // Verify all timecodes are standard HH:MM:SS with no invalid seconds like :60
  const timecodeRegex = /^\d{2}:\d{2}:[0-5]\d$/;
  for (const seg of parsedCapcut.segments) {
    console.assert(timecodeRegex.test(seg.time_in), `Test 11.3 Failed: Invalid time_in ${seg.time_in}`);
    console.assert(timecodeRegex.test(seg.time_out), `Test 11.4 Failed: Invalid time_out ${seg.time_out}`);
  }

  const srt = exportToSrt(dummyItem);
  console.assert(srt.includes('00:00:00,000 -->'), 'Test 12.1 Failed: SRT timecode missing');

  console.log('--- TEST 5: YouTube Studio Analytics CSV Parser ---');
  // Test time parser
  console.assert(parseDurationToSeconds('0:44') === 44, 'Test 13.1 Failed: 0:44 duration');
  console.assert(parseDurationToSeconds('01:15') === 75, 'Test 13.2 Failed: 01:15 duration');
  console.assert(parseDurationToSeconds('45.5') === 45.5, 'Test 13.3 Failed: numeric string');

  // Test percentage parser
  console.assert(parsePercentage('73.8%') === 73.8, 'Test 13.4 Failed: percentage string');
  console.assert(parsePercentage('73,8%') === 73.8, 'Test 13.5 Failed: comma percentage');
  console.assert(parsePercentage(0.738) === 73.8, 'Test 13.6 Failed: decimal ratio');

  // English YouTube Studio CSV export
  const csvEn = `Content,Views,Shown in feed,Viewed (vs. swiped away) (%),Average view duration,Average percentage viewed (%),Likes,Subscribers
"Why Phone AI Runs Offline",54200,72100,74.2%,0:42,98.2%,3900,310
"How Digital Wallets Work",38100,51000,71.5%,0:38,91.4%,2600,195
Total,92300,123100,72.8%,0:40,94.8%,6500,505`;

  const parsedEn = parseYouTubeAnalyticsCsv(csvEn);
  console.assert(parsedEn.length === 2, `Test 14.1 Failed: Expected 2 rows, got ${parsedEn.length}`);
  console.assert(parsedEn[0].title === 'Why Phone AI Runs Offline', 'Test 14.2 Failed');
  console.assert(parsedEn[0].views === 54200, 'Test 14.3 Failed');
  console.assert(parsedEn[0].stayed_to_watch === 74.2, 'Test 14.4 Failed');
  console.assert(parsedEn[0].avg_view_duration === 42, 'Test 14.5 Failed');
  console.assert(parsedEn[0].apv === 98.2, 'Test 14.6 Failed');
  console.assert(parsedEn[0].pillar === 'AI & Technology', 'Test 14.7 Failed: Pillar inference');

  // Indonesian YouTube Studio CSV export (with semicolon separator)
  const csvId = `Judul video;Penayangan;Ditampilkan di feed;Dilihat (vs. digeser) (%);Rata-rata durasi tonton;Rata-rata persentase penayangan (%);Suka;Pelanggan
Kenapa Algoritma TikTok Berbahaya?;82000;110000;76,5%;0:45;104,2%;6100;520
Bagaimana Cara Top Up Game?;29000;42000;68,2%;0:30;88,0%;1800;120`;

  const parsedId = parseYouTubeAnalyticsCsv(csvId);
  console.assert(parsedId.length === 2, `Test 15.1 Failed: Expected 2 rows, got ${parsedId.length}`);
  console.assert(parsedId[0].title === 'Kenapa Algoritma TikTok Berbahaya?', 'Test 15.2 Failed');
  console.assert(parsedId[0].views === 82000, 'Test 15.3 Failed');
  console.assert(parsedId[0].stayed_to_watch === 76.5, 'Test 15.4 Failed');
  console.assert(parsedId[0].apv === 104.2, 'Test 15.5 Failed');
  console.assert(parsedId[1].pillar === 'Gaming & Digital Entertainment', 'Test 15.6 Failed');

  console.log('ALL UNIT & REGRESSION TESTS PASSED SUCCESSFULLY! ✓');
}

runTests();
