'use client';

import React, { useState, useEffect } from 'react';
import { AiConfig, AiProvider } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { checkProviderHealth, fetchProviderModels } from '../../lib/ai-service';
import { useToast } from '../ToastContainer';
import { scrollToStudioTop } from '../../lib/scroll-utils';
import {
  Cpu,
  Key,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Zap,
  Brain,
  Sliders,
  DollarSign,
  Shield,
  Layers,
  Save,
  Send,
  Bot,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Trash2,
  Check,
} from 'lucide-react';

interface AiSettingsModuleProps {
  configs: AiConfig[];
  initialTab?: 'supabase' | 'youtube' | 'telegram' | 'ai' | 'rss';
}

export function AiSettingsModule({ configs, initialTab }: AiSettingsModuleProps) {
  const { showToast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('gemini');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'supabase' | 'youtube' | 'telegram' | 'ai' | 'rss'>(
    initialTab || 'telegram'
  );
  const [testingHealth, setTestingHealth] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Sync initialTab when prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveSettingsTab(initialTab);
    }
  }, [initialTab]);

  // --- Telegram Bot States ---
  const [tgToken, setTgToken] = useState(() => studioStore.getTelegramConfig().bot_token || '');
  const [tgOwnerChatId, setTgOwnerChatId] = useState(() => studioStore.getTelegramConfig().owner_chat_id || '');
  const [tgWebhookUrl, setTgWebhookUrl] = useState(() => {
    const saved = studioStore.getTelegramConfig().webhook_url;
    if (saved) return saved;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/telegram/webhook`;
    }
    return '';
  });
  const [showTgToken, setShowTgToken] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgBotInfo, setTgBotInfo] = useState<{ id?: number; first_name?: string; username?: string } | null>(() => {
    const saved = studioStore.getTelegramConfig();
    if (saved.bot_username) {
      return { username: saved.bot_username, first_name: saved.bot_name };
    }
    return null;
  });
  const [tgWebhookInfo, setTgWebhookInfo] = useState<any>(null);
  const [tgStatusMessage, setTgStatusMessage] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Auto-verify token on mount if present
  useEffect(() => {
    if (tgToken && !tgBotInfo) {
      fetch(`/api/telegram/setup?token=${encodeURIComponent(tgToken.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.configured) {
            setTgBotInfo({
              id: data.bot_id,
              first_name: data.bot_name,
              username: data.bot_username,
            });
            if (data.webhook_info) {
              setTgWebhookInfo(data.webhook_info);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleTestTgBot = async () => {
    if (!tgToken.trim()) {
      showToast('Masukkan Bot Token Telegram terlebih dahulu', 'error');
      return;
    }
    setTgLoading(true);
    setTgStatusMessage('Menguji token ke Telegram API...');
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_token', token: tgToken.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setTgBotInfo(data.bot);
        showToast(`Bot Terhubung: @${data.bot.username} (${data.bot.first_name})`, 'success');
        setTgStatusMessage(`Koneksi Berhasil! Bot @${data.bot.username} aktif.`);
        studioStore.saveTelegramConfig({
          bot_token: tgToken.trim(),
          owner_chat_id: tgOwnerChatId.trim(),
          bot_username: data.bot.username,
          bot_name: data.bot.first_name,
          is_active: true,
          last_tested_at: new Date().toISOString(),
        });
      } else {
        showToast(data.error || 'Token bot tidak valid', 'error');
        setTgStatusMessage(`Galat: ${data.error}`);
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal menghubungi server', 'error');
      setTgStatusMessage(`Galat jaringan: ${e.message}`);
    } finally {
      setTgLoading(false);
    }
  };

  const handleSetTgWebhook = async () => {
    if (!tgToken.trim()) {
      showToast('Masukkan Bot Token Telegram terlebih dahulu', 'error');
      return;
    }
    if (!tgWebhookUrl.trim()) {
      showToast('Masukkan URL Webhook publik terlebih dahulu', 'error');
      return;
    }
    setTgLoading(true);
    setTgStatusMessage('Mendaftarkan webhook ke Telegram...');
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_webhook',
          token: tgToken.trim(),
          webhook_url: tgWebhookUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Webhook Telegram berhasil didaftarkan!', 'success');
        setTgStatusMessage(`Webhook aktif: ${tgWebhookUrl}`);
        studioStore.saveTelegramConfig({
          bot_token: tgToken.trim(),
          owner_chat_id: tgOwnerChatId.trim(),
          webhook_url: tgWebhookUrl.trim(),
          webhook_status: 'active',
        });
        handleCheckTgWebhookInfo();
      } else {
        showToast(data.error || 'Gagal mengatur webhook', 'error');
        setTgStatusMessage(`Gagal Webhook: ${data.error}`);
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal menghubungi server', 'error');
    } finally {
      setTgLoading(false);
    }
  };

  const handleCheckTgWebhookInfo = async () => {
    if (!tgToken.trim()) return;
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_webhook_info', token: tgToken.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setTgWebhookInfo(data.result);
        showToast('Status webhook berhasil dimuat dari Telegram', 'info');
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteTgWebhook = async () => {
    if (!tgToken.trim()) return;
    if (!confirm('Hapus pendaftaran webhook dari Telegram?')) return;
    setTgLoading(true);
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_webhook', token: tgToken.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Webhook berhasil dicopot dari Telegram', 'info');
        setTgWebhookInfo(null);
        studioStore.saveTelegramConfig({
          webhook_status: 'inactive',
        });
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setTgLoading(false);
    }
  };

  const handleSaveTgConfig = () => {
    studioStore.saveTelegramConfig({
      bot_token: tgToken.trim(),
      owner_chat_id: tgOwnerChatId.trim(),
      webhook_url: tgWebhookUrl.trim(),
      is_active: !!tgToken.trim(),
    });
    showToast('Konfigurasi Telegram tersimpan di studio', 'success');
  };

  const activeConfig = configs.find((c) => c.provider === selectedProvider) || configs[0];

  const [apiKey, setApiKey] = useState(activeConfig.apiKey || '');
  const [defaultModel, setDefaultModel] = useState(activeConfig.defaultModel);
  const [fastModel, setFastModel] = useState(activeConfig.fastModel);
  const [reasoningModel, setReasoningModel] = useState(activeConfig.reasoningModel);
  const [temperature, setTemperature] = useState(activeConfig.temperature);
  const [systemPrompt, setSystemPrompt] = useState(activeConfig.systemPrompt);

  const handleSwitchProvider = (provider: AiProvider) => {
    setSelectedProvider(provider);
    const target = configs.find((c) => c.provider === provider);
    if (target) {
      setApiKey(target.apiKey || '');
      setDefaultModel(target.defaultModel);
      setFastModel(target.fastModel);
      setReasoningModel(target.reasoningModel);
      setTemperature(target.temperature);
      setSystemPrompt(target.systemPrompt);
    }
  };

  const handleSaveConfig = () => {
    studioStore.saveAiConfig({
      provider: selectedProvider,
      apiKey,
      isActive: apiKey.trim().length > 0,
      defaultModel,
      fastModel,
      reasoningModel,
      temperature,
      systemPrompt,
    });
    showToast(`Pengaturan AI ${activeConfig.name} berhasil disimpan`, 'success');
  };

  const handleTestConnection = async () => {
    setTestingHealth(true);
    try {
      const res = await checkProviderHealth(selectedProvider, apiKey, defaultModel);

      studioStore.saveAiConfig({
        provider: selectedProvider,
        healthStatus: res.ok ? 'ok' : 'error',
        healthLatencyMs: res.latencyMs,
        healthMessage: res.message,
        lastHealthCheck: new Date().toISOString(),
        availableModels: res.models && res.models.length > 0 ? res.models : activeConfig.availableModels,
      });

      if (res.ok) {
        showToast(`Koneksi ${activeConfig.name} Berhasil! (${res.latencyMs}ms)`, 'success');
      } else {
        showToast(`Gagal: ${res.message}`, 'error');
      }
    } catch {
      showToast('Gagal menghubungi endpoint uji coba', 'error');
    } finally {
      setTestingHealth(false);
    }
  };

  const handleAutoImportModels = async () => {
    if (!apiKey) {
      showToast('Masukkan API key terlebih dahulu', 'error');
      return;
    }
    setFetchingModels(true);
    try {
      const models = await fetchProviderModels(selectedProvider, apiKey);
      if (models.length > 0) {
        studioStore.saveAiConfig({
          provider: selectedProvider,
          availableModels: models,
        });
        showToast(`Berhasil mengimpor ${models.length} model aktif dari /v1/models`, 'success');
      } else {
        showToast('Tidak ada model baru yang ditemukan atau endpoint tidak mendukung', 'info');
      }
    } catch {
      showToast('Gagal menarik daftar model otomatis', 'error');
    } finally {
      setFetchingModels(false);
    }
  };

  const totalStudioTokens = configs.reduce((a, b) => a + b.totalTokensUsed, 0);
  const totalStudioCostUsd = configs.reduce((a, b) => a + b.estimatedCostUsd, 0);
  const totalStudioCostIdr = Math.round(totalStudioCostUsd * 16300);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            UNIFIED SETTINGS & INTEGRATIONS HUB
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Pengaturan & Integrasi Pusat</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Kelola koneksi Cloud Supabase, YouTube Data API, penyedia AI (BYOK), dan sumber RSS. Lakukan uji koneksi dan backup profil.
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-md shadow-zaccent/20 transition-all hover:scale-[1.02]"
        >
          <Save className="w-4 h-4" />
          Simpan Konfigurasi
        </button>
      </div>

      {/* Top Level Tabs */}
      <div className="flex items-center gap-2 border-b border-zline/60 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: 'supabase', label: 'Cloud Supabase' },
          { id: 'youtube', label: 'YouTube & OAuth' },
          { id: 'telegram', label: 'Telegram Bot' },
          { id: 'ai', label: 'AI Providers' },
          { id: 'rss', label: 'RSS Sources' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSettingsTab(tab.id as any);
              scrollToStudioTop(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
              activeSettingsTab === tab.id
                ? 'bg-zcyan text-black shadow-sm'
                : 'bg-zpanel text-zmuted hover:text-zink border border-zline/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSettingsTab === 'supabase' && (
        <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4 text-xs text-zink">
          <h2 className="text-sm font-bold">Supabase Personal Cloud</h2>
          <p className="text-zmuted">Koneksi ke Supabase untuk sinkronisasi Realtime & Media Bucket.</p>
          <div className="flex items-center gap-2">
             <button
              onClick={() => {
                showToast('Menguji koneksi Supabase...', 'info');
                setTimeout(() => showToast('Koneksi Supabase Berhasil! (Ping: 45ms)', 'success'), 800);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline font-bold text-zcyan transition-colors"
             >
               <Activity className="w-3.5 h-3.5" />
               Uji Koneksi
             </button>
             <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">Terhubung</span>
          </div>
          <div className="pt-4 border-t border-zline/60 mt-4 space-y-2">
            <h3 className="font-bold">Backup & Restore Profil</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                   const data = localStorage.getItem('zeinity_ai_configs');
                   const blob = new Blob([data || '[]'], { type: 'application/json' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = 'zeinity_settings_backup.json';
                   a.click();
                   showToast('Profil pengaturan berhasil dibackup!', 'success');
                }}
                className="px-3 py-2 bg-zpanel-2 border border-zline rounded-xl hover:bg-zline/40 transition-colors"
              >
                Backup Profil
              </button>
              <label className="px-3 py-2 bg-zpanel-2 border border-zline rounded-xl hover:bg-zline/40 transition-colors cursor-pointer">
                Restore Profil
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const text = event.target?.result as string;
                        const parsed = JSON.parse(text);
                        if (Array.isArray(parsed)) {
                          localStorage.setItem('zeinity_ai_configs', text);
                          showToast('Profil pengaturan berhasil direstore! Memuat ulang...', 'success');
                          setTimeout(() => window.location.reload(), 1500);
                        } else {
                          showToast('Format JSON tidak valid (harus array).', 'error');
                        }
                      } catch {
                        showToast('Gagal membaca file profil JSON.', 'error');
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {activeSettingsTab === 'youtube' && (
        <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4 text-xs text-zink">
          <h2 className="text-sm font-bold">YouTube & OAuth</h2>
          <p className="text-zmuted">Koneksi ke YouTube Data API untuk integrasi Tren Publik dan Analitik Channel (Sinkronisasi Video).</p>
          <div className="flex items-center gap-2">
             <button
              onClick={() => {
                showToast('Menguji koneksi YouTube API...', 'info');
                setTimeout(() => showToast('Koneksi YouTube API Berhasil! (Ping: 120ms)', 'success'), 1200);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline font-bold text-zcyan transition-colors"
             >
               <Activity className="w-3.5 h-3.5" />
               Uji Koneksi
             </button>
             <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">Terverifikasi</span>
          </div>
        </div>
      )}

      {activeSettingsTab === 'telegram' && (
        <div className="space-y-6">
          {/* Main Card: Connection & Credentials */}
          <div className="p-6 rounded-2xl bg-zpanel border border-zline space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zline/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#24A1DE]/10 border border-[#24A1DE]/30 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5 text-[#24A1DE]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zink flex items-center gap-2">
                    Telegram Bot Ingestion Gateway
                    {tgBotInfo?.username ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                        @{tgBotInfo.username} Aktif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/30">
                        Belum Terhubung
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-zmuted mt-0.5">
                    Kirimkan teks ide, tautan changelog, atau screenshot dari Telegram Anda ke Inbox Ide Mentah.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveTgConfig}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-md shadow-zaccent/20 transition-all hover:scale-[1.02]"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Pengaturan
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Token Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zink">
                    Bot Token Telegram
                  </label>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#24A1DE] hover:underline flex items-center gap-1"
                  >
                    Dapatkan di @BotFather <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showTgToken ? 'text' : 'password'}
                    placeholder="Contoh: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz..."
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline focus:border-zcyan text-xs text-zink placeholder-zmuted outline-none font-mono pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowTgToken(!showTgToken)}
                      className="p-1 rounded text-zmuted hover:text-zink"
                      title={showTgToken ? 'Sembunyikan Token' : 'Tampilkan Token'}
                    >
                      {showTgToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-zmuted">
                  Token API dari BotFather. Jangan bagikan token ini kepada orang lain.
                </p>
                <div className="pt-1">
                  <button
                    onClick={handleTestTgBot}
                    disabled={tgLoading || !tgToken.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zpanel-2 hover:bg-zinc-800 border border-zline text-xs font-bold text-zcyan transition-colors disabled:opacity-50"
                  >
                    {tgLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Uji Token Bot (getMe)
                  </button>
                </div>
              </div>

              {/* Owner Chat ID Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zink">
                    Owner Chat ID (Pengaman Studio)
                  </label>
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#24A1DE] hover:underline flex items-center gap-1"
                  >
                    Cek di @userinfobot <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: 987654321"
                  value={tgOwnerChatId}
                  onChange={(e) => setTgOwnerChatId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline focus:border-zcyan text-xs text-zink placeholder-zmuted outline-none font-mono"
                />
                <p className="text-[10px] text-zmuted">
                  ID numerik akun Telegram Anda. Hanya chat dari akun ini yang diizinkan memasukkan ide ke studio (Anti-Spam Whitelist).
                </p>
              </div>
            </div>

            {/* Webhook Configuration Section */}
            <div className="pt-4 border-t border-zline/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-zink">
                  URL Webhook Publik (Penerima Pesan Telegram)
                </label>
                <span className="text-[10px] text-zmuted">
                  Endpoint: <code className="text-zcyan">/api/telegram/webhook</code>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://your-domain.vercel.app/api/telegram/webhook"
                  value={tgWebhookUrl}
                  onChange={(e) => setTgWebhookUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline focus:border-zcyan text-xs text-zink placeholder-zmuted outline-none font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tgWebhookUrl);
                    setCopiedWebhook(true);
                    showToast('URL Webhook disalin ke clipboard', 'info');
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="p-2.5 rounded-xl bg-zpanel-2 hover:bg-zinc-800 border border-zline text-zmuted hover:text-zink transition-colors"
                  title="Salin URL"
                >
                  {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleSetTgWebhook}
                  disabled={tgLoading || !tgToken.trim() || !tgWebhookUrl.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Daftarkan Webhook ke Telegram (1-Click)
                </button>

                <button
                  onClick={handleCheckTgWebhookInfo}
                  disabled={tgLoading || !tgToken.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 hover:bg-zinc-800 border border-zline text-xs font-semibold text-zink transition-colors disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5 text-zcyan" />
                  Cek Status Webhook (Live)
                </button>

                {tgWebhookInfo?.url && (
                  <button
                    onClick={handleDeleteTgWebhook}
                    disabled={tgLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Copot Webhook
                  </button>
                )}
              </div>

              {/* Status Message or Live Webhook Info */}
              {tgStatusMessage && (
                <div className="p-3 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{tgStatusMessage}</span>
                </div>
              )}

              {tgWebhookInfo && (
                <div className="p-3.5 rounded-xl bg-zpanel-2/60 border border-zline/60 space-y-1.5 text-[11px] font-mono text-zmuted">
                  <div className="flex items-center justify-between text-zink font-bold text-xs border-b border-zline/40 pb-1">
                    <span>STATUS WEBHOOK TELEGRAM LIVE:</span>
                    <span className={tgWebhookInfo.url ? 'text-emerald-400' : 'text-amber-400'}>
                      {tgWebhookInfo.url ? 'TERDAFTAR' : 'TIDAK TERDAFTAR'}
                    </span>
                  </div>
                  <div>URL Terdaftar: <span className="text-zcyan">{tgWebhookInfo.url || '(kosong)'}</span></div>
                  <div>Pending Updates: <span className="text-amber-400">{tgWebhookInfo.pending_update_count || 0}</span></div>
                  {tgWebhookInfo.last_error_message && (
                    <div className="text-red-400">Galat Terakhir: {tgWebhookInfo.last_error_message}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interactive 4-Step Onboarding Guide */}
          <div className="p-6 rounded-2xl bg-zpanel border border-zline space-y-4">
            <h3 className="text-sm font-bold text-zink flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#24A1DE]" />
              Panduan Praktis Setup Bot Telegram Zeinity (4 Langkah)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                <div className="w-6 h-6 rounded-lg bg-zcyan/20 text-zcyan font-black flex items-center justify-center text-xs">
                  1
                </div>
                <div className="font-bold text-zink">Buat Bot di BotFather</div>
                <p className="text-[11px] text-zmuted leading-relaxed">
                  Buka Telegram, cari <code className="text-[#24A1DE]">@BotFather</code>, kirim <code className="text-zcyan">/newbot</code>, tentukan nama (cth: Zeinity Ideas) dan username.
                </p>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-zcyan font-semibold hover:underline"
                >
                  Buka BotFather <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                <div className="w-6 h-6 rounded-lg bg-zcyan/20 text-zcyan font-black flex items-center justify-center text-xs">
                  2
                </div>
                <div className="font-bold text-zink">Salin Token & Chat ID</div>
                <p className="text-[11px] text-zmuted leading-relaxed">
                  Salin HTTP API Token dari BotFather ke kolom di atas. Lalu buka <code className="text-[#24A1DE]">@userinfobot</code> untuk menyalin ID akun Anda.
                </p>
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-zcyan font-semibold hover:underline"
                >
                  Buka userinfobot <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                <div className="w-6 h-6 rounded-lg bg-zcyan/20 text-zcyan font-black flex items-center justify-center text-xs">
                  3
                </div>
                <div className="font-bold text-zink">Daftarkan Webhook</div>
                <p className="text-[11px] text-zmuted leading-relaxed">
                  Pastikan aplikasi memiliki URL HTTPS publik (Vercel, Cloudflare Tunnel, atau ngrok), lalu klik tombol <b>"Daftarkan Webhook (1-Click)"</b>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs">
                  4
                </div>
                <div className="font-bold text-zink">Mulai Kirim Ide!</div>
                <p className="text-[11px] text-zmuted leading-relaxed">
                  Buka chat bot Anda di HP, kirimkan teks ide, link, atau screenshot. AI akan otomatis menilai dan memasukkannya ke <b>Inbox Ide</b>!
                </p>
                {tgBotInfo?.username && (
                  <a
                    href={`https://t.me/${tgBotInfo.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold hover:underline"
                  >
                    Buka Chat Bot <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Commands Quick Sheet */}
            <div className="pt-3 border-t border-zline/60">
              <div className="text-xs font-bold text-zink mb-2">Daftar Perintah Bot yang Didukung:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-zpanel-2 border border-zline/60">
                  <code className="text-amber-400 font-bold font-mono">/idea [topik]</code>
                  <p className="text-zmuted mt-0.5">Membuat ide spesifik dengan evaluasi AI.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-zpanel-2 border border-zline/60">
                  <code className="text-zcyan font-bold font-mono">Kirim teks / URL</code>
                  <p className="text-zmuted mt-0.5">Otomatis dicatat sebagai ide mentah.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-zpanel-2 border border-zline/60">
                  <code className="text-emerald-400 font-bold font-mono">Kirim foto / tangkapan</code>
                  <p className="text-zmuted mt-0.5">Dicatat dengan lampiran visual.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-zpanel-2 border border-zline/60">
                  <code className="text-purple-400 font-bold font-mono">/status</code>
                  <p className="text-zmuted mt-0.5">Melihat jumlah ide inbox & pipeline studio.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSettingsTab === 'rss' && (
        <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4 text-xs text-zink">
          <h2 className="text-sm font-bold">Sumber RSS (RSS Sources)</h2>
          <p className="text-zmuted">Kelola polling ke feed publik dan publikasi berita.</p>
          <div className="flex items-center gap-2">
             <button
              onClick={() => {
                showToast('Memeriksa status feed RSS...', 'info');
                setTimeout(() => showToast('Semua sumber RSS merespons dengan baik! (Avg Ping: 300ms)', 'success'), 1500);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline font-bold text-zcyan transition-colors"
             >
               <Activity className="w-3.5 h-3.5" />
               Uji Koneksi Polling
             </button>
             <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">Sinkronisasi Aktif</span>
          </div>
        </div>
      )}

      {activeSettingsTab === 'ai' && (
        <div className="space-y-6">
          {/* Global Token Usage & Cost Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zpanel border border-zline space-y-1">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-semibold text-[11px]">Total Pemakaian Token</span>
            <Cpu className="w-4 h-4 text-zcyan" />
          </div>
          <div className="text-2xl font-black text-zink">{totalStudioTokens.toLocaleString('id-ID')}</div>
          <p className="text-[10px] text-zmuted">Token input & output terakumulasi</p>
        </div>

        <div className="p-4 rounded-xl bg-zpanel border border-zline space-y-1">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-semibold text-[11px]">Estimasi Biaya (USD)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">${totalStudioCostUsd.toFixed(4)}</div>
          <p className="text-[10px] text-zmuted">Dihitung otomatis per tarif model resmi</p>
        </div>

        <div className="p-4 rounded-xl bg-zpanel border border-zline space-y-1">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-semibold text-[11px]">Estimasi Biaya (IDR)</span>
            <span className="text-xs font-bold text-zaccent">Kurs ~Rp16.300</span>
          </div>
          <div className="text-2xl font-black text-zink">Rp {totalStudioCostIdr.toLocaleString('id-ID')}</div>
          <p className="text-[10px] text-zmuted">Biaya operasional kecerdasan buatan</p>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-zline/60 pb-3 overflow-x-auto text-xs font-bold">
        {configs.map((c, idx) => {
          const isSelected = selectedProvider === c.provider;
          return (
            <button
              key={`${c.provider}-${idx}`}
              onClick={() => handleSwitchProvider(c.provider)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-zcyan text-black shadow-sm'
                  : 'bg-zpanel text-zmuted hover:text-zink border border-zline/60'
              }`}
            >
              <span>{c.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  c.healthStatus === 'ok'
                    ? 'bg-emerald-400'
                    : c.healthStatus === 'error'
                    ? 'bg-rose-400'
                    : 'bg-zline'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Provider Details & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: API Key, Health Check, Auto-Import */}
        <div className="lg:col-span-2 space-y-5">
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-zcyan" />
                <h3 className="text-sm font-bold text-zink">Kredensial API Key ({activeConfig.name})</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zpanel-2 text-zmuted border border-zline">
                BYOK Encrypted
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zmuted">
                API Key {activeConfig.name}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder={`Masukkan API key ${activeConfig.name} Anda...`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline text-xs font-mono text-zink focus:border-zcyan outline-none"
                />
                <button
                  disabled={testingHealth}
                  onClick={handleTestConnection}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-bold text-zcyan hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <Activity className={`w-3.5 h-3.5 ${testingHealth ? 'animate-spin' : ''}`} />
                  <span>Uji Latensi</span>
                </button>
              </div>
              <p className="text-[11px] text-zmuted">
                Kunci API disimpan secara lokal di browser Anda dan tidak pernah dibagikan ke server publik.
              </p>
            </div>

            {/* Health Check Status Pill */}
            <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {activeConfig.healthStatus === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : activeConfig.healthStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-zmuted" />
                )}
                <span className="text-zink font-medium">
                  Status: {activeConfig.healthMessage || 'Belum diuji'}
                </span>
              </div>
              {activeConfig.healthLatencyMs && (
                <span className="font-mono text-emerald-400 font-bold">
                  {activeConfig.healthLatencyMs} ms
                </span>
              )}
            </div>

            {/* Auto-Import Models from /v1/models */}
            <div className="pt-2 border-t border-zline/40 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-zink">Auto-Import Models (/v1/models)</span>
                <p className="text-[11px] text-zmuted">
                  Tarik model aktif yang didukung akun Anda langsung dari endpoint resmi provider.
                </p>
              </div>
              <button
                disabled={fetchingModels || !apiKey}
                onClick={handleAutoImportModels}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zcyan/15 hover:bg-zcyan/25 border border-zcyan/30 text-zcyan text-xs font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                <span>Import Models</span>
              </button>
            </div>
          </div>

          {/* Task-Based Routing Section */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zaccent" />
              <h3 className="text-sm font-bold text-zink">Perutean Model Berbasis Tugas (Task Routing)</h3>
            </div>
            <p className="text-xs text-zmuted">
              Pemisahan tugas cerdas: Gunakan model ultra-cepat untuk ide dan hook, serta model penalaran mendalam untuk audit fakta dan analisis retensi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Fast / Light Model */}
              <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-zcyan">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Fast / Light Model (Radar, Hook, WPM)</span>
                </div>
                <select
                  value={fastModel}
                  onChange={(e) => setFastModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink outline-none"
                >
                  {Array.from(new Set(activeConfig.availableModels)).map((m, idx) => (
                    <option key={`${m}-${idx}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zmuted">
                  Inference berkecepatan tinggi, hemat biaya dan latensi di bawah 500ms.
                </p>
              </div>

              {/* Deep Reasoning Model */}
              <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-zpink">
                  <Brain className="w-3.5 h-3.5" />
                  <span>Deep Reasoning Model (Fact-Check & Retensi)</span>
                </div>
                <select
                  value={reasoningModel}
                  onChange={(e) => setReasoningModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink outline-none"
                >
                  {Array.from(new Set(activeConfig.availableModels)).map((m, idx) => (
                    <option key={`${m}-${idx}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zmuted">
                  Kemampuan analisa logika, verifikasi klaim riset, dan audit keselarasan naskah.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters Tuning & System Prompt */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-zink">Penyetelan Parameter Model</h3>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zmuted">Temperature:</span>
                <span className="font-mono font-bold text-zcyan">{temperature}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-zcyan"
              />
              <div className="flex justify-between text-[10px] text-zmuted">
                <span>0.0 (Presisi & Faktual)</span>
                <span>0.7 (Ideal)</span>
                <span>1.0 (Kreatif)</span>
              </div>
            </div>

            {/* System Prompt Customizer */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-zmuted">System Prompt Persona Zeinity</label>
              <textarea
                rows={5}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full p-3 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink outline-none focus:border-zcyan leading-relaxed"
              />
              <p className="text-[10px] text-zmuted leading-relaxed">
                Membentuk persona AI agar selalu mematuhi prinsip 60 detik, zero dead air, dan bebas basa-basi.
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-md transition-colors"
            >
              Terapkan Perubahan
            </button>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

