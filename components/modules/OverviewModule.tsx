'use client';

import React from 'react';
import { ContentItem, TrendSignal } from '../../lib/types';
import {
  CalendarDays,
  Lightbulb,
  FileText,
  Radio,
  ArrowRight,
  TrendingUp,
  Clock,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface OverviewModuleProps {
  contentItems: ContentItem[];
  ideas: ContentItem[];
  trends: TrendSignal[];
  onNavigate: (tab: string, itemId?: string) => void;
  onCreateContent: () => void;
  onCreateIdea: () => void;
  onOpenStudio?: (item: ContentItem) => void;
}

export function OverviewModule({
  contentItems,
  ideas,
  trends,
  onNavigate,
  onCreateContent,
  onCreateIdea,
  onOpenStudio,
}: OverviewModuleProps) {
  const risingTrends = trends.filter((t) => t.trend_status === 'Rising');
  const activePipelines = contentItems.filter((c) => c.status !== 'Terbit');
  const publishedCount = contentItems.filter((c) => c.status === 'Terbit').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Channel Artwork */}
      <div className="relative overflow-hidden rounded-2xl border border-zline/80 bg-zpanel shadow-xl">
        {/* Banner Hero Image */}
        <div className="relative h-32 sm:h-44 w-full overflow-hidden bg-zinc-950">
          <img
            src="/banner.png"
            alt="Zeinity Channel Banner"
            className="w-full h-full object-cover object-center opacity-90 transition-transform duration-700 hover:scale-[1.01]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zpanel via-zpanel/50 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="relative p-6 -mt-10 sm:-mt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-start sm:items-end gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-zline shadow-2xl bg-zinc-900 shrink-0">
              <img
                src="/logo.png"
                alt="Zeinity Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest flex items-center gap-2">
                <span>ZEINITY CREATOR OPERATING SYSTEM</span>
                <span className="px-2 py-0.5 rounded-full bg-zcyan/10 border border-zcyan/30 text-[9px] text-zcyan font-mono">@ZeinityShorts</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zink mt-1">
                Pusat Komando Produksi
              </h1>
              <p className="text-xs sm:text-sm text-zmuted mt-1 max-w-xl">
                Produksi konten multi-format berstandar editorial terverifikasi. Ritme rilis: 4 slot per minggu (Senin, Kamis, Minggu 07:00 WIB Shorts & Sabtu 19:00 WIB Long-Form).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-end">
            <button
              onClick={onCreateContent}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-lg shadow-zaccent/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              + Konten Baru
            </button>
            <button
              onClick={() => onNavigate('radar')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink hover:border-zcyan font-semibold text-xs transition-colors"
            >
              <Radio className="w-4 h-4 text-zcyan" />
              Radar Tren
            </button>
          </div>
        </div>
      </div>

      {/* Daily Action Focus */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const overdueItems = contentItems.filter((c) => c.status !== 'Terbit' && c.production_due && c.production_due < todayStr);
        const now = new Date();
        const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
        const urgentPublish = contentItems.find(
          (c) => c.status !== 'Terbit' && c.status !== 'Terjadwal' && c.publish_date && c.publish_date < next48h
        );

        let criticalBanner = null;
        if (overdueItems.length > 0) {
          criticalBanner = `⚠️ ${overdueItems.length} video melewati tenggat produksi! Segera selesaikan: ${overdueItems.slice(0, 2).map((c) => c.title).join(', ')}${overdueItems.length > 2 ? '...' : ''}`;
        } else if (urgentPublish) {
          criticalBanner = `⚠️ Video untuk jadwal tayang terdekat ("${urgentPublish.title}") masih berstatus ${urgentPublish.status} - butuh diselesaikan hari ini!`;
        }

        if (!criticalBanner) return null;

        return (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <div className="mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-500">Tugas Kritis Hari Ini</h3>
              <p className="text-xs text-amber-400/90 mt-1">{criticalBanner}</p>
            </div>
          </div>
        );
      })()}

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weekly Slot Card */}
        <div className="p-4 rounded-xl bg-zpanel border border-zline/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Ritme Rilis</span>
            <CalendarDays className="w-4 h-4 text-zcyan" />
          </div>
          <div className="text-3xl font-black text-zink">4 Slot</div>
          <p className="text-[11px] text-zmuted">Senin, Kamis, Minggu 07:00 (Shorts) & Sabtu 19:00 (Long-Form)</p>
        </div>

        {/* Content Pipeline */}
        <div className="p-4 rounded-xl bg-zpanel border border-zline/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Pipeline Aktif</span>
            <FileText className="w-4 h-4 text-zaccent" />
          </div>
          <div className="text-3xl font-black text-zink">{activePipelines.length} Video</div>
          <p className="text-[11px] text-zmuted">{publishedCount} video telah terbit</p>
        </div>

        {/* Idea Bank */}
        <div className="p-4 rounded-xl bg-zpanel border border-zline/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Idea Backlog</span>
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-zink">{ideas.length} Ide</div>
          <p className="text-[11px] text-zmuted">Siap dikonversi ke riset & naskah</p>
        </div>

        {/* Radar Trends */}
        <div className="p-4 rounded-xl bg-zpanel border border-zline/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Sinyal Rising</span>
            <Radio className="w-4 h-4 text-zpink" />
          </div>
          <div className="text-3xl font-black text-zink">{risingTrends.length} Topik</div>
          <p className="text-[11px] text-zmuted">Dari RSS, YouTube, & Google Trends</p>
        </div>
      </div>

      {/* Main Grid: Pipeline Snapshot & Production Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pipeline Spotlight */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zmuted">
                Pipeline Produksi Minggu Ini
              </h2>
            </div>
            <button
              onClick={() => onNavigate('pipeline')}
              className="text-xs font-semibold text-zcyan hover:underline flex items-center gap-1"
            >
              Buka Semua Pipeline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {contentItems
              .filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i)
              .slice(0, 4)
              .map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="p-4 rounded-xl bg-zpanel border border-zline/70 hover:border-zaccent/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zpanel-2 border border-zline text-zcyan">
                      {item.status}
                    </span>
                    <span className="text-[11px] text-zmuted">
                      {item.pillar}
                    </span>
                    <span className="text-[11px] text-zmuted">• {item.format}</span>
                  </div>
                  <h3
                    onClick={() => {
                      if (onOpenStudio) {
                        onOpenStudio(item);
                      } else {
                        onNavigate('pipeline', item.id);
                      }
                    }}
                    className="text-sm font-bold text-zink hover:text-zcyan cursor-pointer transition-colors"
                  >
                    {item.title}
                  </h3>
                  {item.production_due && (
                    <div className="flex items-center gap-1.5 text-[11px] text-zmuted">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Tenggat Produksi: <strong>{item.production_due}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      if (onOpenStudio) {
                        onOpenStudio(item);
                      } else {
                        onNavigate('pipeline', item.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-sm transition-all flex items-center gap-1"
                    title="Buka Studio Pembuatan Konten (Storyboard & Visual)"
                  >
                    <span>Buka Studio 🎬</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Benchmark Highlights */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-zcyan" />
                <h3 className="text-sm font-bold text-zink">Tolok Ukur Target Retensi Zeinity</h3>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs text-zcyan hover:underline"
              >
                Lihat Detail Analitik →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline space-y-1">
                <div className="text-xs text-zmuted">Viewed vs Swiped Away Target</div>
                <div className="text-2xl font-black text-emerald-400">≥ 70%</div>
                <p className="text-[11px] text-zmuted">
                  Kait visual & audio pada detik 0–3 wajib menahan penonton sebelum swipe.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zpanel-2 border border-zline space-y-1">
                <div className="text-xs text-zmuted">Average Percentage Viewed (APV)</div>
                <div className="text-2xl font-black text-zcyan">90% – 110%</div>
                <p className="text-[11px] text-zmuted">
                  Struktur naskah 4 tahap & transisi tiap 2-3s memastikan penonton tuntas.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Radar Trending Highlights & Editorial Rules */}
        <div className="space-y-6">
          {/* Radar Tren Box */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-zpink" />
                <h3 className="text-sm font-bold text-zink">Radar Tren Tertinggi</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zpink/20 text-zpink text-[10px] font-bold">
                Live Signal
              </span>
            </div>

            <div className="space-y-3">
              {trends
                .filter((tr, i, arr) => arr.findIndex((x) => x.id === tr.id) === i)
                .slice(0, 3)
                .map((tr, idx) => (
                  <div
                    key={`${tr.id}-${idx}`}
                    className="p-3 rounded-xl bg-zpanel-2 border border-zline/60 hover:border-zcyan/40 transition-colors space-y-1.5"
                  >
                  <div className="flex items-center justify-between text-[10px] text-zmuted">
                    <span className="font-semibold text-zcyan">{tr.source_name}</span>
                    <span>Momentum: <strong className="text-zink">{tr.momentum_score}/100</strong></span>
                  </div>
                  <h4 className="text-xs font-bold text-zink leading-snug line-clamp-2">
                    {tr.headline}
                  </h4>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zline/40 text-zmuted">
                      {tr.format_suggestion}
                    </span>
                    <button
                      onClick={() => onNavigate('radar')}
                      className="text-[11px] font-semibold text-zcyan hover:underline"
                    >
                      Buka sinyal →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zeinity Editorial Standards Checklist Box */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-zink">Standar Baku Zeinity</h3>
            </div>
            <div className="space-y-2 text-xs text-zmuted">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Format Vertikal 9:16 (1080×1920), durasi maksimal 60 detik.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Judul: Diawali Apa/Kenapa/Bagaimana, 5–10 kata, diakhiri tanda tanya (?).</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Naskah: 90–140 kata, tempo bicara 130–160 WPM (ideal 145 WPM).</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Komposisi Visual: Rasio adaptif (9:16 vertikal atau 16:9 horizontal) sesuai tier konten.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Fakta: Sumber resmi, tanggal periksa, dan bukti kutipan wajib dicatat.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
