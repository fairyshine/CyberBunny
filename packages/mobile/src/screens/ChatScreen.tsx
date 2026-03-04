import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Appbar, Text } from 'react-native-paper';
import { useSessionStore, selectCurrentSession } from '@shared/stores/session';
import { useLLM } from '@shared/hooks/useLLM';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { ChatScreenRouteProp, ChatScreenNavigationProp } from '../navigation/types';
import type { Message } from '@shared/types';

export default function ChatScreen() {
  const { t } = useTranslation();
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { sessionId } = route.params;

  const { sessions, addMessage, updateMessage, llmConfig } = useSessionStore();
  const session = sessions.find((s) => s.id === sessionId);

  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const { sendMessage, isLoading, abort } = useLLM(llmConfig);

  useEffect(() => {
    if (session) {
      navigation.setOptions({ title: session.name });
    }
  }, [session?.name, navigation]);

  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Text>{t('chat.sessionNotFound')}</Text>
      </View>
    );
  }

  const handleSend = async (content: string) => {
    if (!llmConfig.apiKey) {
      Alert.alert('配置错误', t('chat.configRequired'));
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    addMessage(sessionId, userMessage);

    // Create assistant message placeholder
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(sessionId, assistantMessage);

    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Prepare messages for LLM
      const llmMessages = [...session.messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content || '',
      }));

      const result = await sendMessage(llmMessages, {
        onChunk: (chunk) => {
          setStreamingContent(chunk);
          updateMessage(sessionId, assistantMessageId, { content: chunk });
        },
        onComplete: () => {
          setIsStreaming(false);
          setStreamingContent('');
        },
        onError: (error) => {
          setIsStreaming(false);
          setStreamingContent('');
          updateMessage(sessionId, assistantMessageId, {
            content: `❌ ${t('chat.error', { error })}`,
          });
        },
      });

      // Update final content
      updateMessage(sessionId, assistantMessageId, { content: result.content });
    } catch (error) {
      setIsStreaming(false);
      setStreamingContent('');
      console.error('[Chat] Send message error:', error);
    }
  };

  const handleStop = () => {
    abort();
    setIsStreaming(false);
  };

  // Combine persisted messages with streaming content
  const displayMessages = [...session.messages];
  if (isStreaming && streamingContent) {
    const lastMessage = displayMessages[displayMessages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      displayMessages[displayMessages.length - 1] = {
        ...lastMessage,
        content: streamingContent,
      };
    }
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={session.name} />
      </Appbar.Header>
      <MessageList messages={displayMessages} />
      <ChatInput onSend={handleSend} isLoading={isLoading} onStop={handleStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
