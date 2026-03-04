import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Appbar, List, FAB, IconButton, Text } from 'react-native-paper';
import { useSessionStore, selectActiveSessions } from '@shared/stores/session';
import type { SessionListScreenNavigationProp } from '../navigation/types';

export default function SessionListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<SessionListScreenNavigationProp>();
  const { createSession, deleteSession } = useSessionStore();
  const sessions = useSessionStore(selectActiveSessions);

  const handleCreateSession = () => {
    const session = createSession(t('header.newSession'));
    navigation.navigate('Chat', { sessionId: session.id });
  };

  const handleSelectSession = (sessionId: string) => {
    navigation.navigate('Chat', { sessionId });
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(sessionId);
  };

  if (sessions.length === 0) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title={t('header.newSession')} />
        </Appbar.Header>
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            {t('chat.noSessionHint')}
          </Text>
        </View>
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleCreateSession}
          label={t('header.newSession')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="会话列表" />
      </Appbar.Header>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.messages.length} 条消息`}
            onPress={() => handleSelectSession(item.id)}
            right={(props) => (
              <IconButton
                {...props}
                icon="delete"
                onPress={() => handleDeleteSession(item.id)}
              />
            )}
          />
        )}
      />
      <FAB icon="plus" style={styles.fab} onPress={handleCreateSession} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
