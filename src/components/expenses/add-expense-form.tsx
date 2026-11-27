import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Radii, Spacing } from '@/constants/theme';
import { useDatabase } from '@/database/database-provider';
import { createMoneySourceRepository, type MoneySource } from '@/database/repositories/money-sources';
import { createTransactionRepository } from '@/database/repositories/transactions';
import { validateExpense } from '@/domain/expense';
import { useTheme } from '@/hooks/use-theme';
import { parseMajorToMinor } from '@/lib/money';

import { ThemedText } from '../themed-text';

const categories = ['Food', 'Transport', 'Bills', 'Shopping', 'Other'];

type AddExpenseFormProps = {
  onClose: () => void;
};

export function AddExpenseForm({ onClose }: AddExpenseFormProps) {
  const theme = useTheme();
  const client = useDatabase();
  const sourceRepository = useMemo(() => createMoneySourceRepository(client), [client]);
  const transactionRepository = useMemo(() => createTransactionRepository(client), [client]);

  const [sources, setSources] = useState<MoneySource[]>([]);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    sourceRepository.list()
      .then((list) => {
        if (!active) return;
        setSources(list);
        setSourcesError(null);
        if (list.length > 0) setSourceId((current) => current ?? list[0].id);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setSourcesError(cause instanceof Error ? cause.message : 'Unable to load money sources.');
      });
    return () => { active = false; };
  }, [sourceRepository]);

  function resetDirtyState() {
    setError(null);
    setSaved(false);
  }

  async function handleSave() {
    if (savingRef.current) return;

    if (!sourceId) {
      setError('Select a money source for this expense.');
      setSaved(false);
      return;
    }

    let amountMinor: number;
    try {
      amountMinor = parseMajorToMinor(amount);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enter a valid expense amount.');
      setSaved(false);
      return;
    }
    if (amountMinor <= 0) {
      setError('Enter a positive expense amount.');
      setSaved(false);
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const expense = validateExpense({
        amountMinor,
        sourceId,
        occurredAt: new Date().toISOString(),
        description: description || null,
      });
      await transactionRepository.createExpense(expense);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this expense.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: theme.background }}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="heading">Add expense</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Saved to your local ledger
                </ThemedText>
              </View>
              <Pressable
                onPress={onClose}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                  isSaving && styles.disabled,
                ]}>
                <ThemedText type="heading" themeColor="textSecondary">
                  ×
                </ThemedText>
              </Pressable>
            </View>

            <Card style={styles.amountCard}>
              <ThemedText type="label" themeColor="textSecondary">
                Amount
              </ThemedText>
              <View style={styles.amountRow}>
                <ThemedText type="amount">₹</ThemedText>
                <TextInput
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value);
                    resetDirtyState();
                  }}
                  editable={!isSaving}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel="Expense amount"
                  style={[styles.amountInput, { color: theme.text }]}
                />
              </View>
            </Card>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Category</ThemedText>
              <View style={styles.chipRow}>
                {categories.map((item) => {
                  const selected = category === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setCategory(item);
                        resetDirtyState();
                      }}
                      disabled={isSaving}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: isSaving }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: theme.border },
                        selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                        pressed && styles.pressed,
                        isSaving && styles.disabled,
                      ]}>
                      <ThemedText type="small" themeColor={selected ? 'primaryForeground' : 'text'}>
                        {item}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Categories are not stored yet; this is for display only.
              </ThemedText>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Money source</ThemedText>
              {sourcesError ? (
                <ThemedText themeColor="destructive" accessibilityRole="alert">
                  {sourcesError}
                </ThemedText>
              ) : sources.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Add a money source first to record an expense.
                </ThemedText>
              ) : (
                <View style={styles.optionGroup}>
                  {sources.map((item) => {
                    const selected = sourceId === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          setSourceId(item.id);
                          resetDirtyState();
                        }}
                        disabled={isSaving}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected, disabled: isSaving }}
                        style={({ pressed }) => [
                          styles.option,
                          { borderColor: theme.border },
                          selected && { borderColor: theme.primary, backgroundColor: theme.backgroundElement },
                          pressed && styles.pressed,
                          isSaving && styles.disabled,
                        ]}>
                        <ThemedText type="smallBold">{item.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.currencyCode} · {selected ? 'Selected' : 'Use this source'}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Description (optional)</ThemedText>
              <Input
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  resetDirtyState();
                }}
                editable={!isSaving}
                placeholder="What was this for?"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                accessibilityLabel="Expense description"
                style={styles.descriptionInput}
              />
            </View>

            {error && (
              <ThemedText themeColor="destructive" accessibilityRole="alert">
                {error}
              </ThemedText>
            )}
            {saved && (
              <ThemedText themeColor="positive" accessibilityRole="alert">
                Expense saved.
              </ThemedText>
            )}

            <Button
              label={isSaving ? 'Saving…' : saved ? 'Saved' : 'Save expense'}
              onPress={handleSave}
              disabled={isSaving || saved}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  headerText: { flex: 1 },
  closeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.medium },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  amountCard: { gap: Spacing.two },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  amountInput: { flex: 1, fontSize: 32, lineHeight: 38, fontWeight: '700', padding: 0 },
  fieldGroup: { gap: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderRadius: Radii.medium, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  optionGroup: { gap: Spacing.two },
  option: { borderWidth: 1, borderRadius: Radii.medium, padding: Spacing.three, gap: Spacing.one },
  descriptionInput: { minHeight: 88, textAlignVertical: 'top' },
});