import { useEffect, useMemo, useState } from 'react';
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
import { useDatabase } from '@/database/database-provider';
import { createMoneySourceRepository, type MoneySource } from '@/database/repositories/money-sources';
import {
  createTransactionRepository,
  type Transaction,
  type TransactionType,
} from '@/database/repositories/transactions';
import { formatMinor } from '@/lib/money';
import { useTheme } from '@/hooks/use-theme';

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

const filters: { key: 'all' | TransactionType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'adjustment', label: 'Adjustments' },
];

function formatActivityDate(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function ActivityScreen() {
  const theme = useTheme();
  const client = useDatabase();
  const sourceRepository = useMemo(() => createMoneySourceRepository(client), [client]);
  const transactionRepository = useMemo(() => createTransactionRepository(client), [client]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sources, setSources] = useState<MoneySource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | TransactionType>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      transactionRepository.list({ limit: 100 }),
      sourceRepository.list({ includeArchived: true }),
    ]).then(([list, sourceList]) => {
      if (!active) return;
      setTransactions(list);
      setSources(sourceList);
      setLoadError(null);
    }).catch((cause: unknown) => {
      if (!active) return;
      setLoadError(cause instanceof Error ? cause.message : 'Unable to load activity.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [transactionRepository, sourceRepository, refreshKey]);

  function refresh() {
    setIsLoading(true);
    setLoadError(null);
    setRefreshKey((value) => value + 1);
  }

  const currencyById = useMemo(
    () => new Map(sources.map((source) => [source.id, source.currencyCode])),
    [sources],
  );
  const sourceNameById = useMemo(
    () => new Map(sources.map((source) => [source.id, source.name])),
    [sources],
  );

  // For transfers, pair the debit and credit rows by transfer_id to show
  // "from X → to Y" and to keep each logical transfer visible once.
  const transferPairs = useMemo(() => {
    const byId = new Map<string, { from: string; to: string; transferId: string }>();
    for (const item of transactions) {
      if (item.type !== 'transfer' || !item.transferId) continue;
      const existing = byId.get(item.transferId);
      if (!existing) {
        byId.set(item.transferId, {
          from: item.direction === 'debit' ? item.sourceId : '',
          to: item.direction === 'credit' ? item.sourceId : '',
          transferId: item.transferId,
        });
      } else {
        if (item.direction === 'debit') existing.from = item.sourceId;
        if (item.direction === 'credit') existing.to = item.sourceId;
      }
    }
    return byId;
  }, [transactions]);

  const visible =
    activeFilter === 'all'
      ? transactions
      : transactions.filter((item) => item.type === activeFilter);

  const expenseCount = transactions.filter((item) => item.type === 'expense').length;
  const transferCount = new Set(transactions.filter((t) => t.type === 'transfer' && t.transferId).map((t) => t.transferId)).size;
  const spentThisMonthMinor = transactions
    .filter((item) => item.type === 'expense' && item.direction === 'debit')
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const shownCurrency = sources.length === 1
    ? sources[0].currencyCode
    : (currencyById.get(visible[0]?.sourceId ?? '') ?? 'INR');

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
            <AmountDisplay label="Recent expense total" amount={formatMinor(spentThisMonthMinor, shownCurrency)} size="compact" />
            <ThemedText type="small" themeColor="textSecondary">
              {expenseCount} expense{expenseCount === 1 ? '' : 's'} · {transferCount} transfer{transferCount === 1 ? '' : 's'} in loaded history
            </ThemedText>
          </Card>

          <View style={styles.filterRow}>
            {filters.map((filter) => {
              const selected = activeFilter === filter.key;
              const count = filter.key === 'all'
                ? transactions.length
                : transactions.filter((item) => item.type === filter.key).length;
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
                  <ThemedText type="small" themeColor={selected ? 'primaryForeground' : 'text'}>
                    {filter.label} ({count})
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {loadError ? (
            <Card style={styles.messageCard}>
              <ThemedText themeColor="destructive" accessibilityRole="alert">
                {loadError}
              </ThemedText>
              <Pressable onPress={refresh} accessibilityRole="button">
                <ThemedText type="smallBold" themeColor="primary">Try again</ThemedText>
              </Pressable>
            </Card>
          ) : (
            <View style={styles.section}>
              <SectionHeader
                title="History"
                subtitle={isLoading
                  ? 'Refreshing…'
                  : `${visible.length} record${visible.length === 1 ? '' : 's'}`}
              />

              {visible.length === 0 ? (
                <EmptyState
                  title="No activity"
                  description="Recorded expenses, transfers, and adjustments will appear here."
                />
              ) : (
                <Card style={styles.listCard}>
                  {visible.map((item, index) => {
                    const isTransfer = item.type === 'transfer';
                    const pair = isTransfer && item.transferId ? transferPairs.get(item.transferId) : undefined;
                    const transferMeta = isTransfer && pair
                      ? `${sourceNameById.get(pair.from) ?? pair.from} → ${sourceNameById.get(pair.to) ?? pair.to}`
                      : null;
                    return (
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
                            <ThemedText type="smallBold">
                              {item.description ?? (item.type === 'expense' ? 'Expense' : typeLabel[item.type])}
                              {item.isVoided ? ' · Voided' : ''}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {transferMeta ?? formatActivityDate(item.occurredAt)} · {typeLabel[item.type]}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText
                          type="smallBold"
                          themeColor={item.direction === 'credit' ? 'positive' : 'destructive'}>
                          {item.direction === 'debit' ? '−' : '+'}
                          {formatMinor(item.amountMinor, currencyById.get(item.sourceId) ?? 'INR')}
                        </ThemedText>
                      </View>
                    );
                  })}
                </Card>
              )}
            </View>
          )}
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
  messageCard: { gap: Spacing.three, alignItems: 'flex-start' },
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