/**
 * Stats Storage — service layer for recording and querying usage statistics.
 *
 * Backend selection mirrors MessageStorage:
 * - Browser / Electron: IndexedDB (auto-detected)
 * - React Native: injected via setBackend()
 */

import type { StatsRecord, IStatsStorageBackend, AggregatedStats } from './statsTypes';
import { IndexedDBStatsBackend } from './statsIndexeddb';

export type { IStatsStorageBackend, StatsRecord, AggregatedStats } from './statsTypes';

class StatsStorage {
  private backend: IStatsStorageBackend;

  constructor() {
    if (typeof indexedDB !== 'undefined') {
      this.backend = new IndexedDBStatsBackend();
    } else {
      this.backend = {
        append: async () => {},
        loadAll: async () => [],
        loadBySession: async () => [],
        deleteBySession: async () => {},
        clear: async () => {},
      };
    }
  }

  setBackend(backend: IStatsStorageBackend): void {
    this.backend = backend;
  }

  /** Record a single interaction's stats (fire-and-forget). */
  async record(record: StatsRecord): Promise<void> {
    try {
      await this.backend.append(record);
    } catch (err) {
      console.error('[StatsStorage] record failed:', err);
    }
  }

  /** Aggregate all stats, optionally filtered by time range. */
  async aggregate(since?: number, until?: number): Promise<AggregatedStats> {
    try {
      const records = await this.backend.loadAll(since, until);
      return computeAggregation(records);
    } catch (err) {
      console.error('[StatsStorage] aggregate failed:', err);
      return EMPTY_STATS;
    }
  }

  /** Get raw records for a specific session. */
  async getSessionStats(sessionId: string): Promise<StatsRecord[]> {
    return this.backend.loadBySession(sessionId);
  }

  /** Delete stats when a session is permanently deleted. */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.backend.deleteBySession(sessionId);
    } catch (err) {
      console.error('[StatsStorage] deleteSession failed:', err);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.backend.clear();
    } catch (err) {
      console.error('[StatsStorage] clear failed:', err);
    }
  }
}

const EMPTY_STATS: AggregatedStats = {
  totalSessions: 0,
  totalInteractions: 0,
  totalMessages: 0,
  totalTokens: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  byModel: {},
  byDate: {},
  byProject: {},
};

function computeAggregation(records: StatsRecord[]): AggregatedStats {
  if (records.length === 0) return EMPTY_STATS;

  const sessionIds = new Set<string>();
  const byModel: AggregatedStats['byModel'] = {};
  const byDate: AggregatedStats['byDate'] = {};
  const byProject: AggregatedStats['byProject'] = {};
  let totalMessages = 0, totalTokens = 0, totalInputTokens = 0, totalOutputTokens = 0;

  for (const r of records) {
    sessionIds.add(r.sessionId);
    totalMessages += r.messageCount;
    totalTokens += r.totalTokens;
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;

    // by model
    if (!byModel[r.model]) byModel[r.model] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, count: 0 };
    byModel[r.model].inputTokens += r.inputTokens;
    byModel[r.model].outputTokens += r.outputTokens;
    byModel[r.model].totalTokens += r.totalTokens;
    byModel[r.model].count++;

    // by date
    if (!byDate[r.date]) byDate[r.date] = { totalTokens: 0, count: 0 };
    byDate[r.date].totalTokens += r.totalTokens;
    byDate[r.date].count++;

    // by project
    if (r.projectId) {
      if (!byProject[r.projectId]) byProject[r.projectId] = { totalTokens: 0, count: 0 };
      byProject[r.projectId].totalTokens += r.totalTokens;
      byProject[r.projectId].count++;
    }
  }

  return {
    totalSessions: sessionIds.size,
    totalInteractions: records.length,
    totalMessages,
    totalTokens,
    totalInputTokens,
    totalOutputTokens,
    byModel,
    byDate,
    byProject,
  };
}

export const statsStorage = new StatsStorage();
