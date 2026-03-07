import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatsStore } from '@cyberbunny/shared';

type TimeRange = '7d' | '30d' | 'all';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function UsageStatsCard() {
  const { t } = useTranslation();
  const { stats, isLoading, fetchStats } = useStatsStore();
  const [range, setRange] = useState<TimeRange>('7d');

  useEffect(() => {
    const since = range === 'all' ? undefined
      : range === '30d' ? Date.now() - 30 * 86400_000
      : Date.now() - 7 * 86400_000;
    fetchStats(since);
  }, [range, fetchStats]);

  if (isLoading || !stats) {
    return <div className="text-xs text-muted-foreground">{t('dashboard.noStats')}</div>;
  }

  const modelEntries = Object.entries(stats.byModel)
    .sort((a, b) => b[1].totalTokens - a[1].totalTokens);

  return (
    <div className="space-y-3">
      {/* Time range selector */}
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

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-lg font-bold">{stats.totalInteractions}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.interactions')}</div>
        </div>
        <div>
          <div className="text-lg font-bold">{formatTokens(stats.totalInputTokens)}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.inputTokens')}</div>
        </div>
        <div>
          <div className="text-lg font-bold">{formatTokens(stats.totalOutputTokens)}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.outputTokens')}</div>
        </div>
      </div>

      {/* Per-model breakdown */}
      {modelEntries.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('dashboard.byModel')}</div>
          <div className="space-y-1">
            {modelEntries.slice(0, 5).map(([model, data]) => {
              const pct = stats.totalTokens > 0 ? (data.totalTokens / stats.totalTokens) * 100 : 0;
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

      {stats.totalInteractions === 0 && (
        <div className="text-xs text-muted-foreground text-center py-2">{t('dashboard.noStats')}</div>
      )}
    </div>
  );
}
