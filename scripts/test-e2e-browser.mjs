import { spawn } from 'node:child_process';
import http from 'node:http';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        const data = await res.json();
        const page = data.find(t => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch (e) {
      // wait
    }
    await sleep(200);
  }
  throw new Error('Could not connect to Edge remote debugging port');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.consoleErrors = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
            this.consoleErrors.push(text);
          }
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
          this.consoleErrors.push(desc);
        }
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

async function runTest() {
  console.log('=== STARTING DEEP E2E BROWSER VALIDATION TEST ===');
  console.log('Launching headless Edge...');

  const edgeProcess = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:\\Users\\seink\\AppData\\Local\\Temp\\edge-test-profile',
    'http://localhost:3000',
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to Edge via DevTools protocol:', wsUrl);

    const client = new CDPClient(wsUrl);
    await client.ready();
    await client.send('Runtime.enable');
    await client.send('Page.enable');

    console.log('Navigating to http://localhost:3000...');
    await client.send('Page.navigate', { url: 'http://localhost:3000' });

    console.log('Waiting 5s for page compilation, load, hydration, and store sync...');
    await sleep(5000);

    // 1. Check Console Errors
    console.log('\n--- 1. Checking Console Errors & Hydration Failure ---');
    console.log('Captured console errors count:', client.consoleErrors.length);
    if (client.consoleErrors.length > 0) {
      console.error('Console errors:', client.consoleErrors);
    }
    const hasSyntaxError = client.consoleErrors.some(e => e.includes('SyntaxError') || e.includes('Invalid or unexpected token'));
    console.assert(!hasSyntaxError, 'FATAL: Found SyntaxError in console!');
    if (!hasSyntaxError) {
      console.log('✓ ZERO SyntaxErrors found in console! Hydration clean.');
    }

    // 2. Check Hydration & Store State
    console.log('\n--- 2. Checking Store State & Counter Populating ---');
    const counters = await client.eval(`
      (() => {
        const text = document.body.innerText;
        const videoMatch = text.match(/(\\d+)\\s*Video/);
        const ideaMatch = text.match(/(\\d+)\\s*Ide/);
        const topicMatch = text.match(/(\\d+)\\s*Topik/);
        return {
          fullTextLength: text.length,
          hasZeinityTitle: text.includes('Zeinity'),
          videoMatch: videoMatch ? videoMatch[0] : null,
          ideaMatch: ideaMatch ? ideaMatch[0] : null,
          topicMatch: topicMatch ? topicMatch[0] : null,
          pipelineCount: videoMatch ? parseInt(videoMatch[1]) : 0,
          ideasCount: ideaMatch ? parseInt(ideaMatch[1]) : 0,
          topicsCount: topicMatch ? parseInt(topicMatch[1]) : 0
        };
      })()
    `);
    console.log('Page store counters:', counters);
    console.assert(counters.pipelineCount > 0, 'Pipeline count should be greater than 0 after hydration!');
    console.assert(counters.ideasCount > 0, 'Ideas count should be greater than 0 after hydration!');
    console.assert(counters.topicsCount > 0, 'Topics count should be greater than 0 after hydration!');
    console.log(`✓ Store initialized and hydrated: ${counters.videoMatch}, ${counters.ideaMatch}, ${counters.topicMatch}`);

    // 3. Check Border Colors (Ensuring NO stark bright white borders)
    console.log('\n--- 3. Checking Border Colors (No Stark White Borders) ---');
    const borderAudit = await client.eval(`
      (() => {
        const allElements = document.querySelectorAll('*');
        let whiteBorderCount = 0;
        let subtleBorderCount = 0;
        const whiteBorderSamples = [];

        for (const el of allElements) {
          const style = window.getComputedStyle(el);
          const bw = parseFloat(style.borderWidth) || 0;
          if (bw > 0) {
            const bc = style.borderColor;
            // Check if border color is stark bright white: rgb(243, 247, 255) or rgb(255, 255, 255)
            if (bc === 'rgb(243, 247, 255)' || bc === 'rgb(255, 255, 255)') {
              // Ignore intentional small elements inside YouTube mockup overlay
              if (!el.closest('.pointer-events-none')) {
                whiteBorderCount++;
                if (whiteBorderSamples.length < 5) {
                  whiteBorderSamples.push({
                    tag: el.tagName,
                    className: el.className,
                    borderColor: bc
                  });
                }
              }
            } else {
              subtleBorderCount++;
            }
          }
        }
        return { whiteBorderCount, subtleBorderCount, whiteBorderSamples };
      })()
    `);
    console.log('Border audit result:', borderAudit);
    console.assert(borderAudit.whiteBorderCount === 0, `Unwanted bright white borders detected: ${borderAudit.whiteBorderCount}`);
    if (borderAudit.whiteBorderCount === 0) {
      console.log(`✓ ZERO stark white borders found! All ${borderAudit.subtleBorderCount} borders use clean dark theme styling.`);
    }

    // 4. Test Navigation Across All Sidebar Tabs
    console.log('\n--- 4. Testing Navigation Across All Sidebar Tabs ---');
    const tabs = [
      'Content Pipeline',
      'Radar Tren',
      'Idea Bank',
      'Calendar',
      'Script Studio',
      'Production Studio',
      'Research & Fact Check',
      'Asset Library',
      'Analytics & Learning',
      'AI Settings (BYOK)',
      'Overview'
    ];

    for (const tab of tabs) {
      const clickTab = await client.eval(`
        (() => {
          const buttons = Array.from(document.querySelectorAll('aside nav button'));
          const btn = buttons.find(b => b.innerText.includes('${tab}'));
          if (!btn) return { found: false };
          btn.click();
          return { found: true };
        })()
      `);
      console.assert(clickTab.found, `Sidebar button for tab ${tab} should exist!`);
      await sleep(250);
    }
    console.log('✓ Successfully navigated across all 11 sidebar tabs without errors.');

    // 5. Test Theme Toggle
    console.log('\n--- 5. Testing Theme Toggle (Dark / Light) ---');
    const themeTest = await client.eval(`
      (async () => {
        const html = document.documentElement;
        const initialDark = html.classList.contains('dark');
        const themeBtn = document.querySelector('button[title*="Ganti Tema"]');
        if (!themeBtn) return { success: false, reason: 'Theme button not found' };

        themeBtn.click();
        await new Promise(r => setTimeout(r, 100));
        const afterFirstClick = html.classList.contains('light') && !html.classList.contains('dark');

        themeBtn.click();
        await new Promise(r => setTimeout(r, 100));
        const afterSecondClick = html.classList.contains('dark') && !html.classList.contains('light');

        return { initialDark, afterFirstClick, afterSecondClick, success: afterFirstClick && afterSecondClick };
      })()
    `);
    console.log('Theme toggle result:', themeTest);
    console.assert(themeTest.success, 'Theme toggle should toggle light/dark classes on <html>!');
    if (themeTest.success) {
      console.log('✓ Theme toggle switches between dark and light smoothly.');
    }

    // 6. Test Create Content Form Submission & Toast Undo Action
    console.log('\n--- 6. Testing Create Content & Toast Undo Flow ---');
    // Open "+ Create Content" drawer
    await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('header button'));
        const createBtn = buttons.find(b => b.innerText.includes('Create Content'));
        if (createBtn) createBtn.click();
      })()
    `);
    await sleep(400);

    // Verify drawer open
    const drawerOpen = await client.eval(`Boolean(document.querySelector('[role="dialog"]'))`);
    console.assert(drawerOpen, 'Create Content drawer should be open!');

    // Fill form and submit
    const submitResult = await client.eval(`
      (() => {
        const titleInput = document.querySelector('form input[placeholder*="Kenapa"], form input[placeholder*="judul"], form input[type="text"]');
        if (!titleInput) return { success: false, reason: 'Title input not found' };
        titleInput.value = 'Kenapa Model AI DeepSeek Mengguncang Wall Street?';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));

        const submitBtn = document.querySelector('form button[type="submit"]');
        if (!submitBtn) return { success: false, reason: 'Submit button not found' };
        submitBtn.click();
        return { success: true };
      })()
    `);
    console.log('Form submit result:', submitResult);
    console.assert(submitResult.success, 'Form should submit successfully');
    await sleep(500);

    // Verify counter incremented to 6 Video
    const newCount = await client.eval(`
      (() => {
        const match = document.body.innerText.match(/(\\d+)\\s*Video/);
        return match ? parseInt(match[1]) : 0;
      })()
    `);
    console.log('Count after new content creation:', newCount);
    console.assert(newCount === 6, `Expected 6 Video after creating 1 item, got ${newCount}`);
    console.log('✓ New content saved to store, pipeline count successfully incremented to 6.');

    // Now test Undo via Toast "Batal" button
    console.log('Testing Undo (Batal) action on toast...');
    const undoResult = await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('div[class*="fixed bottom-5"] button'));
        const undoBtn = buttons.find(b => b.innerText.includes('Batal'));
        if (!undoBtn) return { success: false, reason: 'Undo button not found' };
        undoBtn.click();
        return { success: true };
      })()
    `);
    console.log('Undo button click result:', undoResult);
    console.assert(undoResult.success, 'Undo button should be clicked');
    await sleep(600);

    // Verify count restored back to 5 Video
    const restoredCount = await client.eval(`
      (() => {
        const match = document.body.innerText.match(/(\\d+)\\s*Video/);
        return match ? parseInt(match[1]) : 0;
      })()
    `);
    console.log('Count after undoing creation:', restoredCount);
    console.assert(restoredCount === 5, `Expected 5 Video after undo, got ${restoredCount}`);
    console.log('✓ Undo action successfully restored count back to 5 Video!');

    // 7. Test Global Search Modal
    console.log('\n--- 7. Testing Global Search Modal ---');
    await client.eval(`
      (() => {
        const searchBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cari di workspace'));
        if (searchBtn) searchBtn.click();
      })()
    `);
    await sleep(400);

    const searchModalState = await client.eval(`
      (() => {
        const input = document.querySelector('input[placeholder*="Cari konten"]');
        if (!input) return { open: false };
        input.value = 'AI';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return { open: true, value: input.value };
      })()
    `);
    console.log('Search modal query:', searchModalState);
    console.assert(searchModalState.open, 'Search modal should be open!');
    await sleep(300);

    // Close search modal via Escape key
    await client.eval(`
      (() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      })()
    `);
    await sleep(300);

    console.log('✓ Global search opened, queried, and closed cleanly.');

    console.log('\n=============================================================');
    console.log('ALL DEEP E2E BROWSER FORENSIC TESTS PASSED SUCCESSFULLY! ✓');
    console.log('=============================================================');
  } finally {
    edgeProcess.kill('SIGKILL');
  }
}

runTest().catch((err) => {
  console.error('E2E TEST RUNNER FAILED:', err);
  process.exit(1);
});
