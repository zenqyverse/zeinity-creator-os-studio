'use client';

import React, { useState } from 'react';
import { MediaAsset, ContentItem, AssetType } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import {
  Images,
  Plus,
  Search,
  Video,
  Image as ImageIcon,
  Music,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  Tag,
} from 'lucide-react';

interface AssetLibraryModuleProps {
  assets: MediaAsset[];
  contentItems: ContentItem[];
  onOpenAssetModal: (asset?: MediaAsset) => void;
}

export function AssetLibraryModule({
  assets,
  contentItems,
  onOpenAssetModal,
}: AssetLibraryModuleProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredAssets = assets.filter((a) => {
    const matchSearch =
      !search ||
      a.asset_name.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === 'all' || a.asset_type === typeFilter;
    return matchSearch && matchType;
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Hapus metadata aset "${name}"?`)) {
      studioStore.deleteAsset(id);
      showToast(`Aset "${name}" dihapus`, 'info');
    }
  };

  const isImage = (asset: MediaAsset) => {
    if (!asset.asset_url) return false;
    return (
      asset.asset_type === 'Screenshot' ||
      asset.asset_type === 'Thumbnail frame' ||
      asset.asset_url.startsWith('data:image/') ||
      /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(asset.asset_url)
    );
  };

  const isVideo = (asset: MediaAsset) => {
    if (!asset.asset_url) return false;
    return (
      asset.asset_type === 'Screen recording' ||
      asset.asset_type === 'B-roll' ||
      asset.asset_url.startsWith('data:video/') ||
      /\.(mp4|webm|mov|m4v)($|\?)/i.test(asset.asset_url)
    );
  };

  const isAudio = (asset: MediaAsset) => {
    if (!asset.asset_url) return false;
    return (
      asset.asset_type === 'Audio' ||
      asset.asset_url.startsWith('data:audio/') ||
      /\.(mp3|wav|ogg|m4a|aac)($|\?)/i.test(asset.asset_url)
    );
  };

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'Screen recording':
      case 'B-roll':
        return <Video className="w-4 h-4 text-zcyan" />;
      case 'Screenshot':
      case 'Thumbnail frame':
        return <ImageIcon className="w-4 h-4 text-zaccent" />;
      case 'Audio':
        return <Music className="w-4 h-4 text-zpink" />;
      default:
        return <FileSpreadsheet className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            MEDIA ASSET CATALOG
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Perpustakaan Aset Media</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Katalog metadata aset produksi: Screen recording 1080p, tangkapan layar antarmuka, voiceover clean, dan klip B-roll terhubung per video.
          </p>
        </div>

        <button
          onClick={() => onOpenAssetModal()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-md shadow-zcyan/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          + Catat Aset Baru
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-zpanel border border-zline flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-zmuted" />
          <input
            type="text"
            placeholder="Cari nama aset atau tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-zink placeholder-zmuted outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zmuted text-[11px]">Tipe Aset:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none"
          >
            <option value="all">Semua Tipe</option>
            <option value="Screen recording">Screen recording</option>
            <option value="Screenshot">Screenshot</option>
            <option value="B-roll">B-roll</option>
            <option value="Audio">Audio</option>
            <option value="Thumbnail frame">Thumbnail frame</option>
          </select>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zmuted text-xs border border-dashed border-zline rounded-2xl bg-zpanel/40">
            Belum ada aset terdaftar yang cocok dengan filter.
          </div>
        ) : (
          filteredAssets
            .filter((asset, i, arr) => arr.findIndex((x) => x.id === asset.id) === i)
            .map((asset, idx) => {
            const linked = contentItems.find((c) => c.id === asset.content_id);

            return (
              <div
                key={`${asset.id}-${idx}`}
                className="p-5 rounded-2xl bg-zpanel border border-zline hover:border-zaccent/50 transition-all space-y-3 flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-zink">
                      {getAssetIcon(asset.asset_type)}
                      <span>{asset.asset_type}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        asset.asset_status === 'Ready'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : asset.asset_status === 'Needs edit'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-zline/50 text-zmuted border-zline'
                      }`}
                    >
                      {asset.asset_status}
                    </span>
                  </div>

                  {/* Thumbnail / Media Preview */}
                  {isImage(asset) && (
                    <div
                      onClick={() => onOpenAssetModal(asset)}
                      className="relative w-full h-36 rounded-xl overflow-hidden bg-black/30 border border-zline/60 cursor-pointer group/thumb"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.asset_url}
                        alt={asset.asset_name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
                      />
                    </div>
                  )}

                  {isVideo(asset) && (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-black/60 border border-zline/60 flex items-center justify-center group/video">
                      <video
                        src={asset.asset_url}
                        preload="metadata"
                        className="w-full h-full object-cover"
                        controls={false}
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/video:bg-black/10 transition-colors">
                        <div className="p-2.5 rounded-full bg-zcyan/90 text-black shadow-md">
                          <Video className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}

                  {isAudio(asset) && (
                    <div className="p-2.5 rounded-xl bg-zpanel-2 border border-zline/60 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-zpink text-[11px] font-bold">
                        <Music className="w-3.5 h-3.5" />
                        <span>Audio Voiceover</span>
                      </div>
                      <audio src={asset.asset_url} controls className="w-full h-7" />
                    </div>
                  )}

                  <div>
                    <h3
                      onClick={() => onOpenAssetModal(asset)}
                      className="text-sm font-bold text-zink hover:text-zcyan cursor-pointer truncate transition-colors"
                      title={asset.asset_name}
                    >
                      {asset.asset_name}
                    </h3>
                    {asset.storage_path && (
                      <div className="text-[10px] font-mono text-zmuted truncate mt-0.5">
                        {asset.storage_path}
                      </div>
                    )}
                  </div>

                  {/* Asset Tags */}
                  {asset.asset_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {asset.asset_tags.map((t, idx) => (
                        <span
                          key={`tag-${t}-${idx}`}
                          className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-zpanel-2 text-[10px] text-zmuted border border-zline"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Linked content indicator */}
                  {linked && (
                    <div className="text-[11px] text-zmuted truncate">
                      Konten: <strong className="text-zink">{linked.title}</strong>
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="pt-3 border-t border-zline/50 flex items-center justify-between text-xs text-zmuted">
                  <div className="flex items-center gap-2">
                    {asset.asset_url && (
                      <a
                        href={asset.asset_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zcyan hover:underline flex items-center gap-1 text-[11px]"
                      >
                        Buka File <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenAssetModal(asset)}
                      className="px-2 py-1 rounded bg-zpanel-2 hover:bg-zline/60 border border-zline text-[11px] font-semibold text-zink transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id, asset.asset_name)}
                      className="p-1 rounded text-zmuted hover:text-red-400"
                      title="Hapus aset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
