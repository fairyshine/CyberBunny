import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton } from 'react-native-paper';
import SessionListScreen from '../screens/SessionListScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { RootTabParamList, ChatStackParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator id="ChatStack">
      <ChatStack.Screen
        name="SessionList"
        component={SessionListScreen}
        options={{ title: '会话' }}
      />
      <ChatStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
    </ChatStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      id="RootTab"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="ChatTab"
        component={ChatStackNavigator}
        options={{
          title: '聊天',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="message-text" iconColor={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '设置',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="cog" iconColor={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
