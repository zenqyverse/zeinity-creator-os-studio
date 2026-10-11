import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, apiKey, model, taskType, context = {}, temperature, systemPrompt, stream } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const defaultSys =
      systemPrompt ||
      'Kamu adalah Zeinity Intelligence, asisten produksi konten multi-format (Shorts, Mid-Form, Long-Form) kanal Zeinity. Ringkas, akurat, berbasis data terverifikasi.';

    const rawTier = context.content_tier;
    const tier =
      rawTier === 'Long-Form' || rawTier === 'long'
        ? 'Long-Form'
        : rawTier === 'Mid-Form' || rawTier === 'mid'
        ? 'Mid-Form'
        : 'Shorts';

    const wordBudget =
      tier === 'Long-Form'
        ? '700–1250 kata'
        : tier === 'Mid-Form'
        ? '150–450 kata'
        : '50–140 kata';

    let userPrompt = '';
    if (taskType === 'hook') {
      userPrompt = `Buatkan 3 alternatif hook video (${tier}) untuk topik: "${context.title || context.headline}".
Aturan Zeinity:
- Zero dead air, langsung masuk inti, jangan gunakan salam klise ("Halo guys").
- Wajib ada keselarasan antara On-Screen Text (maksimal 4-6 kata) dan Spoken Hook (maksimal 10-15 kata).
- Formatkan jelas per alternatif.`;
    } else if (taskType === 'seamless_loop') {
      userPrompt = `Buatkan kalimat penutup dengan teknik Seamless Loop atau Smart CTA yang menyambung secara mulus kembali ke pembuka naskah:
Pembuka: "${context.hook || context.title}"
Konteks: "${context.script_context || ''}"
Payoff: "${context.script_payoff || ''}"
Tier: ${tier}
Buatkan 1 versi Seamless Loop dan 1 versi Smart CTA langsung.`;
    } else if (taskType === 'fact_check') {
      userPrompt = `Lakukan audit verifikasi fakta naskah (${tier}):
Judul: "${context.title}"
Naskah Hook: "${context.hook || ''}"
Naskah Payoff: "${context.script_payoff || ''}"
Rujukan Sumber: ${JSON.stringify(context.sources || [])}
Beri penilaian: apakah klaim didukung bukti sumber resmi? Apa potensi misinformasi atau klaim promosi berlebihan?`;
    } else if (taskType === 'retention_insight') {
      userPrompt = `Analisis performa retensi video (${tier}) kanal Zeinity:
Tolok Ukur Baku:
${
  tier === 'Long-Form'
    ? '- Target APV: 40% - 60%\n- Target Thumbnail CTR: 5% - 8% (Optimal), >8% (Top Performer)'
    : tier === 'Mid-Form'
    ? '- Target APV: 60% - 80%\n- Target Thumbnail CTR: 4% - 7%'
    : '- Viewed vs Swiped Away Target: >= 70%\n- Target APV: 90% - 110%'
}
Berdasarkan data performa dan eksperimen terkini:
1. Identifikasi korelasi gaya teks visual pembuka terhadap lonjakan retensi awal.
2. Analisis pola durasi dan retensi payoff di bagian tengah.
3. Berikan 3 rekomendasi taktis yang dapat langsung diterapkan pada naskah berikutnya.`;
    } else if (taskType === 'autonomous_research') {
      userPrompt = `Lakukan riset otonom untuk topik/URL: "${context.url || context.headline || context.title}".
Format Tier: ${tier} (Target Budget: ${wordBudget}).
Ekstrak kutipan verbatim penting, klasifikasikan status verifikasi (Terverifikasi, Perlu Konfirmasi, Kedaluwarsa, rumor flag), dan beri peringatan jika informasi lebih dari 6 bulan (stale).
Hasilkan draf naskah yang mematuhi batas kata ${wordBudget}, serta 3 opsi judul (5-10 kata yang memancing rasa penasaran) dan penutup loop/CTA.`;
    } else if (taskType === 'tighten_script') {
      userPrompt = `Pangkas kata-kata naskah ini agar sesuai budget durasi/kata tanpa kehilangan esensi teknis:
Hook: "${context.hook || ''}"
Context: "${context.script_context || ''}"
Payoff: "${context.script_payoff || ''}"
Ending: "${context.script_ending || ''}"
Tier Konten: ${tier}
WPM Target: ${context.target_wpm || 145}
Total target budget adalah ${wordBudget}.`;
    } else if (taskType === 'generate_titles') {
      if (tier === 'Long-Form' || tier === 'Mid-Form') {
        userPrompt = `Buatkan 3 opsi judul video ${tier} untuk topik: "${context.title || context.headline || ''}".
Aturan Judul ${tier}:
1. Terdiri dari 5 hingga 10 kata yang memancing rasa penasaran audiens (curiosity gap).
2. Tidak wajib menggunakan kata tanya (Apa/Kenapa/Bagaimana), tetapi harus kuat, informatif, dan memiliki daya tarik klik tinggi.
3. Boleh berupa pertanyaan atau pernyataan provokatif/analitis.`;
      } else {
        userPrompt = `Buatkan 3 opsi judul video Shorts untuk topik: "${context.title || context.headline || ''}".
Aturan Validator Judul Shorts:
1. Terdiri dari 5 hingga 10 kata yang memikat perhatian audiens.
2. Dianjurkan menggunakan pola pemikat rasa ingin tahu atau pertanyaan (diawali Apa, Kenapa, atau Bagaimana).
3. Diakhiri dengan tanda tanya (?) jika berupa pertanyaan.`;
      }
    } else {
      userPrompt = `Bantu susun 3 sudut pandang (content angles) untuk topik tren: "${context.headline}". Format disesuaikan dengan tier ${tier}.`;
    }

    let generatedText = '';
    let totalTokens = 200;

    // Dispatch with real upstream streaming support
    if (provider === 'gemini') {
      const isStreaming = Boolean(stream);
      const endpoint = isStreaming
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:streamGenerateContent?alt=sse&key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: defaultSys }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: temperature ?? 0.7,
            maxOutputTokens: 800,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Gemini error (${res.status}): ${res.statusText}` }, { status: res.status });
      }

      if (isStreaming && res.body) {
        const encoder = new TextEncoder();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readable = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const part = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (part) {
                        controller.enqueue(encoder.encode(part));
                      }
                    } catch {
                      // Skip invalid SSE JSON lines
                    }
                  }
                }
              }
              if (buffer.trim().startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(buffer.trim().slice(6));
                  const part = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (part) controller.enqueue(encoder.encode(part));
                } catch {
                  // Ignore trailing parse errors
                }
              }
            } catch (streamErr: any) {
              controller.error(streamErr);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Tokens-Used': '250',
          },
        });
      }

      const data = await res.json();
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      totalTokens = data.usageMetadata?.totalTokenCount || 250;
    } else if (provider === 'openai' || provider === 'groq' || provider === 'openrouter') {
      const endpoint =
        provider === 'groq'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';

      const isStreaming = Boolean(stream);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: defaultSys },
            { role: 'user', content: userPrompt },
          ],
          temperature: temperature ?? 0.7,
          max_tokens: 600,
          stream: isStreaming,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: `${provider} error (${res.status}): ${res.statusText}` }, { status: res.status });
      }

      if (isStreaming && res.body) {
        const encoder = new TextEncoder();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readable = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    if (jsonStr === '[DONE]') continue;
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      if (delta) {
                        controller.enqueue(encoder.encode(delta));
                      }
                    } catch {
                      // Skip invalid SSE JSON lines
                    }
                  }
                }
              }
            } catch (streamErr: any) {
              controller.error(streamErr);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Tokens-Used': '250',
          },
        });
      }

      const data = await res.json();
      generatedText = data.choices?.[0]?.message?.content || '';
      totalTokens = data.usage?.total_tokens || 250;
    } else if (provider === 'anthropic') {
      const isStreaming = Boolean(stream);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-latest',
          system: defaultSys,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: 600,
          temperature: temperature ?? 0.7,
          stream: isStreaming,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Anthropic error (${res.status}): ${res.statusText}` }, { status: res.status });
      }

      if (isStreaming && res.body) {
        const encoder = new TextEncoder();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readable = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    try {
                      const parsed = JSON.parse(jsonStr);
                      if (parsed.type === 'content_block_delta') {
                        const delta = parsed.delta?.text;
                        if (delta) controller.enqueue(encoder.encode(delta));
                      }
                    } catch {
                      // Skip invalid SSE JSON lines
                    }
                  }
                }
              }
            } catch (streamErr: any) {
              controller.error(streamErr);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Tokens-Used': '250',
          },
        });
      }

      const data = await res.json();
      generatedText = data.content?.[0]?.text || '';
      totalTokens = (data.usage?.input_tokens || 100) + (data.usage?.output_tokens || 150);
    }

    return NextResponse.json({
      text: generatedText,
      tokensUsed: totalTokens,
    });
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return NextResponse.json(
      { error: err.message || (isTimeout ? 'Provider timeout' : 'Internal error') },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
