import fs from 'node:fs';
import path from 'node:path';

function scan(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      scan(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('className=')) {
          // Find tokens
          const tokens = line.split(/[\s"'{`]+/);
          for (const token of tokens) {
            if (['border', 'border-t', 'border-b', 'border-l', 'border-r', 'border-y', 'border-x', 'border-2'].includes(token)) {
              const hasColor = tokens.some(t =>
                t.startsWith('border-z') ||
                t.startsWith('border-red') ||
                t.startsWith('border-amber') ||
                t.startsWith('border-emerald') ||
                t.startsWith('border-rose') ||
                t.startsWith('border-cyan') ||
                t.startsWith('border-purple') ||
                t.startsWith('border-blue') ||
                t.startsWith('border-transparent') ||
                t.startsWith('border-white') ||
                t.startsWith('border-zinc') ||
                t.startsWith('border-slate') ||
                t.startsWith('border-neutral') ||
                t.startsWith('border-gray')
              );
              if (!hasColor) {
                console.log(`${f}:${i + 1} uses "${token}" without color: ${line.trim()}`);
              }
            }
          }
        }
      }
    }
  }
}

scan('./components');
scan('./app');
