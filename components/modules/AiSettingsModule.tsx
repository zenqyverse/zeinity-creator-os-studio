'use client';

import React, { useState } from 'react';
import { AiConfig, AiProvider } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { checkProviderHealth, fetchProviderModels } from '../../lib/ai-service';
import { useToast } from '../ToastContainer';
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
} from 'lucide-react';

interface AiSettingsModuleProps {
  configs: AiConfig[];
}

export function AiSettingsModule({ configs }: AiSettingsModuleProps) {
  const { showToast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('gemini');
  const [testingHealth, setTestingHealth] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);

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
            AI CONFIGURATION & MODEL HUB (BYOK)
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Multi-Provider AI Settings</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Bawa API Key mandiri (Bring Your Own Key). Mendukung Google Gemini, OpenAI, Anthropic, Groq, dan OpenRouter dengan perutean model berbasis tugas.
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
  );
}
