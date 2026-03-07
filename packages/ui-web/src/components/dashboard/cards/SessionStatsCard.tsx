import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionStore, useStatsStore } from '@cyberbunny/shared';

type TimeRange = '7d' | '30d' | 'all';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Generate the last N days as YYYY-MM-DD strings */
function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('sv-SE'));
  }
  return days;
}

/** Pure-CSS mini bar chart for daily token usage */
function DailyChart({ byDate, days }: { byDate: Record<string, { totalTokens: number; count: number }>; days: string[] }) {
  const values = days.map((d) => byDate[d]?.totalTokens ?? 0);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-px h-10">
      {values.map((v, i) => {
        const pct = Math.max((v / max) * 100, v > 0 ? 4 : 0);
        return (
          <div
            key={days[i]}
            className="flex-1 bg-primary/60 rounded-t-sm transition-all hover:bg-primary"
            style={{ height: `${pct}%` }}
            title={`${days[i]}: ${formatTokens(v)} tokens`}
          />
        );
      })}
    </div>
  );
}

export default function SessionStatsCard() {
  const { t } = useTranslation();
  const { sessionCount, totalMessages, totalTokens } = useSessionStore((s) => s.sessionStats);
  const { stats, fetchStats } = useStatsStore();
  const [expanded, setExpanded] = useState(false);
  const [range, setRange] = useState<TimeRange>('7d');

  useEffect(() => {
    const since = range === 'all' ? undefined
      : range === '30d' ? Date.now() - 30 * 86400_000
      : Date.now() - 7 * 86400_000;
    fetchStats(since);
  }, [range, fetchStats]);

  const days = useMemo(() => lastNDays(range === '30d' ? 30 : 7), [range]);

  const modelEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byModel).sort((a, b) => b[1].totalTokens - a[1].totalTokens);
  }, [stats]);

  // --- Compact view ---
  if (!expanded) {
    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-2xl font-bold">{sessionCount}</div>
            <div className="text-xs text-muted-foreground">{t('dashboard.sessions')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalMessages}</div>
            <div className="text-xs text-muted-foreground">{t('dashboard.messages')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}</div>
            <div className="text-xs text-muted-foreground">Tokens</div>
          </div>
        </div>

        {/* Mini trend bar */}
        {stats && Object.keys(stats.byDate).length > 0 && (
          <DailyChart byDate={stats.byDate} days={lastNDays(7)} />
        )}

        <button
          onClick={() => setExpanded(true)}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
        >
          {t('dashboard.showDetails')} ▾
        </button>
      </div>
    );
  }

  // --- Expanded view ---
  return (
    <div className="space-y-3">
      {/* Time range selector + collapse button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['7d', '30d', 'all'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                range === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {r === '7d' ? t('dashboard.last7days') : r === '30d' ? t('dashboard.last30days') : t('dashboard.allTime')}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ▴ {t('dashboard.hideDetails')}
        </button>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <div className="text-lg font-bold">{sessionCount}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.sessions')}</div>
        </div>
        <div>
          <div className="text-lg font-bold">{stats?.totalInteractions ?? 0}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.interactions')}</div>
        </div>
        <div>
          <div className="text-lg font-bold">{formatTokens(stats?.totalInputTokens ?? 0)}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.inputTokens')}</div>
        </div>
        <div>
          <div className="text-lg font-bold">{formatTokens(stats?.totalOutputTokens ?? 0)}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.outputTokens')}</div>
        </div>
      </div>

      {/* Daily trend chart */}
      {stats && range !== 'all' && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('dashboard.byDate')}</div>
          <DailyChart byDate={stats.byDate} days={days} />
          <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-0.5">
            <span>{days[0]?.slice(5)}</span>
            <span>{days[days.length - 1]?.slice(5)}</span>
          </div>
        </div>
      )}

      {/* Per-model breakdown */}
      {modelEntries.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('dashboard.byModel')}</div>
          <div className="space-y-1">
            {modelEntries.slice(0, 5).map(([model, data]) => {
              const pct = (stats?.totalTokens ?? 0) > 0 ? (data.totalTokens / stats!.totalTokens) * 100 : 0;
              return (
                <div key={model} className="flex items-center gap-2 text-xs">
                  <span className="truncate flex-1 font-mono">{model}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{formatTokens(data.totalTokens)}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats?.totalInteractions === 0 && (
        <div className="text-xs text-muted-foreground text-center py-1">{t('dashboard.noStats')}</div>
      )}
    </div>
  );
}
