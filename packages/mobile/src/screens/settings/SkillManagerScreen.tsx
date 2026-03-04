import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import {
  Card,
  Text,
  FAB,
  Divider,
  IconButton,
  Switch,
  useTheme,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useSkillStore } from '@shared/stores/skills';
import { skillRegistry } from '@shared/services/skills/registry';
import type { SettingsStackNavigationProp } from '../../navigation/types';

export default function SkillManagerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<SettingsStackNavigationProp>();
  const { sources, removeSource, toggleSource, reloadSource, initSources, loading } = useSkillStore();

  useEffect(() => {
    initSources();
  }, []);

  const allSkills = skillRegistry.getAll();

  const handleRemoveSource = (sourceId: string, sourceName: string) => {
    Alert.alert(
      t('skills.removeSource') || 'Remove Source',
      `${sourceName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete') || 'Delete', style: 'destructive', onPress: () => removeSource(sourceId) },
      ]
    );
  };

  const handleViewSkill = (skillId: string, skillName: string) => {
    navigation.navigate('SkillViewer', { skillId, skillName });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {allSkills.length} skills | {sources.length} sources
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={allSkills}
          keyExtractor={(item) => item.metadata.id}
          numColumns={1}
          renderItem={({ item: skill }) => {
            const meta = skill.metadata;
            const source = sources.find((s) =>
              meta.tags?.includes(s.id) || s.type === 'builtin'
            );

            return (
              <Card style={styles.card} mode="elevated">
                <Card.Title
                  title={`${meta.icon || '⚡'} ${meta.name}`}
                  subtitle={meta.description}
                  subtitleNumberOfLines={2}
                  titleStyle={{ fontSize: 14 }}
                  subtitleStyle={{ fontSize: 12 }}
                  right={() => (
                    <IconButton
                      icon="eye"
                      size={20}
                      onPress={() => handleViewSkill(meta.id, meta.name)}
                    />
                  )}
                />
                <Card.Content>
                  <View style={styles.chipRow}>
                    {meta.version && <Chip compact style={styles.chip}>v{meta.version}</Chip>}
                    {meta.author && <Chip compact style={styles.chip}>{meta.author}</Chip>}
                    {meta.requiredTools && meta.requiredTools.length > 0 && (
                      <Chip compact icon="wrench" style={styles.chip}>
                        {meta.requiredTools.length} tools
                      </Chip>
                    )}
                  </View>
                </Card.Content>
              </Card>
            );
          }}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={styles.emptyText}>
              {t('skills.empty') || 'No skills loaded'}
            </Text>
          }
        />
      )}

      <Divider />

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text variant="titleSmall">{t('skills.sources') || 'Sources'}</Text>
      </View>
      <FlatList
        data={sources}
        keyExtractor={(item) => item.id}
        style={{ maxHeight: 200 }}
        renderItem={({ item: source }) => (
          <View style={styles.sourceRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{source.name}</Text>
              <Text variant="bodySmall" style={{ opacity: 0.5 }}>{source.type}</Text>
            </View>
            {source.type !== 'builtin' && (
              <>
                <IconButton icon="refresh" size={18} onPress={() => reloadSource(source.id)} />
                <IconButton icon="delete" size={18} onPress={() => handleRemoveSource(source.id, source.name)} />
              </>
            )}
            <Switch value={source.enabled} onValueChange={() => toggleSource(source.id)} />
          </View>
        )}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddSkill')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    height: 24,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    opacity: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
