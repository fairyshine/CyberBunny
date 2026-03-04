import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';

interface EnhancedMarkdownProps {
  content: string;
}

export default function EnhancedMarkdown({ content }: EnhancedMarkdownProps) {
  const theme = useTheme();

  const handleCopyCode = (code: string) => {
    try {
      // Use Clipboard if available, fallback to no-op
      if (Clipboard && Clipboard.setStringAsync) {
        Clipboard.setStringAsync(code);
      }
    } catch {
      // Clipboard not available
    }
  };

  const rules = {
    fence: (node: any, children: any, parent: any, styles: any) => {
      const code = node.content || '';
      const language = node.sourceInfo || '';

      return (
        <View key={node.key} style={[codeStyles.codeContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={codeStyles.codeHeader}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {language || 'code'}
            </Text>
            <IconButton
              icon="content-copy"
              size={14}
              onPress={() => handleCopyCode(code)}
              style={{ margin: 0, padding: 0 }}
            />
          </View>
          <Text
            style={[codeStyles.codeText, { color: theme.colors.onSurface }]}
            selectable
          >
            {code}
          </Text>
        </View>
      );
    },
  };

  return (
    <Markdown
      style={{
        body: {
          color: theme.colors.onSurface,
        },
        code_inline: {
          backgroundColor: theme.colors.surfaceVariant,
          color: theme.colors.primary,
          paddingHorizontal: 4,
          paddingVertical: 1,
          borderRadius: 3,
          fontSize: 13,
        },
        code_block: {
          backgroundColor: theme.colors.surfaceVariant,
          color: theme.colors.onSurface,
          padding: 8,
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 12,
        },
        heading1: { color: theme.colors.onSurface, fontSize: 20, fontWeight: 'bold', marginTop: 16 },
        heading2: { color: theme.colors.onSurface, fontSize: 18, fontWeight: 'bold', marginTop: 12 },
        heading3: { color: theme.colors.onSurface, fontSize: 16, fontWeight: 'bold', marginTop: 8 },
        link: { color: theme.colors.primary },
        blockquote: {
          backgroundColor: theme.colors.surfaceVariant,
          borderLeftColor: theme.colors.primary,
          borderLeftWidth: 3,
          paddingLeft: 12,
          paddingVertical: 4,
        },
        list_item: { color: theme.colors.onSurface },
        table: { borderColor: theme.colors.outline },
        hr: { backgroundColor: theme.colors.outline },
      }}
      rules={rules}
    >
      {content}
    </Markdown>
  );
}

const codeStyles = StyleSheet.create({
  codeContainer: {
    borderRadius: 8,
    marginVertical: 4,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ffffff20',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    padding: 8,
  },
});
