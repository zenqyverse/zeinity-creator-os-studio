'use client';

import React, { useState, useEffect } from 'react';
import { studioStore, AutosaveStatus } from '../lib/storage';
import {
  ContentItem,
  ResearchSource,
  MediaAsset,
  AnalyticsMetric,
  TrendSignal,
  AiConfig,
} from '../lib/types';
import { Sidebar } from '../components/Sidebar';
import { TopHeader } from '../components/TopHeader';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { DrawerModal } from '../components/DrawerModal';
import { ContentForm, ResearchSourceForm, MediaAssetForm, MetricForm } from '../components/forms/StudioForms';
import { useToast } from '../components/ToastContainer';

// Modules
import { OverviewModule } from '../components/modules/OverviewModule';
import { PipelineModule } from '../components/modules/PipelineModule';
import { RadarTrenModule } from '../components/modules/RadarTrenModule';
import { IdeaBankModule } from '../components/modules/IdeaBankModule';
import { CalendarModule } from '../components/modules/CalendarModule';
import { ScriptStudioModule } from '../components/modules/ScriptStudioModule';
import { ProductionStudioModule } from '../components/modules/ProductionStudioModule';
import { ResearchModule } from '../components/modules/ResearchModule';
import { AssetLibraryModule } from '../components/modules/AssetLibraryModule';
import { AnalyticsModule } from '../components/modules/AnalyticsModule';
import { AiSettingsModule } from '../components/modules/AiSettingsModule';

export default function ZeinityStudioPage() {
  const { showToast } = useToast();

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Store data states
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [ideas, setIdeas] = useState<ContentItem[]>([]);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [trends, setTrends] = useState<TrendSignal[]>([]);
  const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('Tersimpan');

  // Modal drawers
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'content' | 'idea' | 'source' | 'asset' | 'metric' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Sync with StudioStore on mount and changes
  const syncFromStore = () => {
    setContentItems(studioStore.getContentItems());
    setIdeas(studioStore.getIdeas());
    setSources(studioStore.getSources());
    setAssets(studioStore.getAssets());
    setMetrics(studioStore.getMetrics());
    setTrends(studioStore.getTrends());
    setAiConfigs(studioStore.getAiConfigs());
    setAutosaveStatus(studioStore.getAutosaveStatus());
  };

  useEffect(() => {
    studioStore.loadFromLocalStorage();
    syncFromStore();
    const unsubscribe = studioStore.subscribe(syncFromStore);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('zeinity_')) {
        studioStore.loadFromLocalStorage();
        syncFromStore();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sync document root classes with isDarkMode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' triggers Global Search unless typing in input or textarea
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // Ctrl+S or Cmd+S instant save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        
        // 1. Dispatch custom event for page-level editors (e.g. ScriptStudioModule)
        window.dispatchEvent(new CustomEvent('zeinity:save-draft'));

        // 2. If a form modal/drawer is open, trigger its submit button
        const activeForm = document.querySelector('form');
        if (activeForm) {
          const submitBtn = activeForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
          if (submitBtn) {
            submitBtn.click();
            showToast('Form berhasil disimpan via shortcut Ctrl+S', 'success', true);
            return;
          }
        }
        showToast('Draft instan tersimpan ke workspace', 'success', true);
      }

      // Esc closes drawers
      if (e.key === 'Escape') {
        if (isSearchOpen) setIsSearchOpen(false);
        if (drawerType) setDrawerType(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, drawerType, showToast]);

  // Tab Navigation Handler
  const handleNavigate = (tab: string, itemId?: string) => {
    setCurrentTab(tab);
    if (itemId) setSelectedItemId(itemId);
  };

  // Open Drawer Handlers
  const handleOpenCreateContent = (initialData?: Partial<ContentItem>) => {
    setEditingItem(initialData || null);
    setDrawerType('content');
  };

  const handleOpenCreateIdea = (initialData?: Partial<ContentItem>) => {
    setEditingItem(initialData || null);
    setDrawerType('idea');
  };

  const handleOpenSourceModal = (source?: ResearchSource) => {
    setEditingItem(source || null);
    setDrawerType('source');
  };

  const handleOpenAssetModal = (asset?: MediaAsset) => {
    setEditingItem(asset || null);
    setDrawerType('asset');
  };

  const handleOpenMetricModal = (metric?: AnalyticsMetric) => {
    setEditingItem(metric || null);
    setDrawerType('metric');
  };

  const handleOpenResearchWithTrend = (trend: TrendSignal) => {
    setEditingItem({
      source_title: trend.headline,
      source_url: trend.url,
      source_platform: trend.source_name,
      source_pub_date: trend.source_pub_date || new Date().toISOString().slice(0, 10),
      source_checked_date: new Date().toISOString().slice(0, 10),
      claim: trend.summary,
      evidence_quote: '',
      verification_status: 'Perlu Konfirmasi',
      notes: `Diimpor dari Radar Tren (${trend.source_name}). Rationale: ${trend.rationale || '-'}`,
    });
    setDrawerType('source');
  };

  // Form Submission Handlers
  const handleFormSubmitContent = (data: Partial<ContentItem>) => {
    studioStore.saveContentItem(data);
    setDrawerType(null);
    showToast(
      data.type === 'idea' ? 'Ide berhasil disimpan ke Idea Bank' : 'Konten berhasil disimpan ke Pipeline',
      'success',
      true
    );
  };

  const handleFormSubmitSource = (data: Partial<ResearchSource>) => {
    studioStore.saveSource(data);
    setDrawerType(null);
    showToast('Sumber riset berhasil disimpan', 'success');
  };

  const handleFormSubmitAsset = (data: Partial<MediaAsset>) => {
    studioStore.saveAsset(data);
    setDrawerType(null);
    showToast('Aset media berhasil dicatat', 'success');
  };

  const handleFormSubmitMetric = (data: Partial<AnalyticsMetric>) => {
    studioStore.saveMetric(data);
    setDrawerType(null);
    showToast('Metrik performa berhasil disimpan', 'success');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zbg text-zink">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        radarRisingCount={trends.filter((t) => t.trend_status === 'Rising').length}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Header */}
        <TopHeader
          autosaveStatus={autosaveStatus}
          onOpenSearch={() => setIsSearchOpen(true)}
          onCreateContent={() => handleOpenCreateContent()}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        />

        {/* Scrollable Main Stage */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewModule
              contentItems={contentItems}
              ideas={ideas}
              trends={trends}
              onNavigate={handleNavigate}
              onCreateContent={() => handleOpenCreateContent()}
              onCreateIdea={() => handleOpenCreateIdea()}
            />
          )}

          {currentTab === 'pipeline' && (
            <PipelineModule
              contentItems={contentItems}
              onNavigate={handleNavigate}
              onEditItem={(item) => handleOpenCreateContent(item)}
              onCreateNew={() => handleOpenCreateContent()}
            />
          )}

          {currentTab === 'radar' && (
            <RadarTrenModule
              trends={trends}
              onNavigate={handleNavigate}
              onOpenResearchWithTrend={handleOpenResearchWithTrend}
            />
          )}

          {currentTab === 'ideas' && (
            <IdeaBankModule
              ideas={ideas}
              contentItems={contentItems}
              onNavigate={handleNavigate}
              onEditIdea={(idea) => handleOpenCreateIdea(idea)}
              onCreateNewIdea={() => handleOpenCreateIdea()}
            />
          )}

          {currentTab === 'calendar' && (
            <CalendarModule
              contentItems={contentItems}
              onOpenContent={(item) => {
                setSelectedItemId(item.id);
                setCurrentTab('script');
              }}
            />
          )}

          {currentTab === 'script' && (
            <ScriptStudioModule
              contentItems={contentItems}
              selectedItemId={selectedItemId}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'production' && (
            <ProductionStudioModule
              contentItems={contentItems}
              selectedItemId={selectedItemId}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'research' && (
            <ResearchModule
              sources={sources}
              contentItems={contentItems}
              onOpenSourceModal={handleOpenSourceModal}
            />
          )}

          {currentTab === 'assets' && (
            <AssetLibraryModule
              assets={assets}
              contentItems={contentItems}
              onOpenAssetModal={handleOpenAssetModal}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsModule
              metrics={metrics}
              contentItems={contentItems}
              onOpenMetricModal={handleOpenMetricModal}
            />
          )}

          {currentTab === 'settings' && (
            <AiSettingsModule configs={aiConfigs} />
          )}
        </main>
      </div>

      {/* Global Search Modal ('/' trigger) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={(type, id) => {
          if (type === 'content') {
            setSelectedItemId(id);
            setCurrentTab('script');
          } else if (type === 'idea') {
            setCurrentTab('ideas');
          } else if (type === 'source') {
            setCurrentTab('research');
          } else if (type === 'trend') {
            setCurrentTab('radar');
          }
        }}
      />

      {/* Slide-over Drawer Modal for Forms */}
      <DrawerModal
        isOpen={drawerType !== null}
        onClose={() => setDrawerType(null)}
        title={
          drawerType === 'content'
            ? editingItem?.id
              ? 'Edit Konten Video'
              : 'Buat Konten Baru'
            : drawerType === 'idea'
            ? editingItem?.id
              ? 'Edit Ide Backlog'
              : 'Buat Ide Baru'
            : drawerType === 'source'
            ? editingItem?.id
              ? 'Edit Sumber Riset'
              : 'Tambah Sumber Riset & Bukti'
            : drawerType === 'asset'
            ? editingItem?.id
              ? 'Edit Metadata Aset'
              : 'Catat Aset Media Baru'
            : drawerType === 'metric'
            ? 'Input Metrik Video YouTube'
            : ''
        }
        subtitle={
          drawerType === 'content' || drawerType === 'idea'
            ? 'Format pertanyaan 5–10 kata dengan standar baku Zeinity.'
            : drawerType === 'source'
            ? 'Pastikan kutipan bukti terverifikasi dari pengumuman resmi.'
            : undefined
        }
      >
        {drawerType === 'content' && (
          <ContentForm
            type="content"
            initialData={editingItem || {}}
            onSubmit={handleFormSubmitContent}
            onCancel={() => setDrawerType(null)}
          />
        )}

        {drawerType === 'idea' && (
          <ContentForm
            type="idea"
            initialData={editingItem || {}}
            onSubmit={handleFormSubmitContent}
            onCancel={() => setDrawerType(null)}
          />
        )}

        {drawerType === 'source' && (
          <ResearchSourceForm
            initialData={editingItem || {}}
            contentItems={contentItems}
            onSubmit={handleFormSubmitSource}
            onCancel={() => setDrawerType(null)}
          />
        )}

        {drawerType === 'asset' && (
          <MediaAssetForm
            initialData={editingItem || {}}
            contentItems={contentItems}
            onSubmit={handleFormSubmitAsset}
            onCancel={() => setDrawerType(null)}
          />
        )}

        {drawerType === 'metric' && (
          <MetricForm
            initialData={editingItem || {}}
            onSubmit={handleFormSubmitMetric}
            onCancel={() => setDrawerType(null)}
          />
        )}
      </DrawerModal>
    </div>
  );
}
