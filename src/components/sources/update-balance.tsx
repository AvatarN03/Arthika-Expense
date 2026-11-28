import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Radii, Spacing } from '@/constants/theme';
import { createReconciliationRepository } from '@/database/repositories/reconciliations';
import { useDatabase } from '@/database/database-provider';
import { useTheme } from '@/hooks/use-theme';
import { formatMinor, parseMajorToMinor } from '@/lib/money';

import { ThemedText } from '../themed-text';

type UpdateBalanceProps = {
  sourceId: string;
  sourceName: string;
  currencyCode: string;
  balanceMinor: number;
  onClose: () => void;
  onSaved: () => void;
};

export function UpdateBalance({
  sourceId,
  sourceName,
  currencyCode,
  balanceMinor,
  onClose,
  onSaved,
}: UpdateBalanceProps) {
  const theme = useTheme();
  const client = useDatabase();
  const repository = createReconciliationRepository(client);

  const [enteredBalance, setEnteredBalance] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentBalance = formatMinor(balanceMinor, currencyCode);

  async function handleSave() {
    if (isSaving) return;

    let enteredBalanceMinor: number;
    try {
      enteredBalanceMinor = parseMajorToMinor(enteredBalance);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enter a valid balance.');
      setSaved(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await repository.create({
        sourceId,
        previousBalanceMinor: balanceMinor,
        enteredBalanceMinor,
        currencyCode,
        occurredAt: new Date().toISOString(),
        reason: reason || null,
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this balance.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="heading">Update balance</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Source: {sourceName}
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

            <Card style={styles.summaryCard}>
              <ThemedText type="small" themeColor="textSecondary">Currently tracked</ThemedText>
              <ThemedText type="title">{currentBalance}</ThemedText>
            </Card>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Actual balance</ThemedText>
              <Input
                value={enteredBalance}
                onChangeText={(value) => { setEnteredBalance(value); setError(null); setSaved(false); }}
                editable={!isSaving}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Actual balance"
                style={styles.input}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Enter the balance you actually observe for {sourceName}.
              </ThemedText>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Reason (optional)</ThemedText>
              <Input
                value={reason}
                onChangeText={(value) => { setReason(value); setError(null); setSaved(false); }}
                editable={!isSaving}
                placeholder="Why is this different?"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Reconciliation reason"
              />
            </View>

            {error && (
              <ThemedText themeColor="destructive" accessibilityRole="alert">{error}</ThemedText>
            )}
            {saved && (
              <ThemedText themeColor="positive" accessibilityRole="alert">Balance updated.</ThemedText>
            )}

            <Button
              label={isSaving ? 'Saving…' : saved ? 'Saved' : 'Save balance update'}
              onPress={handleSave}
              disabled={isSaving || saved}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  summaryCard: { gap: Spacing.two },
  fieldGroup: { gap: Spacing.two },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Radii.medium, padding: Spacing.two },
});