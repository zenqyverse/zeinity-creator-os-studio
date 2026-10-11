import { NextResponse } from 'next/server';
import { evaluateIdeaSuitability } from '../../../../lib/ai-service';
import { studioStore } from '../../../../lib/storage';
import { queueTelegramIdea } from '../../../../lib/telegram-queue';

// Keep track of the last processed Telegram update ID in memory
const globalOffset = global as unknown as { __telegramLastUpdateId?: number };
if (typeof globalOffset.__telegramLastUpdateId === 'undefined') {
  globalOffset.__telegramLastUpdateId = 0;
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || process.env.TELEGRAM_BOT_TOKEN;
    const ownerId = body.owner_chat_id || process.env.TELEGRAM_OWNER_CHAT_ID;

    if (!token) {
      return NextResponse.json({
        ok: false,
        error: 'Telegram Bot Token belum diisi.',
      }, { status: 400 });
    }

    const currentOffset = (globalOffset.__telegramLastUpdateId || 0) + 1;

    // Call getUpdates from Telegram
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${currentOffset}&timeout=0&limit=20`
    );
    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({
        ok: false,
        error: data.description || 'Gagal memanggil getUpdates dari Telegram.',
      }, { status: 400 });
    }

    const updates = data.result || [];
    let processedCount = 0;
    const processedIdeas: string[] = [];

    for (const update of updates) {
      if (update.update_id) {
        globalOffset.__telegramLastUpdateId = Math.max(
          globalOffset.__telegramLastUpdateId || 0,
          update.update_id
        );
      }

      const message = update.message;
      if (!message) continue;

      const chatId = message.chat?.id?.toString();
      if (!chatId) continue;

      // Anti-spam whitelist check
      if (ownerId && chatId !== ownerId.toString()) {
        await sendTelegramMessage(
          token,
          chatId,
          'Akses ditolak: Akun Telegram Anda tidak terdaftar sebagai Owner studio ini.'
        );
        continue;
      }

      let text = (message.text || message.caption || '').trim();
      let photoUrl = '';

      if (message.photo && message.photo.length > 0) {
        photoUrl = `https://api.telegram.org/file/bot${token}/photo_mock`;
      }

      if (!text && !photoUrl) continue;

      // Handle slash commands
      if (text.startsWith('/start')) {
        await sendTelegramMessage(
          token,
          chatId,
          'Selamat datang di Zeinity Studio Bot! Kirim teks ide, link artikel/video, atau foto screenshot untuk langsung masuk ke Bank Ide Studio.'
        );
        continue;
      }

      if (text.startsWith('/ping')) {
        await sendTelegramMessage(token, chatId, 'Pong! Zeinity Creator Studio terhubung.');
        continue;
      }

      if (text.startsWith('/status')) {
        const rawIdeasCount = studioStore.getIdeas().filter((i) => i.is_raw).length;
        const pipelineCount = studioStore.getContentItems().filter((c) => c.status !== 'Terbit').length;
        await sendTelegramMessage(
          token,
          chatId,
          `Status Studio: ${rawIdeasCount} ide di Inbox Mentah, ${pipelineCount} proyek aktif di Pipeline.`
        );
        continue;
      }

      let ideaText = text || 'Ide Gambar Telegram';
      if (text.startsWith('/idea')) {
        ideaText = text.replace('/idea', '').trim();
        if (!ideaText && !photoUrl) {
          await sendTelegramMessage(token, chatId, 'Silakan tulis topik ide setelah perintah /idea.');
          continue;
        }
        if (!ideaText && photoUrl) {
          ideaText = 'Ide Gambar Telegram';
        }
      }

      // AI evaluation
      const { viability_score, ai_recommended_pillar, ai_recommended_format } =
        await evaluateIdeaSuitability(ideaText);

      const savedIdea = studioStore.saveContentItem({
        type: 'idea',
        title: ideaText,
        source: 'telegram',
        source_url: photoUrl,
        notes: photoUrl ? 'Foto dilampirkan via Telegram' : '',
        viability_score,
        ai_recommended_pillar,
        ai_recommended_format,
        is_raw: true,
        visual_readiness: 'Belum dicek',
        priority: 'Sedang',
      });

      queueTelegramIdea(savedIdea);
      processedCount++;
      processedIdeas.push(ideaText);

      await sendTelegramMessage(
        token,
        chatId,
        `Ide berhasil disimpan ke Studio!\nSkor Kelayakan: ${viability_score}/100\nPilar: ${ai_recommended_pillar}\nFormat: ${ai_recommended_format}`
      );
    }

    return NextResponse.json({
      ok: true,
      processed_count: processedCount,
      ideas: processedIdeas,
      last_update_id: globalOffset.__telegramLastUpdateId,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message || 'Terjadi kesalahan saat polling Telegram.',
    }, { status: 500 });
  }
}
