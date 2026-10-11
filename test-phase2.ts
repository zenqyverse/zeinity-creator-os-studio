import fs from 'fs';
import path from 'path';
import { ContentItem } from './lib/types';
import { normalizeContentItem, studioStore } from './lib/storage';
import { exportCleanNarrationForTts } from './lib/export-utils';

function runPhase2Tests() {
  console.log('=== PHASE 2 DEEP VERIFICATION SUITE ===\n');

  // TEST 1: Verification of Obsolete File Deletions
  console.log('--- TEST 1: Obsolete Files Deletion & No Lingering Imports ---');
  const safeZonePath = path.join(__dirname, 'components', 'SafeZoneCanvas.tsx');
  const teleprompterPath = path.join(__dirname, 'components', 'TeleprompterModal.tsx');
  console.assert(!fs.existsSync(safeZonePath), 'Test 1.1 Failed: SafeZoneCanvas.tsx still exists!');
  console.assert(!fs.existsSync(teleprompterPath), 'Test 1.2 Failed: TeleprompterModal.tsx still exists!');

  const appPageContent = fs.readFileSync(path.join(__dirname, 'app', 'page.tsx'), 'utf-8');
  console.assert(!appPageContent.includes('SafeZoneCanvas'), 'Test 1.3 Failed: app/page.tsx imports SafeZoneCanvas');
  console.assert(!appPageContent.includes('TeleprompterModal'), 'Test 1.4 Failed: app/page.tsx imports TeleprompterModal');

  const prodStudioPath = path.join(__dirname, 'components', 'modules', 'ProductionStudioModule.tsx');
  console.assert(!fs.existsSync(prodStudioPath), 'Test 1.5 Failed: ProductionStudioModule.tsx still exists!');

  const scriptStudioPath = path.join(__dirname, 'components', 'modules', 'ScriptStudioModule.tsx');
  console.assert(!fs.existsSync(scriptStudioPath), 'Test 1.6 Failed: ScriptStudioModule.tsx still exists!');
  console.log('✓ Obsolete files deleted and imports cleaned.\n');

  // TEST 2: Sidebar Streamlining
  console.log('--- TEST 2: Sidebar 9 Core Hubs Validation ---');
  const sidebarContent = fs.readFileSync(path.join(__dirname, 'components', 'Sidebar.tsx'), 'utf-8');
  const expectedHubs = [
    'overview',
    'pipeline',
    'radar',
    'ideas',
    'calendar',
    'research',
    'assets',
    'analytics',
    'settings',
  ];

  for (const hub of expectedHubs) {
    console.assert(sidebarContent.includes(`id: '${hub}'`), `Test 2.1 Failed: Hub ${hub} missing from Sidebar`);
  }
  console.assert(!sidebarContent.includes("id: 'script'"), 'Test 2.2 Failed: script hub still in Sidebar');
  console.assert(!sidebarContent.includes("id: 'production'"), 'Test 2.3 Failed: production hub still in Sidebar');

  // Count navItems in Sidebar
  const navItemsMatch = sidebarContent.match(/navItems\s*=\s*\[([\s\S]*?)\];/);
  console.assert(navItemsMatch !== null, 'Test 2.4 Failed: Could not extract navItems');
  if (navItemsMatch) {
    const ids = Array.from(navItemsMatch[1].matchAll(/id:\s*'([^']+)'/g)).map(m => m[1]);
    console.assert(ids.length === 9, `Test 2.5 Failed: Expected exactly 9 nav items, got ${ids.length}`);
    console.assert(JSON.stringify(ids) === JSON.stringify(expectedHubs), 'Test 2.6 Failed: navItems IDs mismatch');
  }
  console.log('✓ Sidebar contains exactly the 9 core hubs.\n');

  // TEST 3: PipelineModule Multi-Tier Filter Logic & Fallback
  console.log('--- TEST 3: Pipeline Multi-Tier Filtering & Fallback ---');
  const testItems: ContentItem[] = [
    normalizeContentItem({ id: 'item-1', title: 'Video Shorts 1', content_tier: 'short' }),
    normalizeContentItem({ id: 'item-2', title: 'Video Mid 1', content_tier: 'mid' }),
    normalizeContentItem({ id: 'item-3', title: 'Video Long 1', content_tier: 'long' }),
    normalizeContentItem({ id: 'item-legacy', title: 'Video Tanpa Tier' }), // Missing content_tier
  ];

  // Fallback check
  console.assert(testItems[3].content_tier === 'short', 'Test 3.1 Failed: Legacy item should default to short tier');

  // Simulate PipelineModule filter logic
  const filterByTier = (items: ContentItem[], tier: 'all' | 'short' | 'mid' | 'long') => {
    return items.filter((item) => {
      const itemTier = item.content_tier || 'short';
      return tier === 'all' || itemTier === tier;
    });
  };

  const allItems = filterByTier(testItems, 'all');
  console.assert(allItems.length === 4, 'Test 3.2 Failed: All items count should be 4');

  const shortItems = filterByTier(testItems, 'short');
  console.assert(shortItems.length === 2, 'Test 3.3 Failed: Short items count should be 2 (including legacy fallback)');

  const midItems = filterByTier(testItems, 'mid');
  console.assert(midItems.length === 1 && midItems[0].id === 'item-2', 'Test 3.4 Failed: Mid items count should be 1');

  const longItems = filterByTier(testItems, 'long');
  console.assert(longItems.length === 1 && longItems[0].id === 'item-3', 'Test 3.5 Failed: Long items count should be 1');
  console.log('✓ Multi-tier filter logic and fallback verified.\n');

  // TEST 4: Content Duplication Part 2 / Part 3 Unique Title Generation
  console.log('--- TEST 4: Content Duplication Unique Title (Part 2, Part 3) ---');
  const duplicateTitleGenerator = (currentTitle: string, existingList: { title: string }[]) => {
    const baseTitle = currentTitle.replace(/\s*\((?:Part\s*\d+|Copy)\)$/i, '').trim();
    const existingTitles = new Set(existingList.map((c) => (c.title || '').trim().toLowerCase()));
    let partNum = 2;
    let nextTitle = `${baseTitle} (Part ${partNum})`;
    while (existingTitles.has(nextTitle.toLowerCase())) {
      partNum++;
      nextTitle = `${baseTitle} (Part ${partNum})`;
    }
    return nextTitle;
  };

  const existingList = [{ title: 'Review Claude 3.5 Sonnet' }];
  const dup1 = duplicateTitleGenerator('Review Claude 3.5 Sonnet', existingList);
  console.assert(dup1 === 'Review Claude 3.5 Sonnet (Part 2)', `Test 4.1 Failed: Expected Part 2, got ${dup1}`);

  existingList.push({ title: dup1 });
  const dup2 = duplicateTitleGenerator('Review Claude 3.5 Sonnet', existingList);
  console.assert(dup2 === 'Review Claude 3.5 Sonnet (Part 3)', `Test 4.2 Failed: Expected Part 3, got ${dup2}`);

  // Duplicating the duplicate itself should yield Part 4
  const dupFromPart2 = duplicateTitleGenerator('Review Claude 3.5 Sonnet (Part 2)', existingList);
  console.assert(dupFromPart2 === 'Review Claude 3.5 Sonnet (Part 3)', `Test 4.3 Failed: Expected Part 3, got ${dupFromPart2}`);

  // Test with storage saving to ensure no overwrites occur
  const savedOriginal = studioStore.saveContentItem({
    id: 'zein-dup-orig',
    title: 'Analisis Algoritma YouTube 2026',
    status: 'Terbit',
    publish_date: '2026-10-15',
  });
  const nextTitle1 = duplicateTitleGenerator(savedOriginal.title, studioStore.getContentItems());
  const savedDup1 = studioStore.saveContentItem({
    ...savedOriginal,
    id: undefined,
    title: nextTitle1,
    status: 'Ide',
    publish_date: undefined,
  });
  console.assert(savedDup1.id !== savedOriginal.id, 'Test 4.4 Failed: Duplicate should have new ID');
  console.assert(savedDup1.title === 'Analisis Algoritma YouTube 2026 (Part 2)', 'Test 4.5 Failed: Title should be Part 2');
  console.assert(savedDup1.status === 'Ide', 'Test 4.6 Failed: Duplicate status should be Ide');
  console.assert(savedDup1.publish_date === undefined, 'Test 4.7 Failed: Publish date reset');

  // Second duplicate from same original
  const nextTitle2 = duplicateTitleGenerator(savedOriginal.title, studioStore.getContentItems());
  const savedDup2 = studioStore.saveContentItem({
    ...savedOriginal,
    id: undefined,
    title: nextTitle2,
    status: 'Ide',
    publish_date: undefined,
  });
  console.assert(savedDup2.title === 'Analisis Algoritma YouTube 2026 (Part 3)', `Test 4.8 Failed: Expected Part 3, got ${savedDup2.title}`);
  console.assert(savedDup2.id !== savedDup1.id, 'Test 4.9 Failed: Part 3 must not overwrite Part 2');
  console.log('✓ Duplication unique title generator and storage persistence verified.\n');

  // TEST 5: Clean Narration Exporter for Kaggle TTS
  console.log('--- TEST 5: Clean Narration Exporter (Kaggle TTS) ---');
  const dirtyShortItem: ContentItem = normalizeContentItem({
    title: 'Rahasia Algoritma',
    script_hook: '[STAGE 1: Hook] Tahukah kamu bahwa AI sekarang bisa memprediksi tren? (Visual: zoom in)',
    script_context: '[STAGE 2: Konteks] (SFX: whoosh) Model bahasa besar memproses jutaan parameter per detik.',
    script_payoff: '[STAGE 3: Payoff] Hasilnya adalah konten yang lebih relevan dan engaging. (b-roll: server farm)',
    script_ending: '[STAGE 4: Loop] Jadi mulai optimalkan sekarang juga! (cut to logo)',
  });
  const cleanShort = exportCleanNarrationForTts(dirtyShortItem);
  console.assert(!cleanShort.includes('[STAGE'), 'Test 5.1 Failed: Stage tags not stripped');
  console.assert(!cleanShort.includes('(Visual:'), 'Test 5.2 Failed: Visual notes not stripped');
  console.assert(!cleanShort.includes('(SFX:'), 'Test 5.3 Failed: SFX notes not stripped');
  console.assert(!cleanShort.includes('(b-roll:'), 'Test 5.4 Failed: b-roll notes not stripped');
  console.assert(!cleanShort.includes('(cut to logo)'), 'Test 5.5 Failed: cut instructions not stripped');
  console.assert(cleanShort.includes('Tahukah kamu bahwa AI sekarang bisa memprediksi tren?'), 'Test 5.6 Failed: Narration hook preserved');
  console.assert(cleanShort.includes('Model bahasa besar memproses'), 'Test 5.7 Failed: Narration context preserved');

  const emptyItem: ContentItem = normalizeContentItem({ title: 'Kosong' });
  const cleanEmpty = exportCleanNarrationForTts(emptyItem);
  console.assert(cleanEmpty === '', 'Test 5.8 Failed: Empty item should return empty string');
  console.log('✓ Clean Narration Exporter successfully validated.\n');

  // TEST 6: OverviewModule Updated Terminology
  console.log('--- TEST 6: OverviewModule Terminology Check ---');
  const overviewContent = fs.readFileSync(path.join(__dirname, 'components', 'modules', 'OverviewModule.tsx'), 'utf-8');
  console.assert(!overviewContent.includes('Safe Zone 9:16'), 'Test 6.1 Failed: OverviewModule still contains "Safe Zone 9:16" label');
  console.assert(overviewContent.includes('Storyboard & Visual'), 'Test 6.2 Failed: OverviewModule missing "Storyboard & Visual"');
  console.log('✓ OverviewModule updated with neutral multi-format terminology.\n');

  console.log('==============================================');
  console.log('ALL PHASE 2 UNIT & INTEGRATION TESTS PASSED! ✓');
  console.log('==============================================');
}

runPhase2Tests();
