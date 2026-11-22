import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DatabaseProvider } from '@/database/database-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <ThemedView style={styles.container}>
          <AppTabs />
        </ThemedView>
      </DatabaseProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Expo's web NativeTabs menu floats above the content instead of reserving space.
    // Keep it clear of screen headers; the native bottom-tab layout is unchanged.
    paddingTop: Platform.OS === 'web' ? Spacing.six + Spacing.three : 0,
  },
});
