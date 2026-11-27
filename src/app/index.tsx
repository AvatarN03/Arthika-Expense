import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AddExpenseForm } from '@/components/expenses/add-expense-form';
import { ExpenseDetailModal } from '@/components/expenses/expense-detail-modal';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/database/database-provider';
import { createMoneySourceRepository, type MoneySource } from '@/database/repositories/money-sources';
import {
  createTransactionRepository,
  type Transaction,
  type TransactionLedgerEntry,
} from '@/database/repositories/transactions';
import { calculateTrackedBalances } from '@/domain/balance';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatMinor } from '@/lib/money';

function formatActivityDate(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const client = useDatabase();
  const sourceRepository = useMemo(() => createMoneySourceRepository(client), [client]);
  const transactionRepository = useMemo(() => createTransactionRepository(client), [client]);

  const [sources, setSources] = useState<MoneySource[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<TransactionLedgerEntry[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddExpenseVisible, setAddExpenseVisible] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const scheme = useColorScheme();
  const { width, fontScale } = useWindowDimensions();
  const stackSummaries = width < 360 || fontScale > 1.2;

  useEffect(() => {
    let active = true;
    Promise.all([
      sourceRepository.list(),
      transactionRepository.listLedgerEntries(),
      transactionRepository.list({ limit: 5 }),
    ]).then(([sourceList, entries, activity]) => {
      if (!active) return;
      setSources(sourceList);
      setLedgerEntries(entries);
      setRecent(activity);
      setLoadError(null);
    }).catch((cause: unknown) => {
      if (!active) return;
      setLoadError(cause instanceof Error ? cause.message : 'Unable to load your money.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [sourceRepository, transactionRepository, refreshKey]);

  function refresh() {
    setIsLoading(true);
    setLoadError(null);
    setRefreshKey((value) => value + 1);
  }

  const activeBalances = useMemo(
    () => calculateTrackedBalances(sources, ledgerEntries),
    [sources, ledgerEntries],
  );
  const balanceById = useMemo(
    () => new Map(activeBalances.sources.map((balance) => [balance.sourceId, balance])),
    [activeBalances],
  );

  function handleSheetClose() {
    setAddExpenseVisible(false);
    refresh();
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={scheme === 'dark'
                ? require('@/assets/images/arthika-logo-horizontal-reversed.png')
                : require('@/assets/images/arthika-logo-horizontal-color.png')}
              contentFit="contain"
              style={styles.logo}
              accessibilityLabel="ARTHIKA"
            />
            <ThemedText type="small" themeColor="textSecondary">
              {isLoading ? 'Refreshing…' : 'Overview'}
            </ThemedText>
          </View>

          <View style={styles.greeting}>
            <ThemedText type="title">Your money</ThemedText>
            <ThemedText themeColor="textSecondary">
              A clear view of what you have and what needs attention.
            </ThemedText>
          </View>

          {loadError ? (
            <Card style={styles.messageCard}>
              <ThemedText themeColor="destructive" accessibilityRole="alert">
                {loadError}
              </ThemedText>
              <Button label="Try again" variant="secondary" onPress={refresh} />
            </Card>
          ) : (
            <>
              <Card style={styles.balanceCard}>
                {activeBalances.totals.length === 0 ? (
                  <AmountDisplay label="Total tracked balance" amount="—" />
                ) : (
                  activeBalances.totals.map((total) => (
                    <AmountDisplay
                      key={total.currencyCode}
                      label={activeBalances.totals.length > 1
                        ? `Total tracked balance · ${total.currencyCode}`
                        : 'Total tracked balance'}
                      amount={formatMinor(total.totalMinor, total.currencyCode)}
                    />
                  ))
                )}
                <ThemedText type="small" themeColor="textSecondary">
                  {sources.length === 0
                    ? 'Add a money source to start tracking'
                    : `Across ${sources.length} active source${sources.length === 1 ? '' : 's'}`}
                </ThemedText>
              </Card>

              <View style={[styles.summaryRow, stackSummaries && styles.stacked]}>
                <Card style={styles.summaryCard}>
                  <AmountDisplay label="Money sources" amount={`${sources.length}`} size="compact" />
                  <ThemedText type="small" themeColor="textSecondary">
                    Active
                  </ThemedText>
                </Card>
                <Card style={styles.summaryCard}>
                  <AmountDisplay label="Recent activity" amount={`${recent.length}`} size="compact" />
                  <ThemedText type="small" themeColor="textSecondary">
                    Latest ledger entries
                  </ThemedText>
                </Card>
              </View>

              <View style={styles.actions}>
                <Button label="Add expense" onPress={() => setAddExpenseVisible(true)} />
                <Button label="Transfer" variant="secondary" disabled />
                <Button label="Update balance" variant="ghost" disabled />
              </View>

              <View style={styles.section}>
                <SectionHeader title="Money sources" accessory={<ThemedText type="link">View all</ThemedText>} />
                {sources.length === 0 ? (
                  <Card>
                    <ThemedText type="small" themeColor="textSecondary">
                      No money sources yet. Add one in Money sources.
                    </ThemedText>
                  </Card>
                ) : (
                  <Card>
                    {sources.map((source) => {
                      const balanceMinor = balanceById.get(source.id)?.balanceMinor
                        ?? source.openingBalanceMinor;
                      return (
                        <View key={source.id} style={styles.listRow}>
                          <View style={styles.rowDetails}>
                            <ThemedText type="smallBold">{source.name}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {source.currencyCode}
                            </ThemedText>
                          </View>
                          <ThemedText type="smallBold">
                            {formatMinor(balanceMinor, source.currencyCode)}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </Card>
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader title="Recent activity" accessory={<ThemedText type="link">View all</ThemedText>} />
                {recent.length === 0 ? (
                  <Card>
                    <ThemedText type="small" themeColor="textSecondary">
                      No activity yet. Add your first expense.
                    </ThemedText>
                  </Card>
                ) : (
                  <Card>
                    {recent.map((activity) => (
                      <Pressable
                        key={activity.id}
                        onPress={() => setDetailId(activity.id)}
                        style={styles.listRow}>
                        <View style={styles.rowDetails}>
                          <ThemedText type="smallBold">
                            {activity.description ?? (activity.type === 'expense' ? 'Expense' : 'Adjustment')}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatActivityDate(activity.occurredAt)} · {activity.type}
                          </ThemedText>
                        </View>
                        <ThemedText type="smallBold">
                          {activity.direction === 'debit' ? '−' : '+'}{formatMinor(activity.amountMinor, sources.find((s) => s.id === activity.sourceId)?.currencyCode ?? 'INR')}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </Card>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <Modal
        visible={isAddExpenseVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleSheetClose}>
        <AddExpenseForm onClose={handleSheetClose} />
      </Modal>
      <ExpenseDetailModal
        key={detailId ?? 'none'}
        transactionId={detailId}
        onClose={() => setDetailId(null)}
        onVoided={refresh}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { alignItems: 'flex-start', gap: Spacing.two },
  logo: { width: 156, height: 40 },
  greeting: { gap: Spacing.one },
  messageCard: { gap: Spacing.three, alignItems: 'flex-start' },
  balanceCard: { gap: Spacing.two },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  stacked: { flexDirection: 'column' },
  summaryCard: { flex: 1, minWidth: 0, padding: Spacing.three },
  actions: { gap: Spacing.two },
  section: { gap: Spacing.two },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  rowDetails: { flex: 1 },
});