'use client';

import React from 'react';
import {
  LayoutDashboard,
  Columns3,
  Radio,
  Lightbulb,
  CalendarDays,
  FilePenLine,
  Clapperboard,
  ShieldCheck,
  Images,
  TrendingUp,
  Cpu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  radarRisingCount?: number;
}

export function Sidebar({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  radarRisingCount = 4,
}: SidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Content Pipeline', icon: Columns3 },
    { id: 'radar', label: 'Radar Tren', icon: Radio, badge: radarRisingCount > 0 ? `${radarRisingCount} Baru` : undefined },
    { id: 'ideas', label: 'Idea Bank', icon: Lightbulb },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'script', label: 'Script Studio', icon: FilePenLine },
    { id: 'production', label: 'Production Studio', icon: Clapperboard },
    { id: 'research', label: 'Research & Fact Check', icon: ShieldCheck },
    { id: 'assets', label: 'Asset Library', icon: Images },
    { id: 'analytics', label: 'Analytics & Learning', icon: TrendingUp },
    { id: 'settings', label: 'AI Settings (BYOK)', icon: Cpu },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-zpanel border-r border-zline transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-zline/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-zaccent via-[#8f82ff] to-zcyan flex items-center justify-center font-black text-black text-base shadow-lg shadow-zaccent/20 shrink-0">
            Z
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm text-zink tracking-tight truncate">
                Zeinity Studio
              </span>
              <span className="text-[10px] text-zcyan font-bold tracking-wider uppercase">
                Creator OS v2.0
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg text-zmuted hover:text-zink hover:bg-zline/40 transition-colors"
          title={isCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                isActive
                  ? 'bg-zpanel-2 text-zcyan border border-zcyan/30 shadow-md shadow-zcyan/5'
                  : 'text-zmuted hover:text-zink hover:bg-zpanel-2/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-zcyan' : 'text-zmuted'}`} />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full bg-zcyan/20 text-zcyan text-[10px] font-bold border border-zcyan/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Workspace Footer Card */}
      {!isCollapsed && (
        <div className="p-3 border-t border-zline/60">
          <div className="rounded-xl bg-zpanel-2/80 border border-zline p-3 space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-zcyan">
              Single Source of Truth
            </div>
            <div className="text-xs font-bold text-zink">@ZeinityShorts</div>
            <p className="text-[11px] text-zmuted leading-tight">
              &quot;Paham Dunia Digital dalam 60 Detik.&quot;
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
