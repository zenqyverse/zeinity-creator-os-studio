"use client";

import React, { useEffect, useState } from 'react';
import { diagnosticService, DiagnosticLog, Subsystem } from '../lib/diagnostic-service';

export default function MacTerminalDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [activeFilter, setActiveFilter] = useState<Subsystem | 'all'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [isMaximized, setIsMaximized] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Load initial logs
    setLogs(diagnosticService.getLogs());

    // Subscribe to new logs
    const unsubscribe = diagnosticService.subscribe(() => {
      setLogs(diagnosticService.getLogs());
    });

    // Global keyboard shortcut: Ctrl+`
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '\`') {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Listen to a custom event that might be dispatched by TopHeader
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-mac-terminal', handleToggle);
    return () => window.removeEventListener('toggle-mac-terminal', handleToggle);
  }, []);

  const handleSelfTest = async () => {
    setIsTesting(true);
    try {
      await diagnosticService.runSelfTest();
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    diagnosticService.clearLogs();
  };

  const handleCopy = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.subsystem}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Log disalin ke clipboard');
  };

  const handleExport = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.subsystem}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeinity-diagnostics-${new Date().toISOString()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = activeFilter === 'all' ? logs : logs.filter(l => l.subsystem === activeFilter);

  if (!isOpen) {
    return null;
  }

  const filters: { label: string; value: Subsystem | 'all' }[] = [
    { label: 'Semua', value: 'all' },
    { label: 'Supabase', value: 'supabase' },
    { label: 'AI Agent', value: 'ai' },
    { label: 'YouTube API', value: 'youtube' },
    { label: 'Radar Ingestion', value: 'radar' },
    { label: 'Validator', value: 'validator' },
    { label: 'Storage', value: 'storage' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full z-[150] px-3 pb-3 font-mono text-xs sm:text-sm shadow-2xl transition-all duration-300">
      <div className={`bg-[#18181b]/95 backdrop-blur-md rounded-t-xl overflow-hidden border border-zinc-700 shadow-2xl flex flex-col transition-all duration-300 ${
        isMaximized ? 'h-[75vh]' : 'max-h-[50vh] h-[380px]'
      }`}>
        {/* Mac OS Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#202023] border-b border-zinc-700/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none transition-colors"
              title="Tutup Terminal"
            />
            <button
              onClick={() => setIsOpen(false)}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 focus:outline-none transition-colors"
              title="Minimize Terminal"
            />
            <button
              onClick={() => setIsMaximized(prev => !prev)}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 focus:outline-none transition-colors"
              title={isMaximized ? "Kembalikan Ukuran" : "Perbesar Terminal"}
            />
          </div>

          <div className="text-zinc-300 text-xs font-semibold tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ZEINITY DIAGNOSTIC TERMINAL
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelfTest}
              disabled={isTesting}
              className="text-xs text-blue-400 hover:text-blue-300 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isTesting && <span className="w-2.5 h-2.5 rounded-full border border-blue-400 border-t-transparent animate-spin"></span>}
              {isTesting ? 'Menguji...' : 'Tes Kesehatan Sistem'}
            </button>
            <button
              onClick={handleCopy}
              className="text-xs text-zinc-300 hover:text-white px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
            >
              Salin
            </button>
            <button
              onClick={handleExport}
              className="text-xs text-zinc-300 hover:text-white px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
            >
              Ekspor
            </button>
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 p-2 bg-[#1b1b1e] border-b border-zinc-700/80 shrink-0 overflow-x-auto">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                activeFilter === f.value
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              [{f.label}]
            </button>
          ))}
        </div>

        {/* Logs Area */}
        <div className="flex-1 overflow-y-auto p-3 text-zinc-300 space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <p className="text-xs">Belum ada catatan log pada filter ini.</p>
              <button
                onClick={handleSelfTest}
                className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold border border-blue-500/30 transition-colors"
              >
                Jalankan Tes Kesehatan Sistem Sekarang
              </button>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="flex flex-col">
                <div
                  className="flex items-start gap-2.5 hover:bg-white/5 p-1 rounded cursor-pointer transition-colors"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <span className="text-zinc-500 shrink-0 text-[11px]">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span
                    className={`shrink-0 uppercase w-[65px] text-xs font-bold ${
                      log.level === 'error'
                        ? 'text-red-400'
                        : log.level === 'warn'
                        ? 'text-yellow-400'
                        : log.level === 'success'
                        ? 'text-green-400'
                        : 'text-blue-400'
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-purple-400 shrink-0 w-[75px] font-semibold">
                    [{log.subsystem}]
                  </span>
                  <span className="flex-1 break-words leading-tight">{log.message}</span>
                </div>

                {/* Expanded details */}
                {expandedLogId === log.id && (log.details || log.humanizedExplanation) && (
                  <div className="ml-4 sm:ml-[160px] mt-1.5 mb-2 p-3 bg-black/60 rounded-lg border border-zinc-700/60 text-xs space-y-2">
                    {log.details && (
                      <div className="text-zinc-400 whitespace-pre-wrap">{log.details}</div>
                    )}
                    {log.humanizedExplanation && (
                      <div className="space-y-2 border-t border-zinc-700/60 pt-2">
                        <div>
                          <strong className="text-red-300 block mb-0.5">Apa yang terjadi:</strong>
                          <span className="text-zinc-200">{log.humanizedExplanation.whatHappened}</span>
                        </div>
                        <div>
                          <strong className="text-yellow-300 block mb-0.5">Akar masalah sebenarnya:</strong>
                          <span className="text-zinc-200">{log.humanizedExplanation.rootCause}</span>
                        </div>
                        <div>
                          <strong className="text-green-300 block mb-0.5">Langkah solusi konkret:</strong>
                          <ol className="list-decimal list-inside text-zinc-200 space-y-0.5 mt-0.5">
                            {log.humanizedExplanation.actionableSteps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
