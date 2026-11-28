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
import { validateTransfer } from '@/domain/transfer';
import { useTheme } from '@/hooks/use-theme';
import { parseMajorToMinor } from '@/lib/money';

import { ThemedText } from '../themed-text';

type TransferFormProps = {
  onClose: () => void;
};

export function TransferForm({ onClose }: TransferFormProps) {
  const theme = useTheme();
  const client = useDatabase();
  const sourceRepository = useMemo(() => createMoneySourceRepository(client), [client]);
  const transactionRepository = useMemo(() => createTransactionRepository(client), [client]);

  const [sources, setSources] = useState<MoneySource[]>([]);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [note, setNote] = useState('');
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
        if (list.length > 0) {
          setFromId((current) => current ?? list[0].id);
          if (list.length > 1) setToId((current) => current ?? list[1].id);
        }
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
    if (!fromId || !toId) {
      setError('Select both a source and a destination.');
      setSaved(false);
      return;
    }

    let amountMinor: number;
    try {
      amountMinor = parseMajorToMinor(amount);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enter a valid amount.');
      setSaved(false);
      return;
    }
    if (amountMinor <= 0) {
      setError('Enter a positive amount.');
      setSaved(false);
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const transfer = validateTransfer({
        fromSourceId: fromId,
        toSourceId: toId,
        amountMinor,
        occurredAt: new Date().toISOString(),
      });
      await transactionRepository.createTransfer({
        sourceId: transfer.fromSourceId,
        toSourceId: transfer.toSourceId,
        amountMinor: transfer.amountMinor,
        occurredAt: transfer.occurredAt,
        description: note || null,
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this transfer.');
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
                <ThemedText type="heading">Transfer</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Move money between your sources
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
                <ThemedText type="heading" themeColor="textSecondary">×</ThemedText>
              </Pressable>
            </View>

            <Card style={styles.amountCard}>
              <ThemedText type="label" themeColor="textSecondary">Amount</ThemedText>
              <View style={styles.amountRow}>
                <ThemedText type="amount">₹</ThemedText>
                <TextInput
                  value={amount}
                  onChangeText={(value) => { setAmount(value); resetDirtyState(); }}
                  editable={!isSaving}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel="Transfer amount"
                  style={[styles.amountInput, { color: theme.text }]}
                />
              </View>
            </Card>

            {sourcesError ? (
              <ThemedText themeColor="destructive" accessibilityRole="alert">{sourcesError}</ThemedText>
            ) : sources.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">Add money sources first to make a transfer.</ThemedText>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <ThemedText type="label">From</ThemedText>
                  <View style={styles.optionGroup}>
                    {sources.map((item) => {
                      const selected = fromId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => { setFromId(item.id); resetDirtyState(); }}
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
                            {item.currencyCode} · {selected ? 'Selected' : 'Use as source'}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText type="label">To</ThemedText>
                  <View style={styles.optionGroup}>
                    {sources.map((item) => {
                      const selected = toId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => { setToId(item.id); resetDirtyState(); }}
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
                            {item.currencyCode} · {selected ? 'Selected' : 'Use as destination'}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Note (optional)</ThemedText>
              <Input
                value={note}
                onChangeText={(value) => { setNote(value); resetDirtyState(); }}
                editable={!isSaving}
                placeholder="What was this for?"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Transfer note"
              />
            </View>

            {error && (
              <ThemedText themeColor="destructive" accessibilityRole="alert">{error}</ThemedText>
            )}
            {saved && (
              <ThemedText themeColor="positive" accessibilityRole="alert">Transfer saved.</ThemedText>
            )}

            <Button
              label={isSaving ? 'Saving…' : saved ? 'Saved' : 'Save transfer'}
              onPress={handleSave}
              disabled={isSaving || saved || sources.length < 2}
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
  optionGroup: { gap: Spacing.two },
  option: { borderWidth: 1, borderRadius: Radii.medium, padding: Spacing.three, gap: Spacing.one },
});