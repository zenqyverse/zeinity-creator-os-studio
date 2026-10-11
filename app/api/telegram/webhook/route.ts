import { NextResponse } from 'next/server';
import { evaluateIdeaSuitability } from '../../../../lib/ai-service';
import { studioStore } from '../../../../lib/storage';
import { queueTelegramIdea } from '../../../../lib/telegram-queue';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID;

async function sendTelegramMessage(chatId: string, text: string) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat?.id?.toString();
    if (!chatId) return NextResponse.json({ ok: true });

    // Protect webhook
    const envOwnerId = TELEGRAM_OWNER_CHAT_ID;
    const headerOwnerId = req.headers.get('x-telegram-owner-id');
    const ownerId = envOwnerId || headerOwnerId;
    if (ownerId && chatId !== ownerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Handle Photos/Screenshots with captions
    let text = message.text || message.caption || '';
    let photoUrl = '';
    
    // Check if there's a photo attachment (just use mock or dummy URL since we don't fetch file from telegram API here)
    if (message.photo && message.photo.length > 0) {
       photoUrl = 'https://api.telegram.org/file/bot' + TELEGRAM_TOKEN + '/photo_path_mock';
    }

    if (!text && !photoUrl) return NextResponse.json({ ok: true });

    if (text.startsWith('/start')) {
      await sendTelegramMessage(chatId, "Welcome to Zeinity Creator Studio Telegram Gateway. Send me an idea or link, or use /idea [topic].");
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/ping')) {
      await sendTelegramMessage(chatId, "Pong! Zeinity Creator Studio connected.");
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/status')) {
      const rawIdeasCount = studioStore.getIdeas().filter(i => i.is_raw).length;
      const pipelineCount = studioStore.getContentItems().filter(c => c.status !== 'Terbit').length;
      await sendTelegramMessage(chatId, `Studio Status: ${rawIdeasCount} raw ideas in inbox, ${pipelineCount} active items in pipeline.`);
      return NextResponse.json({ ok: true });
    }

    let ideaText = text || 'Photo Idea';
    if (text.startsWith('/idea')) {
      ideaText = text.replace('/idea', '').trim();
      if (!ideaText && !photoUrl) {
         await sendTelegramMessage(chatId, "Please provide a topic after /idea.");
         return NextResponse.json({ ok: true });
      }
      if (!ideaText && photoUrl) {
         ideaText = 'Photo Idea';
      }
    }

    const { viability_score, ai_recommended_pillar, ai_recommended_format } = await evaluateIdeaSuitability(ideaText);

    const savedIdea = studioStore.saveContentItem({
      type: 'idea',
      title: ideaText,
      source: 'telegram',
      source_url: photoUrl, // Store photo mock URL here
      notes: photoUrl ? 'Attached image from Telegram' : '',
      viability_score,
      ai_recommended_pillar,
      ai_recommended_format,
      is_raw: true,
      visual_readiness: 'Belum dicek',
      priority: 'Sedang'
    });

    queueTelegramIdea(savedIdea);
    
    await sendTelegramMessage(chatId, `Idea saved! Score: ${viability_score}. Pillar: ${ai_recommended_pillar}. Format: ${ai_recommended_format}.`);
    
    return NextResponse.json({ ok: true, saved: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
