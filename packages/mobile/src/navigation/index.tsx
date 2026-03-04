import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Screens
import SessionListScreen from '../screens/SessionListScreen';
import ChatScreen from '../screens/ChatScreen';
import FileEditorScreen from '../screens/FileEditorScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LLMSettingsScreen from '../screens/settings/LLMSettingsScreen';
import ToolManagerScreen from '../screens/settings/ToolManagerScreen';
import AddToolSourceScreen from '../screens/settings/AddToolSourceScreen';
import SkillManagerScreen from '../screens/settings/SkillManagerScreen';
import AddSkillScreen from '../screens/settings/AddSkillScreen';
import SkillViewerScreen from '../screens/settings/SkillViewerScreen';
import ConnectionTestScreen from '../screens/settings/ConnectionTestScreen';
import GeneralSettingsScreen from '../screens/settings/GeneralSettingsScreen';
import MemoryScreen from '../screens/settings/MemoryScreen';
import ConsoleScreen from '../screens/settings/ConsoleScreen';

// Components
import DrawerContent from '../components/sidebar/DrawerContent';

// Types
import type {
  DrawerParamList,
  RootTabParamList,
  ChatStackParamList,
  SettingsStackParamList,
} from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator id="ChatStack">
      <ChatStack.Screen
        name="SessionList"
        component={SessionListScreen}
        options={{ title: 'Sessions' }}
      />
      <ChatStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <ChatStack.Screen
        name="FileEditor"
        component={FileEditorScreen}
        options={{ headerShown: false }}
      />
    </ChatStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator id="SettingsStack">
      <SettingsStack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="LLMSettings"
        component={LLMSettingsScreen}
        options={{ title: 'LLM' }}
      />
      <SettingsStack.Screen
        name="ToolManager"
        component={ToolManagerScreen}
        options={{ title: 'Tools' }}
      />
      <SettingsStack.Screen
        name="AddToolSource"
        component={AddToolSourceScreen}
        options={{ title: 'Add Tool Source' }}
      />
      <SettingsStack.Screen
        name="SkillManager"
        component={SkillManagerScreen}
        options={{ title: 'Skills' }}
      />
      <SettingsStack.Screen
        name="AddSkill"
        component={AddSkillScreen}
        options={{ title: 'Add Skill' }}
      />
      <SettingsStack.Screen
        name="SkillViewer"
        component={SkillViewerScreen}
        options={{ title: 'Skill Details' }}
      />
      <SettingsStack.Screen
        name="ConnectionTest"
        component={ConnectionTestScreen}
        options={{ title: 'Connection Test' }}
      />
      <SettingsStack.Screen
        name="GeneralSettings"
        component={GeneralSettingsScreen}
        options={{ title: 'General' }}
      />
      <SettingsStack.Screen
        name="Memory"
        component={MemoryScreen}
        options={{ title: 'Memory' }}
      />
      <SettingsStack.Screen
        name="Console"
        component={ConsoleScreen}
        options={{ title: 'Console' }}
      />
    </SettingsStack.Navigator>
  );
}

function TabNavigator() {
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
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="message-text" iconColor={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="cog" iconColor={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Drawer.Navigator
      id="Drawer"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 300 },
      }}
    >
      <Drawer.Screen name="Main" component={TabNavigator} />
    </Drawer.Navigator>
  );
}
