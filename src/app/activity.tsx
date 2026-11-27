import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TransactionType = 'expense' | 'transfer' | 'adjustment';

type Transaction = {
  id: string;
  type: TransactionType;
  title: string;
  meta: string;
  amount: string;
  positive: boolean;
  date: string;
};

const typeLabel: Record<TransactionType, string> = {
  expense: 'Expense',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
};

const typeColor: Record<TransactionType, 'destructive' | 'primary' | 'warning'> = {
  expense: 'destructive',
  transfer: 'primary',
  adjustment: 'warning',
};

const initialTransactions: Transaction[] = [
  { id: '1', type: 'expense', title: 'Groceries', meta: 'Today · Food · Main bank account', amount: '− ₹840', positive: false, date: 'Today' },
  { id: '2', type: 'transfer', title: 'Moved to cash', meta: 'Yesterday · Transfer · Main bank → Everyday cash', amount: '₹2,000', positive: true, date: 'Yesterday' },
  { id: '3', type: 'expense', title: 'Metro card recharge', meta: '20 Nov · Transport · Everyday cash', amount: '− ₹500', positive: false, date: '20 Nov' },
  { id: '4', type: 'adjustment', title: 'Reconciliation correction', meta: '18 Nov · Adjustment · Main bank account', amount: '+ ₹120', positive: true, date: '18 Nov' },
  { id: '5', type: 'expense', title: 'Electricity bill', meta: '15 Nov · Bills · Main bank account', amount: '− ₹1,840', positive: false, date: '15 Nov' },
];

const filters: { key: 'all' | TransactionType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'adjustment', label: 'Adjustments' },
];

export default function ActivityScreen() {
  const theme = useTheme();
  const [activeFilter, setActiveFilter] = useState<'all' | TransactionType>('all');

  const visible =
    activeFilter === 'all'
      ? initialTransactions
      : initialTransactions.filter((t) => t.type === activeFilter);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title">Activity</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Expenses, transfers, and adjustments.
            </ThemedText>
          </View>

          <Card style={styles.summaryCard}>
            <AmountDisplay label="Spent this month" amount="₹8,420" size="compact" />
            <ThemedText type="small" themeColor="textSecondary">
              November · {initialTransactions.filter((t) => t.type === 'expense').length} expenses
            </ThemedText>
          </Card>

          <View style={styles.filterRow}>
            {filters.map((filter) => {
              const selected = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    { borderColor: theme.border },
                    selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="small"
                    themeColor={selected ? 'primaryForeground' : 'text'}>
                    {filter.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="History"
              subtitle={`${visible.length} record${visible.length === 1 ? '' : 's'}`}
            />

            {visible.length === 0 ? (
              <EmptyState
                title="No activity"
                description="Recorded expenses, transfers, and adjustments will appear here."
              />
            ) : (
              <Card style={styles.listCard}>
                {visible.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.row,
                      index < visible.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    ]}>
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.typeDot,
                          { backgroundColor: theme.backgroundElement },
                        ]}>
                        <ThemedText type="smallBold" themeColor={typeColor[item.type]}>
                          {typeLabel[item.type][0]}
                        </ThemedText>
                      </View>
                      <View style={styles.rowDetails}>
                        <ThemedText type="smallBold">{item.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.meta}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText
                      type="smallBold"
                      themeColor={item.positive ? 'positive' : 'destructive'}>
                      {item.amount}
                    </ThemedText>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { gap: Spacing.one },
  summaryCard: { gap: Spacing.two },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filterChip: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderRadius: Radii.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  pressed: { opacity: 0.72 },
  section: { gap: Spacing.two },
  listCard: { padding: 0, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, padding: Spacing.three },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flex: 1 },
  typeDot: { width: 36, height: 36, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  rowDetails: { flex: 1, gap: Spacing.half },
});
