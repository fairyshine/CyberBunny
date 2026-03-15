// Barrel export for @openbunny/shared/terminal

export {
  getConfigValue,
  getAllConfig,
  setConfigValue,
  deleteConfigValue,
  clearConfig,
  createConfigStorage,
  resolveLLMConfig,
  resolveSystemPrompt,
  resolveWorkspace,
} from './nodeConfigSingleton';

export {
  initTerminal,
  type InitTerminalOptions,
  type TerminalContext,
} from './initTerminal';

export {
  createChatEngine,
  type ChatEngine,
  type ChatEngineOptions,
  type ResumeResult as ChatResumeResult,
  type StreamOptions,
} from './chatEngine';

export {
  parseCommand,
  getHelpInfo,
  getSessionList,
  getProviderList,
  getHistoryInfo,
  resumeSession,
  type HelpInfo,
  type SessionListItem,
  type ProviderListGroup,
  type ResumeResult as CommandResumeResult,
} from './commands';
