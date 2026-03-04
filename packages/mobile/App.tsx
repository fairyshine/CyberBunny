import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { localStorageShim } from './src/platform/localStorage-shim';
import { initMobilePlatform } from './src/platform/native';
import { initMobileI18n } from './src/platform/i18n';
import { useAppTheme } from './src/hooks/useAppTheme';
import RootNavigator from './src/navigation';
import LoadingSpinner from './src/components/common/LoadingSpinner';

function AppContent() {
  const theme = useAppTheme();

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style={theme.dark ? 'light' : 'dark'} />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        // Step 1: Preload localStorage shim
        await localStorageShim.preload();
        console.log('[App] localStorage preloaded');

        // Step 2: Initialize platform context
        initMobilePlatform();
        console.log('[App] Platform initialized');

        // Step 3: Initialize i18n
        await initMobileI18n();
        console.log('[App] i18n initialized');

        setIsReady(true);
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        setIsReady(true); // Continue anyway
      }
    }

    initialize();
  }, []);

  if (!isReady) {
    return <LoadingSpinner />;
  }

  return <AppContent />;
}
