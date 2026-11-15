import { StyleSheet, type ViewProps } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';

import { ThemedView } from '../themed-view';

export function Card({ style, ...props }: ViewProps) {
  return <ThemedView type="surface" style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
