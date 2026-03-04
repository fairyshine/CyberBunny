import { Appearance } from 'react-native';
import type { Theme } from '@shared/stores/settings';

/**
 * Get the effective theme (resolve 'system' to 'light' or 'dark')
 */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark' ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Listen to system theme changes
 */
export function setupSystemThemeListener(
  callback: (theme: 'light' | 'dark') => void
): () => void {
  const subscription = Appearance.addChangeListener(({ colorScheme }) => {
    callback(colorScheme === 'dark' ? 'dark' : 'light');
  });

  return () => subscription.remove();
}
