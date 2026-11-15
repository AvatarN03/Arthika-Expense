import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from '../themed-text';

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="heading">{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.description}>
        {description}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  description: {
    maxWidth: 300,
    textAlign: 'center',
  },
});
