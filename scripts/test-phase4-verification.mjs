import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-delegate to npx tsx so TypeScript imports and type stripping work reliably across all Node environments
if (!process.env.__PHASE4_RUNNER__) {
  const currentFilePath = fileURLToPath(import.meta.url);
  const result = spawnSync('npx', ['tsx', currentFilePath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, __PHASE4_RUNNER__: '1' },
    shell: true,
  });
  process.exit(result.status ?? 0);
}

const { studioStore, normalizeContentItem } = await import('../lib/storage.ts');
const { exportCleanNarrationForTts } = await import('../lib/export-utils.ts');
const { calculateChaptersScriptEconomy } = await import('../lib/validator.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== PHASE 4 INTEGRATION & VERIFICATION SUITE ===\n');

// -------------------------------------------------------------
// TEST 1: Static Architecture & Clean Integration in app/page.tsx
// -------------------------------------------------------------
console.log('1. Checking app/page.tsx integration & retirement of legacy routes...');
const appPageContent = fs.readFileSync(path.join(rootDir, 'app', 'page.tsx'), 'utf-8');

assert(
  appPageContent.includes("import { UnifiedStudioModal } from '../components/UnifiedStudioModal'"),
  'Test 1.1 Failed: UnifiedStudioModal not imported in app/page.tsx'
);
assert(
  !appPageContent.includes('<ScriptStudioModule'),
  'Test 1.2 Failed: ScriptStudioModule still rendered in app/page.tsx'
);
assert(
  !appPageContent.includes('<ProductionStudioModule'),
  'Test 1.3 Failed: ProductionStudioModule still rendered in app/page.tsx'
);
assert(
  appPageContent.includes('isStudioModalOpen') && appPageContent.includes('setIsStudioModalOpen'),
  'Test 1.4 Failed: isStudioModalOpen state missing from app/page.tsx'
);
assert(
  appPageContent.includes('studioModalItem') && appPageContent.includes('setStudioModalItem'),
  'Test 1.5 Failed: studioModalItem state missing from app/page.tsx'
);
assert(
  appPageContent.includes('handleOpenStudioModal'),
  'Test 1.6 Failed: handleOpenStudioModal handler missing from app/page.tsx'
);
assert(
  appPageContent.includes('<UnifiedStudioModal'),
  'Test 1.7 Failed: UnifiedStudioModal component tag not rendered in app/page.tsx'
);
assert(
  appPageContent.includes('onOpenStudio={handleOpenStudioModal}'),
  'Test 1.8 Failed: PipelineModule onOpenStudio prop not passed in app/page.tsx'
);
assert(
  appPageContent.includes('onOpenContent={handleOpenStudioModal}'),
  'Test 1.9 Failed: CalendarModule onOpenContent prop not passed in app/page.tsx'
);
console.log('✓ app/page.tsx architecture & legacy route retirement verified.');

// -------------------------------------------------------------
// TEST 2: PipelineModule onOpenStudio Integration & Card/Button Hooks
// -------------------------------------------------------------
console.log('\n2. Checking PipelineModule onOpenStudio & Kanban integration...');
const pipelineContent = fs.readFileSync(path.join(rootDir, 'components', 'modules', 'PipelineModule.tsx'), 'utf-8');

assert(
  pipelineContent.includes('onOpenStudio?: (item: ContentItem) => void;'),
  'Test 2.1 Failed: onOpenStudio prop missing in PipelineModuleProps'
);
assert(
  pipelineContent.includes('handleOpenStudio'),
  'Test 2.2 Failed: handleOpenStudio dispatcher function missing in PipelineModule'
);
assert(
  pipelineContent.includes('Buka Studio 🎬'),
  'Test 2.3 Failed: Buka Studio 🎬 button missing in PipelineModule'
);
assert(
  pipelineContent.includes('isDraggingRef'),
  'Test 2.4 Failed: isDraggingRef guard missing from PipelineModule'
);
assert(
  pipelineContent.includes('Aksi Lainnya') && pipelineContent.includes('activeMenuId === item.id'),
  'Test 2.5 Failed: Popover Aksi Lainnya (···) menu missing or broken'
);
assert(
  pipelineContent.includes('onClick={() => handleOpenStudio(item)}'),
  'Test 2.6 Failed: Table view title does not hook to handleOpenStudio'
);
console.log('✓ PipelineModule props, triggers, and drag protection verified.');

// -------------------------------------------------------------
// TEST 3: GlobalSearchModal Integration & Shortcut Isolation
// -------------------------------------------------------------
console.log('\n3. Checking GlobalSearchModal & Shortcut Isolation...');
const searchContent = fs.readFileSync(path.join(rootDir, 'components', 'GlobalSearchModal.tsx'), 'utf-8');

assert(
  searchContent.includes("onSelect('content', item.id, item)"),
  'Test 3.1 Failed: GlobalSearchModal does not forward item object on content selection'
);

// Check shortcut isolation in app/page.tsx
assert(
  appPageContent.includes('!isStudioModalOpen') && appPageContent.includes("e.key === '/'"),
  'Test 3.2 Failed: Global search shortcut "/" is not isolated when studio modal is open'
);
assert(
  appPageContent.includes('if (isStudioModalOpen)') && appPageContent.includes("e.key.toLowerCase() === 's'"),
  'Test 3.3 Failed: Ctrl+S is not delegated to studio modal when open'
);
assert(
  appPageContent.includes('if (isStudioModalOpen)') && appPageContent.includes("e.key === 'Escape'"),
  'Test 3.4 Failed: Escape key is not delegated to studio modal when open'
);

// Check shortcuts in UnifiedStudioModal
const studioModalContent = fs.readFileSync(path.join(rootDir, 'components', 'UnifiedStudioModal.tsx'), 'utf-8');
assert(
  studioModalContent.includes("e.key === '1'") && studioModalContent.includes("setActiveTab('script')"),
  'Test 3.5 Failed: UnifiedStudioModal does not support Ctrl+1 shortcut'
);
assert(
  studioModalContent.includes("e.key === '2'") && studioModalContent.includes("setActiveTab('packaging')"),
  'Test 3.6 Failed: UnifiedStudioModal does not support Ctrl+2 shortcut'
);
assert(
  studioModalContent.includes("e.key === '3'") && studioModalContent.includes("setActiveTab('metadata')"),
  'Test 3.7 Failed: UnifiedStudioModal does not support Ctrl+3 shortcut'
);
assert(
  studioModalContent.includes("handleRequestClose"),
  'Test 3.8 Failed: UnifiedStudioModal lacks safe flush-on-close handler'
);
console.log('✓ Global search integration, modal shortcuts, and isolation verified.');

// -------------------------------------------------------------
// TEST 4: Unified Studio Modal Multi-Format Store Sync & Updates
// -------------------------------------------------------------
console.log('\n4. Testing end-to-end studio store sync with multi-tier payloads...');

// Setup test short-form item
const shortId = `test-p4-short-${Date.now()}`;
const shortItem = studioStore.saveContentItem({
  id: shortId,
  title: 'Apakah AI Benar Menggantikan Guru?',
  type: 'content',
  content_tier: 'short',
  pillar: 'AI & Technology',
  status: 'Penulisan',
  script_hook: 'Jangan kaget kalau dalam setahun lagi guru favoritmu adalah sebuah algoritma.',
  script_context: 'Perusahaan teknologi raksasa baru saja merilis model kecerdasan buatan personal tutor.',
  script_payoff: 'Namun empati manusia tetap menjadi jangkar utama yang tak tergantikan.',
  script_ending: 'Ketik pendapatmu di komentar dan follow Zeinity.',
});

assert.strictEqual(shortItem.id, shortId);
assert.strictEqual(shortItem.content_tier, 'short');
assert.strictEqual(shortItem.aspect_ratio, '9:16');

// Setup test long-form item
const longId = `test-p4-long-${Date.now()}`;
const longItem = studioStore.saveContentItem({
  id: longId,
  title: 'Investigasi Monopoli Toko Aplikasi Global',
  type: 'content',
  content_tier: 'long',
  pillar: 'Digital Economy & Consumer Culture',
  status: 'Riset',
  script_hook: 'Siapa yang menguasai 30 persen dari seluruh perputaran uang di ponsel kita?',
  script_chapters: [
    {
      id: 'ch-long-1',
      chapter_number: 1,
      title: 'Awal Mula Pajak Digital',
      content: 'Tahun 2008 ekosistem aplikasi ponsel dimulai dengan janji keterbukaan.',
      word_count: 9,
      timestamp_estimate: '00:00',
    },
    {
      id: 'ch-long-2',
      chapter_number: 2,
      title: 'Dampak Terhadap Pengembang Lokal',
      content: 'Pengembang independen terbebani potongan biaya langganan yang signifikan.',
      word_count: 8,
      timestamp_estimate: '00:15',
    },
  ],
});

assert.strictEqual(longItem.id, longId);
assert.strictEqual(longItem.content_tier, 'long');
assert.strictEqual(longItem.aspect_ratio, '16:9'); // Long-form must default to 16:9

// Test TTS export on short vs long
const shortTts = exportCleanNarrationForTts(shortItem);
assert(shortTts.includes('Jangan kaget kalau'), 'Test 4.1 Failed: Short TTS narration missing hook');
assert(shortTts.includes('Ketik pendapatmu'), 'Test 4.2 Failed: Short TTS narration missing ending');

const longTts = exportCleanNarrationForTts(longItem);
assert(longTts.includes('Siapa yang menguasai'), 'Test 4.3 Failed: Long TTS narration missing hook');
assert(longTts.includes('Tahun 2008'), 'Test 4.4 Failed: Long TTS narration missing chapter 1');
assert(longTts.includes('Pengembang independen'), 'Test 4.5 Failed: Long TTS narration missing chapter 2');

// Clean up
studioStore.deleteItem(shortId);
studioStore.deleteItem(longId);
assert(studioStore.getContentById(shortId) === undefined);
assert(studioStore.getContentById(longId) === undefined);
console.log('✓ Multi-tier studioStore synchronization & TTS generation verified.');

// -------------------------------------------------------------
// TEST 5: Fallback & Route Redirection Code Verification
// -------------------------------------------------------------
console.log('\n5. Verifying fallback routing for legacy script & production routes...');

// Check app/page.tsx route redirect handlers
assert(
  appPageContent.includes("if (tab === 'script' || tab === 'production')"),
  'Test 5.1 Failed: handleNavigate lacks retired route check'
);
assert(
  appPageContent.includes("if (currentTab === 'script' || currentTab === 'production')"),
  'Test 5.2 Failed: useEffect fallback lacks retired tab check'
);
assert(
  appPageContent.includes("setCurrentTab('pipeline')"),
  'Test 5.3 Failed: Redirection does not route to pipeline'
);

console.log('✓ Fallback route redirection logic verified in source code.');

console.log('\n==============================================');
console.log('ALL PHASE 4 INTEGRATION TESTS PASSED! ✓');
console.log('==============================================');
