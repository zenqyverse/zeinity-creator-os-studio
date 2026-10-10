'use client';

import React, { useState } from 'react';
import { AnalyticsMetric, ContentItem, Pillar, VideoFormat } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import { generateWithTaskRouter } from '../../lib/ai-service';
import {
  TrendingUp,
  Plus,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  BarChart2,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';

import { parseYouTubeAnalyticsCsv } from '../../lib/csv-parser';

const PILLARS: Pillar[] = [
  'AI & Technology',
  'Internet & Social Media',
  'Digital Economy & Consumer Culture',
  'Gaming & Digital Entertainment',
  'Modern Life & Human Behavior',
];

const FORMATS: VideoFormat[] = [
  'Quick Breakdown',
  'Flash News',
  'Actionable Tip',
  'Myth Buster',
];

interface AnalyticsModuleProps {
  metrics: AnalyticsMetric[];
  contentItems: ContentItem[];
  onOpenMetricModal: (metric?: AnalyticsMetric) => void;
}

export function AnalyticsModule({
  metrics,
  contentItems,
  onOpenMetricModal,
}: AnalyticsModuleProps) {
  const { showToast } = useToast();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // CSV file input trigger
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedRows = parseYouTubeAnalyticsCsv(text);
        if (parsedRows.length === 0) {
          showToast('File CSV tidak memiliki baris data video valid atau format tidak sesuai', 'error');
          return;
        }

        // Save each parsed row into studioStore
        let savedCount = 0;
        for (const row of parsedRows) {
          studioStore.saveMetric(row);
          savedCount++;
        }

        showToast(`Berhasil mengimpor ${savedCount} data performa video dari file CSV!`, 'success');
      } catch (err: any) {
        showToast(`Format CSV tidak dikenali: ${err.message || 'Error'}`, 'error');
      }
    };
    reader.readAsText(file);
    // Reset input value so same file can be re-uploaded if modified
    e.target.value = '';
  };

  const handleRunAiInsight = async () => {
    setIsAiLoading(true);
    try {
      const res = await generateWithTaskRouter('retention_insight', {});
      setAiInsight(res.text);
      showToast('AI Evaluasi Retensi selesai dibuat', 'info');
    } catch {
      showToast('Gagal memproses AI insight', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Compute overall average benchmarks
  const avgViewed =
    metrics.length > 0
      ? Math.round(
          (metrics.reduce((acc, m) => acc + Number(m.stayed_to_watch), 0) / metrics.length) * 10
        ) / 10
      : 72.0;

  const avgApv =
    metrics.length > 0
      ? Math.round(
          (metrics.reduce((acc, m) => acc + Number(m.apv), 0) / metrics.length) * 10
        ) / 10
      : 98.0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            ANALYTICS & LEARNING CENTER
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Evaluasi Performa & Riset Retensi</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Tolok ukur keberhasilan Zeinity: Target <strong>Viewed ≥ 70%</strong> dan <strong>APV 90%–110%</strong>. Eksperimen terarah menghasilkan konten berikutnya yang makin presisi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* CSV file upload button */}
          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-zaccent" />
            <span>Import CSV YouTube</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => onOpenMetricModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-md shadow-zaccent/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            + Input Metrik
          </button>
        </div>
      </div>

      {/* 2 Benchmark Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Benchmark 1: Viewed vs Swiped */}
        <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-2">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-bold uppercase tracking-wider text-[11px]">
              Target 1 · Viewed vs Swiped Away
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                avgViewed >= 70
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              Target Baku: ≥ 70%
            </span>
          </div>
          <div className="text-4xl font-black text-emerald-400">{avgViewed}%</div>
          <p className="text-xs text-zmuted leading-relaxed">
            Rata-rata audiens yang memilih untuk menonton video Zeinity dibanding menggeser (swiped away) pada 3 detik awal.
          </p>
        </div>

        {/* Benchmark 2: APV */}
        <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-2">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-bold uppercase tracking-wider text-[11px]">
              Target 2 · Average Percentage Viewed (APV)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                avgApv >= 90 && avgApv <= 110
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              Target Baku: 90% – 110%
            </span>
          </div>
          <div className="text-4xl font-black text-zcyan">{avgApv}%</div>
          <p className="text-xs text-zmuted leading-relaxed">
            Menunjukkan seberapa tuntas video ditonton. Angka di atas 100% menandakan sebagian penonton melakukan replay (seamless looping berhasil).
          </p>
        </div>
      </div>

      {/* AI Performance Insights Banner */}
      <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zpink" />
            <h3 className="text-sm font-bold text-zink">AI Retention & Experiment Insights</h3>
          </div>
          <button
            disabled={isAiLoading}
            onClick={handleRunAiInsight}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zpink/20 hover:bg-zpink/30 border border-zpink/40 text-zpink text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isAiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Evaluasi Pola Retensi
          </button>
        </div>

        {aiInsight ? (
          <div className="p-4 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink/90 leading-relaxed font-sans whitespace-pre-wrap animate-in fade-in-50">
            {aiInsight}
          </div>
        ) : (
          <p className="text-xs text-zmuted">
            Klik tombol di atas untuk menganalisis korelasi gaya teks visual pada detik 0-3 terhadap lonjakan retensi penonton.
          </p>
        )}
      </div>

      {/* 5 Pillars Retention Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-zcyan" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zink">
              Rincian Retensi Berdasarkan 5 Pilar Konten
            </h3>
          </div>
          <span className="text-[11px] text-zmuted">Tolok Ukur: Viewed ≥70% · APV 90–110%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PILLARS.map((p, idx) => {
            const items = metrics.filter((m) => m.pillar === p);
            const count = items.length;
            const pAvgViewed =
              count > 0
                ? Math.round((items.reduce((s, m) => s + Number(m.stayed_to_watch), 0) / count) * 10) / 10
                : null;
            const pAvgApv =
              count > 0
                ? Math.round((items.reduce((s, m) => s + Number(m.apv), 0) / count) * 10) / 10
                : null;

            const viewedPassed = pAvgViewed !== null && pAvgViewed >= 70;
            const apvPassed = pAvgApv !== null && pAvgApv >= 90 && pAvgApv <= 110;

            return (
              <div
                key={`${p}-${idx}`}
                className="p-4 rounded-xl bg-zpanel border border-zline hover:border-zcyan/40 transition-all space-y-2.5 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="text-[11px] font-bold text-zink line-clamp-1" title={p}>
                    {p}
                  </div>
                  <div className="text-[10px] text-zmuted mt-0.5">{count} video dievaluasi</div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zline/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zmuted">Viewed:</span>
                    <span
                      className={`font-black text-xs ${
                        pAvgViewed === null
                          ? 'text-zmuted'
                          : viewedPassed
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {pAvgViewed !== null ? `${pAvgViewed}%` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zmuted">APV:</span>
                    <span
                      className={`font-black text-xs ${
                        pAvgApv === null
                          ? 'text-zmuted'
                          : apvPassed
                          ? 'text-zcyan'
                          : 'text-amber-400'
                      }`}
                    >
                      {pAvgApv !== null ? `${pAvgApv}%` : '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-zline/30 flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      count === 0
                        ? 'bg-zpanel-2 text-zmuted'
                        : viewedPassed && apvPassed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : viewedPassed || apvPassed
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {count === 0 ? 'Belum Ada Data' : viewedPassed && apvPassed ? 'Target Tercapai' : 'Perlu Optimasi'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 Formats Retention Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zpink" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zink">
              Rincian Retensi Berdasarkan 4 Format Video
            </h3>
          </div>
          <span className="text-[11px] text-zmuted">Evaluasi Struktur Naskah & Pacing</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FORMATS.map((f, idx) => {
            const items = metrics.filter((m) => m.format === f);
            const count = items.length;
            const fAvgViewed =
              count > 0
                ? Math.round((items.reduce((s, m) => s + Number(m.stayed_to_watch), 0) / count) * 10) / 10
                : null;
            const fAvgApv =
              count > 0
                ? Math.round((items.reduce((s, m) => s + Number(m.apv), 0) / count) * 10) / 10
                : null;

            const viewedPassed = fAvgViewed !== null && fAvgViewed >= 70;
            const apvPassed = fAvgApv !== null && fAvgApv >= 90 && fAvgApv <= 110;

            return (
              <div
                key={`${f}-${idx}`}
                className="p-4 rounded-xl bg-zpanel border border-zline hover:border-zpink/40 transition-all space-y-2.5 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="text-[11px] font-bold text-zink">{f}</div>
                  <div className="text-[10px] text-zmuted mt-0.5">{count} video dianalisis</div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zline/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zmuted">Viewed:</span>
                    <span
                      className={`font-black text-xs ${
                        fAvgViewed === null
                          ? 'text-zmuted'
                          : viewedPassed
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {fAvgViewed !== null ? `${fAvgViewed}%` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zmuted">APV:</span>
                    <span
                      className={`font-black text-xs ${
                        fAvgApv === null
                          ? 'text-zmuted'
                          : apvPassed
                          ? 'text-zcyan'
                          : 'text-amber-400'
                      }`}
                    >
                      {fAvgApv !== null ? `${fAvgApv}%` : '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-zline/30 flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      count === 0
                        ? 'bg-zpanel-2 text-zmuted'
                        : viewedPassed && apvPassed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : viewedPassed || apvPassed
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {count === 0 ? 'Belum Ada Data' : viewedPassed && apvPassed ? 'Target Tercapai' : 'Perlu Optimasi'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* A/B Experiment Lab Table */}
      <div className="rounded-2xl border border-zline bg-zpanel overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zink">
              Laboratorium Eksperimen A/B & Riwayat Metrik Video
            </h3>
          </div>
          <span className="text-[11px] text-zmuted">{metrics.length} video dievaluasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zline/80 bg-zpanel-2/60 text-zmuted uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-bold">Judul Video & Pilar</th>
                <th className="py-3 px-3 font-bold">Views / Feed</th>
                <th className="py-3 px-3 font-bold">Viewed % (≥70%)</th>
                <th className="py-3 px-3 font-bold">APV % (90-110%)</th>
                <th className="py-3 px-4 font-bold">Hipotesis & Hasil Eksperimen</th>
                <th className="py-3 px-3 font-bold">Langkah Berikutnya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zline/40">
              {metrics
                .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
                .map((m, idx) => {
                const passedViewed = m.stayed_to_watch >= 70;
                const passedApv = m.apv >= 90 && m.apv <= 110;

                return (
                  <tr key={`${m.id}-${idx}`} className="hover:bg-zpanel-2/40 transition-colors">
                    {/* Title */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-zink">{m.title}</div>
                      <div className="text-[10px] text-zmuted mt-0.5">
                        {m.pillar} • {m.format}
                      </div>
                    </td>

                    {/* Views */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-zink">{m.views.toLocaleString('id-ID')}</div>
                      <div className="text-[10px] text-zmuted">
                        Feed: {m.shown_in_feed.toLocaleString('id-ID')}
                      </div>
                    </td>

                    {/* Viewed % */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-black text-sm ${
                            passedViewed ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {m.stayed_to_watch}%
                        </span>
                        {passedViewed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                    </td>

                    {/* APV % */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-black text-sm ${
                            passedApv ? 'text-zcyan' : 'text-amber-400'
                          }`}
                        >
                          {m.apv}%
                        </span>
                        {passedApv ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-zcyan" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                    </td>

                    {/* Hypothesis & Result */}
                    <td className="py-3.5 px-4 max-w-sm">
                      {m.experiment_hypothesis && (
                        <div className="text-[11px] text-zink/90 font-medium leading-snug">
                          <strong>Uji:</strong> {m.experiment_hypothesis}
                        </div>
                      )}
                      {m.experiment_result && (
                        <div className="text-[10px] text-zmuted mt-1 leading-snug">
                          <strong>Hasil:</strong> {m.experiment_result}
                        </div>
                      )}
                    </td>

                    {/* Next action */}
                    <td className="py-3.5 px-3 max-w-xs text-[11px] text-emerald-300 font-medium">
                      {m.experiment_next || 'Lanjutkan pemantauan'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
