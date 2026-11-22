import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from '../themed-text';

type AmountDisplayProps = {
  amount: string;
  label?: string;
  masked?: boolean;
  size?: 'default' | 'compact';
};

export function AmountDisplay({ amount, label, masked = false, size = 'default' }: AmountDisplayProps) {
  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      <ThemedText
        type="amount"
        style={[styles.amount, size === 'compact' && styles.compact]}
        accessibilityLabel={masked ? 'Amount hidden' : amount}>
        {masked ? '••••••' : amount}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  compact: {
    fontSize: 24,
    lineHeight: 30,
  },
});
