'use client';

import React, { useState } from 'react';
import { ContentItem } from '../../lib/types';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, AlertTriangle, Calendar as CalIcon } from 'lucide-react';

interface CalendarModuleProps {
  contentItems: ContentItem[];
  onOpenContent: (item: ContentItem) => void;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOfCurrentWeek(referenceDate?: Date): Date {
  const d = new Date(referenceDate || new Date());
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

export function CalendarModule({ contentItems, onOpenContent }: CalendarModuleProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  // Dynamic anchor to Monday of current week
  const currentMonday = getMondayOfCurrentWeek();
  const baseDate = new Date(currentMonday);
  baseDate.setDate(baseDate.getDate() + weekOffset * (viewMode === 'week' ? 7 : 28));

  const totalDays = viewMode === 'week' ? 7 : 28;
  const daysArray = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayStr = formatLocalDate(new Date());

  // Helper: check if day is an official publishing slot (Mon, Thu, Sun)
  const isPublishingSlotDay = (dayIndex: number) => {
    // 0 = Sunday, 1 = Monday, 4 = Thursday
    return dayIndex === 0 || dayIndex === 1 || dayIndex === 4;
  };

  const getNextPublishingSlot = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const next = new Date(now);
      next.setDate(now.getDate() + i);
      const day = next.getDay();
      if (isPublishingSlotDay(day)) {
        return `${days[day]}, ${next.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · 07:00 WIB`;
      }
    }
    return 'Senin · 07:00 WIB';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            PUBLISHING CALENDAR
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Kalender Slot Zeinity</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Jadwal tayang resmi 3x seminggu: <strong>Senin, Kamis, & Minggu pukul 07:00 WIB</strong>. Tenggat produksi dipisahkan tegas dari jadwal tayang.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Week / Month view toggle */}
          <div className="flex items-center p-1 rounded-xl bg-zpanel-2 border border-zline text-xs font-bold">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'week' ? 'bg-zcyan text-black' : 'text-zmuted hover:text-zink'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'month' ? 'bg-zcyan text-black' : 'text-zmuted hover:text-zink'
              }`}
            >
              Bulanan
            </button>
          </div>

          {/* Navigation Offset */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-2 rounded-xl bg-zpanel-2 border border-zline hover:border-zcyan text-zmuted hover:text-zink transition-colors"
              title="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-xl bg-zpanel-2 border border-zline text-xs font-semibold text-zink hover:border-zcyan transition-colors"
            >
              Hari Ini
            </button>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-2 rounded-xl bg-zpanel-2 border border-zline hover:border-zcyan text-zmuted hover:text-zink transition-colors"
              title="Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Next Slot Notice Banner */}
      <div className="p-4 rounded-xl bg-zpanel border border-zline flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <CalIcon className="w-4 h-4 text-zcyan" />
          <span>
            Slot Publikasi Terdekat: <strong className="text-zcyan">{getNextPublishingSlot()}</strong>
          </span>
        </div>
        <span className="text-[11px] text-zmuted hidden sm:inline">
          *Jadwal tayang tidak otomatis menjadi tenggat produksi video.
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
        {daysArray.map((date, idx) => {
          const dateStr = formatLocalDate(date);
          const dayOfWeek = date.getDay();
          const isSlot = isPublishingSlotDay(dayOfWeek);

          // Find items scheduled to publish on this date (local date comparison)
          const publishingItems = contentItems.filter((c) => {
            if (!c.publish_date) return false;
            try {
              const pubLocal = formatLocalDate(new Date(c.publish_date));
              return pubLocal === dateStr;
            } catch {
              return c.publish_date.startsWith(dateStr);
            }
          });

          // Find items due for production on this date
          const dueItems = contentItems.filter(
            (c) => c.production_due && c.production_due === dateStr
          );

          const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

          return (
            <div
              key={`day-${dateStr}-${idx}`}
              className={`min-h-[140px] rounded-2xl border p-3 flex flex-col justify-between transition-colors ${
                isSlot
                  ? 'bg-zpanel border-zcyan/40 shadow-sm'
                  : 'bg-zpanel-2/50 border-zline/60'
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zink">
                  {dayNames[dayOfWeek]}, {date.getDate()} {date.toLocaleDateString('id-ID', { month: 'short' })}
                </span>
                {isSlot && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zcyan/20 text-zcyan border border-zcyan/30">
                    07:00 WIB
                  </span>
                )}
              </div>

              {/* Items in day */}
              <div className="space-y-1.5 my-2 flex-1">
                {/* Publishing items */}
                {publishingItems
                  .filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i)
                  .map((item, pubIdx) => (
                  <button
                    key={`pub-${item.id}-${pubIdx}`}
                    onClick={() => onOpenContent(item)}
                    className="w-full text-left p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500 text-[11px] font-semibold text-emerald-300 truncate block transition-colors"
                    title={`Tayang: ${item.title}`}
                  >
                    🚀 {item.title}
                  </button>
                ))}

                {/* Production due items */}
                {dueItems
                  .filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i)
                  .map((item, dueIdx) => {
                  const isOverdue = item.production_due! < todayStr && item.status !== 'Terbit';
                  return (
                    <button
                      key={`due-${item.id}-${dueIdx}`}
                      onClick={() => onOpenContent(item)}
                      className={`w-full text-left p-1.5 rounded-lg border text-[11px] font-medium truncate block transition-colors ${
                        isOverdue
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:border-amber-400'
                          : 'bg-zpanel-2 border-zline hover:border-zaccent text-zmuted hover:text-zink'
                      }`}
                      title={`Tenggat Produksi: ${item.title}`}
                    >
                      <Clock className="w-3 h-3 inline mr-1 text-zaccent" />
                      Due: {item.title}
                    </button>
                  );
                })}

                {publishingItems.length === 0 && dueItems.length === 0 && isSlot && (
                  <div className="text-[10px] text-zmuted/60 italic text-center py-4">
                    Slot terbuka (07:00 WIB)
                  </div>
                )}
              </div>

              <div className="text-[9px] text-zmuted/50 text-right">
                {isSlot ? 'Official Zeinity Slot' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
