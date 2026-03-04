import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import {
  List,
  Switch,
  FAB,
  Text,
  Divider,
  IconButton,
  useTheme,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useToolStore } from '@shared/stores/tools';
import { useSettingsStore } from '@shared/stores/settings';
import { toolRegistry } from '@shared/services/tools/registry';
import type { SettingsStackNavigationProp } from '../../navigation/types';

export default function ToolManagerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<SettingsStackNavigationProp>();
  const { sources, removeSource, toggleSource, reloadSource, initSources, loading } = useToolStore();
  const { enabledTools, toggleTool, enableAllTools, disableAllTools } = useSettingsStore();
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  useEffect(() => {
    initSources();
  }, []);

  const allTools = toolRegistry.getAll();

  const getToolsForSource = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return [];
    return toolRegistry.getToolsBySource(source);
  };

  const handleRemoveSource = (sourceId: string, sourceName: string) => {
    Alert.alert(
      t('tools.removeSource') || 'Remove Source',
      `${sourceName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete') || 'Delete', style: 'destructive', onPress: () => removeSource(sourceId) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {allTools.length} tools | {enabledTools.length} enabled
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip compact onPress={enableAllTools}>{t('tools.enableAll') || 'All'}</Chip>
          <Chip compact onPress={disableAllTools}>{t('tools.disableAll') || 'None'}</Chip>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(item) => item.id}
          renderItem={({ item: source }) => {
            const sourceTools = getToolsForSource(source.id);
            const isExpanded = expandedSource === source.id;

            return (
              <View>
                <List.Accordion
                  title={source.name}
                  description={`${sourceTools.length} tools | ${source.type}`}
                  expanded={isExpanded}
                  onPress={() => setExpandedSource(isExpanded ? null : source.id)}
                  left={(p) => <List.Icon {...p} icon={
                    source.type === 'builtin' ? 'package-variant' :
                    source.type === 'mcp' ? 'server-network' :
                    source.type === 'code' ? 'code-tags' :
                    source.type === 'http' ? 'web' : 'file'
                  } />}
                  right={() => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {source.type !== 'builtin' && (
                        <>
                          <IconButton icon="refresh" size={18} onPress={() => reloadSource(source.id)} />
                          <IconButton icon="delete" size={18} onPress={() => handleRemoveSource(source.id, source.name)} />
                        </>
                      )}
                      <Switch
                        value={source.enabled}
                        onValueChange={() => toggleSource(source.id)}
                      />
                    </View>
                  )}
                >
                  {sourceTools.map((tool) => (
                    <List.Item
                      key={tool.metadata.id}
                      title={tool.metadata.name}
                      description={tool.metadata.description}
                      titleStyle={{ fontSize: 13 }}
                      descriptionStyle={{ fontSize: 11 }}
                      descriptionNumberOfLines={2}
                      left={(p) => <List.Icon {...p} icon={tool.metadata.icon || 'wrench'} />}
                      right={() => (
                        <Switch
                          value={enabledTools.includes(tool.metadata.id)}
                          onValueChange={() => toggleTool(tool.metadata.id)}
                        />
                      )}
                    />
                  ))}
                </List.Accordion>
                <Divider />
              </View>
            );
          }}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddToolSource')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
