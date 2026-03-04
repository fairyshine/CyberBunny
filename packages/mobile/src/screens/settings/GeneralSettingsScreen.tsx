import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { List, SegmentedButtons, Text, Divider } from 'react-native-paper';
import { useSettingsStore } from '@shared/stores/settings';
import type { Theme, Language } from '@shared/stores/settings';

export default function GeneralSettingsScreen() {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useSettingsStore();

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>{t('settings.language')}</List.Subheader>
        <View style={styles.inputContainer}>
          <SegmentedButtons
            value={language}
            onValueChange={(v) => setLanguage(v as Language)}
            buttons={[
              { value: 'system', label: t('settings.language.system') },
              { value: 'zh-CN', label: '中文' },
              { value: 'en-US', label: 'EN' },
            ]}
          />
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>{t('settings.theme') || 'Theme'}</List.Subheader>
        <View style={styles.inputContainer}>
          <SegmentedButtons
            value={theme}
            onValueChange={(v) => setTheme(v as Theme)}
            buttons={[
              { value: 'system', label: t('settings.theme.system') || 'System' },
              { value: 'light', label: t('settings.theme.light') || 'Light' },
              { value: 'dark', label: t('settings.theme.dark') || 'Dark' },
            ]}
          />
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>{t('settings.about')}</List.Subheader>
        <List.Item title="CyberBunny Mobile" description={t('settings.version')} />
        <List.Item title="" description={t('settings.aboutDesc')} />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
