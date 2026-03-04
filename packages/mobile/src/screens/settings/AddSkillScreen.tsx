import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { TextInput, SegmentedButtons, Button, Text } from 'react-native-paper';
import { useSkillStore } from '@shared/stores/skills';

type AddMode = 'folder' | 'url' | 'create';

const SKILL_TEMPLATE = `# My Skill

## Description
Describe what this skill does.

## Steps
1. Step one
2. Step two

## Parameters
- input (string, required): The input to process
`;

export default function AddSkillScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { addSource } = useSkillStore();

  const [mode, setMode] = useState<AddMode>('create');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [content, setContent] = useState(SKILL_TEMPLATE);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      switch (mode) {
        case 'folder':
          await addSource({
            type: 'file',
            name: name.trim(),
            source: folderPath.trim(),
            enabled: true,
          });
          break;
        case 'url':
          await addSource({
            type: 'http',
            name: name.trim(),
            source: url.trim(),
            enabled: true,
          });
          break;
        case 'create':
          await addSource({
            type: 'code',
            name: name.trim(),
            source: '',
            enabled: true,
            metadata: { code: content.trim() },
          });
          break;
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SegmentedButtons
        value={mode}
        onValueChange={(v) => setMode(v as AddMode)}
        buttons={[
          { value: 'folder', label: 'Folder' },
          { value: 'url', label: 'URL' },
          { value: 'create', label: 'Create' },
        ]}
        style={styles.segmented}
      />

      <TextInput
        label={t('skills.name') || 'Skill Name'}
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />

      {mode === 'folder' && (
        <TextInput
          label={t('skills.folderPath') || 'Folder Path'}
          value={folderPath}
          onChangeText={setFolderPath}
          mode="outlined"
          style={styles.input}
          placeholder="/sandbox/skills/my-skill"
        />
      )}

      {mode === 'url' && (
        <TextInput
          label="URL"
          value={url}
          onChangeText={setUrl}
          mode="outlined"
          style={styles.input}
          placeholder="https://example.com/skill.md"
        />
      )}

      {mode === 'create' && (
        <TextInput
          label="SKILL.md"
          value={content}
          onChangeText={setContent}
          mode="outlined"
          multiline
          numberOfLines={15}
          style={[styles.input, { minHeight: 300 }]}
          contentStyle={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      )}

      <Button
        mode="contained"
        onPress={handleAdd}
        loading={loading}
        disabled={loading || !name.trim()}
        style={styles.button}
      >
        {t('skills.add') || 'Add Skill'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  segmented: {
    marginBottom: 16,
  },
  input: {
    marginVertical: 8,
  },
  button: {
    marginTop: 16,
    marginBottom: 32,
  },
});
