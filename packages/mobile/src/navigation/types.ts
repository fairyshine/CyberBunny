import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

export type RootTabParamList = {
  ChatTab: undefined;
  Settings: undefined;
};

export type ChatStackParamList = {
  SessionList: undefined;
  Chat: { sessionId: string };
};

export type ChatStackNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList>,
  BottomTabNavigationProp<RootTabParamList>
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
