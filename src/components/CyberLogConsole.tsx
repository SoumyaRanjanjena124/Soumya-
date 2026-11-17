import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Maximize2, Minimize2, Terminal, Trash2 } from 'lucide-react';
import { CyberLogEntry, LogCategory, NeonPreset } from '../types/flipper';

interface CyberLogConsoleProps {
  preset: NeonPreset;
  logs: CyberLogEntry[];
  onClear: () => void;
}

const CATEGORY_LABELS: Record<LogCategory, string> = {
  sys: 'SYS',
  auth: 'AUTH',
  wireless: 'RF/NET',
  hardware: 'HW',
};

const LEVEL_LABELS: Record<CyberLogEntry['level'], string> = {
  info: 'INFO',
  success: 'OK',
  warn: 'WARN',
  error: 'ERR',
};

export function CyberLogConsole({
  preset,
  logs,
  onClear,
}: CyberLogConsoleProps) {
  const [filter, setFilter] = useState<'all' | LogCategory>('all');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter((entry) => entry.category === filter);
  }, [logs, filter]);

  // Smoothly auto-scroll to the latest entry when new logs arrive
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredLogs.length, filter]);

  const handleCopy = async () => {
    if (filteredLogs.length === 0) return;
    const text = filteredLogs
      .map(
        (e) =>
          `[${e.timestamp}] [${CATEGORY_LABELS[e.category]}] [${LEVEL_LABELS[e.level]}] ${e.message}${
            e.detail ? ` (${e.detail})` : ''
          }`
      )
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be blocked in certain iframe contexts; ignore silently
    }
  };

  const getLevelColor = (level: CyberLogEntry['level']) => {
    if (level === 'success') return preset.primary;
    if (level === 'warn') return '#F59E0B';
    if (level === 'error') return '#FF5C72';
    return '#94A3B8';
  };

  return (
    <section
      aria-label="System Activity Log"
      className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0B0F17]/90 backdrop-blur-xl"
      style={{
        boxShadow: `0 0 28px -18px rgba(${preset.primaryRgb}, 0.32)`,
      }}
    >
      {/* Subtle Neon Top Edge Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent 5%, rgba(${preset.primaryRgb}, 0.65) 50%, transparent 95%)`,
        }}
      />

      {/* Console Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <Terminal
            className="h-4 w-4 shrink-0"
            style={{ color: preset.primary }}
          />
          <h3 className="font-display text-sm font-semibold text-white">
            System Activity Log
          </h3>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Tabs */}
          <div
            role="group"
            aria-label="Filter log events"
            className="flex items-center gap-1 rounded-lg border border-slate-800/90 bg-[#06090F] p-0.5"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'auth', label: 'Auth' },
                { id: 'wireless', label: 'Wireless' },
                { id: 'hardware', label: 'Hardware' },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[30px] rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#121926] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={
                    active
                      ? {
                          boxShadow: `inset 0 0 0 1px rgba(${preset.primaryRgb}, 0.45)`,
                        }
                      : undefined
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            disabled={filteredLogs.length === 0}
            aria-label="Copy activity log"
            className="flex min-h-[32px] items-center gap-1.5 rounded-lg border border-slate-800 bg-[#06090F] px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap transition-colors hover:border-slate-600 hover:text-white disabled:opacity-40"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" style={{ color: preset.primary }} />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse log height' : 'Expand log height'}
            className="flex min-h-[32px] items-center gap-1.5 rounded-lg border border-slate-800 bg-[#06090F] px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap transition-colors hover:border-slate-600 hover:text-white"
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            <span>{expanded ? 'Compact' : 'Expand'}</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={logs.length === 0}
            aria-label="Clear activity log"
            className="flex min-h-[32px] items-center gap-1.5 rounded-lg border border-slate-800 bg-[#06090F] px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap transition-colors hover:border-slate-600 hover:text-white disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Scrollable Terminal Viewport */}
      <div
        ref={scrollContainerRef}
        className={`overflow-y-auto bg-[#05080F] px-4 py-3 font-mono text-xs transition-all duration-200 sm:px-5 ${
          expanded ? 'h-64' : 'h-36'
        }`}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-slate-500">
            No events recorded for this filter. Interact with the controls above to stream system actions.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredLogs.map((entry) => {
              const levelColor = getLevelColor(entry.level);
              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 rounded px-1.5 py-0.5 leading-relaxed transition-colors hover:bg-white/[0.025]"
                >
                  <span className="shrink-0 text-slate-500 tabular-nums">
                    {entry.timestamp}
                  </span>
                  <span className="shrink-0 text-slate-400">
                    [{CATEGORY_LABELS[entry.category]}]
                  </span>
                  <span
                    className="shrink-0 font-semibold"
                    style={{ color: levelColor }}
                  >
                    [{LEVEL_LABELS[entry.level]}]
                  </span>
                  <span className="text-slate-100">{entry.message}</span>
                  {entry.detail && (
                    <span className="text-slate-500">· {entry.detail}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
