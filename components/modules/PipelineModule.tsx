'use client';

import React, { useState } from 'react';
import { ContentItem, EditorialStatus, Pillar, VideoFormat } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import {
  LayoutList,
  Columns3,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  AlertTriangle,
  FilePenLine,
  Clapperboard,
  Trash2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface PipelineModuleProps {
  contentItems: ContentItem[];
  onNavigate: (tab: string, itemId?: string) => void;
  onEditItem: (item: ContentItem) => void;
  onCreateNew: () => void;
}

const STAGES: EditorialStatus[] = [
  'Ide',
  'Riset',
  'Penulisan',
  'Siap Produksi',
  'Editing',
  'Review',
  'Terjadwal',
  'Terbit',
];

export function PipelineModule({
  contentItems,
  onNavigate,
  onEditItem,
  onCreateNew,
}: PipelineModuleProps) {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [sortField, setSortField] = useState<'title' | 'format' | 'status' | 'production_due' | 'publish_date' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<EditorialStatus | null>(null);

  const handleSort = (field: 'title' | 'format' | 'status' | 'production_due' | 'publish_date') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const filteredItems = contentItems.filter((item) => {
    const matchSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.pillar.toLowerCase().includes(search.toLowerCase());
    const matchPillar = pillarFilter === 'all' || item.pillar === pillarFilter;
    const matchFormat = formatFilter === 'all' || item.format === formatFilter;
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchPillar && matchFormat && matchStatus;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0;
    let valA: string | number = '';
    let valB: string | number = '';

    if (sortField === 'title') {
      valA = a.title.toLowerCase();
      valB = b.title.toLowerCase();
    } else if (sortField === 'format') {
      valA = a.format.toLowerCase();
      valB = b.format.toLowerCase();
    } else if (sortField === 'status') {
      valA = STAGES.indexOf(a.status);
      valB = STAGES.indexOf(b.status);
    } else if (sortField === 'production_due') {
      valA = a.production_due || '9999-99-99';
      valB = b.production_due || '9999-99-99';
    } else if (sortField === 'publish_date') {
      valA = a.publish_date || '9999-99-99';
      valB = b.publish_date || '9999-99-99';
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleAdvanceStatus = (item: ContentItem) => {
    const currentIdx = STAGES.indexOf(item.status);
    if (currentIdx < STAGES.length - 1) {
      const nextStatus = STAGES[currentIdx + 1];
      studioStore.saveContentItem({
        ...item,
        status: nextStatus,
      });
      showToast(`Status diperbarui ke "${nextStatus}"`, 'success', true);
    }
  };

  const handleDelete = (item: ContentItem) => {
    if (confirm(`Hapus "${item.title}" dari pipeline?`)) {
      studioStore.deleteItem(item.id);
      showToast(`Konten "${item.title}" dihapus`, 'info', true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            CONTENT PIPELINE
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Alur Kerja Editorial</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Kelola perkembangan 8 tahapan produksi video dari ide awal hingga terbit di YouTube Shorts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle View Mode: Table (Default) vs Kanban */}
          <div className="flex items-center p-1 rounded-xl bg-zpanel-2 border border-zline">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'table'
                  ? 'bg-zcyan text-black shadow-sm'
                  : 'text-zmuted hover:text-zink'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Tabel
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-zcyan text-black shadow-sm'
                  : 'text-zmuted hover:text-zink'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              Kanban
            </button>
          </div>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-md shadow-zaccent/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            + Konten Baru
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 rounded-xl bg-zpanel border border-zline flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-zmuted" />
          <input
            type="text"
            placeholder="Cari judul atau topik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-zink placeholder-zmuted outline-none"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Pillar Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zmuted text-[11px]">Pilar:</span>
            <select
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none"
            >
              <option value="all">Semua Pilar</option>
              <option value="Internet & Social Media">Internet & Social Media</option>
              <option value="AI & Technology">AI & Technology</option>
              <option value="Digital Economy & Consumer Culture">Digital Economy & Consumer Culture</option>
              <option value="Gaming & Digital Entertainment">Gaming & Digital Entertainment</option>
              <option value="Modern Life & Human Behavior">Modern Life & Human Behavior</option>
            </select>
          </div>

          {/* Format Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zmuted text-[11px]">Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none"
            >
              <option value="all">Semua Format</option>
              <option value="Flash News">Flash News (20–30s)</option>
              <option value="Quick Breakdown">Quick Breakdown (30–45s)</option>
              <option value="Actionable Tip">Actionable Tip (45–60s)</option>
              <option value="Myth Buster">Myth Buster (30–45s)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zmuted text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none"
            >
              <option value="all">Semua Status</option>
              {STAGES.map((s, idx) => (
                <option key={`${s}-${idx}`} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: TABLE / LIST VIEW (Default) */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl border border-zline bg-zpanel overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zline/80 bg-zpanel-2/60 text-zmuted uppercase text-[10px] tracking-wider select-none">
                  <th
                    onClick={() => handleSort('title')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-zink transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Judul Konten & Pilar</span>
                      {sortField === 'title' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-zcyan" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zcyan" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('format')}
                    className="py-3 px-3 font-bold cursor-pointer hover:text-zink transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Format & Durasi</span>
                      {sortField === 'format' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-zcyan" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zcyan" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3 px-3 font-bold cursor-pointer hover:text-zink transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status Editorial</span>
                      {sortField === 'status' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-zcyan" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zcyan" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('production_due')}
                    className="py-3 px-3 font-bold cursor-pointer hover:text-zink transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tenggat Produksi</span>
                      {sortField === 'production_due' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-zcyan" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zcyan" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('publish_date')}
                    className="py-3 px-3 font-bold cursor-pointer hover:text-zink transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Jadwal Tayang</span>
                      {sortField === 'publish_date' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-zcyan" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zcyan" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zline/40">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zmuted">
                      Tidak ada konten yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  sortedItems
                    .filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i)
                    .map((item, idx) => {
                    const isOverdue =
                      item.production_due &&
                      item.production_due < todayStr &&
                      item.status !== 'Terbit';

                    return (
                      <tr
                        key={`${item.id}-${idx}`}
                        className="hover:bg-zpanel-2/40 transition-colors group"
                      >
                        {/* Title & Pillar */}
                        <td className="py-3 px-4 max-w-sm">
                          <button
                            onClick={() => onEditItem(item)}
                            className="font-bold text-zink hover:text-zcyan text-left line-clamp-2 transition-colors"
                          >
                            {item.title}
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zmuted">
                              {item.pillar}
                            </span>
                            {isOverdue && (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Format */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-zink">{item.format}</span>
                          <div className="text-[10px] text-zmuted">
                            {item.word_count ? `${item.word_count} kata` : 'Belum diisi'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-zpanel-2 border border-zline text-zcyan">
                            {item.status}
                          </span>
                        </td>

                        {/* Production Due Date */}
                        <td className="py-3 px-3 whitespace-nowrap text-zmuted">
                          {item.production_due ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zmuted" />
                              <span className={isOverdue ? 'text-amber-400 font-bold' : ''}>
                                {item.production_due}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zmuted/50">—</span>
                          )}
                        </td>

                        {/* Publish Schedule (Separate from production due) */}
                        <td className="py-3 px-3 whitespace-nowrap text-zmuted">
                          {item.publish_date ? (
                            <div className="text-zink font-medium">
                              {new Date(item.publish_date).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}{' '}
                              · 07:00 WIB
                            </div>
                          ) : (
                            <span className="text-zmuted/50">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status !== 'Terbit' && (
                              <button
                                onClick={() => handleAdvanceStatus(item)}
                                className="px-2 py-1 rounded bg-zpanel-2 hover:bg-zline/60 border border-zline text-[11px] font-semibold text-zcyan hover:text-white transition-colors"
                                title="Majukan ke status berikutnya"
                              >
                                Majukan →
                              </button>
                            )}
                            <button
                              onClick={() => onNavigate('script', item.id)}
                              className="p-1.5 rounded-lg bg-zpanel-2 hover:bg-zline/60 border border-zline text-zmuted hover:text-zink"
                              title="Tulis di Script Studio"
                            >
                              <FilePenLine className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onNavigate('production', item.id)}
                              className="p-1.5 rounded-lg bg-zpanel-2 hover:bg-zline/60 border border-zline text-zmuted hover:text-zcyan"
                              title="Buka Safe Zone 9:16 & Storyboard"
                            >
                              <Clapperboard className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 rounded-lg bg-zpanel-2 hover:bg-red-500/20 border border-zline text-zmuted hover:text-red-400"
                              title="Hapus konten"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: KANBAN BOARD (8 Stages) */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1500px]">
            {STAGES.map((stage) => {
              const stageItems = filteredItems.filter((i) => i.status === stage);
              const isOver = dragOverStage === stage;

              return (
                <div
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverStage !== stage) setDragOverStage(stage);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      if (dragOverStage === stage) setDragOverStage(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedId = e.dataTransfer.getData('text/plain') || draggedItemId;
                    setDragOverStage(null);
                    setDraggedItemId(null);
                    if (!droppedId) return;
                    const target = contentItems.find((c) => c.id === droppedId);
                    if (target && target.status !== stage) {
                      studioStore.saveContentItem({
                        ...target,
                        status: stage,
                      });
                      showToast(`"${target.title.slice(0, 32)}..." dipindah ke status ${stage}`, 'success', true);
                    }
                  }}
                  className={`flex-1 min-w-[210px] rounded-2xl bg-zpanel border transition-all flex flex-col p-3 space-y-3 ${
                    isOver
                      ? 'border-zcyan bg-zcyan/10 ring-2 ring-zcyan/40 shadow-lg shadow-zcyan/10'
                      : 'border-zline'
                  }`}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zink">{stage}</span>
                    <span className="px-2 py-0.5 rounded-full bg-zpanel-2 border border-zline text-[10px] font-bold text-zcyan">
                      {stageItems.length}
                    </span>
                  </div>

                  {isOver && (
                    <div className="p-2 rounded-xl border border-dashed border-zcyan bg-zcyan/10 text-center text-zcyan text-[10px] font-bold animate-pulse">
                      Lepas untuk memindahkan ke {stage}
                    </div>
                  )}

                  <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[650px] pr-1">
                    {stageItems.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-zline/50 text-center text-zmuted/50 text-[11px]">
                        Kosong
                      </div>
                    ) : (
                      stageItems
                        .filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i)
                        .map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          draggable
                          onDragStart={(e) => {
                            setDraggedItemId(item.id);
                            e.dataTransfer.setData('text/plain', item.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggedItemId(null);
                            setDragOverStage(null);
                          }}
                          className={`p-3 rounded-xl bg-zpanel-2 border border-zline hover:border-zaccent/50 transition-all space-y-2 group shadow-sm cursor-grab active:cursor-grabbing ${
                            draggedItemId === item.id
                              ? 'opacity-40 scale-95 border-dashed border-zcyan'
                              : ''
                          }`}
                        >
                          <div className="text-[10px] text-zmuted flex items-center justify-between">
                            <span className="truncate max-w-[130px]">{item.pillar}</span>
                            <span className="font-semibold text-zcyan">{item.format}</span>
                          </div>

                          <h4
                            onClick={() => onEditItem(item)}
                            className="text-xs font-bold text-zink leading-snug line-clamp-2 hover:text-zcyan cursor-pointer transition-colors"
                          >
                            {item.title}
                          </h4>

                          {item.production_due && (
                            <div className="text-[10px] text-zmuted flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Due: {item.production_due}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-zline/40 text-[10px]">
                            <button
                              onClick={() => onNavigate('script', item.id)}
                              className="text-zmuted hover:text-zink flex items-center gap-1"
                            >
                              <FilePenLine className="w-3 h-3" /> Script
                            </button>
                            {stage !== 'Terbit' && (
                              <button
                                onClick={() => handleAdvanceStatus(item)}
                                className="font-bold text-zcyan hover:underline flex items-center gap-0.5"
                              >
                                Maju <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
