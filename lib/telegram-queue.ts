import { ContentItem } from './types';

// In-memory queue on the server for ideas ingested via Telegram Webhook
// Persists ideas between webhook arrival and client frontend fetch/sync
const globalQueue = global as unknown as { __telegramIdeaQueue?: ContentItem[] };
if (!globalQueue.__telegramIdeaQueue) {
  globalQueue.__telegramIdeaQueue = [];
}

export function queueTelegramIdea(idea: ContentItem): void {
  if (!globalQueue.__telegramIdeaQueue) {
    globalQueue.__telegramIdeaQueue = [];
  }
  globalQueue.__telegramIdeaQueue.unshift(idea);
  // Keep queue reasonable size
  if (globalQueue.__telegramIdeaQueue.length > 100) {
    globalQueue.__telegramIdeaQueue = globalQueue.__telegramIdeaQueue.slice(0, 100);
  }
}

export function getQueuedTelegramIdeas(): ContentItem[] {
  return globalQueue.__telegramIdeaQueue ? [...globalQueue.__telegramIdeaQueue] : [];
}

export function clearQueuedTelegramIdeas(): void {
  globalQueue.__telegramIdeaQueue = [];
}
