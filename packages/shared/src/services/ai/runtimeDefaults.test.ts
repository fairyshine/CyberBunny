import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_AGENT_ID, useAgentStore } from '../../stores/agent';
import { useSessionStore } from '../../stores/session';
import { useSettingsStore } from '../../stores/settings';
import { useSkillStore } from '../../stores/skills';
import { useToolStore, type MCPConnection } from '../../stores/tools';
import {
  getDefaultAIRuntimeDefaultsResolver,
  resetDefaultAIRuntimeDefaultsResolverForTests,
  setDefaultAIRuntimeDefaultsResolver,
  zustandAIRuntimeDefaultsResolver,
  type AIRuntimeDefaultsResolver,
} from './runtimeDefaults';

function createConnection(overrides: Partial<MCPConnection> = {}): MCPConnection {
  return {
    id: overrides.id ?? 'conn-1',
    name: overrides.name ?? 'Connection 1',
    url: overrides.url ?? 'http://localhost:3000',
    transport: overrides.transport ?? 'http',
    status: overrides.status ?? 'disconnected',
    lastError: overrides.lastError ?? null,
    tools: overrides.tools ?? [],
  };
}

test('zustandAIRuntimeDefaultsResolver reads current store-backed defaults', () => {
  const agentSnapshot = useAgentStore.getState();
  const sessionSnapshot = useSessionStore.getState();
  const settingsSnapshot = useSettingsStore.getState();
  const skillSnapshot = useSkillStore.getState();
  const toolSnapshot = useToolStore.getState();

  const baseAgent = agentSnapshot.agents.find((agent) => agent.id === DEFAULT_AGENT_ID) ?? agentSnapshot.agents[0];
  const extraAgent = {
    ...baseAgent,
    id: 'agent-runtime-defaults',
    name: 'Agent Runtime Defaults',
  };
  const connection = createConnection({ id: 'runtime-defaults-conn', status: 'connected' });
  const skillCalls: string[] = [];
  const statusCalls: Array<[string, string]> = [];
  const errorCalls: Array<[string, string | null]> = [];

  useAgentStore.setState({
    agents: [baseAgent, extraAgent],
    currentAgentId: 'agent-runtime-defaults',
  });
  useSessionStore.setState({
    llmConfig: {
      provider: 'anthropic',
      apiKey: 'runtime-defaults-key',
      model: 'claude-3-5-sonnet',
      temperature: 0.4,
      maxTokens: 4096,
    },
  });
  useSettingsStore.setState({
    enabledTools: ['memory', 'python'],
    proxyUrl: 'https://runtime-defaults.example.com',
    toolExecutionTimeout: 321,
    execLoginShell: false,
    searchProvider: 'brave',
    exaApiKey: 'exa-runtime-defaults-key',
    braveApiKey: 'brave-runtime-defaults-key',
  });
  useSkillStore.setState({
    skills: [{ name: 'runtime-default-skill', description: 'store', source: 'builtin', body: 'body' }],
    enabledSkillIds: ['runtime-default-skill'],
    markActivated: (skillName: string) => { skillCalls.push(skillName); },
  });
  useToolStore.setState({
    mcpConnections: [connection],
    updateMCPStatus: ((id, status) => { statusCalls.push([id, status]); }) as typeof toolSnapshot.updateMCPStatus,
    setMCPError: ((id, error) => { errorCalls.push([id, error]); }) as typeof toolSnapshot.setMCPError,
  });

  try {
    const defaults = zustandAIRuntimeDefaultsResolver.getDefaults();
    assert.equal(defaults.currentAgentId, 'agent-runtime-defaults');
    assert.deepEqual(defaults.agents.map((agent) => agent.id), [DEFAULT_AGENT_ID, 'agent-runtime-defaults']);
    assert.equal(defaults.defaultLLMConfig.model, 'claude-3-5-sonnet');
    assert.deepEqual(defaults.defaultEnabledToolIds, ['memory', 'python']);
    assert.equal(defaults.proxyUrl, 'https://runtime-defaults.example.com');
    assert.equal(defaults.toolExecutionTimeout, 321);
    assert.equal(defaults.execLoginShell, false);
    assert.equal(defaults.searchProvider, 'brave');
    assert.equal(defaults.exaApiKey, 'exa-runtime-defaults-key');
    assert.equal(defaults.braveApiKey, 'brave-runtime-defaults-key');
    assert.deepEqual(defaults.enabledSkillIds, ['runtime-default-skill']);
    defaults.markSkillActivated?.('runtime-default-hit');
    assert.deepEqual(skillCalls, ['runtime-default-hit']);
    assert.deepEqual(defaults.mcpConnections, [connection]);
    defaults.onConnectionStatusChange?.('runtime-defaults-conn', 'connected', 'boom');
    assert.deepEqual(statusCalls, [['runtime-defaults-conn', 'connected']]);
    assert.deepEqual(errorCalls, [['runtime-defaults-conn', 'boom']]);
  } finally {
    useAgentStore.setState(agentSnapshot);
    useSessionStore.setState(sessionSnapshot);
    useSettingsStore.setState(settingsSnapshot);
    useSkillStore.setState(skillSnapshot);
    useToolStore.setState(toolSnapshot);
  }
});

test('default AI runtime defaults resolver is configurable and resettable', () => {
  resetDefaultAIRuntimeDefaultsResolverForTests();
  assert.equal(getDefaultAIRuntimeDefaultsResolver(), zustandAIRuntimeDefaultsResolver);

  const customResolver: AIRuntimeDefaultsResolver = {
    getDefaults: () => ({
      currentAgentId: DEFAULT_AGENT_ID,
      agents: [],
      defaultLLMConfig: {
        provider: 'openai',
        apiKey: 'custom-key',
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 1024,
      },
      defaultEnabledToolIds: ['memory'],
      proxyUrl: 'https://custom-runtime.example.com',
      toolExecutionTimeout: 999,
      execLoginShell: true,
      searchProvider: 'exa',
      exaApiKey: 'custom-exa-key',
      braveApiKey: 'custom-brave-key',
      skills: [],
      enabledSkillIds: [],
      markSkillActivated: undefined,
      mcpConnections: [],
      onConnectionStatusChange: undefined,
    }),
  };

  setDefaultAIRuntimeDefaultsResolver(customResolver);
  assert.equal(getDefaultAIRuntimeDefaultsResolver(), customResolver);

  resetDefaultAIRuntimeDefaultsResolverForTests();
  assert.equal(getDefaultAIRuntimeDefaultsResolver(), zustandAIRuntimeDefaultsResolver);
});
