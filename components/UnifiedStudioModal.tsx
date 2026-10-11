'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ContentItem,
  ContentTier,
  AspectRatio,
  ScriptChapter,
  Pillar,
  VideoFormat,
  EditorialStatus,
  Priority,
  VisualReadiness,
  ScriptVersion,
  ProductionChecklist,
} from '../lib/types';
import { studioStore } from '../lib/storage';
import { useToast } from './ToastContainer';
import { TitleValidatorBar } from './TitleValidatorBar';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { WpmMeter } from './WpmMeter';
import {
  exportCleanNarrationForTts,
  generateYouTubeChapters,
  generateYouTubeSeoDescription,
  generateYouTubeTags,
  generatePinnedComment,
  generateThumbnailHooks,
} from '../lib/export-utils';
import {
  calculateScriptEconomy,
  calculateChaptersScriptEconomy,
  validateTitle,
  autoSplitRawScript,
} from '../lib/validator';
import {
  X,
  Save,
  Sparkles,
  Copy,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Video,
  FileText,
  CheckSquare,
  Square,
  ExternalLink,
  Clock,
  Calendar,
  ChevronRight,
  Eye,
  Smartphone,
  Monitor,
  AlertTriangle,
  Tag,
  MessageSquare,
  History,
  RotateCcw,
  Scissors,
  Wand2,
  ListChecks,
  CheckCircle2,
  Sliders,
  ChevronDown,
  Info,
} from 'lucide-react';

export interface UnifiedStudioModalProps {
  isOpen: boolean;
  item: ContentItem | null;
  onClose: () => void;
  onUpdateItem?: (updatedItem: ContentItem) => void;
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

const PILLARS: Pillar[] = [
  'Internet & Social Media',
  'AI & Technology',
  'Digital Economy & Consumer Culture',
  'Gaming & Digital Entertainment',
  'Modern Life & Human Behavior',
];

const FORMAT_PRESETS: Record<ContentTier, VideoFormat[]> = {
  short: ['Flash News', 'Quick Breakdown', 'Myth Buster', 'Actionable Tip', 'Kustom'],
  mid: ['Deep Explainer', 'Mini Tutorial', 'Case Breakdown', 'Kustom'],
  long: ['Video Essay', 'Masterclass', 'Case Investigation', 'Ecosystem Review', 'Kustom'],
  'Shorts': ['Flash News', 'Quick Breakdown', 'Myth Buster', 'Actionable Tip', 'Kustom'],
  'Mid-Form': ['Deep Explainer', 'Mini Tutorial', 'Case Breakdown', 'Kustom'],
  'Long-Form': ['Video Essay', 'Masterclass', 'Case Investigation', 'Ecosystem Review', 'Kustom'],
};

function formatDurationSeconds(sec: number): string {
  const rounded = Math.max(0, Math.round(sec));
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

function formatTimestampMinutes(sec: number): string {
  const rounded = Math.max(0, Math.round(sec));
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function toLocalDatetimeString(d: Date): string {
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function safeIsoStringFromLocal(dateStr: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

function getNextDayAtHour(targetDay: number, hour: number, minute: number = 0): string {
  const d = new Date();
  const currentDay = d.getDay();
  let daysDiff = targetDay - currentDay;
  if (daysDiff < 0 || (daysDiff === 0 && (d.getHours() > hour || (d.getHours() === hour && d.getMinutes() >= minute)))) {
    daysDiff += 7;
  }
  d.setDate(d.getDate() + daysDiff);
  d.setHours(hour, minute, 0, 0);
  return toLocalDatetimeString(d);
}

export function UnifiedStudioModal({
  isOpen,
  item,
  onClose,
  onUpdateItem,
}: UnifiedStudioModalProps) {
  const { showToast } = useToast();

  // Active Tab: 1=script, 2=packaging, 3=metadata
  const [activeTab, setActiveTab] = useState<'script' | 'packaging' | 'metadata'>('script');

  // Core Form State
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<ContentTier>('short');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [pillar, setPillar] = useState<Pillar>('AI & Technology');
  const [format, setFormat] = useState<VideoFormat>('Quick Breakdown');
  const [customFormat, setCustomFormat] = useState('');
  const [status, setStatus] = useState<EditorialStatus>('Ide');
  const [priority, setPriority] = useState<Priority>('Sedang');
  const [visualReadiness, setVisualReadiness] = useState<VisualReadiness>('Belum dicek');
  const [targetWpm, setTargetWpm] = useState<number>(145);
  const [sourceUrl, setSourceUrl] = useState('');
  const [productionDue, setProductionDue] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [notes, setNotes] = useState('');

  // Script Fields (Shorts)
  const [hook, setHook] = useState('');
  const [context, setContext] = useState('');
  const [payoff, setPayoff] = useState('');
  const [ending, setEnding] = useState('');

  // Script Fields (Mid/Long Chapters)
  const [chapters, setChapters] = useState<ScriptChapter[]>([]);

  // Packaging & SEO
  const [seoDescription, setSeoDescription] = useState('');
  const [seoTags, setSeoTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [pinnedComment, setPinnedComment] = useState('');
  const [thumbnailHooks, setThumbnailHooks] = useState<string[]>(['', '', '']);
  const [previewThumbnailIndex, setPreviewThumbnailIndex] = useState<number>(0);
  const [feedPreviewMode, setFeedPreviewMode] = useState<'desktop' | 'mobile'>('mobile');

  // Checklist State
  const [checklist, setChecklist] = useState<ProductionChecklist | null>(null);

  // Versions State
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [versionNote, setVersionNote] = useState('');

  // Auto-Split Raw Modal
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [rawSplitText, setRawSplitText] = useState('');

  // UI state
  const [showTitleValidator, setShowTitleValidator] = useState(false);
  const [autosaveIndicator, setAutosaveIndicator] = useState<
    'Tersimpan' | 'Menyimpan...' | 'Tersimpan otomatis'
  >('Tersimpan');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reference to track initial/last saved state
  const lastSavedRef = useRef<{
    id: string;
    title: string;
    tier: ContentTier;
    format: string;
    targetWpm: number;
    hook: string;
    context: string;
    payoff: string;
    ending: string;
    chaptersJson: string;
    seoDesc: string;
    tagsJson: string;
    pinned: string;
    thumbJson: string;
    status: EditorialStatus;
  }>({
    id: '',
    title: '',
    tier: 'short',
    format: '',
    targetWpm: 145,
    hook: '',
    context: '',
    payoff: '',
    ending: '',
    chaptersJson: '[]',
    seoDesc: '',
    tagsJson: '[]',
    pinned: '',
    thumbJson: '[]',
    status: 'Ide',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExecuteDelete = () => {
    if (!item?.id) return;
    const targetTitle = title || item.title || 'Konten';
    studioStore.deleteItem(item.id);
    showToast(`Konten "${targetTitle}" berhasil dihapus`, 'info', true);
    setShowDeleteConfirm(false);
    onClose();
  };

  // Copy helper
  const handleCopyText = async (text: string, key: string, label: string) => {
    if (!text || text.trim().length === 0) {
      showToast(`${label} masih kosong`, 'info');
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      showToast(`${label} disalin ke clipboard!`, 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast(`Gagal menyalin ${label}`, 'error');
    }
  };

  // Sync state when incoming item changes
  useEffect(() => {
    if (!item) return;

    setTitle(item.title || '');
    const activeTier = item.content_tier || 'short';
    setTier(activeTier);
    setAspectRatio(item.aspect_ratio || (activeTier === 'long' ? '16:9' : '9:16'));
    setPillar(item.pillar || 'AI & Technology');

    const fmt = item.format || (activeTier === 'short' ? 'Quick Breakdown' : activeTier === 'mid' ? 'Deep Explainer' : 'Video Essay');
    setFormat(fmt);
    const presets = FORMAT_PRESETS[activeTier];
    if (presets.includes(fmt)) {
      setCustomFormat('');
    } else {
      setCustomFormat(fmt);
    }

    setStatus(item.status || 'Ide');
    setPriority(item.priority || 'Sedang');
    setVisualReadiness(item.visual_readiness || 'Belum dicek');
    setTargetWpm(item.target_wpm || 145);
    setSourceUrl(item.source_url || '');
    let initialPub = '';
    if (item.publish_date) {
      const d = new Date(item.publish_date);
      initialPub = !isNaN(d.getTime()) ? toLocalDatetimeString(d) : item.publish_date.slice(0, 16);
    }
    setPublishDate(initialPub);

    setHook(item.script_hook || item.hook || '');
    setContext(item.script_context || '');
    setPayoff(item.script_payoff || '');
    setEnding(item.script_ending || '');

    const initialChapters: ScriptChapter[] =
      Array.isArray(item.script_chapters) && item.script_chapters.length > 0
        ? item.script_chapters
        : [
            {
              id: 'ch-1',
              chapter_number: 1,
              title: 'Konteks & Masalah',
              timestamp_estimate: '00:15',
              content: '',
              word_count: 0,
            },
            {
              id: 'ch-2',
              chapter_number: 2,
              title: 'Solusi & Bukti Riil',
              timestamp_estimate: '01:00',
              content: '',
              word_count: 0,
            },
          ];
    setChapters(initialChapters);

    setSeoDescription(item.seo_description || '');
    setSeoTags(Array.isArray(item.seo_tags) ? item.seo_tags : []);
    setPinnedComment(item.pinned_comment_prompt || '');

    const initialHooks = Array.isArray(item.thumbnail_hooks) && item.thumbnail_hooks.length > 0
      ? [
          item.thumbnail_hooks[0] || '',
          item.thumbnail_hooks[1] || '',
          item.thumbnail_hooks[2] || '',
        ]
      : ['', '', ''];
    setThumbnailHooks(initialHooks);

    // Load checklist & versions
    const chk = studioStore.getChecklist(item.id);
    setChecklist(chk);
    setVersions(studioStore.getScriptVersions(item.id));

    lastSavedRef.current = {
      id: item.id,
      title: item.title || '',
      tier: activeTier,
      format: fmt,
      targetWpm: item.target_wpm || 145,
      hook: item.script_hook || item.hook || '',
      context: item.script_context || '',
      payoff: item.script_payoff || '',
      ending: item.script_ending || '',
      chaptersJson: JSON.stringify(initialChapters),
      seoDesc: item.seo_description || '',
      tagsJson: JSON.stringify(item.seo_tags || []),
      pinned: item.pinned_comment_prompt || '',
      thumbJson: JSON.stringify(initialHooks),
      status: item.status || 'Ide',
    };
  }, [item?.id]);

  // Handle tier change
  const handleTierChange = (newTier: ContentTier) => {
    setTier(newTier);
    if (newTier === 'long') {
      setAspectRatio('16:9');
    } else if (newTier === 'short') {
      setAspectRatio('9:16');
    }
    const defaultFmt =
      newTier === 'short' ? 'Quick Breakdown' : newTier === 'mid' ? 'Deep Explainer' : 'Video Essay';
    setFormat(defaultFmt);
    setCustomFormat('');
  };

  // Economy calculation
  const economyResult = useMemo(() => {
    if (tier === 'short') {
      return calculateScriptEconomy(hook, context, payoff, ending, format, targetWpm, tier);
    } else {
      return calculateChaptersScriptEconomy(chapters, format, targetWpm, tier, hook, ending);
    }
  }, [tier, hook, context, payoff, ending, chapters, format, targetWpm]);

  // Calculate clean narration text
  const cleanNarrationText = useMemo(() => {
    if (!item) return '';
    const tempItem: ContentItem = {
      ...item,
      content_tier: tier,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
      script_chapters: chapters,
    };
    return exportCleanNarrationForTts(tempItem);
  }, [item, tier, hook, context, payoff, ending, chapters]);

  // Dynamic timestamp estimate calculator for chapters
  const getChapterTimestamp = (index: number): string => {
    const wpm = Math.max(130, Math.min(160, targetWpm || 145));
    const countWords = (t?: string) => (t || '').trim().split(/\s+/).filter(Boolean).length;
    let runningSec = Math.round((countWords(hook) / wpm) * 60);
    for (let i = 0; i < index; i++) {
      const words = chapters[i].content && chapters[i].content.trim()
        ? countWords(chapters[i].content)
        : (chapters[i].word_count || 0);
      runningSec += Math.max(15, Math.round((words / wpm) * 60));
    }
    return formatTimestampMinutes(runningSec);
  };

  // Chapters & Timestamps generator calculation
  const generatedChaptersText = useMemo(() => {
    const tempItem: Partial<ContentItem> = {
      id: item?.id || 'temp',
      type: 'content',
      title,
      pillar,
      format: customFormat.trim() || format,
      status,
      priority,
      visual_readiness: visualReadiness,
      content_tier: tier,
      aspect_ratio: aspectRatio,
      target_wpm: targetWpm,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
      script_chapters: chapters,
    };
    return generateYouTubeChapters(tempItem);
  }, [item?.id, title, pillar, format, customFormat, status, priority, visualReadiness, tier, aspectRatio, targetWpm, hook, context, payoff, ending, chapters]);

  // Save changes to store
  const executeSave = (isAutosave = false, statusOverride?: EditorialStatus): ContentItem | null => {
    if (!item?.id) return null;

    const finalFormat = customFormat.trim().length > 0 ? customFormat.trim() : format;
    const finalStatus = statusOverride || status;
    const countWords = (t?: string) => (t || '').trim().split(/\s+/).filter(Boolean).length;

    let totalWords = 0;
    if (tier === 'short') {
      totalWords = countWords(hook) + countWords(context) + countWords(payoff) + countWords(ending);
    } else {
      totalWords =
        countWords(hook) +
        chapters.reduce((sum, ch) => sum + (ch.content && ch.content.trim() ? countWords(ch.content) : (ch.word_count || 0)), 0) +
        countWords(ending);
    }
    const dur = Math.round((totalWords / targetWpm) * 60 * 10) / 10;

    const chaptersWithTimestamps: ScriptChapter[] = chapters.map((ch, idx) => ({
      ...ch,
      chapter_number: idx + 1,
      timestamp_estimate: getChapterTimestamp(idx),
      word_count: ch.content && ch.content.trim() ? countWords(ch.content) : (ch.word_count || 0),
    }));

    const payload: Partial<ContentItem> & { id: string } = {
      ...item,
      id: item.id,
      title: title.trim() || 'Untitled',
      content_tier: tier,
      aspect_ratio: aspectRatio,
      pillar,
      format: finalFormat,
      status: finalStatus,
      priority,
      visual_readiness: visualReadiness,
      target_wpm: targetWpm,
      source_url: sourceUrl.trim(),
      production_due: productionDue || undefined,
      publish_date: safeIsoStringFromLocal(publishDate),
      notes: notes.trim(),
      hook: hook.trim(),
      script_hook: hook.trim(),
      script_context: context.trim(),
      script_payoff: payoff.trim(),
      script_ending: ending.trim(),
      script_chapters: chaptersWithTimestamps,
      seo_description: seoDescription.trim(),
      seo_tags: seoTags,
      pinned_comment_prompt: pinnedComment.trim(),
      thumbnail_hooks: thumbnailHooks,
      word_count: totalWords,
      duration_estimate: dur,
    };

    const saved = studioStore.saveContentItem(payload);

    lastSavedRef.current = {
      id: saved.id,
      title: saved.title,
      tier,
      format: finalFormat,
      targetWpm,
      hook,
      context,
      payoff,
      ending,
      chaptersJson: JSON.stringify(chaptersWithTimestamps),
      seoDesc: seoDescription,
      tagsJson: JSON.stringify(seoTags),
      pinned: pinnedComment,
      thumbJson: JSON.stringify(thumbnailHooks),
      status: finalStatus,
    };

    if (onUpdateItem) {
      onUpdateItem(saved);
    }

    if (!isAutosave) {
      showToast('Konten berhasil disimpan!', 'success');
    }

    return saved;
  };

  // Mutable ref so keyboard listeners always invoke latest executeSave closure
  const executeSaveRef = useRef(executeSave);
  executeSaveRef.current = executeSave;

  // Debounced Autosave (1000ms)
  useEffect(() => {
    if (!isOpen || !item?.id) return;

    const base = lastSavedRef.current;
    if (base.id !== item.id) return;

    const isDirty =
      base.title !== title ||
      base.tier !== tier ||
      base.format !== (customFormat.trim() || format) ||
      base.targetWpm !== targetWpm ||
      base.hook !== hook ||
      base.context !== context ||
      base.payoff !== payoff ||
      base.ending !== ending ||
      base.chaptersJson !== JSON.stringify(chapters) ||
      base.seoDesc !== seoDescription ||
      base.tagsJson !== JSON.stringify(seoTags) ||
      base.pinned !== pinnedComment ||
      base.thumbJson !== JSON.stringify(thumbnailHooks);

    if (!isDirty) return;

    setAutosaveIndicator('Menyimpan...');
    const timer = setTimeout(() => {
      executeSave(true);
      setAutosaveIndicator('Tersimpan otomatis');
      setTimeout(() => setAutosaveIndicator('Tersimpan'), 2000);
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    title,
    tier,
    format,
    customFormat,
    targetWpm,
    hook,
    context,
    payoff,
    ending,
    chapters,
    seoDescription,
    seoTags,
    pinnedComment,
    thumbnailHooks,
    isOpen,
    item?.id,
  ]);

  // Safe close handler: flushes any dirty state before closing so no edits are lost
  const handleRequestClose = () => {
    const base = lastSavedRef.current;
    if (base.id === item?.id) {
      const isDirty =
        base.title !== title ||
        base.tier !== tier ||
        base.format !== (customFormat.trim() || format) ||
        base.targetWpm !== targetWpm ||
        base.hook !== hook ||
        base.context !== context ||
        base.payoff !== payoff ||
        base.ending !== ending ||
        base.chaptersJson !== JSON.stringify(chapters) ||
        base.seoDesc !== seoDescription ||
        base.tagsJson !== JSON.stringify(seoTags) ||
        base.pinned !== pinnedComment ||
        base.thumbJson !== JSON.stringify(thumbnailHooks);

      if (isDirty) {
        executeSave(true);
      }
    }
    onClose();
  };

  const handleRequestCloseRef = useRef(handleRequestClose);
  handleRequestCloseRef.current = handleRequestClose;

  // Keyboard Shortcuts (Ctrl+1, Ctrl+2, Ctrl+3, Ctrl+S, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc
      if (e.key === 'Escape') {
        if (isSplitModalOpen) {
          setIsSplitModalOpen(false);
          return;
        }
        if (isVersionsOpen) {
          setIsVersionsOpen(false);
          return;
        }
        e.preventDefault();
        handleRequestCloseRef.current();
        return;
      }

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('script');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('packaging');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('metadata');
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          executeSaveRef.current(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSplitModalOpen, isVersionsOpen]);

  // Advance Editorial Status
  const handleAdvanceStatus = () => {
    const currentIdx = STAGES.indexOf(status);
    if (currentIdx < STAGES.length - 1) {
      const nextStatus = STAGES[currentIdx + 1];
      setStatus(nextStatus);
      executeSave(false, nextStatus);
      showToast(`Status dimajukan ke "${nextStatus}"!`, 'success');
    }
  };

  // Chapter handlers
  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    const newCh: ScriptChapter = {
      id: `ch-${Date.now()}-${nextNum}`,
      chapter_number: nextNum,
      title: `Bab ${nextNum}: Topik Bahasan`,
      timestamp_estimate: '00:00',
      content: '',
      word_count: 0,
    };
    setChapters([...chapters, newCh]);
    showToast(`Bab ${nextNum} ditambahkan`, 'info');
  };

  const handleUpdateChapter = (
    index: number,
    field: 'title' | 'content' | 'timestamp_estimate',
    val: string
  ) => {
    setChapters((prev) => {
      const next = [...prev];
      const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
      if (field === 'content') {
        next[index] = {
          ...next[index],
          content: val,
          word_count: countWords(val),
        };
      } else {
        next[index] = {
          ...next[index],
          [field]: val,
        };
      }
      return next;
    });
  };

  const handleDeleteChapter = (index: number) => {
    if (chapters.length <= 1) {
      showToast('Minimal harus ada 1 bab bahasan', 'info');
      return;
    }
    setChapters((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((ch, i) => ({ ...ch, chapter_number: i + 1 }));
    });
    showToast('Bab berhasil dihapus', 'info');
  };

  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;
    setChapters((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((ch, i) => ({ ...ch, chapter_number: i + 1 }));
    });
  };

  // SEO Generators
  const handleGenerateDescription = () => {
    const tempItem: Partial<ContentItem> = {
      id: item?.id || 'temp',
      type: 'content',
      title,
      pillar,
      format: customFormat.trim() || format,
      status,
      priority,
      visual_readiness: visualReadiness,
      content_tier: tier,
      aspect_ratio: aspectRatio,
      target_wpm: targetWpm,
      source_url: sourceUrl,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
      script_chapters: chapters,
    };
    setSeoDescription(generateYouTubeSeoDescription(tempItem));
    showToast('Draf deskripsi YouTube berhasil dibuat!', 'success');
  };

  const handleGenerateTags = () => {
    const tempItem: Partial<ContentItem> = {
      id: item?.id || 'temp',
      type: 'content',
      title,
      pillar,
      format: customFormat.trim() || format,
      content_tier: tier,
      aspect_ratio: aspectRatio,
    };
    setSeoTags(generateYouTubeTags(tempItem));
    showToast('10 Tag rekomendasi YouTube dibuat!', 'success');
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#+/, '').toLowerCase();
    if (!trimmed) return;
    if (seoTags.includes(trimmed)) {
      showToast('Tag sudah ada', 'info');
      return;
    }
    setSeoTags([...seoTags, trimmed]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setSeoTags(seoTags.filter((t) => t !== tag));
  };

  const handleGeneratePinnedComment = () => {
    const tempItem: Partial<ContentItem> = {
      id: item?.id || 'temp',
      type: 'content',
      title,
    };
    setPinnedComment(generatePinnedComment(tempItem));
    showToast('Pertanyaan interaktif dibuat!', 'success');
  };

  const handleGenerateThumbnailHooks = () => {
    const tempItem: Partial<ContentItem> = {
      id: item?.id || 'temp',
      type: 'content',
      title,
    };
    setThumbnailHooks(generateThumbnailHooks(tempItem));
    showToast('3 Konsep Hook Visual Thumbnail dibuat!', 'success');
  };

  // Checklist toggle
  const handleToggleChecklist = (key: keyof ProductionChecklist) => {
    if (!item?.id || !checklist) return;
    const updated = studioStore.updateChecklist(item.id, {
      [key]: !checklist[key],
    });
    setChecklist(updated);
  };

  // Revision Version Snapshots
  const handleSaveVersionSnapshot = () => {
    if (!item?.id) return;
    const countWords = (t?: string) => (t || '').trim().split(/\s+/).filter(Boolean).length;
    const totalWords =
      tier === 'short'
        ? countWords(hook) + countWords(context) + countWords(payoff) + countWords(ending)
        : countWords(hook) +
          chapters.reduce((sum, ch) => sum + (ch.word_count || countWords(ch.content)), 0) +
          countWords(ending);

    const newVer = studioStore.saveScriptVersion({
      content_id: item.id,
      title: versionNote.trim() ? `${title} (${versionNote.trim()})` : title,
      format,
      content_tier: tier,
      target_wpm: targetWpm,
      script_hook: hook,
      script_context: context,
      script_payoff: payoff,
      script_ending: ending,
      script_chapters: chapters,
      word_count: totalWords,
      duration_estimate: Math.round((totalWords / targetWpm) * 60 * 10) / 10,
    });

    setVersions(studioStore.getScriptVersions(item.id));
    setVersionNote('');
    setIsVersionsOpen(false);
    showToast(`Snapshot revisi v${newVer.version_number} tersimpan!`, 'success');
  };

  const handleRestoreVersion = (ver: ScriptVersion) => {
    studioStore.restoreScriptVersion(ver.id);

    const restoredTier = ver.content_tier || tier;
    setTier(restoredTier);
    if (restoredTier === 'long') {
      setAspectRatio('16:9');
    } else if (restoredTier === 'short') {
      setAspectRatio('9:16');
    }

    if (ver.format) {
      setFormat(ver.format);
      if (FORMAT_PRESETS[restoredTier]?.includes(ver.format)) {
        setCustomFormat('');
      } else {
        setCustomFormat(ver.format);
      }
    }

    setHook(ver.script_hook || '');
    setContext(ver.script_context || '');
    setPayoff(ver.script_payoff || '');
    setEnding(ver.script_ending || '');
    setChapters(Array.isArray(ver.script_chapters) ? ver.script_chapters : []);
    setTargetWpm(ver.target_wpm || 145);

    const updatedParent = studioStore.getContentById(ver.content_id);
    if (updatedParent && onUpdateItem) {
      onUpdateItem(updatedParent);
    }

    lastSavedRef.current = {
      id: ver.content_id,
      title: ver.title,
      tier: restoredTier,
      format: ver.format || format,
      targetWpm: ver.target_wpm || 145,
      hook: ver.script_hook || '',
      context: ver.script_context || '',
      payoff: ver.script_payoff || '',
      ending: ver.script_ending || '',
      chaptersJson: JSON.stringify(ver.script_chapters || []),
      seoDesc: seoDescription,
      tagsJson: JSON.stringify(seoTags),
      pinned: pinnedComment,
      thumbJson: JSON.stringify(thumbnailHooks),
      status,
    };

    setAutosaveIndicator('Tersimpan');
    setVersions(studioStore.getScriptVersions(item!.id));
    setIsVersionsOpen(false);
    showToast(`Naskah dipulihkan ke revisi v${ver.version_number}!`, 'success');
  };

  // Quick Auto-Split Raw
  const handleApplyAutoSplit = () => {
    const res = autoSplitRawScript(rawSplitText);
    setHook(res.hook);
    setContext(res.context);
    setPayoff(res.payoff);
    setEnding(res.ending);
    setIsSplitModalOpen(false);
    setRawSplitText('');
    showToast('Teks naskah otomatis dipecah ke 4 panggung!', 'success');
  };

  // AI Tightener
  const handleAiTightener = () => {
    const stripFluff = (text: string) => {
      return text
        .replace(/\b(sebenarnya|pada dasarnya|tentunya|perlu diketahui bahwa|seperti yang kita tahu|bisa dibilang)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    setHook(stripFluff(hook));
    setContext(stripFluff(context));
    setPayoff(stripFluff(payoff));
    setEnding(stripFluff(ending));

    if (chapters.length > 0) {
      setChapters((prev) =>
        prev.map((ch) => ({
          ...ch,
          content: stripFluff(ch.content),
          word_count: stripFluff(ch.content).split(/\s+/).filter(Boolean).length,
        }))
      );
    }

    showToast('AI Tightener: Kata mubazir berhasil dipangkas!', 'success');
  };

  if (!isOpen || !item) return null;

  const titleValidation = validateTitle(title);
  const checklistItems =
    tier === 'short'
      ? [
          { key: 'checklist_voiceover' as const, label: 'Voiceover jernih & pacing 130–160 WPM' },
          { key: 'checklist_broll' as const, label: 'Visual B-Roll dinamis berganti tiap 2–3 detik' },
          { key: 'checklist_captions' as const, label: 'Teks layar / Captions akurat di safe zone 60%' },
          { key: 'checklist_audio' as const, label: 'Audio balance (VO dominan, BGM -18dB s/d -22dB)' },
          { key: 'checklist_music' as const, label: 'Musik latar aman hak cipta YouTube Audio Library' },
          { key: 'checklist_contrast' as const, label: 'Kontras visual & teks terbaca jelas di ponsel' },
          { key: 'checklist_final' as const, label: 'Seamless Loop / Ending menyatu ke detik pertama' },
        ]
      : [
          { key: 'checklist_chapters' as const, label: 'Struktur Bab / Chapters rapi & sinkron timestamp' },
          { key: 'checklist_thumbnail' as const, label: 'Thumbnail 16:9 CTR tinggi, teks < 5 kata jelas di HP' },
          { key: 'checklist_seo' as const, label: 'Deskripsi YouTube, Chapters & 5–10 Tags SEO lengkap' },
          { key: 'checklist_lufs' as const, label: 'Standar Kenyaringan Audio (-14 LUFS YouTube Standard)' },
          { key: 'checklist_pacing' as const, label: 'Pacing narasi dinamis antar bab tanpa dead-air' },
          { key: 'checklist_hook_retention' as const, label: 'Hook 15 detik pertama memikat retensi penonton' },
          { key: 'checklist_final' as const, label: 'Review Final Ekspor (Resolusi 1080p/4K 60fps, color grading)' },
        ];

  const completedChecksCount = checklist
    ? checklistItems.filter((chk) => Boolean(checklist[chk.key])).length
    : 0;
  const checklistPercentage = Math.round((completedChecksCount / checklistItems.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-[95vw] max-w-7xl h-[90vh] bg-zpanel border border-zline rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
        {/* ============================================================== */}
        {/* HEADER BAR                                                     */}
        {/* ============================================================== */}
        <header className="px-5 py-3.5 border-b border-zline bg-zpanel-2/90 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Left: Title + Inline Edit + Tier & Status Badges */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Content Tier Selector */}
              <div className="relative inline-flex items-center">
                <select
                  value={tier}
                  onChange={(e) => handleTierChange(e.target.value as ContentTier)}
                  className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border outline-none cursor-pointer transition-colors ${
                    tier === 'short'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                      : tier === 'mid'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  <option value="short" className="bg-zpanel text-zink">
                    Shorts (9:16)
                  </option>
                  <option value="mid" className="bg-zpanel text-zink">
                    Mid-Form (1–3m)
                  </option>
                  <option value="long" className="bg-zpanel text-zink">
                    Long-Form (16:9)
                  </option>
                </select>
              </div>

              {/* Status Badge */}
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zpanel border border-zline text-zcyan">
                {status}
              </span>

              {/* Advance Status Quick Button */}
              {status !== 'Terbit' && (
                <button
                  onClick={handleAdvanceStatus}
                  className="text-[11px] font-bold px-2 py-0.5 rounded bg-zcyan/15 hover:bg-zcyan/25 text-zcyan border border-zcyan/30 flex items-center gap-1 transition-colors"
                  title="Majukan status editorial ke tahap selanjutnya"
                >
                  <span>Majukan Status</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}

              {/* Words & Duration Indicator */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zmuted px-2 py-0.5 rounded bg-zpanel border border-zline/60">
                <Clock className="w-3 h-3 text-zcyan" />
                <span className="font-bold text-zink">{economyResult.totalWords} kata</span>
                <span>•</span>
                <span
                  className={
                    economyResult.isDurationSafe ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  ~{formatDurationSeconds(economyResult.estimatedSeconds)}
                </span>
              </div>
            </div>

            {/* Title Inline Edit Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul Konten (Format pertanyaan 5–10 kata)..."
                className="w-full text-sm sm:text-base font-extrabold text-zink bg-transparent border-b border-transparent hover:border-zline focus:border-zcyan outline-none py-0.5 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowTitleValidator(!showTitleValidator)}
                className={`p-1 rounded text-[11px] font-bold border transition-colors shrink-0 ${
                  titleValidation.isValid
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                    : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                }`}
                title="Buka / Tutup Validator Judul"
              >
                {titleValidation.isValid ? '✓ Valid' : '! Validator'}
              </button>
            </div>
          </div>

          {/* Right: Tab Switcher & Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zpanel border border-zline text-xs font-bold">
              <button
                onClick={() => setActiveTab('script')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'script'
                    ? 'bg-zcyan text-black shadow-sm'
                    : 'text-zmuted hover:text-zink'
                }`}
                title="Naskah Studio (Tekan Ctrl+1)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Naskah Studio</span>
              </button>
              <button
                onClick={() => setActiveTab('packaging')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'packaging'
                    ? 'bg-zcyan text-black shadow-sm'
                    : 'text-zmuted hover:text-zink'
                }`}
                title="Packaging, SEO & Thumbnail (Tekan Ctrl+2)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Packaging, SEO & Thumbnail</span>
              </button>
              <button
                onClick={() => setActiveTab('metadata')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'metadata'
                    ? 'bg-zcyan text-black shadow-sm'
                    : 'text-zmuted hover:text-zink'
                }`}
                title="Metadata & Checklist (Tekan Ctrl+3)"
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Metadata & Checklist</span>
              </button>
            </div>

            {/* Autosave Status Indicator */}
            <span className="text-[11px] text-zmuted hidden sm:inline-block px-1">
              {autosaveIndicator}
            </span>

            {/* Delete Content Button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl bg-zpanel-2 hover:bg-rose-500/20 border border-zline text-zmuted hover:text-rose-400 transition-colors"
              title="Hapus Konten dari Pipeline"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
            </button>

            {/* Manual Save Button */}
            <button
              onClick={() => executeSave(false)}
              className="p-2 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-zink hover:text-zcyan transition-colors"
              title="Simpan Perubahan (Ctrl+S)"
            >
              <Save className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={handleRequestClose}
              className="p-2 rounded-xl bg-zpanel-2 hover:bg-rose-500/20 border border-zline text-zmuted hover:text-rose-400 transition-colors"
              title="Tutup Modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Collapsible Title Validator Banner */}
        {showTitleValidator && (
          <div className="p-3 border-b border-zline bg-zpanel animate-in slide-in-from-top-2">
            <TitleValidatorBar title={title} />
          </div>
        )}

        {/* ============================================================== */}
        {/* MAIN BODY: 3 TABS                                              */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ============================================================ */}
          {/* TAB 1: NASKAH STUDIO                                          */}
          {/* ============================================================ */}
          {activeTab === 'script' && (
            <div className="space-y-6">
              {/* Studio Toolbar (WPM, Versions, Clean Kaggle TTS Copy, AI Tightener) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zpanel-2 border border-zline">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* WPM Pacing Selector */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-zmuted text-[11px]">Tempo VO:</span>
                    <div className="flex items-center gap-1 bg-zpanel border border-zline rounded-lg px-2 py-1">
                      <Sliders className="w-3 h-3 text-zcyan" />
                      <input
                        type="range"
                        min="130"
                        max="160"
                        step="1"
                        value={targetWpm}
                        onChange={(e) => setTargetWpm(Number(e.target.value))}
                        className="w-20 accent-zcyan cursor-pointer"
                      />
                      <span className="font-extrabold text-zink text-xs ml-1">{targetWpm} WPM</span>
                    </div>
                  </div>

                  {/* Versions Drawer Trigger */}
                  <button
                    onClick={() => setIsVersionsOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-xs font-semibold text-zink flex items-center gap-1.5 transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-zcyan" />
                    <span>Versi & Riwayat ({versions.length})</span>
                  </button>

                  {/* Quick Auto-Split Raw Button */}
                  <button
                    onClick={() => setIsSplitModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-xs font-semibold text-zink flex items-center gap-1.5 transition-colors"
                  >
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto-Split Teks</span>
                  </button>

                  {/* AI Tightener Button */}
                  <button
                    onClick={handleAiTightener}
                    className="px-2.5 py-1.5 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-xs font-semibold text-zink flex items-center gap-1.5 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-zcyan" />
                    <span>AI Tightener (Pangkas Basa-Basi)</span>
                  </button>
                </div>

                {/* 1-Click Kaggle TTS Clean Narration Copy Button */}
                <button
                  onClick={() =>
                    handleCopyText(
                      cleanNarrationText,
                      'kaggle-tts',
                      'Narasi Bersih untuk Kaggle TTS'
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs shadow-sm flex items-center gap-2 transition-all"
                  title="Salin plain text narasi bersih tanpa catatan sutradara / instruksi visual untuk Kaggle AI Voice Cloning"
                >
                  {copiedKey === 'kaggle-tts' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Salin Narasi Bersih untuk Kaggle TTS</span>
                </button>
              </div>

              {/* Mode A: Shorts (4-Stage Classic Interface) */}
              {tier === 'short' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stage 1: Hook */}
                    <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px] font-extrabold">
                            1
                          </span>
                          <span className="text-xs font-extrabold text-zink uppercase">
                            Hook (0–3s)
                          </span>
                        </div>
                        <span className="text-[10px] text-zmuted">
                          {hook.trim().split(/\s+/).filter(Boolean).length} kata • Stop the scroll
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={hook}
                        onChange={(e) => setHook(e.target.value)}
                        placeholder="Kail visual & audio detik pertama. Tanpa dead air, langsung ke intisari kontras..."
                        className="w-full p-3 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan transition-colors"
                      />
                    </div>

                    {/* Stage 2: Context */}
                    <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[10px] font-extrabold">
                            2
                          </span>
                          <span className="text-xs font-extrabold text-zink uppercase">
                            Konteks (4–10s)
                          </span>
                        </div>
                        <span className="text-[10px] text-zmuted">
                          {context.trim().split(/\s+/).filter(Boolean).length} kata • Kenapa harus peduli
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Konteks masalah atau kejadian penting. Kenapa penonton harus terus menyimak sekarang..."
                        className="w-full p-3 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan transition-colors"
                      />
                    </div>

                    {/* Stage 3: Payoff */}
                    <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-extrabold">
                            3
                          </span>
                          <span className="text-xs font-extrabold text-zink uppercase">
                            Payoff / Daging (11–45s)
                          </span>
                        </div>
                        <span className="text-[10px] text-zmuted">
                          {payoff.trim().split(/\s+/).filter(Boolean).length} kata • Solusi & Bukti
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        value={payoff}
                        onChange={(e) => setPayoff(e.target.value)}
                        placeholder="Inti jawaban, demonstrasi, bukti riil platform, potong dead air secara agresif..."
                        className="w-full p-3 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan transition-colors"
                      />
                    </div>

                    {/* Stage 4: Ending / Loop */}
                    <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-[10px] font-extrabold">
                            4
                          </span>
                          <span className="text-xs font-extrabold text-zink uppercase">
                            Ending / Loop (46–60s)
                          </span>
                        </div>
                        <span className="text-[10px] text-zmuted">
                          {ending.trim().split(/\s+/).filter(Boolean).length} kata • Seamless replay
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        value={ending}
                        onChange={(e) => setEnding(e.target.value)}
                        placeholder="Kalimat penutup yang menyambung mulus kembali ke detik pembuka (seamless loop) atau Smart CTA..."
                        className="w-full p-3 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan transition-colors"
                      />
                    </div>
                  </div>

                  {/* WPM & Economy Meter Bar */}
                  <WpmMeter
                    hook={hook}
                    context={context}
                    payoff={payoff}
                    ending={ending}
                    format={format}
                    targetWpm={targetWpm}
                    tier={tier}
                    onWpmChange={(w: number) => setTargetWpm(w)}
                  />
                </div>
              )}

              {/* Mode B: Mid & Long-Form (Dynamic Chapters Mode) */}
              {(tier === 'mid' || tier === 'long') && (
                <div className="space-y-5">
                  {/* Visual Hook / Premis Utama (0–15s) */}
                  <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px] font-extrabold">
                          H
                        </span>
                        <span className="text-xs font-extrabold text-zink uppercase">
                          Visual Hook & Executive Premis (0–15s)
                        </span>
                      </div>
                      <span className="text-[10px] text-zmuted">
                        {hook.trim().split(/\s+/).filter(Boolean).length} kata • Pertahankan retensi 15s
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={hook}
                      onChange={(e) => setHook(e.target.value)}
                      placeholder="Premis pembuka video horizontal: Ajukan pertanyaan besar, tampilkan cuplikan konklusi, dan alasan mengapa video ini penting..."
                      className="w-full p-3 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan transition-colors"
                    />
                  </div>

                  {/* Dynamic Chapters Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-zcyan" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink">
                          Daftar Bab Bahasan ({chapters.length} Bab)
                        </h4>
                      </div>
                      <button
                        onClick={handleAddChapter}
                        className="px-3 py-1.5 rounded-lg bg-zcyan text-black font-extrabold text-xs shadow-sm hover:bg-zcyan-hover flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Bab Baru</span>
                      </button>
                    </div>

                    {/* Chapter Cards */}
                    {chapters.map((ch, idx) => (
                      <div
                        key={ch.id}
                        className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-3 transition-colors hover:border-zline/90"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <span className="w-6 h-6 rounded-lg bg-zpanel border border-zline text-zcyan font-extrabold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={ch.title}
                              onChange={(e) => handleUpdateChapter(idx, 'title', e.target.value)}
                              placeholder={`Judul Bab ${idx + 1}...`}
                              className="font-bold text-xs text-zink bg-transparent border-b border-transparent focus:border-zcyan outline-none py-1 flex-1 transition-colors"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded bg-zpanel border border-zline/70 font-mono text-[11px] font-bold text-zcyan flex items-center gap-1"
                              title="Estimasi timestamp mulai bab di timeline video"
                            >
                              <Clock className="w-3 h-3 text-zcyan" />
                              <span>{getChapterTimestamp(idx)}</span>
                            </span>
                            <span className="text-[11px] text-zmuted">
                              {ch.word_count || ch.content.trim().split(/\s+/).filter(Boolean).length} kata
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMoveChapter(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1.5 rounded bg-zpanel border border-zline text-zmuted hover:text-zink disabled:opacity-30 transition-colors"
                                title="Pindah ke atas"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveChapter(idx, 'down')}
                                disabled={idx === chapters.length - 1}
                                className="p-1.5 rounded bg-zpanel border border-zline text-zmuted hover:text-zink disabled:opacity-30 transition-colors"
                                title="Pindah ke bawah"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteChapter(idx)}
                                className="p-1.5 rounded bg-zpanel border border-zline text-zmuted hover:text-rose-400 transition-colors"
                                title="Hapus bab"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <textarea
                          rows={4}
                          value={ch.content}
                          onChange={(e) => handleUpdateChapter(idx, 'content', e.target.value)}
                          placeholder={`Tulis narasi untuk bab "${ch.title}" di sini...`}
                          className="w-full p-3 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan transition-colors"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Outro / Call-to-Action */}
                  <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-[10px] font-extrabold">
                          O
                        </span>
                        <span className="text-xs font-extrabold text-zink uppercase">
                          Outro & Smart Call-to-Action
                        </span>
                      </div>
                      <span className="text-[10px] text-zmuted">
                        {ending.trim().split(/\s+/).filter(Boolean).length} kata • Rekomendasi video
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={ending}
                      onChange={(e) => setEnding(e.target.value)}
                      placeholder="Ringkasan inti, pandangan penutup, ajakan subscribe bernilai tinggi, atau rekomendasi video berikutnya..."
                      className="w-full p-3 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan transition-colors"
                    />
                  </div>

                  {/* Accumulated Duration Status Bar */}
                  <div className="p-4 rounded-xl bg-zpanel-2 border border-zline flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-zcyan" />
                      <div>
                        <span className="font-bold text-zmuted">Akumulasi Naskah: </span>
                        <span className="font-extrabold text-zink">{economyResult.totalWords} kata</span>
                        <span className="text-zmuted mx-1.5">•</span>
                        <span className="font-extrabold text-zcyan">
                          ~{formatDurationSeconds(economyResult.estimatedSeconds)}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-zmuted">
                      Target format {format}: {economyResult.formatTargetSeconds.min}–
                      {economyResult.formatTargetSeconds.max}s ({economyResult.formatTargetSeconds.wordMin}–
                      {economyResult.formatTargetSeconds.wordMax} kata)
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: PACKAGING, SEO & THUMBNAIL LAB                         */}
          {/* ============================================================ */}
          {activeTab === 'packaging' && (
            <div className="space-y-6">
              {/* Section 1: YouTube Packaging & SEO */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Auto Video Chapters / Timestamps */}
                <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-zcyan" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink">
                        Video Chapters / Timestamps Otomatis
                      </h4>
                    </div>
                    <button
                      onClick={() =>
                        handleCopyText(
                          generatedChaptersText,
                          'chapters',
                          'Chapters & Timestamps'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-[11px] font-bold text-zcyan flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'chapters' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Salin Chapters</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zmuted">
                    Dihitung otomatis dari durasi kata per bab/panggung dengan tempo {targetWpm} WPM.
                  </p>
                  <textarea
                    rows={6}
                    readOnly
                    value={generatedChaptersText}
                    className="w-full p-3 rounded-lg bg-zpanel border border-zline font-mono text-xs text-zink outline-none"
                  />
                </div>

                {/* Right: Pinned Comment Engagement Prompt */}
                <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-zcyan" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink">
                        Pinned Comment Prompt
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleGeneratePinnedComment}
                        className="px-2.5 py-1 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-[11px] font-bold text-zink flex items-center gap-1 transition-colors"
                      >
                        <Wand2 className="w-3 h-3 text-zcyan" />
                        <span>Generate</span>
                      </button>
                      <button
                        onClick={() =>
                          handleCopyText(
                            pinnedComment,
                            'pinned',
                            'Pinned Comment'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-[11px] font-bold text-zcyan flex items-center gap-1 transition-colors"
                      >
                        {copiedKey === 'pinned' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Salin</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-zmuted">
                    Pertanyaan pemantik komentar penonton untuk meningkatkan sinyal interaksi algoritma YouTube.
                  </p>
                  <textarea
                    rows={6}
                    value={pinnedComment}
                    onChange={(e) => setPinnedComment(e.target.value)}
                    placeholder="Tulis atau generate pertanyaan diskusi di sini..."
                    className="w-full p-3 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan transition-colors"
                  />
                </div>
              </div>

              {/* Section 2: SEO Description Generator */}
              <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zcyan" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink">
                      Deskripsi YouTube SEO Lengkap
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateDescription}
                      className="px-3 py-1.5 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-xs font-bold text-zink flex items-center gap-1.5 transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-zcyan" />
                      <span>Buat Draf Otomatis</span>
                    </button>
                    <button
                      onClick={() =>
                        handleCopyText(
                          seoDescription,
                          'desc',
                          'Deskripsi YouTube'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-zcyan hover:bg-zcyan-hover text-black font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      {copiedKey === 'desc' ? (
                        <Check className="w-3.5 h-3.5 text-black" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-black" />
                      )}
                      <span>Salin Deskripsi</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-zmuted">
                  Menyertakan paragraf pembuka bervolume kata kunci, chapters otomatis, ringkasan, dan rujukan sumber.
                </p>
                <textarea
                  rows={8}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Draf deskripsi YouTube SEO siap pakai..."
                  className="w-full p-3.5 rounded-lg bg-zpanel border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan font-mono transition-colors"
                />
              </div>

              {/* Section 3: 5–10 SEO Tags & Hashtags */}
              <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-zcyan" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink">
                      5–10 SEO Tags & Hashtags
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateTags}
                      className="px-2.5 py-1 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-xs font-bold text-zink flex items-center gap-1 transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-zcyan" />
                      <span>Rekomendasi Tag</span>
                    </button>
                    <button
                      onClick={() =>
                        handleCopyText(
                          seoTags.join(', '),
                          'tags-comma',
                          'Tags (Format Koma)'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-xs font-bold text-zcyan flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'tags-comma' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Salin Tags (Koma)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleCopyText(
                          seoTags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' '),
                          'tags-hash',
                          'Hashtags'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-xs font-bold text-zcyan flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'tags-hash' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Salin Hashtags</span>
                    </button>
                  </div>
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-zpanel border border-zline min-h-[50px]">
                  {seoTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-zpanel-2 border border-zline text-zink"
                    >
                      <span>#{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-zmuted hover:text-rose-400 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="+ Ketik tag lalu tekan Enter..."
                      className="w-full bg-transparent text-xs text-zink placeholder-zmuted outline-none px-2 py-1"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Thumbnail Hook & A/B Concept Lab */}
              <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-zcyan" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink">
                      Thumbnail Visual Hook & Feed CTR Mockup
                    </h4>
                  </div>
                  <button
                    onClick={handleGenerateThumbnailHooks}
                    className="px-3 py-1.5 rounded-lg bg-zpanel hover:bg-zline/50 border border-zline text-xs font-bold text-zink flex items-center gap-1.5 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-zcyan" />
                    <span>Generate 3 Ide Hook Visual</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: 3 Hook Variations */}
                  <div className="space-y-3">
                    <p className="text-[11px] text-zmuted">
                      Teks pada gambar thumbnail tidak boleh mengulang judul secara mentah. Gunakan 2–4 kata yang memicu rasa penasaran (curiosity gap).
                    </p>

                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewThumbnailIndex(idx)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          previewThumbnailIndex === idx
                            ? 'bg-zpanel border-zcyan shadow-md'
                            : 'bg-zpanel border-zline hover:border-zline/90'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-extrabold text-zmuted">
                            Konsep {idx === 0 ? 'A (Emosional)' : idx === 1 ? 'B (Kontras/Peringatan)' : 'C (Rasa Penasaran)'}
                          </span>
                          {previewThumbnailIndex === idx && (
                            <span className="text-[10px] font-bold text-zcyan">Aktif di Preview</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={thumbnailHooks[idx] || ''}
                          onChange={(e) => {
                            const next = [...thumbnailHooks];
                            next[idx] = e.target.value;
                            setThumbnailHooks(next);
                          }}
                          placeholder={`Teks hook gambar ${idx + 1}...`}
                          className="w-full bg-transparent font-extrabold text-sm text-zink outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Right: YouTube Feed Card Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-zmuted uppercase">
                        Mockup Tampilan Feed YouTube
                      </span>
                      <div className="flex items-center gap-1 bg-zpanel border border-zline rounded-lg p-0.5 text-xs font-bold">
                        <button
                          onClick={() => setFeedPreviewMode('mobile')}
                          className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                            feedPreviewMode === 'mobile'
                              ? 'bg-zcyan text-black'
                              : 'text-zmuted hover:text-zink'
                          }`}
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>Mobile</span>
                        </button>
                        <button
                          onClick={() => setFeedPreviewMode('desktop')}
                          className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                            feedPreviewMode === 'desktop'
                              ? 'bg-zcyan text-black'
                              : 'text-zmuted hover:text-zink'
                          }`}
                        >
                          <Monitor className="w-3 h-3" />
                          <span>Desktop</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview Card Mockup */}
                    <div className="flex justify-center p-4 rounded-xl bg-[#0f0f0f] border border-zline">
                      {!(aspectRatio === '16:9' || item?.aspect_ratio === '16:9' || tier === 'long') &&
                      (tier === 'short' || feedPreviewMode === 'mobile') ? (
                        /* Mobile Shorts Card Mockup */
                        <div className="w-56 h-96 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 relative flex flex-col justify-between p-3 overflow-hidden shadow-2xl">
                          {/* Duration Badge */}
                          <div className="self-end px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                            {formatDurationSeconds(economyResult.estimatedSeconds)}
                          </div>

                          {/* Center Visual Hook Text on Image */}
                          <div className="text-center px-2 py-3 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
                            <h2 className="text-base font-black uppercase text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight leading-tight">
                              {thumbnailHooks[previewThumbnailIndex] || 'TEKS HOOK THUMBNAIL'}
                            </h2>
                          </div>

                          {/* Bottom Shorts Metadata */}
                          <div className="space-y-1 text-white">
                            <p className="text-xs font-bold line-clamp-2 leading-snug drop-shadow">
                              {title || 'Judul Video Shorts'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-neutral-300">
                              <span className="w-4 h-4 rounded-full bg-zcyan text-black font-extrabold flex items-center justify-center text-[9px]">
                                Z
                              </span>
                              <span>@ZeinityShorts</span>
                              <span>•</span>
                              <span>18 rb view</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 16:9 Horizontal Video Player Mockup */
                        <div className="w-full max-w-sm sm:max-w-md rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-2xl space-y-2.5">
                          {/* 16:9 Thumbnail Mockup */}
                          <div className="aspect-video w-full bg-gradient-to-br from-neutral-900 to-neutral-800 relative flex items-center justify-center p-3">
                            <div className="text-center px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
                              <h2 className="text-sm font-black uppercase text-amber-300 drop-shadow tracking-tight">
                                {thumbnailHooks[previewThumbnailIndex] || 'TEKS HOOK THUMBNAIL'}
                              </h2>
                            </div>
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                              {formatTimestampMinutes(economyResult.estimatedSeconds)}
                            </div>
                            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-zcyan border border-zcyan/30">
                              16:9 Landscape
                            </div>
                          </div>

                          {/* Video Metadata */}
                          <div className="p-3 pt-0 flex gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-zcyan text-black font-extrabold flex items-center justify-center text-xs shrink-0">
                              Z
                            </span>
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                                {title || 'Judul Video YouTube'}
                              </h3>
                              <p className="text-[11px] text-neutral-400">
                                Zeinity • {tier === 'long' ? 'Long-Form' : tier === 'mid' ? 'Mid-Form' : 'Shorts'}
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                24 rb x ditonton • 3 jam yang lalu
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: METADATA & CHECKLIST                                   */}
          {/* ============================================================ */}
          {activeTab === 'metadata' && (
            <div className="space-y-6">
              {/* Basic Metadata Grid */}
              <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink flex items-center gap-2">
                  <Info className="w-4 h-4 text-zcyan" />
                  <span>Metadata Dasar Konten</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {/* Pillar */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-zmuted uppercase tracking-wider text-[11px]">
                      Pilar Konten
                    </label>
                    <select
                      value={pillar}
                      onChange={(e) => setPillar(e.target.value as Pillar)}
                      className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink font-medium outline-none focus:border-zcyan"
                    >
                      {PILLARS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Format (Dynamic Presets per Tier) */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-zmuted uppercase tracking-wider text-[11px]">
                      Sub-Format ({tier.toUpperCase()})
                    </label>
                    <select
                      value={FORMAT_PRESETS[tier].includes(format) ? format : 'Kustom'}
                      onChange={(e) => {
                        const val = e.target.value as VideoFormat;
                        setFormat(val);
                        if (val !== 'Kustom') {
                          setCustomFormat('');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink font-medium outline-none focus:border-zcyan"
                    >
                      {FORMAT_PRESETS[tier].map((fmt) => (
                        <option key={fmt} value={fmt}>
                          {fmt}
                        </option>
                      ))}
                    </select>
                    {(format === 'Kustom' || customFormat.length > 0) && (
                      <input
                        type="text"
                        value={customFormat}
                        onChange={(e) => setCustomFormat(e.target.value)}
                        placeholder="Nama format kustom..."
                        className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-zpanel border border-zline text-zink outline-none focus:border-zcyan text-xs"
                      />
                    )}
                  </div>

                  {/* Priority */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-zmuted uppercase tracking-wider text-[11px]">
                      Prioritas Produksi
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink font-medium outline-none focus:border-zcyan"
                    >
                      <option value="Tinggi">Tinggi</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Rendah">Rendah</option>
                    </select>
                  </div>

                  {/* Visual Readiness */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-zmuted uppercase tracking-wider text-[11px]">
                      Kesiapan Visual
                    </label>
                    <select
                      value={visualReadiness}
                      onChange={(e) => setVisualReadiness(e.target.value as VisualReadiness)}
                      className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink font-medium outline-none focus:border-zcyan"
                    >
                      <option value="Siap">Siap</option>
                      <option value="Perlu aset">Perlu aset</option>
                      <option value="Belum dicek">Belum dicek</option>
                    </select>
                  </div>

                  {/* Production Due Date */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-zmuted uppercase tracking-wider text-[11px]">
                      Tenggat Produksi
                    </label>
                    <input
                      type="date"
                      value={productionDue}
                      onChange={(e) => setProductionDue(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink font-medium outline-none focus:border-zcyan"
                    />
                  </div>

                  {/* Source URL with quick open */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-zmuted uppercase tracking-wider text-[11px]">
                        Sumber Riset URL
                      </label>
                      {sourceUrl && (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zcyan hover:underline flex items-center gap-0.5 text-[10px]"
                        >
                          <span>Buka</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink font-medium outline-none focus:border-zcyan"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-zmuted uppercase tracking-wider text-[11px]">
                    Catatan Internal & Arahan Kreator
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk tim editing atau referensi khusus..."
                    className="w-full p-2.5 rounded-lg bg-zpanel border border-zline text-xs text-zink outline-none focus:border-zcyan"
                  />
                </div>
              </div>

              {/* Smart Schedule 1-Click Section */}
              <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zcyan" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink">
                      Jadwal Pintar 1-Klik
                    </h4>
                  </div>
                  <span className="text-[11px] text-zmuted">
                    Slot rilis rekomendasi audiens Zeinity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Datetime picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-zmuted font-bold">Waktu Tayang Terjadwal</label>
                    <input
                      type="datetime-local"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zpanel border border-zline text-zink font-medium text-xs outline-none focus:border-zcyan"
                    />
                  </div>

                  {/* 1-Click Preset Buttons */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-zmuted font-bold">Pilih Slot Rekomendasi:</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPublishDate(getNextDayAtHour(1, 7, 0));
                          showToast('Jadwal diatur: Senin 07:00 WIB', 'info');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zpanel hover:bg-zline/60 border border-zline text-xs font-bold text-zink hover:text-zcyan transition-colors"
                      >
                        Senin 07:00 WIB
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPublishDate(getNextDayAtHour(4, 7, 0));
                          showToast('Jadwal diatur: Kamis 07:00 WIB', 'info');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zpanel hover:bg-zline/60 border border-zline text-xs font-bold text-zink hover:text-zcyan transition-colors"
                      >
                        Kamis 07:00 WIB
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPublishDate(getNextDayAtHour(0, 7, 0));
                          showToast('Jadwal diatur: Minggu 07:00 WIB', 'info');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zpanel hover:bg-zline/60 border border-zline text-xs font-bold text-zink hover:text-zcyan transition-colors"
                      >
                        Minggu 07:00 WIB
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPublishDate(getNextDayAtHour(6, 19, 0));
                          showToast('Jadwal diatur: Sabtu 19:00 WIB (Long-Form)', 'info');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zpanel hover:bg-zline/60 border border-zline text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        Sabtu 19:00 WIB (Long)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adaptive Quality Checklist Section */}
              <div className="p-4 rounded-xl bg-zpanel-2 border border-zline space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-zcyan" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zink">
                      Checklist Kepatuhan Pra-Upload ({tier.toUpperCase()})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className={
                        checklistPercentage === 100 ? 'text-emerald-400' : 'text-amber-400'
                      }
                    >
                      {completedChecksCount} / {checklistItems.length} Selesai ({checklistPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-zpanel rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      checklistPercentage === 100 ? 'bg-emerald-400' : 'bg-zcyan'
                    }`}
                    style={{ width: `${checklistPercentage}%` }}
                  />
                </div>

                {/* Checklist Rows */}
                <div className="space-y-2">
                  {checklistItems.map((chkItem) => {
                    const isChecked = Boolean(checklist && checklist[chkItem.key]);
                    return (
                      <button
                        key={chkItem.key}
                        onClick={() => handleToggleChecklist(chkItem.key)}
                        className={`w-full p-2.5 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-zpanel border-zline text-zmuted hover:text-zink'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zmuted shrink-0" />
                        )}
                        <span className="text-xs font-medium">{chkItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone: Hapus Konten */}
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                      Zona Bahaya: Hapus Konten
                    </h4>
                    <p className="text-[11px] text-zmuted mt-0.5">
                      Hapus konten ini beserta seluruh draf naskah, adegan storyboard, dan checklist dari pipeline.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Konten Ini</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* MODAL SUB-DRAWER: VERSIONS HISTORY                             */}
        {/* ============================================================== */}
        {isVersionsOpen && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in">
            <div className="w-full max-w-md h-full bg-zpanel border-l border-zline p-5 flex flex-col justify-between shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zline">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-zcyan" />
                    <h3 className="text-sm font-extrabold text-zink">Riwayat Revisi Naskah</h3>
                  </div>
                  <button
                    onClick={() => setIsVersionsOpen(false)}
                    className="p-1 rounded text-zmuted hover:text-zink"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Save Current as New Snapshot */}
                <div className="p-3 rounded-xl bg-zpanel-2 border border-zline space-y-2">
                  <label className="text-[11px] font-bold text-zmuted uppercase">
                    Simpan Snapshot Versi Saat Ini
                  </label>
                  <input
                    type="text"
                    value={versionNote}
                    onChange={(e) => setVersionNote(e.target.value)}
                    placeholder="Label versi (misal: 'Draft Awal', 'Revisi Hook')..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zpanel border border-zline text-xs text-zink outline-none focus:border-zcyan"
                  />
                  <button
                    onClick={handleSaveVersionSnapshot}
                    className="w-full py-1.5 rounded-lg bg-zcyan text-black font-extrabold text-xs shadow-sm hover:bg-zcyan-hover transition-colors"
                  >
                    + Simpan Snapshot Naskah
                  </button>
                </div>

                {/* Versions List */}
                <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
                  {versions.length === 0 ? (
                    <p className="text-xs text-zmuted text-center py-6">
                      Belum ada snapshot tersimpan untuk naskah ini.
                    </p>
                  ) : (
                    versions.map((ver) => (
                      <div
                        key={ver.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                          ver.is_active
                            ? 'bg-zpanel-2 border-zcyan'
                            : 'bg-zpanel border-zline hover:border-zline/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-zink">v{ver.version_number}</span>
                          <span className="text-[10px] text-zmuted">
                            {new Date(ver.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-zmuted text-[11px] line-clamp-1">{ver.title}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-zmuted">
                            {ver.word_count} kata • ~{ver.duration_estimate}s
                          </span>
                          <button
                            onClick={() => handleRestoreVersion(ver)}
                            className="px-2 py-0.5 rounded bg-zpanel-2 hover:bg-zline border border-zline text-[11px] font-bold text-zcyan flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Pulihkan</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsVersionsOpen(false)}
                className="w-full py-2 rounded-xl bg-zpanel-2 border border-zline text-xs font-bold text-zmuted hover:text-zink transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL SUB-POPUP: QUICK AUTO-SPLIT RAW TEXT                     */}
        {/* ============================================================== */}
        {isSplitModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-lg bg-zpanel border border-zline rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-extrabold text-zink">Auto-Split Naskah Mentah</h3>
                </div>
                <button
                  onClick={() => setIsSplitModalOpen(false)}
                  className="p-1 rounded text-zmuted hover:text-zink"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zmuted leading-relaxed">
                Tempel draf naskah mentahmu di bawah ini. Algoritma Zeinity akan otomatis memecah dan menyusunnya ke dalam 4 panggung: Hook, Konteks, Payoff, dan Ending.
              </p>

              <textarea
                rows={8}
                value={rawSplitText}
                onChange={(e) => setRawSplitText(e.target.value)}
                placeholder="Tempel naskah panjang di sini..."
                className="w-full p-3 rounded-lg bg-zpanel-2 border border-zline text-xs text-zink placeholder-zmuted outline-none focus:border-zcyan"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsSplitModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zpanel-2 border border-zline text-xs font-bold text-zmuted hover:text-zink transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleApplyAutoSplit}
                  disabled={!rawSplitText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-zcyan text-black font-extrabold text-xs shadow-sm hover:bg-zcyan-hover disabled:opacity-40 transition-all"
                >
                  Terapkan ke 4 Panggung
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resilient Delete Confirmation Modal */}
        <ConfirmDialogModal
          isOpen={showDeleteConfirm}
          title="Hapus Konten dari Pipeline?"
          message={`Apakah Anda yakin ingin menghapus konten "${title || item?.title || ''}"? Seluruh draf naskah, storyboard, dan checklist akan dihapus dari pipeline. Anda dapat membatalkannya melalui tombol Undo.`}
          confirmLabel="Ya, Hapus Konten"
          cancelLabel="Batal"
          variant="danger"
          onConfirm={handleExecuteDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </div>
  );
}
