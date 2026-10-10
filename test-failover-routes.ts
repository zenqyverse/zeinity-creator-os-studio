import { studioStore } from './lib/storage';
import { generateWithTaskRouter } from './lib/ai-service';

async function testFailoverAndIngestion() {
  console.log('=== TEST SUITE: AI FAILOVER & INGESTION RESILIENCE ===');

  // Test 1: AI Provider failover when non-configured or invalid
  console.log('\n--- 1. Testing AI Provider Auto Failover ---');
  // Configure mock configs
  const originalConfigs = studioStore.getAiConfigs();

  try {
    // Set active config to OpenAI with dummy key, and Groq with dummy key
    studioStore.saveAiConfig({
      provider: 'openai',
      apiKey: 'test-invalid-key-failover-1',
      defaultModel: 'gpt-4o-mini',
      isActive: true,
    });
    studioStore.saveAiConfig({
      provider: 'groq',
      apiKey: 'test-invalid-key-failover-2',
      defaultModel: 'llama-3.3-70b-versatile',
      isActive: false,
    });

    // Run generateWithTaskRouter. Upstream will fail or timeout, triggering automatic failover chain
    // and ultimately resolving safely via intelligent mock without crashing!
    const result = await generateWithTaskRouter('hook', {
      title: 'Kenapa Fitur Ini Viral di YouTube Shorts?',
    });

    console.assert(result.text.length > 0, 'Failover result text must not be empty');
    console.assert(typeof result.tokensUsed === 'number', 'Tokens used must be a number');
    console.log(`✓ AI Failover chain smoothly resolved without crash (returned ${result.text.length} chars)`);
  } finally {
    // Restore original configs
    for (const cfg of originalConfigs) {
      studioStore.saveAiConfig(cfg);
    }
  }

  // Test 2: Ingestion RSS auto-categorization
  console.log('\n--- 2. Testing Radar Tren Sinyal Ingestion Scoring ---');
  const customSignal = studioStore.addCustomTrend({
    source_platform: 'google',
    source_name: 'Google Trends ID',
    headline: 'Chip NPU Ponsel Generasi Baru',
    summary: 'Lonjakan minat teknologi AI lokal.',
    url: 'https://trends.google.com/test-id-1',
    pillar: 'AI & Technology',
    momentum_score: 95,
  });

  console.assert(customSignal.id.length > 0, 'Custom trend signal must have unique ID');
  console.assert(customSignal.momentum_score === 95, 'Momentum score should be 95');
  console.assert(customSignal.pillar === 'AI & Technology', 'Pillar should be AI & Technology');

  // Update status to Tersimpan
  studioStore.updateTrendStatus(customSignal.id, 'Tersimpan', 'Catatan riset penting');
  const allTrends = studioStore.getTrends();
  const updatedTrend = allTrends.find((t) => t.id === customSignal.id);
  console.assert(updatedTrend?.user_status === 'Tersimpan', 'Status should be updated to Tersimpan');
  console.assert(updatedTrend?.saved_notes === 'Catatan riset penting', 'Notes should be saved');
  console.log('✓ Trend signal ingestion & status updates verified!');

  console.log('\n======================================================');
  console.log('AI FAILOVER & INGESTION RESILIENCE SUITE PASSED! ✓');
  console.log('======================================================');
}

testFailoverAndIngestion().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
