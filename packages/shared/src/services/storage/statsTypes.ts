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

  // Extended fields (v2)
  stepCount?: number; // agent loop steps
  toolCalls?: string[]; // tool names called in this interaction
  toolCallCount?: number; // total tool invocations
  finishReason?: string; // 'stop' | 'tool-calls' | 'length' | 'error' | ...
  temperature?: number;
  maxTokens?: number;
  userInputLength?: number; // character count of user input
  totalChunks?: number; // streaming chunks received
  error?: string; // error message if failed
}

/** Per-dimension bucket with full token breakdown. */
interface StatsBucket {
  count: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalDuration: number;
}

/** Tool usage bucket. */
interface ToolStatsBucket {
  count: number; // total invocations
  interactions: number; // how many interactions used this tool
}

/** Aggregated stats query result. */
export interface AggregatedStats {
  totalSessions: number;
  totalInteractions: number;
  totalMessages: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalDuration: number;
  totalToolCalls: number;
  totalSteps: number;
  avgDuration: number; // ms per interaction
  avgTokensPerInteraction: number;
  errorCount: number;
  byModel: Record<string, StatsBucket>;
  byProvider: Record<string, StatsBucket>;
  byDate: Record<string, StatsBucket>;
  byProject: Record<string, StatsBucket>;
  byTool: Record<string, ToolStatsBucket>;
  byFinishReason: Record<string, number>;
}

/** Pluggable backend interface for stats persistence. */
export interface IStatsStorageBackend {
  append(record: StatsRecord): Promise<void>;
  loadAll(since?: number, until?: number): Promise<StatsRecord[]>;
  loadBySession(sessionId: string): Promise<StatsRecord[]>;
  deleteBySession(sessionId: string): Promise<void>;
  clear(): Promise<void>;
}
