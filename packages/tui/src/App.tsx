import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import type { LLMConfig } from '@openbunny/shared/types';
import {
  createChatEngine,
  parseCommand,
  getHelpInfo,
  getSessionList,
  getHistoryInfo,
  getProviderList,
  type ChatEngine,
} from '@openbunny/shared/terminal';

interface AppProps {
  config: LLMConfig;
  systemPrompt?: string;
  workspace?: string;
  configDir?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function App({ config, systemPrompt, workspace, configDir }: AppProps) {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const engineRef = useRef<ChatEngine | null>(null);

  // Create chat engine on mount
  useEffect(() => {
    createChatEngine({ config, systemPrompt, sessionName: 'TUI Chat' }).then((engine) => {
      engineRef.current = engine;
    });
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { role: 'system', content }]);
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    const engine = engineRef.current;
    if (!engine) return;

    const cmd = parseCommand(trimmed);

    if (cmd) {
      switch (cmd.command) {
        case 'quit':
        case 'exit':
          await engine.shutdown();
          exit();
          return;

        case 'clear':
          engine.clear();
          setMessages([]);
          setError('');
          setInput('');
          return;

        case 'help': {
          const help = getHelpInfo(config, {
            workspace,
            configDir,
            sessionId: engine.sessionId.slice(0, 8),
          });
          const lines = [
            '',
            '  Configuration',
            `    Provider:    ${help.config.provider}`,
            `    Model:       ${help.config.model}`,
            `    Temperature: ${help.config.temperature}`,
            `    Max tokens:  ${help.config.maxTokens}`,
            ...(help.config.workspace ? [`    Workspace:   ${help.config.workspace}`] : []),
            ...(help.config.configDir ? [`    Config dir:  ${help.config.configDir}`] : []),
            ...(help.config.sessionId ? [`    Session:     ${help.config.sessionId}`] : []),
            '',
            '  Commands',
            ...help.commands.map(c => `    ${c.name.padEnd(16)}${c.description}`),
            '',
          ];
          addSystemMessage(lines.join('\n'));
          setInput('');
          return;
        }

        case 'history':
          addSystemMessage(getHistoryInfo(engine.sessionId, engine.messageCount()));
          setInput('');
          return;

        case 'sessions': {
          const sessions = getSessionList();
          if (sessions.length === 0) {
            addSystemMessage('No sessions found.');
          } else {
            const lines = sessions.map((s) =>
              `  ${s.shortId}  ${s.name}  ${s.messageCount} msg(s)  ${s.createdAt}`
            );
            addSystemMessage(`${sessions.length} session(s):\n${lines.join('\n')}`);
          }
          setInput('');
          return;
        }

        case 'resume': {
          if (!cmd.args) {
            addSystemMessage('Usage: /resume <session-id-prefix>');
            setInput('');
            return;
          }
          try {
            const result = await engine.resume(cmd.args);
            const newMessages: ChatMessage[] = result.displayMessages.map(m => ({
              role: m.role,
              content: m.content,
            }));
            setMessages(newMessages);
            setError('');
            addSystemMessage(`Resumed session ${result.sessionId.slice(0, 8)} (${result.name}) — ${result.messageCount} message(s)`);
          } catch (err) {
            addSystemMessage(err instanceof Error ? err.message : String(err));
          }
          setInput('');
          return;
        }

        case 'save':
          await engine.flush();
          addSystemMessage('Messages flushed to disk.');
          setInput('');
          return;

        case 'providers': {
          const groups = getProviderList();
          const lines: string[] = [];
          for (const group of groups) {
            lines.push(group.category);
            for (const p of group.providers) {
              const apiKeyLabel = p.requiresApiKey ? 'api key' : 'no api key';
              lines.push(`  ${p.id}  ${p.name}  (${apiKeyLabel})`);
              lines.push(`    ${p.sampleModels}`);
            }
            lines.push('');
          }
          addSystemMessage(lines.join('\n'));
          setInput('');
          return;
        }

        default:
          addSystemMessage(`Unknown command: /${cmd.command}. Type /help for available commands.`);
          setInput('');
          return;
      }
    }

    // Regular message
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setIsLoading(true);
    setStreaming('');

    try {
      const result = await engine.send(trimmed, {
        onChunk: (full) => setStreaming(full),
      });

      setStreaming('');
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (err) {
      setStreaming('');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [config, isLoading, workspace, configDir, exit, addSystemMessage]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">OpenBunny TUI</Text>
        <Text color="gray"> | {config.model} | {config.provider}</Text>
        {workspace && <Text color="gray"> | {workspace}</Text>}
        <Text color="gray"> | /help</Text>
      </Box>

      {messages.map((msg, i) => (
        <Box key={i} marginBottom={1} flexDirection="column">
          <Text bold color={msg.role === 'user' ? 'green' : msg.role === 'assistant' ? 'blue' : 'gray'}>
            {msg.role === 'user' ? '> ' : msg.role === 'assistant' ? '🐰 ' : '  '}
          </Text>
          <Box marginLeft={2}>
            <Text wrap="wrap">{msg.content}</Text>
          </Box>
        </Box>
      ))}

      {streaming && (
        <Box marginBottom={1} flexDirection="column">
          <Text bold color="blue">🐰 </Text>
          <Box marginLeft={2}>
            <Text wrap="wrap">{streaming}</Text>
          </Box>
        </Box>
      )}

      {isLoading && !streaming && (
        <Box marginBottom={1}>
          <Text color="yellow">
            <Spinner type="dots" />
            {' '}Thinking...
          </Text>
        </Box>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      <Box>
        <Text color="green" bold>{isLoading ? '  ' : '> '}</Text>
        {!isLoading && (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Type a message..."
          />
        )}
      </Box>
    </Box>
  );
}

export default App;
