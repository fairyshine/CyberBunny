import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, IconButton, useTheme } from 'react-native-paper';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop?: () => void;
}

export default function ChatInput({ onSend, isLoading, onStop }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const theme = useTheme();

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="输入消息..."
          mode="outlined"
          multiline
          maxLength={4000}
          style={styles.input}
          disabled={isLoading}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        {isLoading ? (
          <IconButton
            icon="stop"
            size={24}
            onPress={onStop}
            style={styles.button}
          />
        ) : (
          <IconButton
            icon="send"
            size={24}
            onPress={handleSend}
            disabled={!message.trim()}
            style={styles.button}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    maxHeight: 120,
  },
  button: {
    marginLeft: 4,
  },
});
