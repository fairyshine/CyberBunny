import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextInput, SegmentedButtons, Text, Button, Divider, List } from 'react-native-paper';
import { useSessionStore } from '@shared/stores/session';

export default function LLMSettingsScreen() {
  const { t } = useTranslation();
  const { llmConfig, setLLMConfig } = useSessionStore();

  const [provider, setProvider] = useState(llmConfig.provider);
  const [apiKey, setApiKey] = useState(llmConfig.apiKey);
  const [model, setModel] = useState(llmConfig.model);
  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl || '');
  const [temperature, setTemperature] = useState(String(llmConfig.temperature ?? 0.7));
  const [maxTokens, setMaxTokens] = useState(String(llmConfig.maxTokens ?? 4096));

  const handleSave = () => {
    setLLMConfig({
      provider,
      apiKey,
      model,
      baseUrl: baseUrl || undefined,
      temperature: parseFloat(temperature) || 0.7,
      maxTokens: parseInt(maxTokens) || 4096,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>{t('settings.provider') || 'Provider'}</List.Subheader>
        <View style={styles.inputContainer}>
          <SegmentedButtons
            value={provider}
            onValueChange={(v) => { setProvider(v as any); }}
            buttons={[
              { value: 'openai', label: 'OpenAI' },
              { value: 'anthropic', label: 'Anthropic' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
        </View>
      </List.Section>

      <TextInput
        label={t('settings.apiKey')}
        value={apiKey}
        onChangeText={setApiKey}
        onBlur={handleSave}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label={t('settings.model')}
        value={model}
        onChangeText={setModel}
        onBlur={handleSave}
        mode="outlined"
        style={styles.input}
        placeholder="gpt-4o / claude-3-5-sonnet-20241022"
      />

      <TextInput
        label={t('settings.baseUrl')}
        value={baseUrl}
        onChangeText={setBaseUrl}
        onBlur={handleSave}
        mode="outlined"
        style={styles.input}
        placeholder="https://api.example.com/v1"
      />

      <Divider style={{ marginVertical: 8 }} />

      <TextInput
        label={t('settings.temperature') || 'Temperature'}
        value={temperature}
        onChangeText={setTemperature}
        onBlur={handleSave}
        mode="outlined"
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="0.7"
      />

      <TextInput
        label={t('settings.maxTokens') || 'Max Tokens'}
        value={maxTokens}
        onChangeText={setMaxTokens}
        onBlur={handleSave}
        mode="outlined"
        style={styles.input}
        keyboardType="number-pad"
        placeholder="4096"
      />

      <Button mode="contained" onPress={handleSave} style={styles.saveButton}>
        {t('common.save') || 'Save'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  input: {
    marginVertical: 8,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 32,
  },
});
