import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

// Drawer level
export type DrawerParamList = {
  Main: undefined;
};

// Bottom tabs
export type RootTabParamList = {
  ChatTab: undefined;
  SettingsTab: undefined;
};

// Chat stack
export type ChatStackParamList = {
  SessionList: undefined;
  Chat: { sessionId: string };
  FileEditor: { filePath: string; fileName: string };
};

// Settings stack
export type SettingsStackParamList = {
  SettingsHome: undefined;
  LLMSettings: undefined;
  ToolManager: undefined;
  AddToolSource: undefined;
  SkillManager: undefined;
  AddSkill: undefined;
  SkillViewer: { skillId: string; skillName: string };
  ConnectionTest: undefined;
  GeneralSettings: undefined;
  Memory: undefined;
  Console: undefined;
};

// Navigation props
export type ChatStackNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<RootTabParamList>,
    DrawerNavigationProp<DrawerParamList>
  >
>;

export type SessionListScreenNavigationProp = NativeStackNavigationProp<
  ChatStackParamList,
  'SessionList'
>;

export type ChatScreenNavigationProp = NativeStackNavigationProp<
  ChatStackParamList,
  'Chat'
>;

export type ChatScreenRouteProp = RouteProp<ChatStackParamList, 'Chat'>;

export type FileEditorRouteProp = RouteProp<ChatStackParamList, 'FileEditor'>;

export type SettingsStackNavigationProp = NativeStackNavigationProp<SettingsStackParamList>;

export type SkillViewerRouteProp = RouteProp<SettingsStackParamList, 'SkillViewer'>;
