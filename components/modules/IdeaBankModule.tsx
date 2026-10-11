'use client';

import React, { useState, useEffect } from 'react';
import { ContentItem } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import { scrollToStudioTop } from '../../lib/scroll-utils';
import {
  Lightbulb,
  Plus,
  Radio,
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Trash2,
  Inbox,
  Library,
  Save,
  Check,
  X,
  Edit2,
  Send,
  RefreshCw,
} from 'lucide-react';

interface IdeaBankModuleProps {
  ideas: ContentItem[];
  contentItems: ContentItem[];
  onNavigate: (tab: string, itemId?: string) => void;
  onEditIdea: (idea: ContentItem) => void;
  onCreateNewIdea: () => void;
}

export function IdeaBankModule({
  ideas,
  contentItems,
  onNavigate,
  onEditIdea,
  onCreateNewIdea,
}: IdeaBankModuleProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'inbox' | 'backlog'>('inbox');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [readinessFilter, setReadinessFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Telegram Bot integration states
  const tgConfig = studioStore.getTelegramConfig();
  const isTelegramConfigured = !!tgConfig.bot_token;
  const [isSyncingTg, setIsSyncingTg] = useState(false);

  // Auto-sync pending ideas on mount
  useEffect(() => {
    fetch('/api/telegram/ideas')
      .then((res) => res.json())
      .then((data) => {
        if (data.ideas && data.ideas.length > 0) {
          for (const item of data.ideas) {
            studioStore.saveContentItem(item);
          }
          fetch('/api/telegram/ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear' }),
          });
          showToast(`${data.ideas.length} ide baru dari Telegram otomatis masuk ke Inbox!`, 'success');
        }
      })
      .catch(() => {});
  }, [showToast]);

  const handleSyncTelegramIdeas = async () => {
    setIsSyncingTg(true);
    try {
      const res = await fetch('/api/telegram/ideas');
      const data = await res.json();
      if (data.ideas && data.ideas.length > 0) {
        for (const item of data.ideas) {
          studioStore.saveContentItem(item);
        }
        await fetch('/api/telegram/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear' }),
        });
        showToast(`${data.ideas.length} ide baru dari Telegram berhasil disinkronkan!`, 'success');
      } else {
        showToast('Tidak ada ide baru yang tertunda di antrean Telegram.', 'info');
      }
    } catch (err: any) {
      showToast('Gagal menarik ide Telegram: ' + err.message, 'error');
    } finally {
      setIsSyncingTg(false);
    }
  };

  // Define what is raw
  const rawIdeas = ideas.filter((idea) => idea.is_raw || idea.source);
  const backlogIdeas = ideas.filter((idea) => !idea.is_raw && !idea.source);

  const displayedIdeas = activeTab === 'inbox' ? rawIdeas : backlogIdeas;

  const filteredIdeas = displayedIdeas.filter((idea) => {
    const matchSearch =
      !search ||
      idea.title.toLowerCase().includes(search.toLowerCase()) ||
      idea.pillar.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === 'all' || idea.priority === priorityFilter;
    const matchReadiness = readinessFilter === 'all' || idea.visual_readiness === readinessFilter;
    return matchSearch && matchPriority && matchReadiness;
  });

  const handleConvertToContent = (idea: ContentItem) => {
    const newContent = studioStore.convertIdeaToContent(idea.id);
    if (newContent) {
      showToast(`Ide berhasil dikonversi ke Content Pipeline: "${newContent.title}"`, 'success', true);
      onNavigate('pipeline', newContent.id);
    }
  };

  const handleConvertToResearch = (idea: ContentItem) => {
    const newSource = studioStore.saveSource({
      source_title: idea.title,
      source_url: idea.source_url || 'https://google.com',
      source_platform: 'Web / Platform',
      claim: idea.hook || idea.title,
      verification_status: 'Perlu Konfirmasi',
      notes: `Diinisiasi dari Ide: ${idea.title}. Pilar: ${idea.pillar}`,
    });
    showToast(`Ide dikirim ke Research Studio: "${newSource.source_title}"`, 'success', true);
    onNavigate('research');
  };

  const handleDelete = (idea: ContentItem) => {
    if (confirm(`Hapus ide "${idea.title}"?`)) {
      studioStore.deleteItem(idea.id);
      showToast('Ide dihapus dari backlog', 'info', true);
    }
  };

  const handleMoveToBacklog = (idea: ContentItem) => {
    studioStore.saveContentItem({
      ...idea,
      is_raw: false,
      source: undefined,
    });
    showToast('Ide disimpan di backlog', 'success', true);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBatchPromote = () => {
    selectedIds.forEach((id) => {
      const idea = ideas.find((i) => i.id === id);
      if (idea) studioStore.convertIdeaToContent(idea.id);
    });
    showToast(`${selectedIds.size} ide diloloskan ke pipeline`, 'success', true);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (confirm(`Hapus ${selectedIds.size} ide?`)) {
      selectedIds.forEach((id) => {
        studioStore.deleteItem(id);
      });
      showToast(`${selectedIds.size} ide dihapus`, 'info', true);
      setSelectedIds(new Set());
    }
  };

  const startInlineEdit = (idea: ContentItem) => {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditNotes(idea.notes || '');
  };

  const saveInlineEdit = (idea: ContentItem) => {
    studioStore.saveContentItem({
      ...idea,
      title: editTitle,
      notes: editNotes,
    });
    setEditingId(null);
    showToast('Perubahan disimpan', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
            IDEA TRIAGE & INGESTION
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Bank Ide & Triage</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Tinjau ide mentah dari berbagai sumber atau kelola ide di backlog.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Telegram Ingest Status & Sync Button */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zpanel-2 border border-zline">
            <button
              onClick={() => onNavigate('settings', 'telegram')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zink hover:text-white hover:bg-zline/30 transition-colors"
              title="Pengaturan & Status Bot Telegram Ingestion"
            >
              <Send className="w-3.5 h-3.5 text-[#24A1DE]" />
              <span className="hidden sm:inline">Bot Telegram</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isTelegramConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
                title={isTelegramConfigured ? 'Telegram Terhubung' : 'Telegram Belum Di-setup'}
              />
            </button>
            <button
              onClick={handleSyncTelegramIdeas}
              disabled={isSyncingTg}
              className="p-1.5 rounded-lg text-zmuted hover:text-zcyan hover:bg-zline/40 transition-colors disabled:opacity-50"
              title="Sinkronkan Ide Masuk dari Telegram"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTg ? 'animate-spin text-zcyan' : ''}`} />
            </button>
          </div>

          <button
            onClick={() => onNavigate('radar')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 border border-zline hover:border-zcyan text-xs font-semibold text-zink transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-zcyan" />
            Impor dari Radar Tren
          </button>
          <button
            onClick={onCreateNewIdea}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            + Ide Baru
          </button>
        </div>
      </div>

      {/* Telegram Onboarding Banner for Raw Inbox */}
      {!isTelegramConfigured && activeTab === 'inbox' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-zpanel via-[#24A1DE]/10 to-zpanel border border-[#24A1DE]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#24A1DE]/20 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-[#24A1DE]" />
            </div>
            <div>
              <div className="font-bold text-zink">Kirim Ide dari Smartphone via Chat Telegram</div>
              <p className="text-[11px] text-zmuted mt-0.5">
                Hubungkan Telegram Bot untuk menangkap ide spontan, URL artikel, atau screenshot saat bepergian langsung ke Inbox ini dengan penilaian AI otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings', 'telegram')}
            className="px-3.5 py-2 rounded-xl bg-[#24A1DE] hover:bg-[#1E88E5] text-white font-bold text-xs shrink-0 shadow-md transition-all self-start sm:self-auto"
          >
            Setup Bot Sekarang
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zline pb-2">
        <button
          onClick={() => {
            setActiveTab('inbox');
            setSelectedIds(new Set());
            scrollToStudioTop(true);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'inbox' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zmuted hover:text-zink'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Inbox Ide Mentah ({rawIdeas.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('backlog');
            setSelectedIds(new Set());
            scrollToStudioTop(true);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'backlog' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zmuted hover:text-zink'
          }`}
        >
          <Library className="w-4 h-4" />
          Backlog Ide Terkurasi ({backlogIdeas.length})
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-zpanel border border-zline flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-zmuted" />
          <input
            type="text"
            placeholder="Cari ide..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-zink placeholder-zmuted outline-none"
          />
        </div>

        {activeTab === 'inbox' && selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zmuted mr-2">{selectedIds.size} dipilih</span>
            <button
              onClick={handleBatchPromote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" /> Loloskan ke Pipeline
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold text-xs shadow-sm transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
          </div>
        )}

        {activeTab === 'backlog' && (
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zmuted text-[11px]">Prioritas:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none"
              >
                <option value="all">Semua Prioritas</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Sedang">Sedang</option>
                <option value="Rendah">Rendah</option>
              </select>
            </div>

            {/* Visual Readiness Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zmuted text-[11px]">Visual Readiness:</span>
              <select
                value={readinessFilter}
                onChange={(e) => setReadinessFilter(e.target.value)}
                className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none"
              >
                <option value="all">Semua Kesiapan</option>
                <option value="Siap">Siap (Ada visual)</option>
                <option value="Perlu aset">Perlu Aset Tambahan</option>
                <option value="Belum dicek">Belum Dicek</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Idea Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIdeas.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-zline p-8 space-y-3 bg-zpanel/40">
            <Lightbulb className="w-8 h-8 text-zmuted mx-auto opacity-50" />
            <p className="text-sm font-semibold text-zmuted">
              Belum ada ide di {activeTab === 'inbox' ? 'inbox' : 'backlog'}.
            </p>
          </div>
        ) : (
          filteredIdeas
            .filter((idea, i, arr) => arr.findIndex((x) => x.id === idea.id) === i)
            .map((idea, idx) => {
            
            // Generate Jaccard Similarity Mock Check for Duplicates
            const isDuplicate = contentItems.some((c) => {
              const words1 = c.title.toLowerCase().split(/\s+/);
              const words2 = new Set(idea.title.toLowerCase().split(/\s+/));
              const intersection = words1.filter(word => words2.has(word)).length;
              const union = new Set([...words1, ...words2]).size;
              return union > 0 && intersection / union > 0.4;
            });

            return (
              <div
                key={`${idea.id}-${idx}`}
                className={`p-5 rounded-2xl bg-zpanel border transition-all flex flex-col justify-between space-y-4 shadow-sm group ${
                  selectedIds.has(idea.id) ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-zline hover:border-amber-400/60'
                }`}
              >
                <div className="space-y-3">
                  {/* Badges bar */}
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-2">
                      {activeTab === 'inbox' && (
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-zline bg-zpanel-2 text-amber-500 focus:ring-amber-500"
                          checked={selectedIds.has(idea.id)}
                          onChange={() => toggleSelect(idea.id)}
                        />
                      )}
                      
                      {activeTab === 'inbox' && idea.source && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400 uppercase tracking-wider">
                          [{idea.source}]
                        </span>
                      )}

                      {activeTab === 'inbox' && idea.viability_score !== undefined && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          idea.viability_score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          idea.viability_score >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          SCORE: {idea.viability_score}
                        </span>
                      )}

                      {activeTab === 'backlog' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zpanel-2 border border-zline text-amber-400">
                          Prioritas: {idea.priority}
                        </span>
                      )}
                    </div>

                    {activeTab === 'backlog' && (
                      <span
                        className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          idea.visual_readiness === 'Siap'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : idea.visual_readiness === 'Perlu aset'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-zline/40 text-zmuted border-zline'
                        }`}
                      >
                        {idea.visual_readiness === 'Siap' && <CheckCircle className="w-3 h-3" />}
                        {idea.visual_readiness === 'Perlu aset' && <AlertCircle className="w-3 h-3" />}
                        {idea.visual_readiness === 'Belum dicek' && <HelpCircle className="w-3 h-3" />}
                        {idea.visual_readiness}
                      </span>
                    )}
                  </div>

                  {/* Duplicate warning banner */}
                  {isDuplicate && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Kemungkinan kanibalisasi topik terdeteksi.</span>
                    </div>
                  )}

                  {/* Title & Metadata */}
                  {editingId === idea.id ? (
                    <div className="space-y-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-zpanel-2 border border-zline rounded px-2 py-1 text-sm text-zink font-bold"
                      />
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full bg-zpanel-2 border border-zline rounded px-2 py-1 text-xs text-zink"
                        placeholder="Catatan..."
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => saveInlineEdit(idea)} className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Simpan</button>
                        <button onClick={() => setEditingId(null)} className="text-xs bg-zpanel-2 text-zmuted px-2 py-1 rounded">Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between">
                        <h3
                          onClick={() => onEditIdea(idea)}
                          className="text-sm font-bold text-zink group-hover:text-amber-400 cursor-pointer leading-snug transition-colors pr-2"
                        >
                          {idea.title}
                        </h3>
                        <button onClick={() => startInlineEdit(idea)} className="opacity-0 group-hover:opacity-100 p-1 text-zmuted hover:text-amber-400 transition-opacity">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="text-[11px] text-zmuted mt-1 space-y-1">
                        <div>
                          {idea.ai_recommended_pillar || idea.pillar} • <strong className="text-zink">{idea.ai_recommended_format || idea.format}</strong>
                        </div>
                        {idea.notes && (
                          <div className="text-zmuted/80 line-clamp-2 italic">
                            {idea.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Source link */}
                  {idea.source_url && (
                    <a
                      href={idea.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-zcyan hover:underline truncate max-w-full"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{idea.source_url}</span>
                    </a>
                  )}
                </div>

                {/* Card Actions Bottom */}
                <div className="pt-3 border-t border-zline/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditIdea(idea)}
                      className="px-2.5 py-1.5 rounded-lg bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => handleDelete(idea)}
                      className="p-1.5 rounded-lg bg-zpanel-2 hover:bg-red-500/20 border border-zline text-zmuted hover:text-red-400"
                      title="Hapus ide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {activeTab === 'inbox' && (
                      <button
                        onClick={() => handleMoveToBacklog(idea)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zpanel-2 hover:bg-zline/60 border border-zline text-zmuted hover:text-zink text-xs font-bold transition-all shadow-sm"
                        title="Simpan di Backlog"
                      >
                        <Save className="w-3 h-3" />
                        <span>Backlog</span>
                      </button>
                    )}
                    {activeTab === 'backlog' && (
                      <button
                        onClick={() => handleConvertToResearch(idea)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all shadow-sm"
                        title="Kirim topik ke modul Riset & Fakta"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Riset</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleConvertToContent(idea)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zcyan hover:bg-zcyan-hover text-black text-xs font-bold transition-all shadow-sm"
                      title="Loloskan ke Pipeline"
                    >
                      <span>{activeTab === 'inbox' ? 'Loloskan' : 'Konten'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
