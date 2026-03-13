import type { Agent, AgentGroup, Message, Project, Session } from '../types';
import { clearStreamingMessageFlags, stripTransientSessionState } from './sessionStateHelpers';

interface AgentSessionState {
  sessions: Session[];
  currentSessionId: string | null;
}

interface AgentWorkspaceState {
  agents: Agent[];
  currentAgentId: string;
  agentSessions: Record<string, Session[]>;
  agentCurrentSessionId: Record<string, string | null>;
  agentProjects: Record<string, Project[]>;
  agentGroups: AgentGroup[];
}

interface NormalizeHydratedAgentStateOptions {
  agents: Agent[];
  agentSessions: Record<string, Session[]>;
  agentCurrentSessionId: Record<string, string | null>;
  agentProjects: Record<string, Project[]>;
  defaultAgentId: string;
  createDefaultAgent: () => Agent;
}

export function deleteAgentSessionState(
  state: AgentSessionState,
  sessionId: string,
): AgentSessionState {
  const sessions = state.sessions.filter((session) => session.id !== sessionId);
  const currentSessionId = state.currentSessionId === sessionId
    ? (sessions[0]?.id || null)
    : state.currentSessionId;

  return { sessions, currentSessionId };
}

export function deleteAgentState(
  state: AgentWorkspaceState,
  agentId: string,
  fallbackAgentId: string,
): AgentWorkspaceState {
  const { [agentId]: _sessions, ...agentSessions } = state.agentSessions;
  const { [agentId]: _currentSessionId, ...agentCurrentSessionId } = state.agentCurrentSessionId;
  const { [agentId]: _projects, ...agentProjects } = state.agentProjects;
  const agents = state.agents.filter((agent) => agent.id !== agentId);

  return {
    agents,
    currentAgentId: state.currentAgentId === agentId ? fallbackAgentId : state.currentAgentId,
    agentSessions,
    agentCurrentSessionId,
    agentProjects,
    agentGroups: state.agentGroups.map((group) => {
      if (group.coreAgentId !== agentId) return group;
      const nextCore = agents.find((agent) => agent.groupId === group.id);
      return { ...group, coreAgentId: nextCore?.id };
    }),
  };
}

export function markStreamingAgentSessionsInterruptedState(
  agentSessions: Record<string, Session[]>,
  persistMessages: (sessionId: string, messages: Message[]) => void,
  interruptedAt: number = Date.now(),
): { agentSessions: Record<string, Session[]>; changed: boolean } {
  let changed = false;

  const nextAgentSessions = Object.fromEntries(
    Object.entries(agentSessions).map(([agentId, sessions]) => [
      agentId,
      sessions.map((session) => {
        if (!session.isStreaming) return session;

        changed = true;
        const messages = clearStreamingMessageFlags(session.messages);
        persistMessages(session.id, messages);

        return {
          ...session,
          messages,
          isStreaming: false,
          interruptedAt,
          updatedAt: interruptedAt,
        };
      }),
    ]),
  );

  return { agentSessions: nextAgentSessions, changed };
}

export function normalizeHydratedAgentState(
  options: NormalizeHydratedAgentStateOptions,
): Pick<AgentWorkspaceState, 'agents' | 'agentSessions' | 'agentCurrentSessionId' | 'agentProjects'> {
  const {
    defaultAgentId,
    createDefaultAgent,
  } = options;

  let agents = [...options.agents];

  if (!agents.some((agent) => agent.isDefault)) {
    agents = [createDefaultAgent(), ...agents];
  }

  const defaultAgent = agents.find((agent) => agent.id === defaultAgentId || agent.isDefault);
  if (defaultAgent) {
    defaultAgent.id = defaultAgentId;
    defaultAgent.isDefault = true;
    if (!defaultAgent.name || defaultAgent.name === 'CyberBunny') {
      defaultAgent.name = 'OpenBunny';
    }
    defaultAgent.mindUserPrompt = defaultAgent.mindUserPrompt || '';
    defaultAgent.chatActiveAssistantPrompt = defaultAgent.chatActiveAssistantPrompt || '';
  }

  agents = agents.map((agent) => ({
    ...agent,
    mindUserPrompt: agent.mindUserPrompt || '',
    chatActiveAssistantPrompt: agent.chatActiveAssistantPrompt || '',
  }));

  const agentSessions = Object.fromEntries(
    Object.entries(options.agentSessions).map(([agentId, sessions]) => [
      agentId,
      sessions.map((session) => stripTransientSessionState(session)),
    ]),
  );
  if (!agentSessions[defaultAgentId]) {
    agentSessions[defaultAgentId] = [];
  }

  const agentCurrentSessionId = { ...options.agentCurrentSessionId };
  if (agentCurrentSessionId[defaultAgentId] === undefined) {
    agentCurrentSessionId[defaultAgentId] = null;
  }

  const agentProjects = { ...options.agentProjects };
  if (!agentProjects[defaultAgentId]) {
    agentProjects[defaultAgentId] = [];
  }

  return {
    agents,
    agentSessions,
    agentCurrentSessionId,
    agentProjects,
  };
}
