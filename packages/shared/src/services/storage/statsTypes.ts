/**
 * Stats storage types — per-interaction usage records with multi-dimensional aggregation.
 */

/** A single stats record, written once per agent loop completion. */
export interface StatsRecord {
  id: string;
  sessionId: string;
  projectId?: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messageCount: number;
  duration: number; // ms
  createdAt: number;
  date: string; // 'YYYY-MM-DD' local time, for daily aggregation index
}

/** Aggregated stats query result. */
export interface AggregatedStats {
  totalSessions: number;
  totalInteractions: number;
  totalMessages: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: Record<string, { inputTokens: number; outputTokens: number; totalTokens: number; count: number }>;
  byDate: Record<string, { totalTokens: number; count: number }>;
  byProject: Record<string, { totalTokens: number; count: number }>;
}

/** Pluggable backend interface for stats persistence. */
export interface IStatsStorageBackend {
  append(record: StatsRecord): Promise<void>;
  loadAll(since?: number, until?: number): Promise<StatsRecord[]>;
  loadBySession(sessionId: string): Promise<StatsRecord[]>;
  deleteBySession(sessionId: string): Promise<void>;
  clear(): Promise<void>;
}
