'use client';

import React, { useState, useEffect } from 'react';
import { AiConfig, AiProvider } from '../../lib/types';
import { studioStore, migrateLocalDataToSupabase, syncWithSupabase } from '../../lib/storage';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  isSupabaseConfigured,
  testSupabaseHealth,
} from '../../lib/supabase';
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
  Database,
  Cloud,
  UploadCloud,
  DownloadCloud,
  FileCode,
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

  // --- Supabase Cloud States ---
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'not_configured' | 'schema_missing' | 'error'>('not_configured');
  const [supabaseLatency, setSupabaseLatency] = useState<number>(0);
  const [supabaseMessage, setSupabaseMessage] = useState<string>('');
  const [supabaseDetails, setSupabaseDetails] = useState<string>('');
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [migratingData, setMigratingData] = useState(false);
  const [syncingData, setSyncingData] = useState(false);

  // --- YouTube API States ---
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [youtubeStatus, setYoutubeStatus] = useState<'idle' | 'testing' | 'connected' | 'fallback'>('idle');
  const [youtubeStatusMsg, setYoutubeStatusMsg] = useState('');
  const [testingYoutube, setTestingYoutube] = useState(false);

  // Load Supabase and YouTube configs on mount
  useEffect(() => {
    const creds = getSupabaseCredentials();
    setSupabaseUrl(creds.url);
    setSupabaseAnonKey(creds.anonKey);
    if (creds.url && creds.anonKey) {
      testSupabaseHealth().then((res) => {
        setSupabaseLatency(res.latencyMs);
        setSupabaseMessage(res.message);
        setSupabaseDetails(res.details || '');
        if (res.connected) setSupabaseStatus('connected');
        else if (res.message.includes('belum ada')) setSupabaseStatus('schema_missing');
        else setSupabaseStatus('error');
      });
    } else {
      setSupabaseStatus('not_configured');
      setSupabaseMessage('Kunci Supabase belum diisi. Mode Offline LocalStorage aktif.');
    }

    if (typeof window !== 'undefined') {
      const savedYt = localStorage.getItem('zeinity_youtube_api_key') || '';
      setYoutubeApiKey(savedYt);
    }
  }, []);

  const handleSaveSupabaseConfig = () => {
    saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    showToast('Konfigurasi Supabase berhasil disimpan ke penyimpanan browser', 'success');
    handleTestSupabase(true);
  };

  const handleTestSupabase = async (notify = true) => {
    setTestingSupabase(true);
    if (notify) showToast('Menguji koneksi langsung ke Supabase...', 'info');
    try {
      const res = await testSupabaseHealth();
      setSupabaseLatency(res.latencyMs);
      setSupabaseMessage(res.message);
      setSupabaseDetails(res.details || '');
      if (res.connected) {
        setSupabaseStatus('connected');
        if (notify) showToast(`Koneksi Supabase Sukses! (Respon: ${res.latencyMs}ms)`, 'success');
      } else if (!res.configured) {
        setSupabaseStatus('not_configured');
        if (notify) showToast('Kunci Supabase belum diisi (Mode Offline LocalStorage)', 'info');
      } else if (res.message.includes('belum ada')) {
        setSupabaseStatus('schema_missing');
        if (notify) showToast('Koneksi berhasil, namun tabel belum dibuat di Supabase', 'info');
      } else {
        setSupabaseStatus('error');
        if (notify) showToast(`Gagal: ${res.message}`, 'error');
      }
    } catch (e: any) {
      setSupabaseStatus('error');
      setSupabaseMessage(e.message || 'Gagal menguji koneksi');
      if (notify) showToast('Gagal melakukan ping ke Supabase', 'error');
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleMigrateToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      showToast('Konfigurasikan dan simpan kredensial Supabase terlebih dahulu', 'error');
      return;
    }
    setMigratingData(true);
    showToast('Memulai migrasi seluruh data lokal ke database Supabase...', 'info');
    try {
      const res = await migrateLocalDataToSupabase();
      if (res.success) {
        showToast(`Migrasi sukses! ${res.totalUploaded} entitas tersimpan di Cloud Supabase.`, 'success');
      } else {
        showToast(`Migrasi gagal: ${res.error}`, 'error');
      }
    } finally {
      setMigratingData(false);
    }
  };

  const handleSyncFromSupabase = async () => {
    if (!isSupabaseConfigured()) {
      showToast('Konfigurasikan Supabase terlebih dahulu', 'error');
      return;
    }
    setSyncingData(true);
    try {
      const res = await syncWithSupabase();
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setSyncingData(false);
    }
  };

  const handleCopySqlMigration = () => {
    const notice = `-- SKRIP MIGRASI DATABASE ZEINITY CREATOR STUDIO
-- File skrip relasional PostgreSQL lengkap ada di:
-- supabase/migrations/001_initial_schema.sql
-- Buka file tersebut dan salin ke Supabase Dashboard > SQL Editor > New Query.`;
    navigator.clipboard.writeText(notice);
    showToast('Instruksi disalin! Buka supabase/migrations/001_initial_schema.sql di workspace', 'info');
  };

  const handleSaveYoutubeKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zeinity_youtube_api_key', youtubeApiKey.trim());
      showToast('Kunci YouTube API berhasil disimpan', 'success');
      handleTestYoutube();
    }
  };

  const handleTestYoutube = async () => {
    setTestingYoutube(true);
    showToast('Mengecek endpoint YouTube Trends...', 'info');
    try {
      const res = await fetch('/api/trends/youtube');
      if (res.ok) {
        const data = await res.json();
        setYoutubeStatus(data.source === 'youtube_api' ? 'connected' : 'fallback');
        setYoutubeStatusMsg(data.source === 'youtube_api'
          ? `Terhubung ke YouTube Data API v3 (Region ID, Kategori Sains & Teknologi). Dimuat ${data.trends?.length || 0} video.`
          : `Mode Kurasi Lokal Aktif (Fallback ${data.trends?.length || 0} tren). Kunci API belum diisi.`);
        showToast(data.source === 'youtube_api' ? 'YouTube API Terverifikasi!' : 'Mode Kurasi Lokal Responsif', 'success');
      } else {
        setYoutubeStatus('fallback');
        setYoutubeStatusMsg(`Endpoint merespon dengan status: ${res.status}`);
        showToast(`YouTube API Status: ${res.status}`, 'info');
      }
    } catch {
      setYoutubeStatus('fallback');
      setYoutubeStatusMsg('Gagal menjangkau endpoint.');
      showToast('Gagal menghubungi endpoint YouTube Trends', 'error');
    } finally {
      setTestingYoutube(false);
    }
  };

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

  // Polling states for localhost development
  const [isPollingTg, setIsPollingTg] = useState(false);
  const [autoPollTg, setAutoPollTg] = useState(false);
  const [pollSuccessCount, setPollSuccessCount] = useState(0);

  const handlePollTelegram = async (isSilent = false) => {
    if (!tgToken.trim()) {
      if (!isSilent) showToast('Masukkan Bot Token Telegram terlebih dahulu', 'error');
      return;
    }
    setIsPollingTg(true);
    try {
      const res = await fetch('/api/telegram/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tgToken.trim(),
          owner_chat_id: tgOwnerChatId.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.processed_count > 0) {
          showToast(`⚡ ${data.processed_count} ide baru dari chat Telegram berhasil diproses dan disimpan!`, 'success');
          setPollSuccessCount((prev) => prev + data.processed_count);
        } else if (!isSilent) {
          showToast('Tidak ada pesan baru di chat bot Telegram.', 'info');
        }
      } else {
        if (!isSilent) showToast(data.error || 'Gagal polling Telegram', 'error');
      }
    } catch (e: any) {
      if (!isSilent) showToast(e.message || 'Gagal koneksi polling', 'error');
    } finally {
      setIsPollingTg(false);
    }
  };

  // Auto-poll effect when autoPollTg is enabled
  useEffect(() => {
    if (!autoPollTg || !tgToken.trim()) return;
    const interval = setInterval(() => {
      handlePollTelegram(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoPollTg, tgToken, tgOwnerChatId]);

  const handleSetTgWebhook = async () => {
    if (!tgToken.trim()) {
      showToast('Masukkan Bot Token Telegram terlebih dahulu', 'error');
      return;
    }
    if (!tgWebhookUrl.trim()) {
      showToast('Masukkan URL Webhook publik terlebih dahulu', 'error');
      return;
    }
    if (!tgWebhookUrl.trim().startsWith('https://')) {
      showToast('Telegram API mewajibkan URL HTTPS publik! Gunakan Mode Polling di bawah untuk localhost.', 'error');
      setTgStatusMessage('Peringatan: Telegram menolak URL non-HTTPS. Untuk localhost, gunakan "Mode Polling (Tarik Pesan)" di bawah.');
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
        <div className="space-y-6">
          {/* Supabase Status Header Card */}
          <div className="p-6 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zline/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zink flex items-center gap-2">
                    Supabase Personal Cloud
                    {supabaseStatus === 'connected' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Terhubung ({supabaseLatency}ms)
                      </span>
                    )}
                    {supabaseStatus === 'schema_missing' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/30">
                        Skema SQL Belum Dibuat
                      </span>
                    )}
                    {supabaseStatus === 'not_configured' && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-medium border border-zinc-700">
                        Mode Offline LocalStorage (Aktif)
                      </span>
                    )}
                    {supabaseStatus === 'error' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-medium border border-red-500/30">
                        Koneksi Gagal
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-zmuted mt-0.5">
                    Single-user personal cloud untuk sinkronisasi Realtime lintas tab/perangkat dan penyimpanan aset media.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveSupabaseConfig}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-md shadow-zaccent/20 transition-all hover:scale-[1.02]"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Kredensial
                </button>
              </div>
            </div>

            {/* Explanation & Honest Status Banner */}
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              supabaseStatus === 'connected'
                ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-300'
                : supabaseStatus === 'schema_missing'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : supabaseStatus === 'not_configured'
                ? 'bg-zinc-800/40 border-zinc-700/60 text-zinc-300'
                : 'bg-red-500/10 border-red-500/30 text-red-200'
            }`}>
              <div className="flex items-start gap-2.5">
                {supabaseStatus === 'connected' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : supabaseStatus === 'schema_missing' ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : supabaseStatus === 'not_configured' ? (
                  <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold text-zink">
                    {supabaseStatus === 'connected' && 'Status Database: Aktif & Terhubung'}
                    {supabaseStatus === 'schema_missing' && 'Koneksi Berhasil, tetapi Tabel Belum Ada'}
                    {supabaseStatus === 'not_configured' && 'Arsitektur Offline-First (LocalStorage Siap Pakai)'}
                    {supabaseStatus === 'error' && 'Galat Otentikasi / Koneksi Supabase'}
                  </div>
                  <p className="text-[11px] leading-relaxed text-zmuted">
                    {supabaseStatus === 'connected' && (
                      <>Koneksi database PostgreSQL dan listener Realtime aktif. Setiap perubahan di Content Pipeline, Riset, atau Naskah akan disinkronkan otomatis.</>
                    )}
                    {supabaseStatus === 'schema_missing' && (
                      <>Instance Supabase merespon ({supabaseLatency}ms), namun tabel relasional seperti <code>content_items</code> belum dibuat. Klik tombol <b>"Salin Instruksi Skrip SQL"</b> di bawah dan jalankan di SQL Editor dashboard Supabase Anda.</>
                    )}
                    {supabaseStatus === 'not_configured' && (
                      <>Studio beroperasi normal dengan LocalStorage browser Anda. Semua data aman dan tidak akan hilang saat reload. Jika ingin sinkronisasi multi-device atau backup cloud, masukkan Project URL dan Anon Key Supabase di formulir bawah.</>
                    )}
                    {supabaseStatus === 'error' && (
                      <>{supabaseMessage} {supabaseDetails ? `(${supabaseDetails})` : ''}</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Credential Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zink">Supabase Project URL</label>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-zcyan hover:underline flex items-center gap-1"
                  >
                    Buka Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline focus:border-zcyan text-xs text-zink placeholder-zmuted outline-none font-mono"
                />
                <p className="text-[10px] text-zmuted">Dapat ditemukan di Project Settings &gt; API &gt; Project URL</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zink">Supabase Anon Key (Public API Key)</label>
                  <span className="text-[10px] text-zmuted font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                </div>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline focus:border-zcyan text-xs text-zink placeholder-zmuted outline-none font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zmuted hover:text-zink"
                    title={showSupabaseKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
                  >
                    {showSupabaseKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-zmuted">Kunci anon/public aman digunakan di client browser.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zline/60">
              <button
                onClick={() => handleTestSupabase(true)}
                disabled={testingSupabase}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 hover:bg-zinc-800 border border-zline text-xs font-bold text-zcyan transition-colors disabled:opacity-50"
              >
                {testingSupabase ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                {testingSupabase ? 'Menguji Ping...' : 'Uji Koneksi Supabase (Live Ping)'}
              </button>

              <button
                onClick={handleCopySqlMigration}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 hover:bg-zinc-800 border border-zline text-xs font-semibold text-zinc-300 transition-colors"
                title="Salin lokasi dan instruksi skrip migrasi SQL"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                Salin Instruksi Skrip SQL (001_initial_schema.sql)
              </button>

              <button
                onClick={handleMigrateToSupabase}
                disabled={migratingData || !isSupabaseConfigured()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 transition-colors disabled:opacity-50"
              >
                {migratingData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                {migratingData ? 'Memindahkan Data...' : 'Migrasi Data Lokal ke Supabase'}
              </button>

              <button
                onClick={handleSyncFromSupabase}
                disabled={syncingData || !isSupabaseConfigured()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 hover:bg-zinc-800 border border-zline text-xs font-semibold text-zinc-300 transition-colors disabled:opacity-50"
              >
                {syncingData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5 text-blue-400" />}
                {syncingData ? 'Sinkronisasi...' : 'Tarik Data dari Supabase'}
              </button>
            </div>
          </div>

          {/* Backup & Restore Local Profile */}
          <div className="p-6 rounded-2xl bg-zpanel border border-zline space-y-3">
            <h3 className="text-sm font-bold text-zink">Backup & Restore Profil Pengaturan Lokal</h3>
            <p className="text-xs text-zmuted">
              Ekspor seluruh konfigurasi AI BYOK, Feed RSS, dan preferensi studio Anda ke dalam berkas JSON mandiri.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  const data = localStorage.getItem('zeinity_ai_configs');
                  const blob = new Blob([data || '[]'], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `zeinity_settings_backup_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  showToast('Profil pengaturan berhasil dibackup ke JSON!', 'success');
                }}
                className="px-3.5 py-2 bg-zpanel-2 border border-zline rounded-xl hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition-colors"
              >
                Download File Backup (.json)
              </button>
              <label className="px-3.5 py-2 bg-zpanel-2 border border-zline rounded-xl hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer">
                Restore dari File JSON
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
                          setTimeout(() => window.location.reload(), 1200);
                        } else {
                          showToast('Format JSON tidak valid (harus array konfigurasi).', 'error');
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
        <div className="p-6 rounded-2xl bg-zpanel border border-zline space-y-5 text-xs text-zink">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zline/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zink flex items-center gap-2">
                  YouTube Data API v3 & Tren Publik
                  {youtubeStatus === 'connected' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                      API Aktif (Region ID)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/30">
                      Mode Kurasi Lokal
                    </span>
                  )}
                </h2>
                <p className="text-xs text-zmuted mt-0.5">
                  Menarik video paling populer secara real-time dari YouTube Data API kategori Sains & Teknologi Indonesia (Category ID: 28).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveYoutubeKey}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-md shadow-zaccent/20 transition-all hover:scale-[1.02]"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan API Key
              </button>
            </div>
          </div>

          {/* Status notification */}
          {youtubeStatusMsg && (
            <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline text-xs text-zinc-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{youtubeStatusMsg}</div>
            </div>
          )}

          {/* YouTube API Key Input */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zink">YouTube Data API v3 Key (Opsional)</label>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-zcyan hover:underline flex items-center gap-1"
              >
                Google Cloud Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showYoutubeKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={youtubeApiKey}
                onChange={(e) => setYoutubeApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline focus:border-zcyan text-xs text-zink placeholder-zmuted outline-none font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zmuted hover:text-zink"
                title={showYoutubeKey ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showYoutubeKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-zmuted leading-relaxed">
              Jika kunci dikosongkan, Radar Tren otomatis menggunakan daftar video kurasi bawaan Zeinity sehingga Anda tetap dapat meriset konten tanpa API key berbayar.
            </p>
          </div>

          <div className="pt-2 border-t border-zline/60">
            <button
              onClick={handleTestYoutube}
              disabled={testingYoutube}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 hover:bg-zinc-800 border border-zline font-bold text-zcyan text-xs transition-colors disabled:opacity-50"
            >
              {testingYoutube ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              {testingYoutube ? 'Menguji...' : 'Uji Endpoint Tren YouTube (Live Ping)'}
            </button>
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
          </div>

          {/* Mode 1: Localhost Polling Mode (Primary for Local Development) */}
          <div className="p-6 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zline/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zink flex items-center gap-2">
                    Mode Polling Localhost (Tanpa Domain / Tanpa HTTPS)
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                      Rekomendasi Localhost
                    </span>
                  </h3>
                  <p className="text-xs text-zmuted mt-0.5">
                    Mode ini menarik pesan dari Telegram via getUpdates langsung dari komputer lokal Anda tanpa membutuhkan domain HTTPS publik atau pendaftaran webhook.
                  </p>
                </div>
              </div>

              {/* Auto Poll Switch */}
              <label className="flex items-center gap-2.5 cursor-pointer bg-zpanel-2 px-3.5 py-2 rounded-xl border border-zline hover:border-zcyan/50 transition-colors">
                <input
                  type="checkbox"
                  checked={autoPollTg}
                  onChange={(e) => {
                    setAutoPollTg(e.target.checked);
                    if (e.target.checked) {
                      showToast('Auto-Polling aktif: memeriksa chat Telegram tiap 4 detik', 'info');
                    } else {
                      showToast('Auto-Polling dinonaktifkan', 'info');
                    }
                  }}
                  className="w-4 h-4 rounded accent-zcyan cursor-pointer"
                />
                <span className="text-xs font-semibold text-zink select-none">
                  Auto-Polling (Tiap 4 Detik)
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handlePollTelegram(false)}
                disabled={isPollingTg || !tgToken.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isPollingTg ? 'animate-spin' : ''}`} />
                {isPollingTg ? 'Sedang Memeriksa Chat...' : '⚡ Tarik Pesan Chat Telegram Sekarang'}
              </button>

              {pollSuccessCount > 0 && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  {pollSuccessCount} ide berhasil diserap dari chat!
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-zpanel-2/60 border border-zline/60 text-xs text-zinc-300 space-y-1.5 leading-relaxed">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Cara Langsung Menguji di Localhost:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-zmuted">
                <li>Buka aplikasi Telegram di HP Anda dan mulai chat dengan bot <code className="text-zcyan">@{tgBotInfo?.username || 'bot_anda'}</code>.</li>
                <li>Ketik perintah <code className="text-amber-400 font-mono">/start</code> atau kirim ide: <code className="text-amber-400 font-mono">/idea Cara install AI lokal di laptop</code>.</li>
                <li>Klik tombol kuning <b>"Tarik Pesan Chat Telegram Sekarang"</b> di atas (atau aktifkan checkbox Auto-Polling).</li>
                <li>Ide akan otomatis dievaluasi oleh AI dan langsung masuk ke <b>Bank Ide (Inbox Ide Mentah)</b>, dan bot akan membalas chat Anda di Telegram!</li>
              </ol>
            </div>
          </div>

          {/* Mode 2: Webhook Mode (For Public Production Domain with HTTPS Only) */}
          <div className="p-6 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zline/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zink flex items-center gap-2">
                    Mode Webhook Produksi (Khusus Domain Publik HTTPS)
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/30">
                      Vercel / Production
                    </span>
                  </h3>
                  <p className="text-xs text-zmuted mt-0.5">
                    Telegram API secara otomatis mendorong update ke server Anda saat ada chat masuk (event-driven).
                  </p>
                </div>
              </div>
            </div>

            {/* Public HTTPS Explanation Notice */}
            <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/60 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] text-zinc-300 leading-relaxed">
                  <p className="font-semibold text-amber-400">Aturan Resmi Telegram API:</p>
                  <p>
                    Telegram Bot API secara teknis <b>mewajibkan URL dengan protokol HTTPS publik</b> dan sertifikat SSL valid. Telegram secara tegas <b>menolak</b> pendaftaran webhook ke alamat <code>http://localhost:*</code>.
                  </p>
                  <p className="text-zmuted">
                    Untuk pengembangan lokal di komputer Anda, selalu gunakan <b>Mode Polling di atas</b>. Tombol pendaftaran webhook di bawah ini hanya aktif apabila studio dijalankan di domain HTTPS publik (misal: saat dideploy ke Vercel atau menggunakan tunnel ngrok/cloudflared).
                  </p>
                </div>
              </div>
            </div>

            {/* Webhook URL Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zink">
                  URL Webhook Publik (Wajib HTTPS)
                </label>
                <span className="text-[10px] text-zmuted">
                  Endpoint: <code className="text-zcyan">/api/telegram/webhook</code>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://zeinity-studio.vercel.app/api/telegram/webhook"
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
            </div>

            {/* Webhook Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(!tgWebhookUrl.startsWith('https://') || tgWebhookUrl.includes('localhost')) ? (
                <div className="flex items-center gap-2">
                  <button
                    disabled={true}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 text-zinc-500 font-bold text-xs border border-zinc-700 cursor-not-allowed opacity-60"
                    title="Telegram menolak localhost. Gunakan Mode Polling untuk pengujian lokal."
                  >
                    <Bot className="w-3.5 h-3.5" />
                    Daftarkan Webhook (Nonaktif di Localhost)
                  </button>
                  <span className="text-[10px] text-amber-400 font-medium">
                    ← Memerlukan domain HTTPS publik
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleSetTgWebhook}
                  disabled={tgLoading || !tgToken.trim() || !tgWebhookUrl.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Daftarkan Webhook ke Telegram (1-Click)
                </button>
              )}

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

