'use client';

import React, { useState, useEffect } from 'react';
import { ContentItem, VideoFormat } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import { TitleValidatorBar } from '../TitleValidatorBar';
import { WpmMeter } from '../WpmMeter';
import {
  exportToPlainText,
  exportToCapCutSegments,
  exportToSrt,
  exportCleanNarrationForTts,
} from '../../lib/export-utils';
import { autoSplitRawScript } from '../../lib/validator';
import { generateWithTaskRouter } from '../../lib/ai-service';
import {
  FilePenLine,
  Sparkles,
  Download,
  Copy,
  Eye,
  Check,
  ShieldCheck,
  RefreshCw,
  Save,
  Wand2,
  Scissors,
  X,
  History,
  Clock,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { ScriptVersion } from '../../lib/types';

interface ScriptStudioModuleProps {
  contentItems: ContentItem[];
  selectedItemId?: string;
  onNavigate: (tab: string, itemId?: string) => void;
}

export function ScriptStudioModule({
  contentItems,
  selectedItemId,
  onNavigate,
}: ScriptStudioModuleProps) {
  const { showToast } = useToast();

  const [activeItem, setActiveItem] = useState<ContentItem>(() => {
    if (selectedItemId) {
      const found = contentItems.find((c) => c.id === selectedItemId);
      if (found) return found;
    }
    return contentItems[0] || ({} as ContentItem);
  });

  const [title, setTitle] = useState(activeItem.title || '');
  const [format, setFormat] = useState<VideoFormat>(activeItem.format || 'Quick Breakdown');
  const [targetWpm, setTargetWpm] = useState<number>(activeItem.target_wpm || 145);
  const [hook, setHook] = useState(activeItem.script_hook || '');
  const [context, setContext] = useState(activeItem.script_context || '');
  const [payoff, setPayoff] = useState(activeItem.script_payoff || '');
  const [ending, setEnding] = useState(activeItem.script_ending || '');

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [rawPastedScript, setRawPastedScript] = useState('');

  // Revision History & Autosave State
  const [isVersionsDrawerOpen, setIsVersionsDrawerOpen] = useState(false);
  const [versions, setVersions] = useState<ScriptVersion[]>(() =>
    activeItem.id ? studioStore.getScriptVersions(activeItem.id) : []
  );
  const [autosaveIndicator, setAutosaveIndicator] = useState<'Tersimpan' | 'Menyimpan...' | 'Tersimpan otomatis'>('Tersimpan');
  
  // Track last saved baseline to prevent phantom autosaves and status mutations
  const lastSavedRef = React.useRef({
    id: activeItem.id || '',
    title: activeItem.title || '',
    format: activeItem.format || 'Quick Breakdown',
    targetWpm: activeItem.target_wpm || 145,
    hook: activeItem.script_hook || '',
    context: activeItem.script_context || '',
    payoff: activeItem.script_payoff || '',
    ending: activeItem.script_ending || '',
  });

  const refreshVersions = () => {
    if (activeItem.id) {
      setVersions(studioStore.getScriptVersions(activeItem.id));
    }
  };

  // Debounced Autosave (1000ms) - only fires when user has made actual edits
  useEffect(() => {
    if (!activeItem.id) return;

    const base = lastSavedRef.current;
    const isDirty =
      base.id === activeItem.id &&
      (base.title !== title ||
        base.format !== format ||
        base.targetWpm !== targetWpm ||
        base.hook !== hook ||
        base.context !== context ||
        base.payoff !== payoff ||
        base.ending !== ending);

    if (!isDirty) return;

    setAutosaveIndicator('Menyimpan...');
    const timer = setTimeout(() => {
      const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
      const totalWords = countWords(hook) + countWords(context) + countWords(payoff) + countWords(ending);
      const dur = Math.round((totalWords / targetWpm) * 60 * 10) / 10;

      const updated = studioStore.saveContentItem({
        ...activeItem,
        title,
        format,
        target_wpm: targetWpm,
        script_hook: hook,
        script_context: context,
        script_payoff: payoff,
        script_ending: ending,
        word_count: totalWords,
        duration_estimate: dur,
        status: activeItem.status === 'Ide' || activeItem.status === 'Riset' ? 'Penulisan' : activeItem.status,
      });

      lastSavedRef.current = {
        id: updated.id,
        title,
        format,
        targetWpm,
        hook,
        context,
        payoff,
        ending,
      };

      setActiveItem(updated);
      setAutosaveIndicator('Tersimpan otomatis');
      setTimeout(() => setAutosaveIndicator('Tersimpan'), 2000);
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, format, targetWpm, hook, context, payoff, ending, activeItem]);

  const handleApplyAutoSplit = () => {
    if (!rawPastedScript.trim()) {
      showToast('Masukkan teks naskah terlebih dahulu', 'error');
      return;
    }
    const split = autoSplitRawScript(rawPastedScript);
    if (split.hook) setHook(split.hook);
    if (split.context) setContext(split.context);
    if (split.payoff) setPayoff(split.payoff);
    if (split.ending) setEnding(split.ending);
    setIsSplitModalOpen(false);
    setRawPastedScript('');
    showToast('Naskah berhasil didistribusikan ke 4 tahap!', 'success');
  };

  // Helper to switch active item and flush any pending unsaved work
  const loadItem = (found: ContentItem) => {
    const base = lastSavedRef.current;
    if (base.id && base.id !== found.id) {
      const isDirty =
        base.title !== title ||
        base.format !== format ||
        base.targetWpm !== targetWpm ||
        base.hook !== hook ||
        base.context !== context ||
        base.payoff !== payoff ||
        base.ending !== ending;

      if (isDirty) {
        const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
        const totalWords = countWords(hook) + countWords(context) + countWords(payoff) + countWords(ending);
        const dur = Math.round((totalWords / targetWpm) * 60 * 10) / 10;
        studioStore.saveContentItem({
          ...activeItem,
          title,
          format,
          target_wpm: targetWpm,
          script_hook: hook,
          script_context: context,
          script_payoff: payoff,
          script_ending: ending,
          word_count: totalWords,
          duration_estimate: dur,
        });
      }
    }

    setActiveItem(found);
    setTitle(found.title);
    setFormat(found.format);
    setTargetWpm(found.target_wpm || 145);
    setHook(found.script_hook || '');
    setContext(found.script_context || '');
    setPayoff(found.script_payoff || '');
    setEnding(found.script_ending || '');
    setAiOutput(null);
    setVersions(studioStore.getScriptVersions(found.id));
    setAutosaveIndicator('Tersimpan');

    lastSavedRef.current = {
      id: found.id,
      title: found.title,
      format: found.format,
      targetWpm: found.target_wpm || 145,
      hook: found.script_hook || '',
      context: found.script_context || '',
      payoff: found.script_payoff || '',
      ending: found.script_ending || '',
    };
  };

  // Sync state if selectedItemId changes
  useEffect(() => {
    if (selectedItemId && selectedItemId !== activeItem.id) {
      const found = contentItems.find((c) => c.id === selectedItemId);
      if (found) {
        loadItem(found);
      }
    }
  }, [selectedItemId, contentItems]);

  const handleSelectContent = (id: string) => {
    const found = contentItems.find((c) => c.id === id);
    if (found) {
      loadItem(found);
    }
  };

  // Listen to global shortcut save event
  useEffect(() => {
    const handleGlobalSave = () => {
      handleSaveDraft();
    };
    window.addEventListener('zeinity:save-draft', handleGlobalSave);
    return () => window.removeEventListener('zeinity:save-draft', handleGlobalSave);
  });

  const handleSaveDraft = () => {
    if (!activeItem.id) return;
    const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    const totalWords = countWords(hook) + countWords(context) + countWords(payoff) + countWords(ending);
    const dur = Math.round((totalWords / targetWpm) * 60 * 10) / 10;

    const updated = studioStore.saveContentItem({
      ...activeItem,
      title,
      format,
      target_wpm: targetWpm,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
      word_count: totalWords,
      duration_estimate: dur,
      status: activeItem.status === 'Ide' || activeItem.status === 'Riset' ? 'Penulisan' : activeItem.status,
    });

    // Save snapshot revision
    studioStore.saveScriptVersion({
      content_id: activeItem.id,
      title,
      format,
      target_wpm: targetWpm,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
      word_count: totalWords,
      duration_estimate: dur,
      is_active: true,
    });

    lastSavedRef.current = {
      id: updated.id,
      title,
      format,
      targetWpm,
      hook,
      context,
      payoff,
      ending,
    };

    setActiveItem(updated);
    setAutosaveIndicator('Tersimpan');
    refreshVersions();
    showToast('Naskah & revisi snapshot berhasil disimpan ke studio', 'success', true);
  };

  const handleSaveNewVersionSnapshot = () => {
    if (!activeItem.id) return;
    const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    const totalWords = countWords(hook) + countWords(context) + countWords(payoff) + countWords(ending);
    const dur = Math.round((totalWords / targetWpm) * 60 * 10) / 10;

    const newVer = studioStore.saveScriptVersion({
      content_id: activeItem.id,
      title,
      format,
      target_wpm: targetWpm,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
      word_count: totalWords,
      duration_estimate: dur,
      is_active: true,
    });

    refreshVersions();
    showToast(`Snapshot revisi v${newVer.version_number} berhasil disimpan`, 'success');
  };

  const handleRestoreVersion = (ver: ScriptVersion) => {
    const restored = studioStore.restoreScriptVersion(ver.id);
    if (restored) {
      const parent = studioStore.getContentById(restored.content_id);
      if (parent) {
        setActiveItem(parent);
      }
      setTitle(restored.title);
      setFormat(restored.format);
      setTargetWpm(restored.target_wpm);
      setHook(restored.script_hook);
      setContext(restored.script_context);
      setPayoff(restored.script_payoff);
      setEnding(restored.script_ending);

      lastSavedRef.current = {
        id: restored.content_id,
        title: restored.title,
        format: restored.format,
        targetWpm: restored.target_wpm,
        hook: restored.script_hook,
        context: restored.script_context,
        payoff: restored.script_payoff,
        ending: restored.script_ending,
      };

      setAutosaveIndicator('Tersimpan');
      refreshVersions();
      showToast(`Naskah dipulihkan ke revisi v${restored.version_number}`, 'success');
      setIsVersionsDrawerOpen(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Teks disalin ke clipboard', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // AI Copilot Actions
  const runAiTask = async (taskType: 'hook' | 'seamless_loop' | 'fact_check' | 'tighten_script' | 'generate_titles') => {
    setIsAiLoading(true);
    setAiOutput(null);
    try {
      const sources = studioStore.getSourcesByContentId(activeItem.id);
      const res = await generateWithTaskRouter(taskType, {
        title,
        hook,
        script_context: context,
        script_payoff: payoff,
        script_ending: ending,
        target_wpm: targetWpm,
        sources,
        contentItem: activeItem,
      });
      setAiOutput(res.text);
      let taskName = '';
      if (taskType === 'hook') taskName = '3 Alternatif Hook';
      else if (taskType === 'seamless_loop') taskName = 'Seamless Loop';
      else if (taskType === 'fact_check') taskName = 'Audit Fakta';
      else if (taskType === 'tighten_script') taskName = 'Pangkas Kata';
      else if (taskType === 'generate_titles') taskName = 'Generate Judul';
      showToast(`AI: ${taskName} selesai dieksekusi`, 'info');
    } catch {
      showToast('Gagal memproses permintaan AI Copilot', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Export handlers
  const handleExportTxt = () => {
    const text = exportToPlainText({
      ...activeItem,
      title,
      format,
      target_wpm: targetWpm,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeinity-script-${activeItem.id || 'draft'}.txt`;
    a.click();
    showToast('Naskah diekspor sebagai .txt', 'success');
  };

  const handleExportCapCut = () => {
    const json = exportToCapCutSegments({
      ...activeItem,
      title,
      format,
      target_wpm: targetWpm,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
    });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeinity-capcut-segments-${activeItem.id || 'draft'}.json`;
    a.click();
    showToast('Segmen CapCut diekspor (.json)', 'success');
  };

  const handleExportSrt = () => {
    const srt = exportToSrt({
      ...activeItem,
      title,
      format,
      target_wpm: targetWpm,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
    });
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeinity-subtitles-${activeItem.id || 'draft'}.srt`;
    a.click();
    showToast('Subtitel diekspor (.srt)', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            SCRIPT STUDIO & VALIDATOR
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Editor Naskah 4-Tahap</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Susun naskah terstruktur: Hook (0-3s), Konteks (4-10s), Payoff (11-45s), dan Seamless Loop (46-60s) dengan batas 90–140 kata.
          </p>
        </div>

        {/* Content item picker & Teleprompter trigger */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-zmuted text-xs">Pilih Konten:</span>
            <select
              value={activeItem.id || ''}
              onChange={(e) => handleSelectContent(e.target.value)}
              className="bg-zpanel-2 border border-zline rounded-xl px-3 py-2 text-xs font-semibold text-zink outline-none max-w-xs truncate"
            >
              {contentItems
                .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
                .map((c, idx) => (
                <option key={`${c.id}-${idx}`} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Autosave Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zpanel-2/70 border border-zline/60 text-xs">
            {autosaveIndicator === 'Menyimpan...' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-[11px] text-zmuted font-medium">{autosaveIndicator}</span>
          </div>

          {/* Revision History Trigger */}
          <button
            onClick={() => {
              refreshVersions();
              setIsVersionsDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors"
            title="Buka Riwayat Revisi Naskah"
          >
            <History className="w-3.5 h-3.5 text-zaccent" />
            <span>Revisi ({versions.length})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Editor on Left, Stats & AI Copilot on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editor & Title Validator */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title Validator Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zmuted uppercase tracking-wider">
                Judul Shorts (Sekaligus Teks Layar Detik 0–3)
              </label>
              <button
                type="button"
                onClick={() => runAiTask('generate_titles')}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-[10px] transition-colors disabled:opacity-50"
                title="Generate 3 Opsi Judul"
              >
                <FilePenLine className="w-3 h-3" />
                Auto-Title
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Kenapa AI di Ponsel Bisa Bekerja Offline?"
              className="w-full px-4 py-3 rounded-xl bg-zpanel border border-zline text-sm font-bold text-zink focus:border-zcyan outline-none transition-colors"
            />
            <TitleValidatorBar title={title} />
          </div>

          {/* Format Selector Bar */}
          <div className="p-4 rounded-xl bg-zpanel border border-zline flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zmuted">Format Video:</span>
              <div className="flex flex-wrap gap-1.5">
                {(['Flash News', 'Quick Breakdown', 'Actionable Tip', 'Myth Buster'] as VideoFormat[]).map(
                  (f, idx) => (
                    <button
                      key={`${f}-${idx}`}
                      onClick={() => setFormat(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        format === f
                          ? 'bg-zaccent text-black shadow-sm'
                          : 'bg-zpanel-2 text-zmuted hover:text-zink border border-zline'
                      }`}
                    >
                      {f}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSplitModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zpanel-2 hover:bg-zline/60 border border-zline text-zcyan hover:text-white font-semibold text-xs transition-colors"
                title="Tempel naskah panjang dan distribusikan otomatis ke 4 tahap"
              >
                <Scissors className="w-3.5 h-3.5" />
                Tempel & Auto-Split
              </button>

              <button
                type="button"
                onClick={() => runAiTask('tighten_script')}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-semibold text-xs transition-colors disabled:opacity-50"
                title="Pangkas kata naskah agar sesuai budget"
              >
                <Scissors className="w-3.5 h-3.5" />
                Pangkas Kata (AI)
              </button>

              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Draft
              </button>
            </div>
          </div>

          {/* 4-STAGE SCRIPT BOXES */}
          <div className="space-y-4">
            {/* STAGE 1: HOOK (0-3s) */}
            <div className="p-4 rounded-2xl bg-zpanel border border-zline space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    STAGE 1 · 0–3s
                  </span>
                  <span className="text-xs font-bold text-zink">The Visual & Audio Hook</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zmuted">Zero dead air, selaras teks layar</span>
                  <button
                    onClick={() => handleCopy(hook, 'hook')}
                    className="p-1 rounded text-zmuted hover:text-zink"
                    title="Salin hook"
                  >
                    {copiedKey === 'hook' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="Kalimat pertama yang diucapkan. Jangan buang waktu dengan 'Halo guys'..."
                rows={3}
                className="w-full p-3 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink placeholder-zmuted/60 focus:border-zcyan outline-none resize-y leading-relaxed"
              />
            </div>

            {/* STAGE 2: CONTEXT ACCELERATION (4-10s) */}
            <div className="p-4 rounded-2xl bg-zpanel border border-zline space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-zaccent/20 text-zaccent border border-zaccent/30">
                    STAGE 2 · 4–10s
                  </span>
                  <span className="text-xs font-bold text-zink">Context Acceleration</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zmuted">1-2 kalimat mengapa penonton harus peduli</span>
                  <button
                    onClick={() => handleCopy(context, 'context')}
                    className="p-1 rounded text-zmuted hover:text-zink"
                    title="Salin konteks"
                  >
                    {copiedKey === 'context' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Jelaskan konteks masalah atau rilis resmi dalam tempo cepat..."
                rows={3}
                className="w-full p-3 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink placeholder-zmuted/60 focus:border-zcyan outline-none resize-y leading-relaxed"
              />
            </div>

            {/* STAGE 3: CORE VALUE / PAYOFF (11-45s) */}
            <div className="p-4 rounded-2xl bg-zpanel border border-zline space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    STAGE 3 · 11–45s
                  </span>
                  <span className="text-xs font-bold text-zink">Core Value / Payoff</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zmuted">Bukti visual, demo langkah, atau fakta teknis</span>
                  <button
                    onClick={() => handleCopy(payoff, 'payoff')}
                    className="p-1 rounded text-zmuted hover:text-zink"
                    title="Salin payoff"
                  >
                    {copiedKey === 'payoff' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <textarea
                value={payoff}
                onChange={(e) => setPayoff(e.target.value)}
                placeholder="Bagian daging naskah: uraikan mekanisme atau 3 langkah praktis..."
                rows={5}
                className="w-full p-3 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink placeholder-zmuted/60 focus:border-zcyan outline-none resize-y leading-relaxed"
              />
            </div>

            {/* STAGE 4: SEAMLESS LOOP / SMART CTA (46-60s) */}
            <div className="p-4 rounded-2xl bg-zpanel border border-zline space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-zpink/20 text-zpink border border-zpink/30">
                    STAGE 4 · 46–60s
                  </span>
                  <span className="text-xs font-bold text-zink">Seamless Loop / Smart CTA</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zmuted">Menyambung ke kalimat awal atau ajakan coba</span>
                  <button
                    onClick={() => runAiTask('seamless_loop')}
                    disabled={isAiLoading}
                    className="flex items-center gap-1 p-1 px-2 rounded bg-zpink/10 hover:bg-zpink/20 border border-zpink/30 text-zpink text-[10px] font-bold transition-colors disabled:opacity-50"
                    title="Generate AI Seamless Loop"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-Loop
                  </button>
                  <button
                    onClick={() => handleCopy(ending, 'ending')}
                    className="p-1 rounded text-zmuted hover:text-zink"
                    title="Salin penutup"
                  >
                    {copiedKey === 'ending' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <textarea
                value={ending}
                onChange={(e) => setEnding(e.target.value)}
                placeholder="Kalimat penutup yang menyambung kembali ke pembuka atau perintah spesifik..."
                rows={3}
                className="w-full p-3 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink placeholder-zmuted/60 focus:border-zcyan outline-none resize-y leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Right Column: WPM Gauge & AI Copilot Tools */}
        <div className="space-y-6">
          {/* Script Economy Meter */}
          <WpmMeter
            hook={hook}
            context={context}
            payoff={payoff}
            ending={ending}
            format={format}
            targetWpm={targetWpm}
            onWpmChange={(w) => setTargetWpm(w)}
          />

          {/* AI Script Copilot Panel */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zcyan" />
                <h3 className="text-sm font-bold text-zink">AI Script Copilot</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zcyan/20 text-zcyan border border-zcyan/30">
                BYOK Ready
              </span>
            </div>

            <p className="text-xs text-zmuted">
              Model cerdas terlatih dengan pedoman penulisan video pendek kanal Zeinity.
            </p>

            {/* Copilot Action Buttons */}
            <div className="grid grid-cols-1 gap-2">
              <button
                disabled={isAiLoading}
                onClick={() => runAiTask('hook')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors disabled:opacity-50 text-left"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>3 Alternatif Hook Detik 0–3</span>
                </div>
                {isAiLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zcyan" />}
              </button>

              <button
                disabled={isAiLoading}
                onClick={() => runAiTask('seamless_loop')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors disabled:opacity-50 text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-zpink shrink-0" />
                  <span>Formula Seamless Loop Ending</span>
                </div>
                {isAiLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zcyan" />}
              </button>

              <button
                disabled={isAiLoading}
                onClick={() => runAiTask('fact_check')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors disabled:opacity-50 text-left"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Audit Klaim vs Bukti Riset</span>
                </div>
                {isAiLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zcyan" />}
              </button>
              <button
                disabled={isAiLoading}
                onClick={() => runAiTask('tighten_script')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors disabled:opacity-50 text-left"
              >
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Pangkas Kata (Tighten Script)</span>
                </div>
                {isAiLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zcyan" />}
              </button>

              <button
                disabled={isAiLoading}
                onClick={() => runAiTask('generate_titles')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors disabled:opacity-50 text-left"
              >
                <div className="flex items-center gap-2">
                  <FilePenLine className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Generate 3 Opsi Judul</span>
                </div>
                {isAiLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zcyan" />}
              </button>
            </div>

            {/* AI Output Container */}
            {aiOutput && (
              <div className="p-3.5 rounded-xl bg-zpanel-2/90 border border-zcyan/40 space-y-2 animate-in fade-in-50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zcyan">Hasil Saran AI Copilot</span>
                  <button
                    onClick={() => handleCopy(aiOutput, 'ai_out')}
                    className="p-1 text-zmuted hover:text-zink"
                    title="Salin hasil"
                  >
                    {copiedKey === 'ai_out' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <pre className="text-[11px] text-zink/90 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                  {aiOutput}
                </pre>
              </div>
            )}
          </div>

          {/* Export Options Box */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-zaccent" />
              <h3 className="text-sm font-bold text-zink">Opsi Ekspor Naskah</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleExportTxt}
                className="p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline font-semibold text-zink transition-colors text-center"
              >
                Plain Text (.txt)
              </button>
              <button
                onClick={() => {
                  const cleanText = exportCleanNarrationForTts({
                    ...activeItem,
                    title,
                    format,
                    script_hook: hook,
                    script_context: context,
                    script_payoff: payoff,
                    script_ending: ending,
                  });
                  navigator.clipboard.writeText(cleanText);
                  showToast('Narasi bersih disalin untuk Kaggle TTS!', 'success');
                }}
                className="p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline font-semibold text-zaccent transition-colors text-center"
              >
                Kaggle TTS (.txt)
              </button>
              <button
                onClick={handleExportCapCut}
                className="p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline font-semibold text-zink transition-colors text-center"
              >
                CapCut Segments (.json)
              </button>
              <button
                onClick={handleExportSrt}
                className="p-2.5 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline font-semibold text-zink transition-colors text-center"
              >
                Subtitles (.srt)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Split Raw Script Modal */}
      {isSplitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-zpanel border border-zline rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zline/60 pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-zcyan" />
                <h3 className="text-base font-bold text-zink">
                  Tempel & Auto-Split Naskah Penuh
                </h3>
              </div>
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="p-1 rounded-lg text-zmuted hover:text-zink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zmuted leading-relaxed">
              Punya draf naskah lengkap dari catatan, ChatGPT, atau dokumen riset? Tempel di bawah ini. Sistem Zeinity akan secara cerdas membedah dan mendistribusikannya ke 4 Tahap baku Shorts: <strong>Hook (0-3s)</strong>, <strong>Context (4-10s)</strong>, <strong>Payoff (11-45s)</strong>, dan <strong>Loop/CTA (46-60s)</strong>.
            </p>

            <textarea
              rows={8}
              value={rawPastedScript}
              onChange={(e) => setRawPastedScript(e.target.value)}
              placeholder="Tempel draf naskah lengkap di sini... (Bisa berupa paragraf bebas atau berlabel [Stage 1], [Hook], dsb.)"
              className="w-full p-3.5 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink font-sans placeholder-zmuted/60 focus:border-zcyan outline-none leading-relaxed"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zpanel-2 border border-zline text-xs font-semibold text-zmuted hover:text-zink"
              >
                Batal
              </button>
              <button
                onClick={handleApplyAutoSplit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-md transition-colors"
              >
                <Scissors className="w-4 h-4" />
                Distribusikan ke 4 Tahap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Revisi Naskah Drawer Modal */}
      {isVersionsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] bg-zpanel border border-zline rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zline/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zaccent/10 border border-zaccent/30 text-zaccent">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zink">Riwayat Revisi Naskah</h3>
                  <p className="text-xs text-zmuted mt-0.5 truncate max-w-md">
                    Snapshot versi untuk: <strong className="text-zink">{activeItem.title}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveNewVersionSnapshot}
                  className="px-3 py-1.5 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-sm transition-colors"
                >
                  + Snapshot Baru
                </button>
                <button
                  onClick={() => setIsVersionsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zmuted hover:text-zink"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Versions List Scroll Area */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
              {versions.length === 0 ? (
                <div className="py-12 text-center text-zmuted text-xs border border-dashed border-zline rounded-xl">
                  Belum ada catatan revisi untuk konten ini. Klik &quot;+ Snapshot Baru&quot; atau &quot;Simpan Draft&quot; untuk membuat versi pertama.
                </div>
              ) : (
                versions
                  .filter((ver, i, arr) => arr.findIndex((x) => x.id === ver.id) === i)
                  .map((ver, idx) => (
                  <div
                    key={`${ver.id}-${idx}`}
                    className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                      ver.is_active
                        ? 'bg-zpanel-2 border-zcyan/50 ring-1 ring-zcyan/30'
                        : 'bg-zpanel-2/60 border-zline/70 hover:border-zline'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-black text-xs bg-zpanel text-zink border border-zline">
                          v{ver.version_number}
                        </span>
                        {ver.is_active ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Aktif di Editor
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zline/40 text-zmuted">
                            Arsip
                          </span>
                        )}
                        <span className="text-[11px] text-zmuted">
                          {new Date(ver.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {!ver.is_active ? (
                        <button
                          onClick={() => handleRestoreVersion(ver)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-sm transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-bold">Sedang Aktif</span>
                      )}
                    </div>

                    {/* Stats pills */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-zmuted">
                      <span className="px-2 py-0.5 rounded bg-zpanel border border-zline">
                        Kata: <strong className="text-zink">{ver.word_count}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zpanel border border-zline">
                        Durasi: <strong className="text-zcyan">{ver.duration_estimate}s</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zpanel border border-zline">
                        Target WPM: <strong className="text-zink">{ver.target_wpm}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zpanel border border-zline">
                        Format: <strong className="text-zaccent">{ver.format}</strong>
                      </span>
                    </div>

                    {/* Excerpt preview */}
                    <div className="p-2.5 rounded-lg bg-zpanel/80 border border-zline/50 text-[11px] space-y-1">
                      <div className="text-zmuted truncate">
                        <strong>Hook:</strong> {ver.script_hook || '(Kosong)'}
                      </div>
                      <div className="text-zmuted truncate">
                        <strong>Payoff:</strong> {ver.script_payoff || '(Kosong)'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-zline/60 bg-zpanel-2/40 flex justify-end">
              <button
                onClick={() => setIsVersionsDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-zpanel-2 border border-zline text-xs font-semibold text-zink hover:bg-zline/50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
