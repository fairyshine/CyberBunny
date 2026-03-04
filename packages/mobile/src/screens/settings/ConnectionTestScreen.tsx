import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, Card, useTheme, ActivityIndicator } from 'react-native-paper';
import { useSessionStore } from '@shared/stores/session';
import { buildChatCompletionsUrl } from '@shared/utils/api';

export default function ConnectionTestScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { llmConfig } = useSessionStore();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState('');

  const appendLog = (line: string) => {
    setResult((prev) => prev + line + '\n');
  };

  const handleTest = async () => {
    setResult('');
    setTesting(true);

    try {
      appendLog('=== Connection Test ===');
      appendLog(`Provider: ${llmConfig.provider}`);
      appendLog(`Model: ${llmConfig.model}`);
      appendLog(`Base URL: ${llmConfig.baseUrl || '(default)'}`);
      appendLog(`API Key: ${llmConfig.apiKey ? '***' + llmConfig.apiKey.slice(-4) : '(not set)'}`);
      appendLog('');

      if (!llmConfig.apiKey) {
        appendLog('ERROR: No API key configured');
        return;
      }

      const { url: apiUrl, targetUrl } = buildChatCompletionsUrl(llmConfig);
      appendLog(`Request URL: ${apiUrl}`);
      if (targetUrl) {
        appendLog(`Target URL: ${targetUrl}`);
      }
      appendLog('');
      appendLog('Sending test request...');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (llmConfig.provider === 'anthropic') {
        headers['x-api-key'] = llmConfig.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${llmConfig.apiKey}`;
      }

      if (targetUrl) {
        headers['X-Target-URL'] = targetUrl;
      }

      const body = llmConfig.provider === 'anthropic'
        ? {
            model: llmConfig.model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
          }
        : {
            model: llmConfig.model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
          };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      appendLog(`Response Status: ${response.status} ${response.statusText}`);
      appendLog('');

      if (!response.ok) {
        const errorText = await response.text();
        appendLog(`ERROR: ${errorText.slice(0, 500)}`);
        appendLog('');
        appendLog('--- Troubleshooting ---');
        if (llmConfig.baseUrl) {
          appendLog('1. Check if the service is running');
          appendLog('2. Verify the base URL is correct');
          appendLog('3. Check CORS configuration');
        } else {
          appendLog('1. Verify your API key');
          appendLog('2. Check network connectivity');
        }
      } else {
        const data = await response.json();
        appendLog('SUCCESS!');
        appendLog('');
        appendLog(JSON.stringify(data, null, 2).slice(0, 500));
      }
    } catch (error) {
      appendLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      appendLog('');
      appendLog('The request failed. Check your network and configuration.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        onPress={handleTest}
        loading={testing}
        disabled={testing}
        style={styles.button}
        icon="connection"
      >
        {testing ? t('settings.testing') || 'Testing...' : t('settings.testConnection') || 'Test Connection'}
      </Button>

      <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <ScrollView style={styles.logScroll}>
            <Text
              variant="bodySmall"
              style={[styles.logText, { color: theme.colors.onSurface }]}
            >
              {result || 'Press "Test Connection" to start'}
            </Text>
          </ScrollView>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  button: {
    marginBottom: 16,
  },
  card: {
    flex: 1,
  },
  logScroll: {
    maxHeight: 500,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
});
