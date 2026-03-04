import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Appbar,
  List,
  TextInput,
  SegmentedButtons,
  Switch,
  Divider,
  Text,
} from 'react-native-paper';
import { useSessionStore } from '@shared/stores/session';
import { useSettingsStore } from '@shared/stores/settings';
import type { Theme, Language } from '@shared/stores/settings';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { llmConfig, setLLMConfig } = useSessionStore();
  const { theme, setTheme, language, setLanguage } = useSettingsStore();

  const [provider, setProvider] = useState(llmConfig.provider);
  const [apiKey, setApiKey] = useState(llmConfig.apiKey);
  const [model, setModel] = useState(llmConfig.model);
  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl || '');

  const handleSave = () => {
    setLLMConfig({
      provider,
      apiKey,
      model,
      baseUrl: baseUrl || undefined,
    });
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={t('settings.title')} />
      </Appbar.Header>
      <ScrollView style={styles.scrollView}>
        {/* LLM Settings */}
        <List.Section>
          <List.Subheader>大模型配置</List.Subheader>

          <View style={styles.inputContainer}>
            <Text variant="labelLarge">提供商</Text>
            <SegmentedButtons
              value={provider}
              onValueChange={(value) => setProvider(value as 'openai' | 'anthropic')}
              buttons={[
                { value: 'openai', label: 'OpenAI' },
                { value: 'anthropic', label: 'Anthropic' },
              ]}
              style={styles.segmented}
            />
          </View>

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
          />

          <TextInput
            label={t('settings.baseUrl')}
            value={baseUrl}
            onChangeText={setBaseUrl}
            onBlur={handleSave}
            mode="outlined"
            placeholder="https://api.example.com/v1"
            style={styles.input}
          />
        </List.Section>

        <Divider />

        {/* UI Settings */}
        <List.Section>
          <List.Subheader>界面设置</List.Subheader>

          <View style={styles.inputContainer}>
            <Text variant="labelLarge">{t('settings.language')}</Text>
            <SegmentedButtons
              value={language}
              onValueChange={(value) => setLanguage(value as Language)}
              buttons={[
                { value: 'system', label: t('settings.language.system') },
                { value: 'zh-CN', label: '中文' },
                { value: 'en-US', label: 'EN' },
              ]}
              style={styles.segmented}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text variant="labelLarge">主题</Text>
            <SegmentedButtons
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
              buttons={[
                { value: 'system', label: '跟随系统' },
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
              ]}
              style={styles.segmented}
            />
          </View>
        </List.Section>

        <Divider />

        {/* About */}
        <List.Section>
          <List.Subheader>{t('settings.about')}</List.Subheader>
          <List.Item
            title="CyberBunny Mobile"
            description={t('settings.version')}
          />
          <List.Item
            title=""
            description={t('settings.aboutDesc')}
          />
        </List.Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  segmented: {
    marginTop: 8,
  },
});
