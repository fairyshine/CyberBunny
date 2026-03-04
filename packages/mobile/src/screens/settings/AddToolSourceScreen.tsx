import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { TextInput, SegmentedButtons, Button, Text } from 'react-native-paper';
import { useToolStore } from '@shared/stores/tools';

type SourceType = 'code' | 'http' | 'mcp';

export default function AddToolSourceScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { addSource } = useToolStore();

  const [type, setType] = useState<SourceType>('code');
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      await addSource({
        type,
        name: name.trim(),
        source: type === 'code' ? '' : source.trim(),
        enabled: true,
        metadata: type === 'code' ? { code: code.trim() } : undefined,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="bodyMedium" style={styles.description}>
        {t('tools.addSourceDesc') || 'Add a tool source to extend CyberBunny capabilities.'}
      </Text>

      <SegmentedButtons
        value={type}
        onValueChange={(v) => setType(v as SourceType)}
        buttons={[
          { value: 'code', label: 'Code' },
          { value: 'http', label: 'HTTP' },
          { value: 'mcp', label: 'MCP' },
        ]}
        style={styles.segmented}
      />

      <TextInput
        label={t('tools.sourceName') || 'Name'}
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />

      {type !== 'code' && (
        <TextInput
          label={type === 'mcp' ? 'MCP Server URL' : 'HTTP URL'}
          value={source}
          onChangeText={setSource}
          mode="outlined"
          style={styles.input}
          placeholder={type === 'mcp' ? 'http://localhost:3000/mcp' : 'https://example.com/tools.json'}
        />
      )}

      {type === 'code' && (
        <TextInput
          label={t('tools.code') || 'JavaScript Code'}
          value={code}
          onChangeText={setCode}
          mode="outlined"
          multiline
          numberOfLines={12}
          style={[styles.input, { minHeight: 200 }]}
          contentStyle={{ fontFamily: 'monospace', fontSize: 12 }}
          placeholder={`// Define your tool\nexport default {\n  metadata: { id: 'my-tool', name: 'My Tool', description: '...' },\n  async execute(input) {\n    return { content: 'result' };\n  }\n};`}
        />
      )}

      <Button
        mode="contained"
        onPress={handleAdd}
        loading={loading}
        disabled={loading || !name.trim()}
        style={styles.button}
      >
        {t('tools.addSource') || 'Add Source'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  description: {
    marginBottom: 16,
    opacity: 0.7,
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
