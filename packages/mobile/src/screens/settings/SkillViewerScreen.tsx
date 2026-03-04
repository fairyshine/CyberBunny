import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import { Text, List, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { skillRegistry } from '@shared/services/skills/registry';
import { fileSystem } from '@shared/services/filesystem';
import type { SkillViewerRouteProp } from '../../navigation/types';

export default function SkillViewerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const route = useRoute<SkillViewerRouteProp>();
  const { skillId, skillName } = route.params;

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [files, setFiles] = useState<{ name: string; path: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const skill = skillRegistry.get(skillId);

  useEffect(() => {
    loadSkillFiles();
  }, [skillId]);

  const loadSkillFiles = async () => {
    try {
      // Try to find skill folder
      const skillPath = `/sandbox/skills/${skillId}`;
      const exists = await fileSystem.exists(skillPath);

      if (exists) {
        const entries = await fileSystem.readdir(skillPath, true);
        const fileList = entries
          .filter((e) => e.type === 'file')
          .map((e) => ({ name: e.name, path: e.path }));
        setFiles(fileList);

        // Auto-select SKILL.md if exists
        const skillMd = fileList.find((f) => f.name === 'SKILL.md');
        if (skillMd) {
          await loadFile(skillMd.path);
        } else if (fileList.length > 0) {
          await loadFile(fileList[0].path);
        }
      }
    } catch (error) {
      console.error('[SkillViewer] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (filePath: string) => {
    try {
      const content = await fileSystem.readFileText(filePath);
      setFileContent(content);
      setSelectedFile(filePath);
    } catch (error) {
      setFileContent(`Error loading file: ${error}`);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 32 }} />;
  }

  return (
    <View style={styles.container}>
      {/* Skill metadata */}
      {skill && (
        <View style={[styles.metaSection, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="titleMedium">{skill.metadata.icon || '⚡'} {skill.metadata.name}</Text>
          <Text variant="bodySmall" style={{ marginTop: 4 }}>{skill.metadata.description}</Text>
          {skill.metadata.requiredTools && skill.metadata.requiredTools.length > 0 && (
            <Text variant="labelSmall" style={{ marginTop: 4, color: theme.colors.primary }}>
              Required: {skill.metadata.requiredTools.join(', ')}
            </Text>
          )}
          {skill.metadata.parameters && skill.metadata.parameters.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text variant="labelSmall" style={{ fontWeight: 'bold' }}>Parameters:</Text>
              {skill.metadata.parameters.map((p) => (
                <Text key={p.name} variant="labelSmall">
                  - {p.name} ({p.type}){p.required ? ' *' : ''}: {p.description}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      <Divider />

      {/* File list */}
      {files.length > 0 && (
        <View style={styles.fileList}>
          <Text variant="labelMedium" style={{ paddingHorizontal: 16, paddingVertical: 4 }}>Files</Text>
          {files.map((file) => (
            <List.Item
              key={file.path}
              title={file.name}
              titleStyle={{ fontSize: 12 }}
              onPress={() => loadFile(file.path)}
              style={[
                selectedFile === file.path && { backgroundColor: theme.colors.secondaryContainer },
              ]}
              left={(p) => <List.Icon {...p} icon="file-document-outline" />}
            />
          ))}
        </View>
      )}

      <Divider />

      {/* File content */}
      <ScrollView style={styles.contentArea}>
        {fileContent !== null ? (
          <Text
            variant="bodySmall"
            style={[styles.codeText, { color: theme.colors.onSurface }]}
          >
            {fileContent}
          </Text>
        ) : (
          <Text variant="bodyMedium" style={styles.emptyText}>
            {t('skills.noFiles') || 'No files found for this skill'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  metaSection: {
    padding: 16,
  },
  fileList: {
    maxHeight: 150,
  },
  contentArea: {
    flex: 1,
    padding: 16,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    opacity: 0.5,
  },
});
