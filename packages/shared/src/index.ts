// Platform
export * from './platform';

// Types
export * from './types';

// Stores
export { useSessionStore, selectCurrentSession, selectActiveSessions, selectDeletedSessions } from './stores/session';
export { useSettingsStore, setThemeHandler, setLanguageHandler, resolveLanguage } from './stores/settings';
export type { Theme, Language } from './stores/settings';
export { useToolStore } from './stores/tools';
export { useSkillStore } from './stores/skills';

// Services
export { logSystem, logLLM, logTool, logFile, logSettings, logMCP, logPython, consoleLogger } from './services/console/logger';
export type { LogEntry, LogLevel, LogCategory } from './services/console/logger';
export { fileSystem, setFileSystemInstance } from './services/filesystem';
export type { IFileSystem, FileSystemEntry } from './services/filesystem';
export { pythonExecutor } from './services/python/executor';
export { mcpClient } from './services/mcp/client';
export { toolRegistry } from './services/tools/registry';
export { skillRegistry } from './services/skills/registry';
export { LLMConversation } from './services/llm/conversation';
export { callLLM } from './services/llm/streaming';
export type { StreamOptions } from './services/llm/streaming';
export { runAgentLoop, executeTool } from './services/agent';
export type { AgentCallbacks, SendLLMMessageFn } from './services/agent';

// Hooks
export { useLLM } from './hooks/useLLM';

// Utils
export { buildChatCompletionsUrl } from './utils/api';
export { getErrorMessage, isAbortError } from './utils/errors';
export { MessageHistoryManager } from './utils/messageHistory';

// Lib
export { cn } from './lib/utils';

// i18n
export { default as i18n } from './i18n';
