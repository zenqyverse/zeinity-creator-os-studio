'use client';

import React, { useState, useEffect } from 'react';
import { studioStore } from '../lib/storage';
import { Search, FileText, Lightbulb, ShieldCheck, Radio, X, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: string, id: string) => void;
}

export function GlobalSearchModal({ isOpen, onClose, onSelect }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contentItems = studioStore.getContentItems();
  const ideas = studioStore.getIdeas();
  const sources = studioStore.getSources();
  const trends = studioStore.getTrends();

  const q = query.toLowerCase().trim();

  const filteredContent = contentItems.filter(
    (c) => c.title.toLowerCase().includes(q) || c.pillar.toLowerCase().includes(q) || c.status.toLowerCase().includes(q)
  );
  const filteredIdeas = ideas.filter(
    (i) => i.title.toLowerCase().includes(q) || i.pillar.toLowerCase().includes(q)
  );
  const filteredSources = sources.filter(
    (s) => s.source_title.toLowerCase().includes(q) || s.claim.toLowerCase().includes(q)
  );
  const filteredTrends = trends.filter(
    (t) => t.headline.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q) || t.pillar.toLowerCase().includes(q)
  );

  const totalResults = filteredContent.length + filteredIdeas.length + filteredSources.length + filteredTrends.length;

  return (
    <div className="fixed inset-0 z-[9995] bg-black/80 flex items-start justify-center pt-20 px-4 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-2xl bg-zpanel-2 border border-zline rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zline/60 bg-zpanel">
          <Search className="w-5 h-5 text-zcyan shrink-0" />
          <input
            type="text"
            placeholder="Cari konten, ide, sumber riset, sinyal tren... (Esc untuk menutup)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-zink placeholder-zmuted outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zmuted hover:text-zink hover:bg-zline/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {totalResults === 0 ? (
            <div className="text-center py-12 text-zmuted text-sm">
              Tidak ada hasil ditemukan untuk &quot;{query}&quot;.
            </div>
          ) : (
            <>
              {/* Content Pipeline Matches */}
              {filteredContent.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-zcyan uppercase tracking-wider px-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Konten Pipeline ({filteredContent.length})</span>
                  </div>
                  {filteredContent
                    .filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i)
                    .slice(0, 4)
                    .map((item, idx) => (
                    <button
                      key={`${item.id}-${idx}`}
                      onClick={() => {
                        onSelect('content', item.id);
                        onClose();
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-zpanel/60 hover:bg-zpanel border border-zline/50 hover:border-zcyan/50 flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-zink group-hover:text-zcyan transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zmuted mt-0.5">
                          {item.pillar} • {item.format} • Status: <strong className="text-zink">{item.status}</strong>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zmuted group-hover:text-zcyan shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Ideas Matches */}
              {filteredIdeas.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider px-2">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Idea Bank ({filteredIdeas.length})</span>
                  </div>
                  {filteredIdeas
                    .filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i)
                    .slice(0, 3)
                    .map((item, idx) => (
                    <button
                      key={`${item.id}-${idx}`}
                      onClick={() => {
                        onSelect('idea', item.id);
                        onClose();
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-zpanel/60 hover:bg-zpanel border border-zline/50 hover:border-amber-400/50 flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-zink group-hover:text-amber-400 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zmuted mt-0.5">
                          {item.pillar} • Prioritas: {item.priority}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zmuted group-hover:text-amber-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Research Sources Matches */}
              {filteredSources.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider px-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Riset & Fakta ({filteredSources.length})</span>
                  </div>
                  {filteredSources
                    .filter((src, i, arr) => arr.findIndex((x) => x.id === src.id) === i)
                    .slice(0, 3)
                    .map((src, idx) => (
                    <button
                      key={`${src.id}-${idx}`}
                      onClick={() => {
                        onSelect('source', src.id);
                        onClose();
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-zpanel/60 hover:bg-zpanel border border-zline/50 hover:border-emerald-400/50 flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-zink group-hover:text-emerald-400 transition-colors">
                          {src.source_title}
                        </div>
                        <div className="text-[11px] text-zmuted mt-0.5 truncate max-w-lg">
                          {src.claim} • [{src.verification_status}]
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zmuted group-hover:text-emerald-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trends Matches */}
              {filteredTrends.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-zaccent uppercase tracking-wider px-2">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Radar Tren ({filteredTrends.length})</span>
                  </div>
                  {filteredTrends
                    .filter((tr, i, arr) => arr.findIndex((x) => x.id === tr.id) === i)
                    .slice(0, 3)
                    .map((tr, idx) => (
                    <button
                      key={`${tr.id}-${idx}`}
                      onClick={() => {
                        onSelect('trend', tr.id);
                        onClose();
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-zpanel/60 hover:bg-zpanel border border-zline/50 hover:border-zaccent/50 flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-zink group-hover:text-zaccent transition-colors">
                          {tr.headline}
                        </div>
                        <div className="text-[11px] text-zmuted mt-0.5">
                          {tr.source_name} • Momentum: {tr.momentum_score}/100 • {tr.pillar}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zmuted group-hover:text-zaccent shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-5 py-2.5 bg-zpanel border-t border-zline/60 flex items-center justify-between text-[11px] text-zmuted">
          <span>Ketik kata kunci pencarian apa saja</span>
          <div className="flex items-center gap-2">
            <span>Tekan <kbd className="px-1.5 py-0.5 bg-zline rounded text-zink">Esc</kbd> untuk keluar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
