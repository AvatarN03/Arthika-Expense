import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type AppSectionProps = {
  title: string;
  description: string;
};

export function AppSection({ title, description }: AppSectionProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Image
          source={require('@/assets/images/arthika-symbol-color.png')}
          contentFit="contain"
          style={styles.logo}
          accessibilityLabel="ARTHIKA symbol"
        />
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  logo: {
    width: 88,
    height: 88,
  },
  description: {
    maxWidth: 320,
    textAlign: 'center',
  },
});
