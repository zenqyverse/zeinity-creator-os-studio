'use client';

import React, { useState, useEffect } from 'react';
import { ContentItem, StoryboardScene } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import { SafeZoneCanvas, ProjectedShotInfo } from '../SafeZoneCanvas';
import {
  Clapperboard,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Video,
  FileText,
  Sliders,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Edit3,
  X,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';

interface ProductionStudioModuleProps {
  contentItems: ContentItem[];
  selectedItemId?: string;
  onNavigate: (tab: string, itemId?: string) => void;
}

export function ProductionStudioModule({
  contentItems,
  selectedItemId,
  onNavigate,
}: ProductionStudioModuleProps) {
  const { showToast } = useToast();

  const [activeItem, setActiveItem] = useState<ContentItem>(() => {
    if (selectedItemId) {
      const found = contentItems.find((c) => c.id === selectedItemId);
      if (found) return found;
    }
    return contentItems[0] || ({} as ContentItem);
  });

  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>(() =>
    studioStore.getStoryboardsByContentId(activeItem.id || '')
  );

  const [checklist, setChecklist] = useState(() =>
    studioStore.getChecklist(activeItem.id || '')
  );

  const [assets, setAssets] = useState(() =>
    studioStore.getAssetsByContentId(activeItem.id || '')
  );

  // Visual Projection & Storyboard In-Place Edit State
  const [selectedBgAssetUrl, setSelectedBgAssetUrl] = useState<string>('');
  const [selectedShotId, setSelectedShotId] = useState<string>('');
  const [editingScene, setEditingScene] = useState<StoryboardScene | null>(null);

  // Synchronize when selectedItemId or contentItems changes
  useEffect(() => {
    if (selectedItemId) {
      const found = contentItems.find((c) => c.id === selectedItemId);
      if (found) {
        setActiveItem(found);
        setStoryboardScenes(studioStore.getStoryboardsByContentId(found.id));
        setChecklist(studioStore.getChecklist(found.id));
        setAssets(studioStore.getAssetsByContentId(found.id));
        setSelectedShotId('');
      }
    } else if (contentItems.length > 0 && !activeItem.id) {
      const first = contentItems[0];
      setActiveItem(first);
      setStoryboardScenes(studioStore.getStoryboardsByContentId(first.id));
      setChecklist(studioStore.getChecklist(first.id));
      setAssets(studioStore.getAssetsByContentId(first.id));
      setSelectedShotId('');
    }
  }, [selectedItemId, contentItems]);

  const handleSelectContent = (id: string) => {
    const found = contentItems.find((c) => c.id === id);
    if (found) {
      setActiveItem(found);
      setStoryboardScenes(studioStore.getStoryboardsByContentId(found.id));
      setChecklist(studioStore.getChecklist(found.id));
      setAssets(studioStore.getAssetsByContentId(found.id));
      setSelectedShotId('');
    }
  };

  const handleToggleCheck = (key: keyof typeof checklist) => {
    const updated = studioStore.updateChecklist(activeItem.id, {
      [key]: !checklist[key],
    });
    setChecklist(updated);
    showToast('Checklist produksi diperbarui', 'success');
  };

  const handleAddScene = () => {
    const newScene = studioStore.saveStoryboardScene({
      content_id: activeItem.id,
      scene_order: storyboardScenes.length + 1,
      time_range: '0–6s',
      narration_text: 'Narasi adegan baru...',
      on_screen_text: 'TEKS LAYAR',
      visual_direction: 'Shot baru dengan aset B-roll',
      broll_type: 'Screen recording / Demo UI',
    });
    setStoryboardScenes([...storyboardScenes, newScene]);
    showToast('Adegan storyboard ditambahkan', 'success');
  };

  const handleDeleteScene = (id: string) => {
    studioStore.deleteStoryboardScene(id);
    setStoryboardScenes((prev) => prev.filter((s) => s.id !== id));
    if (selectedShotId === id) setSelectedShotId('');
    showToast('Adegan dihapus', 'info');
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= storyboardScenes.length) return;

    const current = storyboardScenes[index];
    const target = storyboardScenes[targetIndex];

    const currentOrder = current.scene_order;
    const targetOrder = target.scene_order;

    const updatedCurrent = studioStore.saveStoryboardScene({
      ...current,
      scene_order: targetOrder,
    });
    const updatedTarget = studioStore.saveStoryboardScene({
      ...target,
      scene_order: currentOrder,
    });

    const nextList = [...storyboardScenes];
    nextList[index] = updatedCurrent;
    nextList[targetIndex] = updatedTarget;
    nextList.sort((a, b) => a.scene_order - b.scene_order);
    setStoryboardScenes(nextList);
    showToast(`Urutan shot dipindahkan ke ${direction === 'up' ? 'atas' : 'bawah'}`, 'info');
  };

  const handleSaveEditedScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScene) return;
    const saved = studioStore.saveStoryboardScene(editingScene);
    setStoryboardScenes((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    setEditingScene(null);
    showToast('Adegan storyboard berhasil diperbarui', 'success');
  };

  const projectedScene = storyboardScenes.find((s) => s.id === selectedShotId);
  const projectedShotInfo: ProjectedShotInfo | null = projectedScene
    ? {
        shotIndex: storyboardScenes.indexOf(projectedScene) + 1,
        timeRange: projectedScene.time_range,
        onScreenText: projectedScene.on_screen_text,
        narrationText: projectedScene.narration_text,
        visualDirection: projectedScene.visual_direction,
      }
    : null;

  // Checklist items definition
  const checkItems = [
    { key: 'checklist_voiceover', label: '1. Voiceover Clean (Artikulasi jernih, jeda nafas teratur, no dead air)' },
    { key: 'checklist_broll', label: '2. B-Roll Ready (Screen recording 1080p, tangkapan layar antarmuka terpotong rapi)' },
    { key: 'checklist_captions', label: '3. Dynamic Captions (Animasi subtitle sinkron, berada di safe zone tengah 60%)' },
    { key: 'checklist_audio', label: '4. Audio Balance (VO dominan jelas -14 LUFS, background music tidak menenggelamkan suara)' },
    { key: 'checklist_music', label: '5. Copyright-Safe Music (Musik bebas klaim hak cipta dari YouTube Audio Library)' },
    { key: 'checklist_contrast', label: '6. Readable Contrast (Warna teks kuning/cyan dengan shadow gelap, kontras tinggi)' },
    { key: 'checklist_final', label: '7. Final Review (Cek ulang durasi total ≤ 60 detik sebelum render akhir)' },
  ] as const;

  const passedCount = checkItems.filter((c) => checklist[c.key as keyof typeof checklist]).length;
  const progressPct = Math.round((passedCount / checkItems.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            PRODUCTION STUDIO & SAFE ZONE
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Simulasi Visual & Storyboard</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Komposisi vertikal 9:16 (1080×1920) dengan batas aman antarmuka Shorts serta checklist kepatuhan teknis pra-render.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-zmuted text-xs">Pilih Konten:</span>
            <select
              value={activeItem.id || ''}
              onChange={(e) => handleSelectContent(e.target.value)}
              className="bg-zpanel-2 border border-zline rounded-xl px-3 py-2 text-xs font-semibold text-zink outline-none max-w-xs truncate"
            >
              {contentItems
                .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
                .map((c, idx) => (
                <option key={`${c.id}-${idx}`} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Safe Zone Simulator on Left, Storyboard & Checklist on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 9:16 Simulator Canvas */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-zpanel border border-zline flex flex-col items-center justify-center space-y-4">
          <div className="w-full flex items-center justify-between border-b border-zline/60 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zcyan" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zink">
                Simulator Kanvas 9:16
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zmuted">1080 × 1920 PX</span>
          </div>

          {/* Canvas Projection Controls */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Background Asset Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zmuted flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-zcyan" />
                <span>Latar Aset Visual:</span>
              </label>
              <select
                value={selectedBgAssetUrl}
                onChange={(e) => setSelectedBgAssetUrl(e.target.value)}
                className="w-full bg-zpanel-2 border border-zline rounded-xl px-2.5 py-1.5 text-xs text-zink outline-none truncate"
              >
                <option value="">(Default Latar Zeinity)</option>
                {assets
                  .filter((ast, i, arr) => arr.findIndex((x) => x.id === ast.id) === i)
                  .map((ast, idx) => (
                  <option key={`${ast.id}-${idx}`} value={ast.asset_url || ''}>
                    {ast.asset_name} ({ast.asset_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Shot Projection Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zmuted flex items-center gap-1">
                <Eye className="w-3 h-3 text-zaccent" />
                <span>Proyeksi Shot (Safe Zone):</span>
              </label>
              <select
                value={selectedShotId}
                onChange={(e) => setSelectedShotId(e.target.value)}
                className="w-full bg-zpanel-2 border border-zline rounded-xl px-2.5 py-1.5 text-xs text-zink outline-none truncate"
              >
                <option value="">(Judul & Hook Awal)</option>
                {storyboardScenes
                  .filter((sc, i, arr) => arr.findIndex((x) => x.id === sc.id) === i)
                  .map((scene, idx) => (
                  <option key={`${scene.id}-${idx}`} value={scene.id}>
                    Shot {idx + 1} ({scene.time_range})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SafeZoneCanvas
            title={activeItem.title}
            hookText={activeItem.script_hook || activeItem.hook}
            bgUrl={selectedBgAssetUrl || undefined}
            projectedShot={projectedShotInfo}
          />
        </div>

        {/* Right Column: Storyboard & 7-Point Compliance Checklist */}
        <div className="lg:col-span-7 space-y-6">
          {/* 7-POINT PRE-RENDER COMPLIANCE CHECKLIST */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zink">Checklist Kepatuhan Pra-Render</h3>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  passedCount === checkItems.length
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {passedCount} / {checkItems.length} Lulus ({progressPct}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-zpanel-2 rounded-full overflow-hidden border border-zline/60">
              <div
                className="h-full bg-gradient-to-r from-zcyan to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Checklist options */}
            <div className="space-y-2">
              {checkItems.map((item, idx) => {
                const isChecked = Boolean(checklist[item.key as keyof typeof checklist]);
                return (
                  <button
                    key={`${item.key}-${idx}`}
                    onClick={() => handleToggleCheck(item.key as keyof typeof checklist)}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl border text-left text-xs transition-colors ${
                      isChecked
                        ? 'bg-emerald-500/5 border-emerald-500/30 text-zink'
                        : 'bg-zpanel-2/60 border-zline/60 text-zmuted hover:text-zink'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-zmuted shrink-0 mt-0.5" />
                    )}
                    <span className={isChecked ? 'font-semibold text-emerald-300' : ''}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STORYBOARD & TIMELINE SHOT PLANNER */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-zaccent" />
                <h3 className="text-sm font-bold text-zink">Storyboard & Shot Planner (0–60s)</h3>
              </div>
              <button
                onClick={handleAddScene}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Shot
              </button>
            </div>

            <div className="space-y-3">
              {storyboardScenes.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-zline text-center text-zmuted text-xs">
                  Belum ada pembagian shot visual. Klik &quot;+ Tambah Shot&quot; untuk mulai merencanakan timeline 0–60s.
                </div>
              ) : (
                storyboardScenes
                  .filter((sc, i, arr) => arr.findIndex((x) => x.id === sc.id) === i)
                  .map((scene, idx) => (
                  <div
                    key={`${scene.id}-${idx}`}
                    className="p-3.5 rounded-xl bg-zpanel-2 border border-zline/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-zcyan/20 text-zcyan border border-zcyan/30">
                          SHOT {idx + 1} · {scene.time_range}
                        </span>
                        <span className="font-semibold text-zink">{scene.broll_type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Project to Canvas toggle button */}
                        <button
                          onClick={() => setSelectedShotId(selectedShotId === scene.id ? '' : scene.id)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            selectedShotId === scene.id
                              ? 'bg-zcyan text-black border-zcyan'
                              : 'bg-zpanel text-zmuted hover:text-zink border-zline'
                          }`}
                          title={selectedShotId === scene.id ? 'Sedang diproyeksikan ke simulator' : 'Proyeksikan teks ke kanvas 9:16'}
                        >
                          <Eye className="w-3 h-3" />
                          <span>{selectedShotId === scene.id ? 'Terproyeksi' : 'Proyeksikan'}</span>
                        </button>

                        {/* Move Up */}
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveScene(idx, 'up')}
                          className="p-1 rounded text-zmuted hover:text-zink disabled:opacity-30 disabled:pointer-events-none"
                          title="Pindahkan shot ke atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          disabled={idx === storyboardScenes.length - 1}
                          onClick={() => handleMoveScene(idx, 'down')}
                          className="p-1 rounded text-zmuted hover:text-zink disabled:opacity-30 disabled:pointer-events-none"
                          title="Pindahkan shot ke bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* In-place edit */}
                        <button
                          onClick={() => setEditingScene({ ...scene })}
                          className="p-1 rounded text-zmuted hover:text-zcyan"
                          title="Edit adegan storyboard"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteScene(scene.id)}
                          className="p-1 text-zmuted hover:text-red-400"
                          title="Hapus shot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="space-y-0.5">
                        <span className="text-zmuted font-medium">Narasi Voiceover:</span>
                        <p className="text-zink/90 italic">&quot;{scene.narration_text}&quot;</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-zmuted font-medium">Teks Layar (Center Safe Zone):</span>
                        <p className="text-zcyan font-bold">{scene.on_screen_text}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-zmuted/90 pt-1 border-t border-zline/40">
                      <strong>Arahan Visual:</strong> {scene.visual_direction}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LINKED ASSETS SUMMARY */}
          <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-zpink" />
                <h3 className="text-sm font-bold text-zink">Aset Media Proyek ({assets.length})</h3>
              </div>
              <button
                onClick={() => onNavigate('assets')}
                className="text-xs text-zcyan hover:underline"
              >
                Buka Perpustakaan Aset →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assets
                .filter((ast, i, arr) => arr.findIndex((x) => x.id === ast.id) === i)
                .map((ast, idx) => (
                <div
                  key={`${ast.id}-${idx}`}
                  className="p-2.5 rounded-xl bg-zpanel-2 border border-zline/60 flex items-center justify-between text-xs"
                >
                  <div className="truncate max-w-[180px]">
                    <div className="font-semibold text-zink truncate">{ast.asset_name}</div>
                    <div className="text-[10px] text-zmuted">{ast.asset_type}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    {ast.asset_status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* IN-PLACE STORYBOARD EDIT MODAL */}
      {editingScene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-zpanel border border-zline rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zline/60 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-zcyan" />
                <h3 className="text-base font-bold text-zink">Edit Adegan Storyboard</h3>
              </div>
              <button
                onClick={() => setEditingScene(null)}
                className="p-1 rounded-lg text-zmuted hover:text-zink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedScene} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zmuted font-semibold">Rentang Waktu</label>
                  <input
                    type="text"
                    required
                    value={editingScene.time_range}
                    onChange={(e) => setEditingScene({ ...editingScene, time_range: e.target.value })}
                    placeholder="e.g. 0–3s, 4–10s, 11–45s"
                    className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zmuted font-semibold">Tipe Visual / B-Roll</label>
                  <input
                    type="text"
                    required
                    value={editingScene.broll_type}
                    onChange={(e) => setEditingScene({ ...editingScene, broll_type: e.target.value })}
                    placeholder="e.g. Screen recording UI, B-roll"
                    className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zmuted font-semibold">Teks Layar (Center Safe Zone 60%)</label>
                <input
                  type="text"
                  required
                  value={editingScene.on_screen_text}
                  onChange={(e) => setEditingScene({ ...editingScene, on_screen_text: e.target.value })}
                  placeholder="Teks kapital yang diproyeksikan di layar..."
                  className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zmuted font-semibold">Narasi Voiceover</label>
                <textarea
                  rows={2}
                  required
                  value={editingScene.narration_text}
                  onChange={(e) => setEditingScene({ ...editingScene, narration_text: e.target.value })}
                  placeholder="Kalimat narasi pembacaan VO untuk adegan ini..."
                  className="w-full p-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zmuted font-semibold">Arahan Visual & Transisi</label>
                <textarea
                  rows={2}
                  value={editingScene.visual_direction}
                  onChange={(e) => setEditingScene({ ...editingScene, visual_direction: e.target.value })}
                  placeholder="Instruksi angle kamera, zoom-in, cursor highlight..."
                  className="w-full p-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zline/60">
                <button
                  type="button"
                  onClick={() => setEditingScene(null)}
                  className="px-4 py-2 rounded-xl bg-zpanel-2 border border-zline font-semibold text-zmuted hover:text-zink"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold shadow-sm"
                >
                  Simpan Perubahan Shot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
