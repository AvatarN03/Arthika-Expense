import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from '../themed-text';

type AmountDisplayProps = {
  amount: string;
  label?: string;
  masked?: boolean;
};

export function AmountDisplay({ amount, label, masked = false }: AmountDisplayProps) {
  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      <ThemedText type="amount" accessibilityLabel={masked ? 'Amount hidden' : amount}>
        {masked ? '••••••' : amount}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
});
