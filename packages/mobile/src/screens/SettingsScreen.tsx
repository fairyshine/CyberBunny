import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Appbar, List, Divider } from 'react-native-paper';
import type { SettingsStackNavigationProp } from '../navigation/types';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<SettingsStackNavigationProp>();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={t('settings.title')} />
      </Appbar.Header>
      <ScrollView>
        <List.Section>
          <List.Subheader>{t('settings.llm') || 'AI Model'}</List.Subheader>
          <List.Item
            title={t('settings.llmConfig') || 'LLM Configuration'}
            description={t('settings.llmConfigDesc') || 'Provider, API Key, Model'}
            left={(p) => <List.Icon {...p} icon="brain" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate('LLMSettings')}
          />
          <List.Item
            title={t('settings.connectionTest') || 'Connection Test'}
            description={t('settings.connectionTestDesc') || 'Test API connectivity'}
            left={(p) => <List.Icon {...p} icon="connection" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate('ConnectionTest')}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>{t('settings.capabilities') || 'Capabilities'}</List.Subheader>
          <List.Item
            title={t('tools.title') || 'Tools'}
            description={t('tools.desc') || 'Manage tool sources and toggles'}
            left={(p) => <List.Icon {...p} icon="wrench" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate('ToolManager')}
          />
          <List.Item
            title={t('skills.title') || 'Skills'}
            description={t('skills.desc') || 'Multi-step workflow skills'}
            left={(p) => <List.Icon {...p} icon="lightning-bolt" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate('SkillManager')}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>{t('settings.data') || 'Data'}</List.Subheader>
          <List.Item
            title={t('memory.title') || 'Memory'}
            description={t('memory.desc') || 'Notes and diary'}
            left={(p) => <List.Icon {...p} icon="brain" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate('Memory')}
          />
          <List.Item
            title={t('console.title') || 'Console'}
            description={t('console.desc') || 'System logs and diagnostics'}
            left={(p) => <List.Icon {...p} icon="console" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate('Console')}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>{t('settings.general') || 'General'}</List.Subheader>
          <List.Item
            title={t('settings.generalSettings') || 'General Settings'}
            description={t('settings.generalDesc') || 'Language, theme, about'}
            left={(p) => <List.Icon {...p} icon="cog" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => navigation.navigate('GeneralSettings')}
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
});
