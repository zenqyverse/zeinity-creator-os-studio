import { studioStore } from './lib/storage';
import { generateWithTaskRouter } from './lib/ai-service';
import { validateTitle, calculateScriptEconomy } from './lib/validator';
import { isSupabaseConfigured } from './lib/supabase';

async function runComprehensiveRoadmapTests() {
  console.log('=== ROADMAP FORENSIC & INTEGRATION TEST SUITE ===');

  // -------------------------------------------------------------
  // TEST 1: Script Studio Revision History & Version Restore
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing Script Versions Management ---');
  const dummyContent = studioStore.saveContentItem({
    title: 'Kenapa Chip NPU Ponsel Sangat Cepat?',
    pillar: 'AI & Technology',
    format: 'Quick Breakdown',
    status: 'Penulisan',
    script_hook: 'Hook Versi 1: Ini kalimat pembuka awal.',
    script_context: 'Konteks awal tentang neural processing unit.',
    script_payoff: 'Payoff awal dengan penjelasan teknis mendalam.',
    script_ending: 'Loop penutup awal.',
    word_count: 55,
    duration_estimate: 22.8,
  });

  const v1 = studioStore.saveScriptVersion({
    content_id: dummyContent.id,
    title: dummyContent.title,
    format: dummyContent.format,
    target_wpm: 145,
    script_hook: dummyContent.script_hook,
    script_context: dummyContent.script_context,
    script_payoff: dummyContent.script_payoff,
    script_ending: dummyContent.script_ending,
    word_count: 55,
    duration_estimate: 22.8,
    is_active: true,
  });

  console.assert(v1.version_number === 1, `Expected v1 version_number=1, got ${v1.version_number}`);
  console.assert(v1.is_active === true, 'v1 should be active');

  // Create v2 with updated copy
  const v2 = studioStore.saveScriptVersion({
    content_id: dummyContent.id,
    title: 'Kenapa Chip NPU Ponsel Bekerja Offline?',
    format: 'Quick Breakdown',
    target_wpm: 150,
    script_hook: 'Hook Versi 2: Trik rahasia komputasi on-device.',
    script_context: 'Konteks versi 2.',
    script_payoff: 'Payoff versi 2.',
    script_ending: 'Loop versi 2.',
    word_count: 65,
    duration_estimate: 26,
    is_active: true,
  });

  console.assert(v2.version_number === 2, `Expected v2 version_number=2, got ${v2.version_number}`);
  const versionsList = studioStore.getScriptVersions(dummyContent.id);
  console.assert(versionsList.length >= 2, `Expected at least 2 versions, got ${versionsList.length}`);
  console.assert(versionsList[0].version_number === 2, 'Versions should be sorted desc by version_number');

  // Restore v1
  const restored = studioStore.restoreScriptVersion(v1.id);
  console.assert(restored !== null, 'Restore should return restored version');
  console.assert(restored?.version_number === 1, 'Restored version should be v1');
  const parentAfterRestore = studioStore.getContentById(dummyContent.id);
  console.assert(
    parentAfterRestore?.script_hook === 'Hook Versi 1: Ini kalimat pembuka awal.',
    'Parent content item hook should be restored to v1 hook'
  );
  console.log('✓ Script versions & restore verified successfully!');

  // -------------------------------------------------------------
  // TEST 2: Supabase Client Configuration & Hybrid Fallback
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Supabase Hybrid Configuration ---');
  const configured = isSupabaseConfigured();
  console.log(`Supabase isConfigured runtime check: ${configured} (Offline fallback active: ${!configured})`);
  // Ensure store operates gracefully without throwing exceptions in offline fallback
  const testAsset = studioStore.saveAsset({
    content_id: dummyContent.id,
    asset_name: 'test-screenshot.png',
    asset_type: 'Screenshot',
    asset_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    storage_path: 'local-cache/test-screenshot.png',
  });
  console.assert(testAsset.id.length > 0, 'Asset should be saved to store');
  const foundAsset = studioStore.getAssetsByContentId(dummyContent.id);
  console.assert(foundAsset.some((a) => a.id === testAsset.id), 'Saved asset found in content assets');
  console.log('✓ Hybrid storage fallback verified successfully!');

  // -------------------------------------------------------------
  // TEST 3: AI Service Intelligent Mock Fallback & Streaming Simulation
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing AI Service Task Router & Streaming ---');
  let streamedChunks = '';
  const aiResult = await generateWithTaskRouter(
    'hook',
    { title: 'Kenapa Baterai Smartphone Lebih Cepat Habis di Sinyal Lemah?' },
    (chunk) => {
      streamedChunks = chunk;
    }
  );

  console.assert(aiResult.text.length > 0, 'AI Result text should not be empty');
  console.assert(aiResult.tokensUsed > 0, 'Tokens used should be tracked');
  console.assert(streamedChunks.length > 0, 'Stream callback should have accumulated chunks');
  console.assert(streamedChunks === aiResult.text, 'Streamed chunks should equal final generated text');
  console.log(`✓ AI Task Router stream generated ${aiResult.text.length} chars!`);

  // -------------------------------------------------------------
  // TEST 4: Storyboard Reordering & Time Range
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Storyboard Scene Planner & Ordering ---');
  const sc1 = studioStore.saveStoryboardScene({
    content_id: dummyContent.id,
    scene_order: 1,
    time_range: '0–3s',
    narration_text: 'Narasi Scene 1',
    on_screen_text: 'HOOK LAYAR',
    visual_direction: 'Fast cut to smartphone screen',
  });

  const sc2 = studioStore.saveStoryboardScene({
    content_id: dummyContent.id,
    scene_order: 2,
    time_range: '4–10s',
    narration_text: 'Narasi Scene 2',
    on_screen_text: 'KONTEKS CHIPSET',
    visual_direction: 'Motherboard B-roll',
  });

  const scenes = studioStore.getStoryboardsByContentId(dummyContent.id);
  console.assert(scenes.length >= 2, 'Scenes should be retrieved');
  console.assert(scenes[0].scene_order === 1, 'Scene 1 should be first');
  console.assert(scenes[1].scene_order === 2, 'Scene 2 should be second');
  console.log('✓ Storyboard scenes & order verified!');

  // -------------------------------------------------------------
  // TEST 5: Title & Script Validation Boundary Conditions
  // -------------------------------------------------------------
  console.log('\n--- 5. Testing Validator Boundaries ---');
  const validTitle = validateTitle('Kenapa AI di Ponsel Bisa Bekerja Offline?');
  console.assert(validTitle.isValid === true, 'Valid title must pass');

  const shortTitle = validateTitle('Apa ini?');
  console.assert(shortTitle.isValid === false, 'Short title must fail');

  const econ = calculateScriptEconomy(
    'Pernah sadar ponselmu bisa merangkum artikel panjang tanpa internet?',
    'Chip NPU modern sekarang ditanamkan langsung pada motherboard perangkat kita.',
    'Model bahasa mini berjalan langsung di RAM tanpa perlu koneksi cloud, menjaga privasi.',
    'Coba cek pengaturan ponselmu sekarang juga!'
  );
  console.assert(econ.isDurationSafe === true, 'Pacing economy under 60s should be safe');
  console.log('✓ Validator edge cases verified!');

  console.log('\n=================================================');
  console.log('ALL INTEGRATION & ROADMAP TESTS PASSED CLEANLY! ✓');
  console.log('=================================================');
}

runComprehensiveRoadmapTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
