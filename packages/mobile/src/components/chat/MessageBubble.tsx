import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Markdown from 'react-native-markdown-display';
import type { Message } from '@shared/types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const theme = useTheme();
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.colors.primaryContainer }
            : { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        {message.content ? (
          <Markdown
            style={{
              body: {
                color: theme.colors.onSurface,
              },
              code_inline: {
                backgroundColor: theme.colors.surface,
                color: theme.colors.primary,
              },
              code_block: {
                backgroundColor: theme.colors.surface,
                color: theme.colors.onSurface,
              },
            }}
          >
            {message.content}
          </Markdown>
        ) : (
          <Text style={{ color: theme.colors.onSurface }}>
            {message.role === 'assistant' ? '思考中...' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
});
