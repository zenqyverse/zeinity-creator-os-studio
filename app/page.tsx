'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { UnifiedStudioModal } from '../components/UnifiedStudioModal';
import { DrawerModal } from '../components/DrawerModal';
import { ContentForm, ResearchSourceForm, MediaAssetForm, MetricForm } from '../components/forms/StudioForms';
import { useToast } from '../components/ToastContainer';
import MacTerminalDock from '../components/MacTerminalDock';
import { ChevronUp } from 'lucide-react';

// Modules
import { OverviewModule } from '../components/modules/OverviewModule';
import { PipelineModule } from '../components/modules/PipelineModule';
import { RadarTrenModule } from '../components/modules/RadarTrenModule';
import { IdeaBankModule } from '../components/modules/IdeaBankModule';
import { CalendarModule } from '../components/modules/CalendarModule';
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

  // Modal drawers & Studio Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'content' | 'idea' | 'source' | 'asset' | 'metric' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [studioModalItem, setStudioModalItem] = useState<ContentItem | null>(null);
  const [settingsTab, setSettingsTab] = useState<'supabase' | 'youtube' | 'telegram' | 'ai' | 'rss'>('telegram');

  // Scroll management
  const mainRef = useRef<HTMLElement>(null);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);

  // Smooth scroll helper
  const scrollToTop = (smooth = true) => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
    try {
      window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    } catch {
      // Fallback
    }
  };

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

  // Auto scroll to top on tab switch or selected content item change
  useEffect(() => {
    scrollToTop(true);
  }, [currentTab, selectedItemId]);

  // Auto scroll to top when a modal form/drawer finishes and closes
  const prevDrawerTypeRef = useRef<typeof drawerType>(drawerType);
  useEffect(() => {
    if (prevDrawerTypeRef.current !== null && drawerType === null) {
      scrollToTop(true);
    }
    prevDrawerTypeRef.current = drawerType;
  }, [drawerType]);

  // Monitor scroll on <main> container to toggle floating "Ke Atas" button
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      setShowScrollTopBtn(mainEl.scrollTop > 240);
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen to custom global scroll-to-top event from anywhere in the app
  useEffect(() => {
    const handleScrollEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ smooth?: boolean }>;
      const smooth = customEvent.detail?.smooth ?? true;
      scrollToTop(smooth);
    };

    window.addEventListener('zeinity:scroll-to-top', handleScrollEvent);
    return () => window.removeEventListener('zeinity:scroll-to-top', handleScrollEvent);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' triggers Global Search unless typing in input, textarea, or studio modal is open
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) &&
        !isStudioModalOpen
      ) {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // Ctrl+S or Cmd+S instant save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (isStudioModalOpen) {
          // Handled internally by UnifiedStudioModal
          return;
        }

        e.preventDefault();
        
        // 1. Dispatch custom event for page-level editors
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

      // Esc closes drawers & modals
      if (e.key === 'Escape') {
        if (isStudioModalOpen) {
          // Handled internally by UnifiedStudioModal
          return;
        }
        if (isSearchOpen) setIsSearchOpen(false);
        if (drawerType) setDrawerType(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, drawerType, isStudioModalOpen, showToast]);

  // Unified Studio Modal Handlers
  const handleOpenStudioModal = (item: ContentItem) => {
    const freshItem = studioStore.getContentById(item.id) || item;
    setStudioModalItem(freshItem);
    setIsStudioModalOpen(true);
  };

  const handleCloseStudioModal = () => {
    setIsStudioModalOpen(false);
    setStudioModalItem(null);
  };

  const handleUpdateStudioItem = (updatedItem: ContentItem) => {
    studioStore.saveContentItem(updatedItem);
    setStudioModalItem(updatedItem);
    syncFromStore();
  };

  // Tab Navigation Handler
  const handleNavigate = (tab: string, itemId?: string) => {
    if (tab === 'script' || tab === 'production') {
      if (itemId) {
        const item = studioStore.getContentById(itemId) || contentItems.find((c) => c.id === itemId);
        if (item) {
          handleOpenStudioModal(item);
        }
      }
      setCurrentTab('pipeline');
      return;
    }
    setCurrentTab(tab);
    if (tab === 'settings' && itemId) {
      setSettingsTab(itemId as any);
    }
    if (itemId) setSelectedItemId(itemId);
  };

  // Fallback redirect for retired script & production tabs
  useEffect(() => {
    if (currentTab === 'script' || currentTab === 'production') {
      if (selectedItemId) {
        const item = studioStore.getContentById(selectedItemId) || contentItems.find((c) => c.id === selectedItemId);
        if (item) {
          handleOpenStudioModal(item);
        }
      }
      setCurrentTab('pipeline');
    }
  }, [currentTab, selectedItemId, contentItems]);

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
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl w-full mx-auto scroll-smooth">
          {currentTab === 'overview' && (
            <OverviewModule
              contentItems={contentItems}
              ideas={ideas}
              trends={trends}
              onNavigate={handleNavigate}
              onCreateContent={() => handleOpenCreateContent()}
              onCreateIdea={() => handleOpenCreateIdea()}
              onOpenStudio={handleOpenStudioModal}
            />
          )}

          {currentTab === 'pipeline' && (
            <PipelineModule
              contentItems={contentItems}
              onNavigate={handleNavigate}
              onEditItem={handleOpenStudioModal}
              onOpenStudio={handleOpenStudioModal}
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
              onOpenContent={handleOpenStudioModal}
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
            <AiSettingsModule configs={aiConfigs} initialTab={settingsTab} />
          )}
        </main>
      </div>

      {/* Global Search Modal ('/' trigger) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={(type, id, item) => {
          if (type === 'content') {
            const target = item || studioStore.getContentById(id) || contentItems.find((c) => c.id === id);
            if (target) {
              handleOpenStudioModal(target);
            }
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
            onDelete={() => {
              syncFromStore();
              setDrawerType(null);
            }}
          />
        )}

        {drawerType === 'idea' && (
          <ContentForm
            type="idea"
            initialData={editingItem || {}}
            onSubmit={handleFormSubmitContent}
            onCancel={() => setDrawerType(null)}
            onDelete={() => {
              syncFromStore();
              setDrawerType(null);
            }}
          />
        )}

        {drawerType === 'source' && (
          <ResearchSourceForm
            initialData={editingItem || {}}
            contentItems={contentItems}
            onSubmit={handleFormSubmitSource}
            onCancel={() => setDrawerType(null)}
            onDelete={() => {
              syncFromStore();
              setDrawerType(null);
            }}
          />
        )}

        {drawerType === 'asset' && (
          <MediaAssetForm
            initialData={editingItem || {}}
            contentItems={contentItems}
            onSubmit={handleFormSubmitAsset}
            onCancel={() => setDrawerType(null)}
            onDelete={() => {
              syncFromStore();
              setDrawerType(null);
            }}
          />
        )}

        {drawerType === 'metric' && (
          <MetricForm
            initialData={editingItem || {}}
            onSubmit={handleFormSubmitMetric}
            onCancel={() => setDrawerType(null)}
            onDelete={() => {
              syncFromStore();
              setDrawerType(null);
            }}
          />
        )}
      </DrawerModal>

      {/* Floating Scroll-to-Top Button */}
      {showScrollTopBtn && (
        <button
          onClick={() => scrollToTop(true)}
          className="fixed bottom-6 right-6 z-40 px-3.5 py-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white shadow-xl shadow-black/50 backdrop-blur-md transition-all duration-300 transform hover:scale-105 flex items-center gap-2 group cursor-pointer"
          title="Kembali ke atas"
          aria-label="Kembali ke atas"
        >
          <ChevronUp className="w-4 h-4 text-zaccent group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-xs font-semibold pr-1 text-zinc-300 group-hover:text-white">
            Ke Atas
          </span>
        </button>
      )}

      {/* Unified Studio Modal */}
      <UnifiedStudioModal
        isOpen={isStudioModalOpen}
        item={studioModalItem}
        onClose={handleCloseStudioModal}
        onUpdateItem={handleUpdateStudioItem}
      />

      <MacTerminalDock />
    </div>
  );
}
