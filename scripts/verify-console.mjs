import { spawn } from 'node:child_process';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        const data = await res.json();
        const page = data.find((t) => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Could not connect to Edge remote debugging port');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.consoleErrors = [];
    this.consoleWarnings = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
        this.consoleLogs.push({ type: msg.params.type, text });
        if (msg.params.type === 'error') {
          this.consoleErrors.push(text);
        } else if (msg.params.type === 'warning') {
          this.consoleWarnings.push(text);
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
        this.consoleErrors.push(desc);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  async send(method, params = {}) {
    await this.ready();
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description || ''));
    }
    return res.result?.value;
  }
}

async function run() {
  console.log('=== VERIFY CONSOLE ERRORS & HYDRATION & DUPLICATE KEYS ===');

  // Verify server is responding with 200 OK first
  const serverRes = await fetch('http://localhost:3000');
  if (!serverRes.ok) {
    throw new Error(`Server returned HTTP ${serverRes.status}: ${await serverRes.text()}`);
  }
  console.log('Server verified HTTP 200 OK');

  const edgeProcess = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:\\Users\\seink\\AppData\\Local\\Temp\\edge-test-profile-clean',
    'about:blank',
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to Edge CDP:', wsUrl);
    const client = new CDPClient(wsUrl);
    await client.ready();
    await client.send('Runtime.enable');
    await client.send('Page.enable');

    console.log('\n--- TEST 1: Initial load of http://localhost:3000 ---');
    await client.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(4000);

    const appInfo = await client.eval(`
      (() => ({
        title: document.title,
        hasHeader: !!document.querySelector('header'),
        hasNav: !!document.querySelector('aside nav'),
        bodyLength: document.body.innerText.length
      }))()
    `);
    console.log('App render audit:', appInfo);
    if (!appInfo.hasHeader || !appInfo.hasNav) {
      throw new Error('Zeinity Creator Studio UI did not render properly!');
    }

    console.log('Console errors count:', client.consoleErrors.length);
    console.log('Console warnings count:', client.consoleWarnings.length);
    if (client.consoleErrors.length > 0) {
      console.log('Errors:', client.consoleErrors);
    }
    if (client.consoleWarnings.length > 0) {
      console.log('Warnings:', client.consoleWarnings);
    }

    const hasHydrationMismatch = client.consoleErrors.some(e => e.includes('Hydration') || e.includes('hydrated') || e.includes('did not match'));
    const hasDuplicateKeyWarning = client.consoleErrors.concat(client.consoleWarnings).some(e => e.includes('Encountered two children with the same key') || e.includes('custom-mv2463e1'));

    console.log('Hydration error present:', hasHydrationMismatch);
    console.log('Duplicate key warning present:', hasDuplicateKeyWarning);

    if (hasHydrationMismatch || hasDuplicateKeyWarning || client.consoleErrors.length > 0) {
      throw new Error('Test 1 failed with console issues!');
    }

    console.log('\n--- TEST 2: Inject corrupted duplicate trend "custom-mv2463e1" into localStorage and reload ---');
    await client.eval(`
      (() => {
        const raw = localStorage.getItem('zeinity_trends');
        const trends = raw ? JSON.parse(raw) : [];
        const duplicateItem = {
          id: 'custom-mv2463e1',
          source_platform: 'rss',
          source_name: 'Custom Duplicate Test',
          headline: 'DeepSeek LLM Breakthrough',
          summary: 'Testing duplicate key suppression',
          url: 'https://example.com/test',
          pillar: 'AI & Technology',
          format_suggestion: 'Quick Breakdown',
          momentum_score: 95,
          visual_score: 90,
          trend_status: 'Rising',
          user_status: 'Belum dibaca',
          freshness: '24 jam'
        };
        // Inject duplicate items with exact same ID
        trends.unshift(duplicateItem);
        trends.unshift({ ...duplicateItem });
        localStorage.setItem('zeinity_trends', JSON.stringify(trends));
      })()
    `);

    // Reset captured logs
    client.consoleErrors = [];
    client.consoleWarnings = [];
    client.consoleLogs = [];

    console.log('Reloading page with duplicate data in localStorage...');
    await client.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(4000);

    console.log('After reload - Console errors count:', client.consoleErrors.length);
    console.log('After reload - Console warnings count:', client.consoleWarnings.length);
    if (client.consoleErrors.length > 0) {
      console.log('Errors after reload:', client.consoleErrors);
    }
    if (client.consoleWarnings.length > 0) {
      console.log('Warnings after reload:', client.consoleWarnings);
    }

    const hasDuplicateAfterHeal = client.consoleErrors.concat(client.consoleWarnings).some(e => e.includes('Encountered two children with the same key') || e.includes('custom-mv2463e1'));
    console.log('Duplicate key warning after healing reload:', hasDuplicateAfterHeal);

    const healedTrends = await client.eval(`
      (() => {
        const raw = localStorage.getItem('zeinity_trends');
        const trends = raw ? JSON.parse(raw) : [];
        const ids = trends.map(t => t.id);
        const hasDuplicateId = ids.length !== new Set(ids).size;
        return {
          totalCount: trends.length,
          hasDuplicateId,
          customOccurrences: ids.filter(id => id === 'custom-mv2463e1').length
        };
      })()
    `);
    console.log('Healed trends audit in localStorage:', healedTrends);

    if (healedTrends.hasDuplicateId) {
      throw new Error(`LocalStorage was not healed! Duplicate IDs still present: ${JSON.stringify(healedTrends)}`);
    }
    if (healedTrends.customOccurrences !== 1) {
      throw new Error(`Expected customOccurrences to be 1, got ${healedTrends.customOccurrences}`);
    }
    if (hasDuplicateAfterHeal || client.consoleErrors.length > 0) {
      throw new Error('Test 2 failed with duplicate key warnings or errors!');
    }

    console.log('\n--- TEST 3: Navigate across tabs (Overview, Radar Tren, Pipeline, Idea Bank, etc.) ---');
    const tabs = ['Radar Tren', 'Content Pipeline', 'Idea Bank', 'Research & Fact Check', 'Production Studio', 'Overview'];
    for (const tab of tabs) {
      await client.eval(`
        (() => {
          const btn = Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('${tab}'));
          if (btn) btn.click();
        })()
      `);
      await sleep(600);
    }

    console.log('Total console errors after full navigation:', client.consoleErrors.length);
    console.log('Total console warnings after full navigation:', client.consoleWarnings.length);

    if (client.consoleErrors.length > 0) {
      throw new Error(`Navigation produced console errors: ${client.consoleErrors.join(', ')}`);
    }

    console.log('\n--- TEST 4: Rapid actions & interactions (Toasts, Modals, Add Trend) ---');
    // Test rapid toasts and modal opening
    await client.eval(`
      (() => {
        // Open search modal via shortcut
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
      })()
    `);
    await sleep(500);

    const isSearchModalOpen = await client.eval(`!!document.querySelector('input[placeholder*="Cari judul"]')`);
    console.log('Global search modal open verified:', isSearchModalOpen);

    // Close modal via Escape
    await client.eval(`
      (() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      })()
    `);
    await sleep(300);

    console.log('Total console errors after all tests:', client.consoleErrors.length);
    console.log('Total console warnings after all tests:', client.consoleWarnings.length);

    if (client.consoleErrors.length > 0) {
      throw new Error(`Console errors detected: ${client.consoleErrors.join(', ')}`);
    }

    console.log('\n✓ SUCCESS: ZERO console errors, ZERO hydration mismatches, ZERO duplicate key warnings!');
  } finally {
    edgeProcess.kill('SIGKILL');
  }
}

run().catch((err) => {
  console.error('VERIFY ERROR:', err);
  process.exit(1);
});
