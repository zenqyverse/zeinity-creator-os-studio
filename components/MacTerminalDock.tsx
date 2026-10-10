"use client";

import React, { useEffect, useState } from 'react';
import { diagnosticService, DiagnosticLog, Subsystem } from '../lib/diagnostic-service';

export default function MacTerminalDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [activeFilter, setActiveFilter] = useState<Subsystem | 'all'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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

  const handleSelfTest = () => {
    diagnosticService.runSelfTest();
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
    return null; // or a floating trigger button
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
    <div className="fixed bottom-0 left-0 w-full z-[100] px-4 pb-4 font-mono text-sm shadow-2xl transition-all duration-300">
      <div className="bg-[#1e1e1e]/90 backdrop-blur-md rounded-t-xl overflow-hidden border border-gray-700 shadow-2xl max-h-[50vh] flex flex-col">
        {/* Mac OS Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsOpen(false)} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none"></button>
            <button onClick={() => setIsOpen(false)} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 focus:outline-none"></button>
            <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 focus:outline-none"></button>
          </div>
          <div className="text-gray-400 text-xs font-semibold tracking-wider">ZEINITY DIAGNOSTIC TERMINAL</div>
          <div className="flex items-center gap-2">
            <button onClick={handleSelfTest} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-gray-800 rounded">Tes Kesehatan Sistem</button>
            <button onClick={handleCopy} className="text-xs text-gray-300 hover:text-white px-2 py-1 bg-gray-800 rounded">Salin</button>
            <button onClick={handleExport} className="text-xs text-gray-300 hover:text-white px-2 py-1 bg-gray-800 rounded">Ekspor</button>
            <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-gray-800 rounded">Clear</button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-2 bg-[#252525] border-b border-gray-700 shrink-0 overflow-x-auto">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-1 rounded text-xs whitespace-nowrap ${activeFilter === f.value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
            >
              [{f.label}]
            </button>
          ))}
        </div>

        {/* Logs Area */}
        <div className="flex-1 overflow-y-auto p-4 text-gray-300 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-gray-500 italic">Tidak ada log.</div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="flex flex-col">
                <div 
                  className="flex items-start gap-3 hover:bg-white/5 p-1 rounded cursor-pointer"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <span className="text-gray-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={`shrink-0 uppercase w-[70px] text-xs font-bold ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    log.level === 'success' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>
                    [{log.level}]
                  </span>
                  <span className="text-purple-400 shrink-0 w-[80px]">[{log.subsystem}]</span>
                  <span className="flex-1 break-words">{log.message}</span>
                </div>
                
                {/* Expanded details */}
                {expandedLogId === log.id && (log.details || log.humanizedExplanation) && (
                  <div className="ml-[180px] mt-2 mb-2 p-3 bg-black/40 rounded border border-gray-700/50 text-sm">
                    {log.details && (
                      <div className="text-gray-400 mb-2 whitespace-pre-wrap">{log.details}</div>
                    )}
                    {log.humanizedExplanation && (
                      <div className="space-y-3 mt-2 border-t border-gray-700/50 pt-2">
                        <div>
                          <strong className="text-red-300 block mb-1">Apa yang terjadi:</strong>
                          <span className="text-gray-200">{log.humanizedExplanation.whatHappened}</span>
                        </div>
                        <div>
                          <strong className="text-yellow-300 block mb-1">Akar masalah sebenarnya:</strong>
                          <span className="text-gray-200">{log.humanizedExplanation.rootCause}</span>
                        </div>
                        <div>
                          <strong className="text-green-300 block mb-1">Langkah solusi konkret:</strong>
                          <ol className="list-decimal list-inside text-gray-200 space-y-1 mt-1">
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
