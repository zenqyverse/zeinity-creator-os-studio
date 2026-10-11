import { studioStore } from './lib/storage';

console.log('=== TEST SUITE: DELETE & TOMBSTONE RESILIENCE ===');

// 1. Test Content Item Deletion & Cascade
const testContent = studioStore.saveContentItem({
  title: 'Uji Coba Hapus Konten Resilient',
  format: 'Quick Breakdown',
  content_tier: 'short',
  status: 'Ide',
  pillar: 'AI & Technology',
});

console.log('1. Created test content:', testContent.id);

// Add linked storyboard scene & checklist
studioStore.saveStoryboardScene({
  content_id: testContent.id,
  scene_order: 1,
  narration_text: 'Narasi adegan uji coba',
});

const scenesBefore = studioStore.getStoryboardsByContentId(testContent.id);
if (scenesBefore.length !== 1) throw new Error('Expected 1 storyboard scene');

// Delete content item
const deleteSuccess = studioStore.deleteItem(testContent.id);
if (!deleteSuccess) throw new Error('deleteItem should return true');

const contentAfter = studioStore.getContentById(testContent.id);
if (contentAfter) throw new Error('Item should no longer exist in store');

const scenesAfter = studioStore.getStoryboardsByContentId(testContent.id);
if (scenesAfter.length !== 0) throw new Error('Linked scenes should be cleaned up upon deletion');

if (!studioStore.isDeleted(testContent.id)) throw new Error('Tombstone should mark item as deleted');
console.log('✓ Content deletion, cascade cleanup, and tombstone verified!');

// 2. Test Undo functionality
const undoSuccess = studioStore.undo();
if (!undoSuccess) throw new Error('Undo should succeed');

const restored = studioStore.getContentById(testContent.id);
if (!restored) throw new Error('Item should be restored after undo');
if (studioStore.isDeleted(testContent.id)) throw new Error('Tombstone should clear on undo');
console.log('✓ Undo restoration verified!');

// Clean up
studioStore.deleteItem(testContent.id);

// 3. Test Idea Deletion
const testIdea = studioStore.saveContentItem({
  title: 'Uji Coba Hapus Ide Backlog',
  type: 'idea',
  format: 'Flash News',
  pillar: 'Internet & Social Media',
});

console.log('3. Created test idea:', testIdea.id);
const deleteIdeaSuccess = studioStore.deleteItem(testIdea.id);
if (!deleteIdeaSuccess) throw new Error('deleteItem on idea should return true');
if (studioStore.getContentById(testIdea.id)) throw new Error('Idea should no longer exist');
console.log('✓ Idea deletion verified!');

// 4. Test Research Source Deletion
const testSource = studioStore.saveSource({
  source_title: 'Sumber Uji Coba Hapus',
  claim: 'Klaim uji coba',
  verification_status: 'Belum Dicek',
});
const deleteSourceSuccess = studioStore.deleteSource(testSource.id);
if (!deleteSourceSuccess) throw new Error('deleteSource should return true');
const sourcesAfter = studioStore.getSources().find((s) => s.id === testSource.id);
if (sourcesAfter) throw new Error('Source should no longer exist');
console.log('✓ Research source deletion verified!');

// 5. Test Media Asset Deletion
const testAsset = studioStore.saveAsset({
  asset_name: 'aset-test.png',
  asset_type: 'Screenshot',
  asset_status: 'Ready',
});
const deleteAssetSuccess = studioStore.deleteAsset(testAsset.id);
if (!deleteAssetSuccess) throw new Error('deleteAsset should return true');
const assetsAfter = studioStore.getAssets().find((a) => a.id === testAsset.id);
if (assetsAfter) throw new Error('Asset should no longer exist');
console.log('✓ Media asset deletion verified!');

// 6. Test Metric Deletion
const testMetric = studioStore.saveMetric({
  title: 'Metrik Test',
  views: 100,
  apv: 95,
  stayed_to_watch: 75,
});
const deleteMetricSuccess = studioStore.deleteMetric(testMetric.id);
if (!deleteMetricSuccess) throw new Error('deleteMetric should return true');
const metricsAfter = studioStore.getMetrics().find((m) => m.id === testMetric.id);
if (metricsAfter) throw new Error('Metric should no longer exist');
console.log('✓ Analytics metric deletion verified!');

console.log('=================================================');
console.log('ALL DELETE TESTS PASSED WITH 100% SUCCESS! ✓');
console.log('=================================================');
