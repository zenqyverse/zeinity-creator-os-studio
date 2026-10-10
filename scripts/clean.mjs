import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const nextDir = path.join(projectRoot, '.next');

try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    console.log('[clean] Stale .next cache removed successfully.');
  }
} catch (err) {
  console.error('[clean] Error: Failed to remove .next cache:', err.message);
  console.error('[clean] Another process (e.g. a running Next.js dev server or terminal) might be locking files in .next.');
  console.error('[clean] Please terminate any running Node/Next.js processes and try again.');
  process.exit(1);
}
