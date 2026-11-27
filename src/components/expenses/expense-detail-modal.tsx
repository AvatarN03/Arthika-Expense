import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radii, Spacing } from '@/constants/theme';
import { useDatabase } from '@/database/database-provider';
import { createTransactionRepository, type Transaction } from '@/database/repositories/transactions';
import { useTheme } from '@/hooks/use-theme';
import { formatMinor } from '@/lib/money';

import { ThemedText } from '../themed-text';

type ExpenseDetailModalProps = {
  transactionId: string | null;
  onClose: () => void;
  onVoided: () => void;
};

export function ExpenseDetailModal({ transactionId, onClose, onVoided }: ExpenseDetailModalProps) {
  const theme = useTheme();
  const client = useDatabase();
  const repository = useMemo(() => createTransactionRepository(client), [client]);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    if (!transactionId) return;
    let active = true;
    repository.getById(transactionId)
      .then((found) => {
        if (!active) return;
        setTransaction(found);
        setError(null);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Unable to load this expense.');
        setIsLoading(false);
      });
    return () => { active = false; };
  }, [repository, transactionId]);

  async function handleVoid() {
    if (!transaction || isVoiding) return;
    setIsVoiding(true);
    setError(null);
    try {
      await repository.voidTransaction(transaction.id, 'Voided from detail');
      onVoided();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to void this expense.');
    } finally {
      setIsVoiding(false);
    }
  }

  const currency = 'INR';
  const amountLabel = transaction
    ? `${transaction.direction === 'debit' ? '−' : '+'} ${formatMinor(transaction.amountMinor, currency)}`
    : '—';

  return (
    <Modal
      visible={transactionId !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      {transactionId !== null && (
        <SafeAreaView style={styles.screen}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="heading">Expense detail</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {transaction?.isVoided ? 'Voided' : 'Active'}
                </ThemedText>
              </View>
              <Pressable
                onPress={onClose}
                disabled={isVoiding}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                  isVoiding && styles.disabled,
                ]}>
                <ThemedText type="heading" themeColor="textSecondary">×</ThemedText>
              </Pressable>
            </View>

            {isLoading ? (
              <Card style={styles.messageCard}>
                <ThemedText type="small" themeColor="textSecondary">Loading…</ThemedText>
              </Card>
            ) : error ? (
              <Card style={styles.messageCard}>
                <ThemedText themeColor="destructive" accessibilityRole="alert">{error}</ThemedText>
                <Button label="Close" variant="secondary" onPress={onClose} />
              </Card>
            ) : !transaction ? (
              <Card style={styles.messageCard}>
                <ThemedText type="small" themeColor="textSecondary">Expense not found.</ThemedText>
                <Button label="Close" variant="secondary" onPress={onClose} />
              </Card>
            ) : (
              <>
                <Card style={styles.detailCard}>
                  <ThemedText type="label" themeColor="textSecondary">Amount</ThemedText>
                  <ThemedText type="title">{amountLabel}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {transaction.description ?? 'No description'}
                  </ThemedText>
                </Card>

                <Card style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary">Type</ThemedText>
                    <ThemedText type="smallBold">{transaction.type}</ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary">Direction</ThemedText>
                    <ThemedText type="smallBold">{transaction.direction}</ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary">Occurred at</ThemedText>
                    <ThemedText type="smallBold">{transaction.occurredAt}</ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary">Status</ThemedText>
                    <ThemedText type="smallBold" themeColor={transaction.isVoided ? 'destructive' : 'positive'}>
                      {transaction.isVoided ? 'Voided' : 'Active'}
                    </ThemedText>
                  </View>
                  {transaction.paymentMethod && (
                    <View style={styles.detailRow}>
                      <ThemedText type="small" themeColor="textSecondary">Payment method</ThemedText>
                      <ThemedText type="smallBold">{transaction.paymentMethod}</ThemedText>
                    </View>
                  )}
                </Card>

                {!transaction.isVoided && (
                  <Button
                    label={isVoiding ? 'Voiding…' : 'Void expense'}
                    variant="secondary"
                    onPress={handleVoid}
                    disabled={isVoiding}
                  />
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  headerText: { flex: 1 },
  closeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.medium },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  messageCard: { gap: Spacing.three, alignItems: 'flex-start' },
  detailCard: { gap: Spacing.two },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, alignItems: 'center' },
});