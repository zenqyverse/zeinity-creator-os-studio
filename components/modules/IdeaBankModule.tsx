'use client';

import React, { useState } from 'react';
import { ContentItem } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
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
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [readinessFilter, setReadinessFilter] = useState<string>('all');

  const filteredIdeas = ideas.filter((idea) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
            IDEA BANK & BACKLOG
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Bank Ide & Prioritisasi</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Koleksi topik potensial. Prioritaskan berdasarkan nilai audiens dan kesiapan aset visual sebelum masuk tahap riset mendalam.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-zpanel border border-zline flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-zmuted" />
          <input
            type="text"
            placeholder="Cari ide di backlog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-zink placeholder-zmuted outline-none"
          />
        </div>

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
      </div>

      {/* Idea Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIdeas.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-zline p-8 space-y-3 bg-zpanel/40">
            <Lightbulb className="w-8 h-8 text-zmuted mx-auto opacity-50" />
            <p className="text-sm font-semibold text-zmuted">Belum ada ide di bank ide.</p>
            <p className="text-xs text-zmuted/80 max-w-sm mx-auto">
              Buka Radar Tren untuk mencari sinyal topik hangat resmi, atau buat ide baru secara manual.
            </p>
            <button
              onClick={onCreateNewIdea}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs"
            >
              Buat Ide Pertama
            </button>
          </div>
        ) : (
          filteredIdeas
            .filter((idea, i, arr) => arr.findIndex((x) => x.id === idea.id) === i)
            .map((idea, idx) => {
            // Check for duplicate / similar topics in content
            const isDuplicate = contentItems.some(
              (c) =>
                c.title.toLowerCase() === idea.title.toLowerCase() ||
                c.title.toLowerCase().includes(idea.title.toLowerCase().slice(0, 15))
            );

            return (
              <div
                key={`${idea.id}-${idx}`}
                className="p-5 rounded-2xl bg-zpanel border border-zline hover:border-amber-400/60 transition-all flex flex-col justify-between space-y-4 shadow-sm group"
              >
                <div className="space-y-3">
                  {/* Badges bar */}
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zpanel-2 border border-zline text-amber-400">
                      Prioritas: {idea.priority}
                    </span>

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
                  </div>

                  {/* Duplicate warning banner */}
                  {isDuplicate && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Topik serupa terdeteksi di pipeline konten.</span>
                    </div>
                  )}

                  {/* Title & Metadata */}
                  <div>
                    <h3
                      onClick={() => onEditIdea(idea)}
                      className="text-sm font-bold text-zink group-hover:text-amber-400 cursor-pointer leading-snug transition-colors"
                    >
                      {idea.title}
                    </h3>
                    <div className="text-[11px] text-zmuted mt-1">
                      {idea.pillar} • Format: <strong className="text-zink">{idea.format}</strong>
                    </div>
                  </div>

                  {/* Hook preview */}
                  {idea.hook && (
                    <div className="p-2.5 rounded-xl bg-zpanel-2 border border-zline/60 text-xs text-zink/90 italic">
                      &quot;{idea.hook}&quot;
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
                    <button
                      onClick={() => handleConvertToResearch(idea)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all shadow-sm"
                      title="Kirim topik ke modul Riset & Fakta"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Riset</span>
                    </button>
                    <button
                      onClick={() => handleConvertToContent(idea)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zcyan hover:bg-zcyan-hover text-black text-xs font-bold transition-all shadow-sm"
                    >
                      <span>Konten</span>
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
