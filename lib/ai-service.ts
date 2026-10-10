import { AiConfig, AiProvider, ContentItem, ResearchSource } from './types';
import { studioStore } from './storage';

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  models?: string[];
}

export interface AiGenerateResult {
  text: string;
  tokensUsed: number;
  costUsd: number;
  provider: AiProvider;
  model: string;
  isMock: boolean;
}

// Cost estimation per 1k tokens (input/output blended average)
const MODEL_PRICING: Record<string, number> = {
  'gemini-2.5-flash': 0.00015,
  'gemini-2.5-pro': 0.00125,
  'gpt-4o-mini': 0.0003,
  'gpt-4o': 0.005,
  'claude-3-5-haiku-latest': 0.0008,
  'claude-3-5-sonnet-latest': 0.006,
  'llama-3.3-70b-versatile': 0.00059,
  'llama-3.1-8b-instant': 0.00008,
  'deepseek/deepseek-r1': 0.0008,
};

const getApiBase = (): string => {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export async function checkProviderHealth(
  provider: AiProvider,
  apiKey: string,
  model?: string
): Promise<HealthCheckResult> {
  const start = Date.now();

  if (!apiKey || apiKey.trim() === '') {
    return {
      ok: false,
      latencyMs: 0,
      message: 'API Key belum diisi. Masukkan API key untuk menguji koneksi.',
    };
  }

  try {
    const res = await fetch(`${getApiBase()}/api/ai/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model }),
    });

    const data = await res.json();
    const latencyMs = Date.now() - start;

    return {
      ok: data.ok,
      latencyMs: data.latencyMs || latencyMs,
      message: data.message || (data.ok ? `Terkoneksi · Latensi ${latencyMs}ms` : 'Koneksi gagal'),
      models: data.models,
    };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: err.message || 'Gagal menghubungi server pengujian',
    };
  }
}

export async function fetchProviderModels(provider: AiProvider, apiKey: string): Promise<string[]> {
  if (!apiKey || apiKey.trim() === '') return [];

  try {
    const res = await fetch(`${getApiBase()}/api/ai/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    });
    const data = await res.json();
    if (data.models && Array.isArray(data.models)) {
      return data.models;
    }
  } catch {
    // Return fallback list
  }
  return [];
}

export async function generateWithTaskRouter(
  taskType: 'hook' | 'angles' | 'seamless_loop' | 'fact_check' | 'retention_insight',
  context: {
    title?: string;
    headline?: string;
    pillar?: string;
    format?: string;
    hook?: string;
    script_context?: string;
    script_payoff?: string;
    sources?: ResearchSource[];
    contentItem?: ContentItem;
  },
  onChunk?: (accumulatedText: string) => void
): Promise<AiGenerateResult> {
  const configs = studioStore.getAiConfigs();
  const activeConfig = configs.find((c) => c.isActive) || configs[0];

  // Order candidates: active config first if it has apiKey, followed by other configured providers
  const candidateConfigs = configs.filter((c) => c.apiKey && c.apiKey.trim().length > 0);
  candidateConfigs.sort((a, b) =>
    a.provider === activeConfig.provider ? -1 : b.provider === activeConfig.provider ? 1 : 0
  );

  const isReasoning = taskType === 'fact_check' || taskType === 'retention_insight';

  // Attempt generation with automatic failover across candidate providers
  for (const config of candidateConfigs) {
    const targetModel = isReasoning
      ? config.reasoningModel || config.defaultModel
      : config.fastModel || config.defaultModel;

    try {
      const res = await fetch(`${getApiBase()}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: config.apiKey,
          model: targetModel,
          taskType,
          context,
          temperature: config.temperature,
          systemPrompt: config.systemPrompt,
          stream: Boolean(onChunk),
        }),
        signal: AbortSignal.timeout(12000),
      });

      // On 429 (Rate Limit), 504 (Gateway Timeout), or provider failure, fail over to next provider
      if (!res.ok) {
        console.warn(
          `[AI Failover]: Provider "${config.provider}" returned HTTP ${res.status}. Attempting next available provider...`
        );
        continue;
      }

      if (onChunk && res.body) {
        // Stream reader
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          fullText += chunkStr;
          onChunk(fullText);
        }

        const tokensHeader = res.headers.get('x-tokens-used');
        const tokensUsed = tokensHeader
          ? parseInt(tokensHeader, 10)
          : Math.max(150, Math.round(fullText.length / 4));
        const cost = (tokensUsed / 1000) * (MODEL_PRICING[targetModel] || 0.0005);
        studioStore.trackAiUsage(config.provider, tokensUsed, cost);

        return {
          text: fullText,
          tokensUsed,
          costUsd: cost,
          provider: config.provider,
          model: targetModel,
          isMock: false,
        };
      } else {
        const data = await res.json();
        const cost = (data.tokensUsed / 1000) * (MODEL_PRICING[targetModel] || 0.0005);
        studioStore.trackAiUsage(config.provider, data.tokensUsed, cost);

        if (onChunk) {
          onChunk(data.text);
        }

        return {
          text: data.text,
          tokensUsed: data.tokensUsed,
          costUsd: cost,
          provider: config.provider,
          model: targetModel,
          isMock: false,
        };
      }
    } catch (err) {
      console.warn(`[AI Failover Exception]: Provider "${config.provider}" error:`, err);
      // Continue to next provider in failover chain
    }
  }

  // Graceful fallback generator (100% offline out-of-the-box)
  const fallbackModel = isReasoning
    ? activeConfig.reasoningModel || activeConfig.defaultModel
    : activeConfig.fastModel || activeConfig.defaultModel;

  const mockResult = generateIntelligentMock(taskType, context, activeConfig.provider, fallbackModel);

  // If streaming callback provided, simulate smooth streaming animation
  if (onChunk) {
    const words = mockResult.text.split(' ');
    let current = '';
    for (let i = 0; i < words.length; i++) {
      current += (i > 0 ? ' ' : '') + words[i];
      onChunk(current);
      await new Promise((r) => setTimeout(r, 12));
    }
  }

  return mockResult;
}

export async function generateWithTaskRouterStream(
  taskType: 'hook' | 'angles' | 'seamless_loop' | 'fact_check' | 'retention_insight',
  context: any,
  onChunk: (accumulatedText: string) => void
): Promise<AiGenerateResult> {
  return generateWithTaskRouter(taskType, context, onChunk);
}

function generateIntelligentMock(
  taskType: string,
  context: any,
  provider: AiProvider,
  model: string
): AiGenerateResult {
  let text = '';
  const tokens = 250;
  const cost = (tokens / 1000) * 0.00015;

  if (taskType === 'hook') {
    const title = context.title || 'Topik Digital';
    text = `Rekomendasi 3 Hook Pemikat (Detik 0-3, Zero Dead Air):

1. HOOK KONTRASTIF (Visual Split Screen):
   • On-Screen Text: "JANGAN KLIK LINK INI!"
   • Spoken Hook: "Satu klik ceroboh di link pesan ini bisa menguras seluruh saldo dompet digitalmu tanpa peringatan."
   • Timing: 0–3 detik (9 kata).

2. HOOK PERTANYAAN EMOSIONAL (Close-up Phone):
   • On-Screen Text: "${title.toUpperCase().replace(/\?$/, '')}?"
   • Spoken Hook: "Pernah merasa ponselmu tiba-tiba bekerja aneh saat baru membuka satu aplikasi baru?"
   • Timing: 0–3 detik (11 kata).

3. HOOK FAKTA RESMI (Highlight Dokumen):
   • On-Screen Text: "RESMI DIUBAH HARI INI!"
   • Spoken Hook: "Pengumuman resmi pagi ini mengubah cara jutaan pengguna memakai aplikasi harian mereka."
   • Timing: 0–3 detik (10 kata).`;
  } else if (taskType === 'seamless_loop') {
    const hook = context.hook || 'pertanyaan awal video ini';
    text = `Rekomendasi Seamless Loop & Smart CTA:

[Opsi 1: Endless Loop]
"Jadi kalau kamu masih bertanya-tanya, itulah alasan utama kenapa..." (Transisi mulus menyambung ke kalimat pembuka: "${hook.slice(0, 40)}...")

[Opsi 2: Actionable Quick CTA]
"Buka menu setelan ponselmu sekarang, periksa apakah fitur ini aktif, dan simpan video ini agar tidak lupa langkahnya."`;
  } else if (taskType === 'fact_check') {
    const sources = context.sources || [];
    const sourceCount = sources.length;
    text = `Hasil Audit Verifikasi Fakta Naskah:

• Total Sumber Terdaftar: ${sourceCount} rujukan
• Status Kelayakan: ${sourceCount > 0 ? 'Dapat Diproses dengan Catatan' : 'PERINGATAN: Belum Ada Sumber Resmi'}

Temuan Audit:
1. Keselarasan Klaim: Kalimat pada Bagian Payoff harus merujuk angka resmi yang tertera pada kutipan bukti (bukan perkiraan).
2. Peringatan Rumor: Pastikan tidak menyebut fitur ini 'pasti dirilis' jika status dokumen sumber masih bertanda 'Perlu Konfirmasi'.
3. Tanggal Kadaluwarsa: Selalu cantumkan tahun rilis (2026) agar penonton tidak mengira ini pembaruan versi lama.`;
  } else if (taskType === 'angles') {
    const topic = context.headline || 'Topik Tren';
    text = `3 Sudut Pandang Konten (Content Angles):

1. FLASH NEWS (20–30s):
   • Judul: "Apa Fitur Baru yang Resmi Dirilis Hari Ini?"
   • Hook: "Satu pembaruan penting baru saja mendarat di ponselmu."
   • Nilai: Penonton tahu update tercepat tanpa membaca artikel panjang.

2. QUICK BREAKDOWN (30–45s):
   • Judul: "Kenapa Perubahan Ini Menguntungkan Pengguna?"
   • Hook: "Mari bedah satu poin penting yang luput dari perhatian banyak orang."
   • Nilai: Memahami mekanisme kerja di balik layar secara visual.

3. ACTIONABLE TIP (45–60s):
   • Judul: "Bagaimana Cara Mengaktifkan Fitur Baru Tersebut?"
   • Hook: "Tiga ketukan cepat untuk mencoba fitur ini sekarang juga."
   • Nilai: Langkah praktis yang langsung bisa dicoba.`;
  } else {
    text = `Evaluasi Retensi & Eksperimen:
Target Viewed >= 70% dan APV 90–110% tercapai paling konsisten ketika teks overlay pada detik 0-3 diletakkan presisi di area aman tengah (60%) dengan font berbobot tebal dan warna kontras tinggi (kuning/cyan). Hindari menaruh teks di 15% area atas atau 25% area bawah antarmuka Shorts.`;
  }

  return {
    text,
    tokensUsed: tokens,
    costUsd: cost,
    provider,
    model,
    isMock: true,
  };
}
