import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || process.env.TELEGRAM_BOT_TOKEN;
    const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;

    if (!token) {
      return NextResponse.json({
        configured: false,
        message: 'Telegram Bot Token belum dikonfigurasi.',
      });
    }

    // Call getMe to verify bot credentials
    const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: 'GET',
    });
    const getMeData = await getMeRes.json();

    if (!getMeData.ok) {
      return NextResponse.json({
        configured: false,
        error: getMeData.description || 'Token bot tidak valid.',
      });
    }

    // Call getWebhookInfo
    let webhookInfo = null;
    try {
      const whRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const whData = await whRes.json();
      if (whData.ok) {
        webhookInfo = whData.result;
      }
    } catch {
      // Ignore webhook fetch error
    }

    return NextResponse.json({
      configured: true,
      bot_id: getMeData.result.id,
      bot_name: getMeData.result.first_name,
      bot_username: getMeData.result.username,
      owner_chat_id_configured: !!ownerChatId,
      webhook_info: webhookInfo,
    });
  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      error: error.message || 'Gagal memeriksa status bot.',
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, token: customToken, webhook_url } = body;
    const token = customToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json({
        error: 'Telegram Bot Token diperlukan untuk operasi ini.',
      }, { status: 400 });
    }

    if (action === 'test_token') {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json({
          ok: false,
          error: data.description || 'Token bot tidak valid.',
        }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        bot: data.result,
      });
    }

    if (action === 'set_webhook') {
      if (!webhook_url) {
        return NextResponse.json({
          error: 'URL webhook publik harus diisi.',
        }, { status: 400 });
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhook_url,
          allowed_updates: ['message'],
          drop_pending_updates: false,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json({
          ok: false,
          error: data.description || 'Gagal mendaftarkan webhook ke Telegram.',
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        description: data.description,
        webhook_url,
      });
    }

    if (action === 'get_webhook_info') {
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = await res.json();
      return NextResponse.json({
        ok: data.ok,
        result: data.result,
        error: data.description,
      });
    }

    if (action === 'delete_webhook') {
      const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
        method: 'POST',
      });
      const data = await res.json();
      return NextResponse.json({
        ok: data.ok,
        description: data.description,
      });
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message || 'Terjadi kesalahan pada server.',
    }, { status: 500 });
  }
}
